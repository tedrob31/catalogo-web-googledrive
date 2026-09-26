import { createAdminClient } from '@/lib/supabase/admin';
import { getDriveClientForTenant } from '@/lib/google-auth';
import { uploadBufferToR2, checkObjectExistsInR2, deleteObjectFromR2 } from '@/lib/r2';
import { slugify } from '@/lib/utils';
import { drive_v3 } from 'googleapis';
import { revalidatePath } from 'next/cache';
import { purgeCloudflareCache } from '@/lib/cloudflare';
import { invalidateTenantCatalogCache } from '@/lib/catalog-db';

export interface SyncProgress {
  tenantId: string;
  albumsCount: number;
  photosCount: number;
  newUploaded: number;
  skipped: number;
  bytesUploaded: number;
  modifiedAlbumPaths?: string[];
  error?: string;
}

/**
 * Motor de Sincronización Multi-Tenant Ultra Ligero (Sin Sharp)
 * Flujo: Google Drive -> Memory Buffer -> Cloudflare R2 -> Supabase PostgreSQL
 */
export async function runTenantSync(
  tenantId: string,
  existingLogId?: string
): Promise<SyncProgress> {
  const supabase = createAdminClient();

  // 1. Obtener datos del Inquilino y su Plan
  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select(`
      id,
      name,
      subdomain,
      status,
      current_photos_count,
      current_storage_bytes,
      plan_id,
      subscription_plans (
        max_photos,
        max_storage_mb
      )
    `)
    .eq('id', tenantId)
    .single();

  if (tenantErr || !tenant) {
    throw new Error(`Inquilino ${tenantId} no encontrado.`);
  }

  if (tenant.status === 'suspended') {
    throw new Error(`La tienda ${tenant.name} se encuentra suspendida. Contacta a soporte.`);
  }

  // Cuotas del plan
  const plan = tenant.subscription_plans as { max_photos: number; max_storage_mb: number } | null;
  const maxAllowedPhotos = plan?.max_photos || 500;
  const maxAllowedStorageBytes = (plan?.max_storage_mb || 1024) * 1024 * 1024;

  // 2. Obtener configuración de Drive del Inquilino
  const { data: integration, error: intErr } = await supabase
    .from('google_integrations')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  if (intErr || !integration || !integration.catalog_folder_id) {
    throw new Error(`El inquilino no ha configurado la carpeta de catálogo en Google Drive.`);
  }

  // 3. Gestionar o crear el log de sincronización
  let logId = existingLogId;
  if (!logId) {
    const { data: logEntry } = await supabase
      .from('sync_logs')
      .insert({
        tenant_id: tenantId,
        status: 'syncing',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    logId = logEntry?.id;
  } else {
    await supabase
      .from('sync_logs')
      .update({
        status: 'syncing',
        error_message: null,
      })
      .eq('id', logId);
  }

  const drive = await getDriveClientForTenant(tenantId);

  const progress: SyncProgress = {
    tenantId,
    albumsCount: 0,
    photosCount: 0,
    newUploaded: 0,
    skipped: 0,
    bytesUploaded: 0,
    modifiedAlbumPaths: [],
  };

  try {
    // 3.1 Pre-cargar en memoria (RAM) todos los álbumes y fotos del tenant en 2 consultas únicas
    // Esto elimina las 150+ consultas HTTP secuenciales a Supabase que causaban lentitud extrema
    const [{ data: initialDbAlbums }, { data: initialDbPhotos }] = await Promise.all([
      supabase.from('albums').select('*').eq('tenant_id', tenantId),
      supabase.from('photos').select('*').eq('tenant_id', tenantId),
    ]);

    const existingAlbumsMap = new Map<string, any>();
    (initialDbAlbums || []).forEach((a) => {
      existingAlbumsMap.set(a.drive_folder_id, a);
    });

    const existingPhotosMap = new Map<string, any>();
    (initialDbPhotos || []).forEach((p) => {
      existingPhotosMap.set(p.drive_file_id, p);
    });

    const visitedDriveFileIds = new Set<string>();
    const visitedDriveFolderIds = new Set<string>();

    // 3.2 VALIDACIÓN AUTOMÁTICA DE INTEGRIDAD EN R2:
    // Si existen fotos registradas en Supabase, verificamos si una muestra existe en Cloudflare R2.
    // Si el usuario eliminó manualmente la carpeta del tenant en Cloudflare R2 para hacer limpieza,
    // detectamos que R2 está vacío y activamos forceReupload para descargar y volver a subir todo desde Google Drive.
    let forceReupload = false;
    if (existingPhotosMap.size > 0) {
      const samplePhoto = existingPhotosMap.values().next().value;
      if (samplePhoto?.r2_key) {
        const sampleExists = await checkObjectExistsInR2(samplePhoto.r2_key);
        if (!sampleExists) {
          console.warn(`[Sync Tenant ${tenantId}] La foto de muestra (${samplePhoto.r2_key}) no existe en Cloudflare R2. Se detectó carpeta limpiada en R2 -> Forzando re-subida completa.`);
          forceReupload = true;
        }
      }
    }

    // 4. Recorrer árbol de carpetas a partir de catalog_folder_id
    const tenantSubdomain = tenant.subdomain || tenantId;

    await syncFolderRecursive({
      drive,
      supabase,
      tenantId,
      tenantSubdomain,
      logId,
      folderId: integration.catalog_folder_id,
      folderName: integration.catalog_folder_name || 'Catálogo Principal',
      parentId: null,
      parentPath: '',
      orderIndex: 0,
      maxPhotos: maxAllowedPhotos,
      maxBytes: maxAllowedStorageBytes,
      progress,
      existingAlbumsMap,
      existingPhotosMap,
      visitedDriveFileIds,
      visitedDriveFolderIds,
      forceReupload,
    });

    // 4.1 Sincronizar carpeta de portadas si está configurada
    if (integration.cover_folder_id) {
      await syncFolderRecursive({
        drive,
        supabase,
        tenantId,
        tenantSubdomain,
        logId,
        folderId: integration.cover_folder_id,
        folderName: integration.cover_folder_name || 'Portadas',
        parentId: null,
        parentPath: '_covers',
        orderIndex: 9999,
        maxPhotos: 500,
        maxBytes: maxAllowedStorageBytes,
        progress,
        existingAlbumsMap,
        existingPhotosMap,
        visitedDriveFileIds,
        visitedDriveFolderIds,
        forceReupload,
      });
    }

    // 4.2 Sincronización espejo de eliminaciones (Borrar en Supabase y R2 lo que fue eliminado en Google Drive)
    let deletedPhotosCount = 0;
    const deletedPhotoIds: string[] = [];
    const photosToDeleteR2Keys: string[] = [];

    existingPhotosMap.forEach((p, driveFileId) => {
      if (!visitedDriveFileIds.has(driveFileId)) {
        deletedPhotoIds.push(p.id);
        photosToDeleteR2Keys.push(p.r2_key);
      }
    });

    if (deletedPhotoIds.length > 0) {
      console.log(`[Sync Tenant ${tenantId}] Detectadas ${deletedPhotoIds.length} fotos eliminadas en Drive. Limpiando espejo...`);
      for (let i = 0; i < deletedPhotoIds.length; i += 100) {
        const batch = deletedPhotoIds.slice(i, i + 100);
        await supabase.from('photos').delete().in('id', batch);
      }
      for (const r2Key of photosToDeleteR2Keys) {
        await deleteObjectFromR2(r2Key).catch((e) =>
          console.warn(`Error eliminando de R2 (${r2Key}):`, e)
        );
      }
      deletedPhotosCount = deletedPhotoIds.length;
    }

    // Detectar álbumes eliminados en Drive
    const deletedAlbumIds: string[] = [];
    existingAlbumsMap.forEach((a, driveFolderId) => {
      if (!visitedDriveFolderIds.has(driveFolderId)) {
        deletedAlbumIds.push(a.id);
      }
    });

    if (deletedAlbumIds.length > 0) {
      console.log(`[Sync Tenant ${tenantId}] Detectados ${deletedAlbumIds.length} álbumes eliminados en Drive. Limpiando espejo...`);
      for (let i = 0; i < deletedAlbumIds.length; i += 50) {
        const batch = deletedAlbumIds.slice(i, i + 50);
        await supabase.from('albums').delete().in('id', batch);
      }
    }

    // Métricas exactas en tiempo real
    progress.photosCount = visitedDriveFileIds.size;
    progress.albumsCount = visitedDriveFolderIds.size;

    // 5. Actualizar métricas acumuladas del tenant y marcar log como completado
    await supabase
      .from('tenants')
      .update({
        current_photos_count: progress.photosCount,
        current_storage_bytes: (tenant.current_storage_bytes || 0) + progress.bytesUploaded,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenantId);

    await supabase
      .from('google_integrations')
      .update({
        last_synced_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId);

    // 5.1 Migrar claves de portadas en albums si apuntaban a rutas antiguas con subdominio
    if (tenantSubdomain) {
      const { data: oldCoverAlbums } = await supabase
        .from('albums')
        .select('id, cover_photo_r2_key')
        .eq('tenant_id', tenantId)
        .like('cover_photo_r2_key', `${tenantSubdomain}/%`);

      if (oldCoverAlbums && oldCoverAlbums.length > 0) {
        for (const alb of oldCoverAlbums) {
          if (alb.cover_photo_r2_key) {
            const migratedKey = alb.cover_photo_r2_key.replace(`${tenantSubdomain}/`, `tenants/${tenantId}/`);
            await supabase
              .from('albums')
              .update({ cover_photo_r2_key: migratedKey, updated_at: new Date().toISOString() })
              .eq('id', alb.id);
          }
        }
      }
    }

    if (logId) {
      await supabase
        .from('sync_logs')
        .update({
          status: 'completed',
          total_albums: progress.albumsCount,
          total_photos: progress.photosCount,
          items_processed: progress.newUploaded,
          completed_at: new Date().toISOString(),
        })
        .eq('id', logId);
    }

    // Revalidación ISR en Next.js y memoria RAM
    try {
      invalidateTenantCatalogCache(tenantId);
      if (tenant.subdomain) {
        invalidateTenantCatalogCache(tenant.subdomain);
      }
      revalidatePath('/', 'layout');
    } catch (e) {
      // Ignorar si se ejecuta fuera de contexto de request
    }

    // Purga inteligente en Cloudflare para el subdominio del tenant
    if (tenant.subdomain) {
      if (progress.newUploaded === 0 && deletedPhotosCount === 0 && deletedAlbumIds.length === 0) {
        console.log('[Sync] Sin cambios en fotos ni álbumes; espejo idéntico, caché CDN conservado intacto.');
      } else {
        // Al haber cualquier cambio (foto subida, editada o eliminada), purgar el subdominio completo del inquilino por Hostname.
        // La purga por Hostname limpia 100% de las rutas (/album, /album/, RSC, etc.) de forma aislada sin afectar a otras tiendas.
        // Además, gracias a la cola con batching en cloudflare.ts, múltiples tiendas concurrentes se agrupan en 1 sola llamada API.
        await purgeCloudflareCache({
          subdomain: tenant.subdomain,
          purgeAll: true,
        });
      }
    }

    return progress;
  } catch (error: any) {
    console.error(`[Sync Tenant ${tenantId}] Error fatal:`, error);
    if (logId) {
      await supabase
        .from('sync_logs')
        .update({
          status: 'failed',
          error_message: error.message || 'Error desconocido durante sync',
          completed_at: new Date().toISOString(),
        })
        .eq('id', logId);
    }
    throw error;
  }
}

interface RecursiveSyncParams {
  drive: drive_v3.Drive;
  supabase: ReturnType<typeof createAdminClient>;
  tenantId: string;
  tenantSubdomain: string;
  logId?: string;
  folderId: string;
  folderName: string;
  parentId: string | null;
  parentPath: string;
  orderIndex: number;
  maxPhotos: number;
  maxBytes: number;
  progress: SyncProgress;
  existingAlbumsMap: Map<string, any>;
  existingPhotosMap: Map<string, any>;
  visitedDriveFileIds: Set<string>;
  visitedDriveFolderIds: Set<string>;
  forceReupload?: boolean;
}

async function syncFolderRecursive({
  drive,
  supabase,
  tenantId,
  tenantSubdomain,
  logId,
  folderId,
  folderName,
  parentId,
  parentPath,
  orderIndex,
  maxPhotos,
  maxBytes,
  progress,
  existingAlbumsMap,
  existingPhotosMap,
  visitedDriveFileIds,
  visitedDriveFolderIds,
  forceReupload = false,
}: RecursiveSyncParams): Promise<void> {
  const currentSlug = slugify(folderName);
  const currentPath = parentPath ? `${parentPath}/${currentSlug}` : currentSlug;

  // Registrar carpeta visitada en el rastreador del espejo
  visitedDriveFolderIds.add(folderId);

  // 1. Guardar / actualizar álbum en Supabase verificando en memoria
  const existingAlbum = existingAlbumsMap.get(folderId);
  let albumId = existingAlbum?.id;

  if (existingAlbum) {
    const hasChanged =
      existingAlbum.name !== folderName ||
      existingAlbum.slug !== currentSlug ||
      existingAlbum.parent_id !== parentId ||
      existingAlbum.path !== currentPath ||
      existingAlbum.order_index !== orderIndex;

    if (hasChanged) {
      await supabase.from('albums').update({
        name: folderName,
        slug: currentSlug,
        parent_id: parentId,
        path: currentPath,
        order_index: orderIndex,
        updated_at: new Date().toISOString(),
      }).eq('id', albumId);

      existingAlbumsMap.set(folderId, {
        ...existingAlbum,
        name: folderName,
        slug: currentSlug,
        parent_id: parentId,
        path: currentPath,
        order_index: orderIndex,
      });
    }
  } else {
    const { data: newAlbum, error: albumError } = await supabase
      .from('albums')
      .insert({
        tenant_id: tenantId,
        drive_folder_id: folderId,
        name: folderName,
        slug: currentSlug,
        parent_id: parentId,
        path: currentPath,
        order_index: orderIndex,
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (albumError || !newAlbum) {
      console.error('Error guardando álbum:', albumError);
      return;
    }
    albumId = newAlbum.id;
    existingAlbumsMap.set(folderId, newAlbum);
  }

  const album = { id: albumId };

  // 2. Listar contenidos de esta carpeta en Google Drive con soporte para paginación completa (>100 archivos)
  let allFiles: drive_v3.Schema$File[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const res: any = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, md5Checksum, version)',
      pageSize: 1000,
      pageToken: pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (res.data.files && res.data.files.length > 0) {
      allFiles.push(...res.data.files);
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  const subfolders = allFiles.filter((f) => f.mimeType === 'application/vnd.google-apps.folder');
  const imageFiles = allFiles.filter((f) => f.mimeType?.startsWith('image/'));

  // Ordenar carpetas de forma natural por nombre (ej. 1 ABRIGOS, 2 CARTERAS, 3 Moda mujer, 4 Moda hombre)
  // para que coincida exactamente con la vista del explorador de Google Drive y no dependa de modifiedTime
  subfolders.sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', 'es', { numeric: true, sensitivity: 'base' })
  );

  // Ordenar fotos de forma natural por nombre (ej. CLQ101, CLQ102, etc.)
  imageFiles.sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', 'es', { numeric: true, sensitivity: 'base' })
  );

  // 3. Procesar imágenes directas a Cloudflare R2 sin Sharp con verificación instantánea en RAM
  let photoIndex = 0;
  for (const img of imageFiles) {
    if (!img.id || !img.name) continue;
    visitedDriveFileIds.add(img.id);

    // Verificar límite de fotos del plan
    if (visitedDriveFileIds.size > maxPhotos) {
      console.warn(`[Sync Tenant ${tenantId}] Límite de fotos del plan alcanzado (${maxPhotos}).`);
      break;
    }

    const ext = (img.name.split('.').pop() || 'jpg').toLowerCase();
    const rawFileName = img.name.substring(0, img.name.lastIndexOf('.')) || img.name;
    const cleanFileName = slugify(rawFileName);
    const isCover = parentPath === '_covers' || parentPath.startsWith('_covers/');
    const folderType = isCover ? 'portadas' : 'catalogo';

    const existingPhoto = existingPhotosMap.get(img.id);

    // Hash canónico de contenido de Google Drive (md5Checksum):
    // El md5Checksum de Google Drive es el hash criptográfico exacto del binario de la imagen.
    // Si no está disponible por alguna razón, se utiliza el timestamp modificado como fallback.
    const rawHash = (img as any).md5Checksum || (img.modifiedTime ? new Date(img.modifiedTime).getTime().toString() : 'v1');
    const contentHash = (img as any).md5Checksum ? (img as any).md5Checksum.slice(0, 12) : rawHash;

    // Clave inmutable versionada por hash en R2:
    // Si la foto se edita en Drive, el hash cambia -> nueva clave R2 -> nueva URL de Imgproxy -> caché de CDN/navegador actualizado de inmediato!
    const r2Key = `tenants/${tenantId}/${folderType}/${cleanFileName ? cleanFileName + '-' : ''}${img.id}-${contentHash}.${ext}`;

    // Comparar si el contenido binario no ha cambiado:
    // 1. Si existe md5_checksum en Supabase y en Drive, la comparación es exacta.
    // 2. Si no viene MD5, se compara por drive_modified_time (tolerancia de 1s).
    let isContentUnchanged = false;
    if ((img as any).md5Checksum && existingPhoto?.md5_checksum) {
      isContentUnchanged = existingPhoto.md5_checksum === (img as any).md5Checksum;
    } else if (existingPhoto?.drive_modified_time && img.modifiedTime) {
      const existingTime = new Date(existingPhoto.drive_modified_time).getTime();
      const driveTime = new Date(img.modifiedTime).getTime();
      isContentUnchanged = Math.abs(existingTime - driveTime) <= 1000;
    }

    const isUpToDate =
      !forceReupload &&
      existingPhoto &&
      isContentUnchanged &&
      existingPhoto.r2_key === r2Key &&
      existingPhoto.album_id === album.id &&
      existingPhoto.name === img.name;

    if (isUpToDate) {
      progress.skipped++;
      continue;
    }

    // Si el contenido binario no cambió pero cambió de nombre o de carpeta (álbum), actualizar solo en BD sin re-subir a R2
    if (!forceReupload && isContentUnchanged && existingPhoto && existingPhoto.r2_key === r2Key) {
      await supabase.from('photos').update({
        album_id: album.id,
        name: img.name,
        order_index: photoIndex++,
      }).eq('id', existingPhoto.id);

      existingPhotosMap.set(img.id, {
        ...existingPhoto,
        album_id: album.id,
        name: img.name,
      });
      progress.skipped++;
      continue;
    }

    try {
      // Descargar binario puro desde Google Drive
      const driveRes = await drive.files.get(
        { fileId: img.id, alt: 'media' },
        { responseType: 'arraybuffer' }
      );

      const buffer = Buffer.from(driveRes.data as ArrayBuffer);

      // Subir directo a Cloudflare R2 con la nueva clave versionada
      await uploadBufferToR2(r2Key, buffer, img.mimeType || 'image/jpeg');

      // Eliminar la versión anterior en R2 si la clave cambió (para no dejar basura huérfana en R2)
      if (existingPhoto?.r2_key && existingPhoto.r2_key !== r2Key) {
        await deleteObjectFromR2(existingPhoto.r2_key).catch((e) =>
          console.warn(`Error eliminando versión previa en R2 (${existingPhoto.r2_key}):`, e)
        );

        // Si la foto modificada era la portada de algún álbum, actualizar la referencia en albums
        await supabase
          .from('albums')
          .update({ cover_photo_r2_key: r2Key, updated_at: new Date().toISOString() })
          .eq('tenant_id', tenantId)
          .eq('cover_photo_r2_key', existingPhoto.r2_key);
      }

      // Guardar en la tabla photos de Supabase
      if (existingPhoto) {
        await supabase.from('photos').update({
          album_id: album.id,
          name: img.name,
          r2_key: r2Key,
          md5_checksum: rawHash,
          mime_type: img.mimeType || 'image/jpeg',
          size_bytes: buffer.length,
          drive_modified_time: img.modifiedTime,
          order_index: photoIndex++,
        }).eq('id', existingPhoto.id);

        existingPhotosMap.set(img.id, {
          ...existingPhoto,
          album_id: album.id,
          name: img.name,
          r2_key: r2Key,
          md5_checksum: rawHash,
          mime_type: img.mimeType || 'image/jpeg',
          size_bytes: buffer.length,
          drive_modified_time: img.modifiedTime,
        });
      } else {
        const { data: insertedPhoto } = await supabase.from('photos').insert({
          tenant_id: tenantId,
          album_id: album.id,
          drive_file_id: img.id,
          name: img.name,
          r2_key: r2Key,
          md5_checksum: rawHash,
          mime_type: img.mimeType || 'image/jpeg',
          size_bytes: buffer.length,
          drive_modified_time: img.modifiedTime,
          order_index: photoIndex++,
        }).select('*').single();

        if (insertedPhoto) {
          existingPhotosMap.set(img.id, insertedPhoto);
        }
      }

      progress.newUploaded++;
      progress.bytesUploaded += buffer.length;
      // Ruta pública relativa del álbum para purga exacta en Cloudflare (ej: "jeans" o "moda/blusas")
      const publicRelativePath = parentPath === '' ? '' : (parentPath.includes('/') ? `${parentPath.split('/').slice(1).join('/')}/${currentSlug}` : currentSlug);
      if (publicRelativePath && progress.modifiedAlbumPaths && !progress.modifiedAlbumPaths.includes(publicRelativePath)) {
        progress.modifiedAlbumPaths.push(publicRelativePath);
      }

      // Reportar progreso incremental en tiempo real en Supabase para el polling
      if (logId && progress.newUploaded % 5 === 0) {
        await supabase
          .from('sync_logs')
          .update({
            total_photos: visitedDriveFileIds.size,
            items_processed: progress.newUploaded,
            total_albums: visitedDriveFolderIds.size,
          })
          .eq('id', logId);
      }
    } catch (uploadErr) {
      console.error(`Error procesando foto ${img.name} (${img.id}):`, uploadErr);
    }
  }

  // 4. Procesar recursivamente subcarpetas
  let folderIndex = 0;
  for (const subfolder of subfolders) {
    if (!subfolder.id || !subfolder.name) continue;

    await syncFolderRecursive({
      drive,
      supabase,
      tenantId,
      tenantSubdomain,
      logId,
      folderId: subfolder.id,
      folderName: subfolder.name,
      parentId: album.id,
      parentPath: currentPath,
      orderIndex: folderIndex++,
      maxPhotos,
      maxBytes,
      progress,
      existingAlbumsMap,
      existingPhotosMap,
      visitedDriveFileIds,
      visitedDriveFolderIds,
      forceReupload,
    });
  }
}
