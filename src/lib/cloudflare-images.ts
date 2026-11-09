import { getR2PublicDomain } from './r2';

export interface CloudflareImageOptions {
  width?: number;
  height?: number;
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
  gravity?: 'auto' | 'side' | 'left' | 'right' | 'top' | 'bottom';
  quality?: number;
  format?: 'auto' | 'avif' | 'webp' | 'json';
  metadata?: 'keep' | 'copyright' | 'none';
  onerror?: 'redirect';
}

/**
 * Genera la URL optimizada servida directamente por Cloudflare Image Resizing
 * sobre el dominio personalizado del bucket R2 (ej. cdn.c4talogo.com).
 *
 * Estructura estándar de Cloudflare:
 * https://<CDN_DOMAIN>/cdn-cgi/image/<OPCIONES>/<R2_KEY>
 */
export function buildCloudflareImageUrl(
  r2Key: string,
  options: CloudflareImageOptions = {}
): string {
  if (!r2Key) return '';

  const cdnDomain = getR2PublicDomain();
  const cleanKey = r2Key.startsWith('/') ? r2Key.slice(1) : r2Key;
  // Codificar de forma segura segmentos que contengan caracteres especiales o espacios
  const encodedKey = cleanKey
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');

  const {
    width,
    height,
    fit = 'scale-down',
    gravity,
    quality = 85,
    format = 'auto',
    metadata = 'none',
    onerror = 'redirect',
  } = options;

  const parts: string[] = [];

  if (width && width > 0) parts.push(`width=${width}`);
  if (height && height > 0) parts.push(`height=${height}`);
  if (fit) parts.push(`fit=${fit}`);
  if (gravity) parts.push(`gravity=${gravity}`);
  if (quality) parts.push(`quality=${quality}`);
  if (format) parts.push(`format=${format}`);
  if (metadata) parts.push(`metadata=${metadata}`);
  if (onerror) parts.push(`onerror=${onerror}`);

  const optionsStr = parts.join(',');

  return `${cdnDomain}/cdn-cgi/image/${optionsStr}/${encodedKey}`;
}

/**
 * Perfiles optimizados de alto rendimiento para el catálogo y tiendas
 */
export const CloudflareImageProfiles = {
  // Miniatura para navegación ultrarrápida / selectores (300x300, AVIF/WebP ~5-10 KB)
  thumbnail: (r2Key: string) =>
    buildCloudflareImageUrl(r2Key, {
      width: 300,
      height: 300,
      fit: 'cover',
      gravity: 'auto',
      quality: 80,
      format: 'auto',
    }),

  // Miniatura optimizada para las tarjetas de la grilla del catálogo (800px ancho, móvil Retina, AVIF/WebP ~15-30 KB)
  grid: (r2Key: string) =>
    buildCloudflareImageUrl(r2Key, {
      width: 800,
      fit: 'scale-down',
      quality: 85,
      format: 'auto',
    }),

  // Portada cuadrada para carpetas y álbumes con smart-crop centrado (600x600)
  cover: (r2Key: string) =>
    buildCloudflareImageUrl(r2Key, {
      width: 600,
      height: 600,
      fit: 'cover',
      gravity: 'auto',
      quality: 85,
      format: 'auto',
    }),

  // Imagen estándar de alta definición (Retina crisp, 1600px)
  catalog: (r2Key: string) =>
    buildCloudflareImageUrl(r2Key, {
      width: 1600,
      fit: 'scale-down',
      quality: 85,
      format: 'auto',
    }),

  // Vista ampliada en lightbox / zoom completo
  lightbox: (r2Key: string) =>
    buildCloudflareImageUrl(r2Key, {
      width: 1920,
      fit: 'scale-down',
      quality: 85,
      format: 'auto',
    }),

  // Fondo de pantalla fija (wallpaper) optimizado para alta fidelidad móvil y desktop (~100-150 kB)
  wallpaper: (r2Key: string) =>
    buildCloudflareImageUrl(r2Key, {
      width: 1920,
      fit: 'cover',
      gravity: 'auto',
      quality: 80,
      format: 'auto',
    }),

  // URL original directa sin transformación (fallback directo desde R2)
  raw: (r2Key: string) => {
    if (!r2Key) return '';
    const cdnDomain = getR2PublicDomain();
    const cleanKey = r2Key.startsWith('/') ? r2Key.slice(1) : r2Key;
    const encodedKey = cleanKey
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/');
    return `${cdnDomain}/${encodedKey}`;
  },
};

/**
 * Optimiza cualquier URL de fondo (incluso si fue guardada previamente como miniatura de portada cuadrada)
 * para que se entregue a través de Cloudflare Image Resizing en calidad wallpaper HD.
 */
export function optimizeWallpaperUrl(url?: string): string {
  if (!url) return '';
  // Si no pertenece a nuestro CDN de Cloudflare R2, devolver tal cual
  const cdnDomain = getR2PublicDomain();
  if (!url.includes(cdnDomain) && !url.includes('/cdn-cgi/image/')) {
    return url;
  }

  // Extraer la clave relativa de R2 (después de cdn-cgi/image/... o del dominio)
  let r2Key = '';
  if (url.includes('/cdn-cgi/image/')) {
    const parts = url.split('/cdn-cgi/image/');
    if (parts.length > 1) {
      // Eliminar las opciones previas (ej. "width=600,height=600,fit=cover/")
      const afterCdnCgi = parts[1];
      const firstSlash = afterCdnCgi.indexOf('/');
      if (firstSlash !== -1) {
        r2Key = decodeURIComponent(afterCdnCgi.substring(firstSlash + 1));
      }
    }
  } else {
    try {
      const parsed = new URL(url);
      r2Key = decodeURIComponent(parsed.pathname.startsWith('/') ? parsed.pathname.slice(1) : parsed.pathname);
    } catch {
      r2Key = url;
    }
  }

  if (r2Key) {
    return CloudflareImageProfiles.wallpaper(r2Key);
  }

  return url;
}

export const ImageProfiles = CloudflareImageProfiles;
