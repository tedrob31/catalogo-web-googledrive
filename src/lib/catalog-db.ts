import { createAdminClient } from '@/lib/supabase/admin';
import { ImgproxyProfiles } from '@/lib/imgproxy';
import { CacheStructure, Album, PhotoItem, findAlbumBySlugPath } from '@/lib/types';
import { AppConfig } from '@/lib/config';

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

  // 5. Construir árbol jerárquico de álbumes
  const albumMap = new Map<string, Album>();
  const folderCovers: Record<string, string> = {};

  for (const a of dbAlbums || []) {
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

  // Raíz virtual que agrupa los álbumes superiores
  const rootAlbum: Album = {
    id: `root_${tenant.id}`,
    name: rawConfig?.title || tenant.name || 'Catálogo',
    photos: photosByAlbum.get(`root_${tenant.id}`) || [],
    subAlbums: [],
  };

  for (const a of dbAlbums || []) {
    const albumObj = albumMap.get(a.id);
    if (!albumObj) continue;

    if (a.parent_id && albumMap.has(a.parent_id)) {
      albumMap.get(a.parent_id)!.subAlbums.push(albumObj);
    } else {
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
  let initialPath = [rootAlbum];
  if (slugs.length > 0) {
    const foundPath = findAlbumBySlugPath(rootAlbum, slugs);
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
