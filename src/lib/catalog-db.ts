import { cache } from 'react';
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

interface CachedTenantBase {
  tenant: {
    id: string;
    name: string;
    subdomain: string;
    custom_domain: string | null;
  };
  cacheStructure: CacheStructure;
  config: AppConfig;
  storefront?: StorefrontConfig;
  mainCatalogAlbum?: any;
  cachedAt: number;
}

// Caché en memoria RAM de alta velocidad en el servidor (TTL de 10 minutos con invalidación instantánea en sync)
const memoryCatalogCache = new Map<string, CachedTenantBase>();
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Invalida inmediatamente el catálogo en la memoria RAM del servidor.
 * Se invoca automáticamente al finalizar una sincronización o al guardar cambios de diseño/portada.
 */
export function invalidateTenantCatalogCache(tenantIdOrSubdomain?: string) {
  if (!tenantIdOrSubdomain) {
    memoryCatalogCache.clear();
    console.log('[Catalog Cache] Memoria caché de todos los tenants invalidada.');
    return;
  }
  for (const [key, entry] of memoryCatalogCache.entries()) {
    if (
      key === tenantIdOrSubdomain ||
      entry.tenant.id === tenantIdOrSubdomain ||
      entry.tenant.subdomain === tenantIdOrSubdomain
    ) {
      memoryCatalogCache.delete(key);
      console.log(`[Catalog Cache] Memoria caché invalidada para tenant: ${tenantIdOrSubdomain}`);
    }
  }
}

/**
 * Obtiene la estructura completa del catálogo del tenant desde la memoria RAM del servidor
 * o la construye desde Supabase si es la primera carga.
 */
async function loadTenantCatalogBase(subdomain: string): Promise<CachedTenantBase | null> {
  const cached = memoryCatalogCache.get(subdomain);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached;
  }

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

  // 4. Mapear fotos por álbum (URL unificada para grilla y lightbox = apertura instantánea a 0ms)
  const photosByAlbum = new Map<string, PhotoItem[]>();
  for (const p of dbPhotos || []) {
    const photoUrl = ImgproxyProfiles.catalog(p.r2_key);
    const item: PhotoItem = {
      id: p.id,
      name: p.name,
      thumbnailLink: photoUrl,
      fullLink: photoUrl, // Misma URL: lightbox abre de inmediato sin animación de carga
      width: p.width || 1080,
      height: p.height || 1080,
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
      order_index: a.order_index ?? 0,
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
    if (mainCatalogAlbum && a.id === mainCatalogAlbum.id) {
      continue;
    }

    const albumObj = albumMap.get(a.id);
    if (!albumObj) continue;

    if (mainCatalogAlbum && a.parent_id === mainCatalogAlbum.id) {
      rootAlbum.subAlbums.push(albumObj);
    } else if (a.parent_id && albumMap.has(a.parent_id)) {
      albumMap.get(a.parent_id)!.subAlbums.push(albumObj);
    } else if (!mainCatalogAlbum && a.parent_id === null) {
      rootAlbum.subAlbums.push(albumObj);
    }
  }

  // Ordenar subálbumes explícitamente por order_index (manteniendo exactamente el orden de Google Drive)
  const sortAlbumsRecursively = (alb: Album) => {
    alb.subAlbums.sort((x, y) => (x.order_index ?? 0) - (y.order_index ?? 0));
    alb.subAlbums.forEach(sortAlbumsRecursively);
  };
  sortAlbumsRecursively(rootAlbum);

  const cacheStructure: CacheStructure = {
    root: rootAlbum,
    lastSynced: new Date().toISOString(),
  };

  const rawSettings = (rawConfig?.settings as Record<string, any>) || {};

  const config: AppConfig = {
    rootFolderId: '',
    gridColumns: rawSettings.grid_columns || 5,
    mobileGridColumns: rawSettings.mobile_grid_columns || 2,
    primaryColor: rawConfig?.primary_color || '#111827',
    secondaryColor: rawSettings.secondary_color || '#ffffff',
    siteTitle: rawConfig?.title || tenant.name,
    siteDescription: rawConfig?.subtitle || undefined,
    logoUrl: rawConfig?.logo_url || undefined,
    favicon: rawConfig?.favicon_url || '',
    whatsappNumber: rawConfig?.whatsapp || undefined,
    theme: (rawConfig?.theme as any) || 'light',
    folderCovers,
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

  const result: CachedTenantBase = {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      custom_domain: tenant.custom_domain,
    },
    cacheStructure,
    config,
    mainCatalogAlbum,
    storefront: rawSettings.storefront || undefined,
    cachedAt: Date.now(),
  };

  // Guardar en la caché en memoria bajo el subdominio y el ID del tenant
  memoryCatalogCache.set(subdomain, result);
  if (tenant.subdomain) memoryCatalogCache.set(tenant.subdomain, result);
  if (tenant.id) memoryCatalogCache.set(tenant.id, result);

  return result;
}

/**
 * Carga la estructura completa de catálogo para un tenant.
 * - Envuelto en React.cache() para evitar doble ejecución entre generateMetadata y TenantCatalogPage en la misma petición.
 * - Usa memoria RAM del servidor para responder en ~10ms.
 */
export const loadTenantCatalog = cache(async (
  subdomain: string,
  slugs: string[] = []
): Promise<TenantCatalogPayload | null> => {
  const base = await loadTenantCatalogBase(subdomain);
  if (!base) {
    return null;
  }

  // 6. Resolver ruta inicial según los slugs de la URL en la memoria RAM (0ms)
  let resolvedSlugs = [...slugs];
  if (
    resolvedSlugs.length > 0 &&
    base.mainCatalogAlbum &&
    (resolvedSlugs[0] === slugify(base.mainCatalogAlbum.name) || resolvedSlugs[0] === base.mainCatalogAlbum.slug)
  ) {
    resolvedSlugs.shift();
  }

  let initialPath = [base.cacheStructure.root];
  if (resolvedSlugs.length > 0) {
    const foundPath = findAlbumBySlugPath(base.cacheStructure.root, resolvedSlugs);
    if (foundPath) {
      initialPath = foundPath;
    }
  }

  return {
    tenant: base.tenant,
    data: base.cacheStructure,
    config: base.config,
    initialPath,
    storefront: base.storefront,
  };
});
