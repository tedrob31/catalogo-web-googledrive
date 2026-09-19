import { createAdminClient } from '@/lib/supabase/admin';
import { getDriveClientForTenant } from '@/lib/google-auth';
import { uploadBufferToR2, checkObjectExistsInR2 } from '@/lib/r2';
import { slugify } from '@/lib/utils';
import { drive_v3 } from 'googleapis';
import { revalidatePath } from 'next/cache';
import { purgeCloudflareCache } from '@/lib/cloudflare';

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
      });
    }

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

    // Revalidación ISR en Next.js
    try {
      revalidatePath('/', 'layout');
    } catch (e) {
      // Ignorar si se ejecuta fuera de contexto de request
    }

    // Purga inteligente en Cloudflare para el subdominio del tenant
    if (tenant.subdomain) {
      if (progress.newUploaded === 0) {
        console.log('[Sync] Sin cambios en fotos; caché CDN conservado intacto.');
      } else if (progress.newUploaded <= 5 && progress.modifiedAlbumPaths && progress.modifiedAlbumPaths.length <= 3) {
        // Pocos cambios: purgar selectivamente solo las URLs de álbumes afectados y la home
        const affectedUrls = [
          '/',
          `/api/storefront?subdomain=${tenant.subdomain}`,
          ...progress.modifiedAlbumPaths.map((p) => `/${p}`),
        ];
        await purgeCloudflareCache({
          subdomain: tenant.subdomain,
          urls: affectedUrls,
          threshold: 5,
        });
      } else {
        // Muchos cambios (> 5 fotos o varios álbumes): purga total del subdominio por Hostname
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
}: RecursiveSyncParams): Promise<void> {
  const currentSlug = slugify(folderName);
  const currentPath = parentPath ? `${parentPath}/${currentSlug}` : currentSlug;

  // 1. Guardar / actualizar álbum en Supabase buscando por folderId
  const { data: existingAlbum } = await supabase
    .from('albums')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('drive_folder_id', folderId)
    .maybeSingle();

  let albumId = existingAlbum?.id;

  if (albumId) {
    await supabase.from('albums').update({
      name: folderName,
      slug: currentSlug,
      parent_id: parentId,
      path: currentPath,
      order_index: orderIndex,
      updated_at: new Date().toISOString(),
    }).eq('id', albumId);
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
  }

  const album = { id: albumId };

  progress.albumsCount++;

  // 2. Listar contenidos de esta carpeta en Google Drive
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, size, modifiedTime)',
    pageSize: 100,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const files = res.data.files || [];
  const subfolders = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
  const imageFiles = files.filter(f => f.mimeType?.startsWith('image/'));

  // 3. Procesar imágenes directas a Cloudflare R2 sin Sharp
  let photoIndex = 0;
  for (const img of imageFiles) {
    if (!img.id || !img.name) continue;

    // Verificar límite de fotos del plan
    if (progress.photosCount >= maxPhotos) {
      console.warn(`[Sync Tenant ${tenantId}] Límite de fotos del plan alcanzado (${maxPhotos}).`);
      break;
    }

    const ext = (img.name.split('.').pop() || 'jpg').toLowerCase();
    const rawFileName = img.name.substring(0, img.name.lastIndexOf('.')) || img.name;
    const cleanFileName = slugify(rawFileName);
    const isCover = parentPath === '_covers' || parentPath.startsWith('_covers/');
    const folderType = isCover ? 'portadas' : 'catalogo';

    // Ruta inmutable por ID único del Tenant: ej. tenants/f8fe9291-.../catalogo/polo-y-short-hombre-1OYFFR25.jpg
    // Garantiza que si el usuario cambia el nombre comercial o subdominio, los archivos en R2 siguen siendo 100% válidos
    const r2Key = `tenants/${tenantId}/${folderType}/${cleanFileName ? cleanFileName + '-' : ''}${img.id}.${ext}`;

    // Verificar si ya existe en la base de datos con la misma fecha de modificación
    const { data: existingPhoto } = await supabase
      .from('photos')
      .select('id, drive_modified_time')
      .eq('tenant_id', tenantId)
      .eq('drive_file_id', img.id)
      .single();

    const isUpToDate = existingPhoto && existingPhoto.drive_modified_time === img.modifiedTime;

    if (isUpToDate) {
      progress.skipped++;
      progress.photosCount++;
      continue;
    }

    try {
      // Descargar binario puro desde Google Drive
      const driveRes = await drive.files.get(
        { fileId: img.id, alt: 'media' },
        { responseType: 'arraybuffer' }
      );

      const buffer = Buffer.from(driveRes.data as ArrayBuffer);

      // Subir directo a Cloudflare R2
      await uploadBufferToR2(r2Key, buffer, img.mimeType || 'image/jpeg');

      // Guardar en la tabla photos de Supabase
      if (existingPhoto) {
        await supabase.from('photos').update({
          album_id: album.id,
          name: img.name,
          r2_key: r2Key,
          mime_type: img.mimeType || 'image/jpeg',
          size_bytes: buffer.length,
          drive_modified_time: img.modifiedTime,
          order_index: photoIndex++,
        }).eq('id', existingPhoto.id);
      } else {
        await supabase.from('photos').insert({
          tenant_id: tenantId,
          album_id: album.id,
          drive_file_id: img.id,
          name: img.name,
          r2_key: r2Key,
          mime_type: img.mimeType || 'image/jpeg',
          size_bytes: buffer.length,
          drive_modified_time: img.modifiedTime,
          order_index: photoIndex++,
        });
      }

      progress.newUploaded++;
      progress.photosCount++;
      progress.bytesUploaded += buffer.length;
      if (progress.modifiedAlbumPaths && !progress.modifiedAlbumPaths.includes(currentPath)) {
        progress.modifiedAlbumPaths.push(currentPath);
      }

      // Reportar progreso incremental en tiempo real en Supabase para el polling
      if (logId && progress.photosCount % 5 === 0) {
        await supabase
          .from('sync_logs')
          .update({
            total_photos: progress.photosCount,
            items_processed: progress.newUploaded,
            total_albums: progress.albumsCount,
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
    });
  }
}
