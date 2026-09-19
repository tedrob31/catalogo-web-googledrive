import { createAdminClient } from '@/lib/supabase/admin';
import { ImgproxyProfiles } from '@/lib/imgproxy';
import { CacheStructure, Album, PhotoItem, findAlbumBySlugPath } from '@/lib/types';
import { AppConfig } from '@/lib/config';
import { slugify } from '@/lib/utils';
import { StorefrontConfig } from '@/lib/storefront';

export interface TenantCatalogPayload {
  tenant: {
    id: string;
    name: string;
    subdomain: string;
    custom_domain: string | null;
  };
  data: CacheStructure;
  config: AppConfig;
  initialPath: Album[];
  storefront?: StorefrontConfig;
}

/**
 * Carga la estructura completa de catálogo para un tenant desde Supabase
 * Genera URLs firmadas de Imgproxy para cada foto y portada.
 */
export async function loadTenantCatalog(
  subdomain: string,
  slugs: string[] = []
): Promise<TenantCatalogPayload | null> {
  const supabase = createAdminClient();

  // 1. Obtener tenant activo por subdominio o custom_domain
  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select(`
      id,
      name,
      subdomain,
      custom_domain,
      status,
      tenant_configs (
        title,
        subtitle,
        whatsapp,
        logo_url,
        favicon_url,
        primary_color,
        theme,
        settings,
        social_links
      )
    `)
    .or(`subdomain.eq.${subdomain},custom_domain.eq.${subdomain}`)
    .eq('status', 'active')
    .single();

  if (tenantErr || !tenant) {
    return null;
  }

  // 1.1 Obtener integración de Google Drive para identificar carpetas de catálogo y portadas
  const { data: integration } = await supabase
    .from('google_integrations')
    .select('catalog_folder_id, cover_folder_id')
    .eq('tenant_id', tenant.id)
    .maybeSingle();

  const rawConfig = Array.isArray(tenant.tenant_configs)
    ? tenant.tenant_configs[0]
    : tenant.tenant_configs;

  // 2. Obtener todos los álbumes del tenant
  const { data: dbAlbums } = await supabase
    .from('albums')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('order_index', { ascending: true })
    .order('name', { ascending: true });

  // Filtrar estrictamente: EXCLUIR cualquier carpeta de portadas (_covers) del catálogo público
  const catalogAlbums = (dbAlbums || []).filter(
    (a) =>
      !a.path?.startsWith('_covers') &&
      a.drive_folder_id !== integration?.cover_folder_id &&
      a.name.toLowerCase() !== 'portadas'
  );

  // 3. Obtener todas las fotos del tenant
  const { data: dbPhotos } = await supabase
    .from('photos')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('order_index', { ascending: true })
    .order('name', { ascending: true });

  // 4. Mapear fotos por álbum
  const photosByAlbum = new Map<string, PhotoItem[]>();
  for (const p of dbPhotos || []) {
    const item: PhotoItem = {
      id: p.id,
      name: p.name,
      thumbnailLink: ImgproxyProfiles.catalog(p.r2_key),
      fullLink: ImgproxyProfiles.lightbox(p.r2_key),
      width: p.width || 800,
      height: p.height || 800,
      modifiedTime: p.drive_modified_time || undefined,
    };

    if (!photosByAlbum.has(p.album_id)) {
      photosByAlbum.set(p.album_id, []);
    }
    photosByAlbum.get(p.album_id)!.push(item);
  }

  // 5. Construir árbol jerárquico de álbumes del catálogo
  const albumMap = new Map<string, Album>();
  const folderCovers: Record<string, string> = {};

  for (const a of catalogAlbums) {
    albumMap.set(a.id, {
      id: a.id,
      name: a.name,
      photos: photosByAlbum.get(a.id) || [],
      subAlbums: [],
    });

    if (a.cover_photo_r2_key) {
      folderCovers[a.id] = ImgproxyProfiles.cover(a.cover_photo_r2_key);
    }
  }

  // Identificar el álbum contenedor del catálogo (la carpeta principal "CATALOGO" configurada en Paso 2)
  const mainCatalogAlbum = catalogAlbums.find(
    (a) =>
      (integration?.catalog_folder_id && a.drive_folder_id === integration.catalog_folder_id) ||
      a.parent_id === null
  );

  // Raíz virtual del catálogo público:
  // Sus fotos son las fotos directas de la carpeta principal
  // Sus subálbumes son las subcarpetas del catálogo (ej. 0. ABRIGOS, 0. CARTERAS, Moda mujer, Moda hombre...)
  const rootAlbum: Album = {
    id: `root_${tenant.id}`,
    name: rawConfig?.title || tenant.name || 'Catálogo',
    photos: mainCatalogAlbum
      ? (photosByAlbum.get(mainCatalogAlbum.id) || [])
      : (photosByAlbum.get(`root_${tenant.id}`) || []),
    subAlbums: [],
  };

  for (const a of catalogAlbums) {
    // Si este álbum es el contenedor principal (ej. "CATALOGO"), no lo mostramos como tarjeta
    if (mainCatalogAlbum && a.id === mainCatalogAlbum.id) {
      continue;
    }

    const albumObj = albumMap.get(a.id);
    if (!albumObj) continue;

    if (mainCatalogAlbum && a.parent_id === mainCatalogAlbum.id) {
      // Es una carpeta de primer nivel dentro de CATALOGO -> va directamente a la raíz del catálogo público
      rootAlbum.subAlbums.push(albumObj);
    } else if (a.parent_id && albumMap.has(a.parent_id)) {
      // Es una subcarpeta anidada (ej. Blusas dentro de Moda mujer)
      albumMap.get(a.parent_id)!.subAlbums.push(albumObj);
    } else if (!mainCatalogAlbum && a.parent_id === null) {
      rootAlbum.subAlbums.push(albumObj);
    }
  }

  const cacheStructure: CacheStructure = {
    root: rootAlbum,
    lastSynced: new Date().toISOString(),
  };

  const rawSettings = (rawConfig?.settings as Record<string, any>) || {};

  const config: AppConfig = {
    rootFolderId: '',
    gridColumns: rawSettings.grid_columns || 5,
    mobileGridColumns: rawSettings.mobile_grid_columns || 2,
    siteTitle: rawConfig?.title || tenant.name,
    siteDescription: rawConfig?.subtitle || '',
    whatsappNumber: rawConfig?.whatsapp || '',
    logoUrl: rawConfig?.logo_url || '',
    favicon: rawConfig?.favicon_url || '',
    folderCovers: { ...folderCovers, ...(rawSettings.folder_covers || {}) },
    theme: (rawConfig?.theme as any) || 'light',
    primaryColor: rawConfig?.primary_color || '#111827',
    secondaryColor: rawSettings.secondary_color || '#ffffff',
    textColor: rawSettings.text_color || undefined,
    backgroundImage: rawSettings.background_image || undefined,
    seasonalEffect: rawSettings.seasonal_effect || 'none',
    seasonalCustomIcon: rawSettings.seasonal_custom_icon || undefined,
    seasonalDuration: rawSettings.seasonal_duration || 0,
    clickEffect: rawSettings.click_effect || 'none',
    hideAlbumTitles: rawSettings.hide_album_titles || false,
    cardBorderWidth: rawSettings.card_border_width || undefined,
    cardBorderColor: rawSettings.card_border_color || undefined,
    ogImage: rawSettings.og_image || undefined,
    forceGlobalOgImage: rawSettings.force_global_og_image || false,
  };

  // 6. Resolver ruta inicial según los slugs de la URL
  let resolvedSlugs = [...slugs];
  // Si la URL venía con el prefijo /catalogo (ej. /catalogo/0-abrigos o /catalogo), lo normalizamos
  if (
    resolvedSlugs.length > 0 &&
    mainCatalogAlbum &&
    (resolvedSlugs[0] === slugify(mainCatalogAlbum.name) || resolvedSlugs[0] === mainCatalogAlbum.slug)
  ) {
    resolvedSlugs.shift();
  }

  let initialPath = [rootAlbum];
  if (resolvedSlugs.length > 0) {
    const foundPath = findAlbumBySlugPath(rootAlbum, resolvedSlugs);
    if (foundPath) {
      initialPath = foundPath;
    }
  }

  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      custom_domain: tenant.custom_domain,
    },
    data: cacheStructure,
    config,
    initialPath,
    storefront: rawSettings.storefront || undefined,
  };
}
