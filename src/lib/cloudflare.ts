/**
 * Opciones para la purga inteligente en Cloudflare API v4
 */
export interface CloudflarePurgeOptions {
  subdomain?: string;
  urls?: string[]; // Lista de URLs o paths específicos (ej: ['/', '/album/verano'])
  purgeAll?: boolean; // Forzar purga total del subdominio o de la zona
  threshold?: number; // Umbral para decidir entre purga puntual o por host (por defecto: 5)
}

/**
 * Purga de caché inteligente en Cloudflare API v4
 * 
 * Estrategia Híbrida:
 * - Si se especifican pocas URLs (<= threshold):
 *   -> Se usa `files: [...]` para purgar SOLO las rutas afectadas sin tocar el resto del caché.
 * - Si son muchos cambios (> threshold) o `purgeAll: true`:
 *   -> Si hay subdominio: purga todo el subdominio `{ hosts: [tenantHost] }` (disponible en Free).
 *   -> Si no hay subdominio: purga la zona completa `{ purge_everything: true }`.
 */
export async function purgeCloudflareCache(optionsOrSubdomain?: string | CloudflarePurgeOptions) {
  const cfZoneId = process.env.CLOUDFLARE_ZONE_ID;
  const cfToken = process.env.CLOUDFLARE_API_TOKEN;
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'c4talogo.com';

  if (!cfZoneId || !cfToken) {
    return;
  }

  // Compatibilidad hacia atrás: acepta string (subdomain) o CloudflarePurgeOptions
  const options: CloudflarePurgeOptions = typeof optionsOrSubdomain === 'string'
    ? { subdomain: optionsOrSubdomain }
    : (optionsOrSubdomain || {});

  const { subdomain, urls = [], purgeAll = false, threshold = 5 } = options;

  try {
    let payload: Record<string, any>;
    const tenantHost = subdomain ? `${subdomain}.${baseDomain}` : null;

    // CASO 1: Purga selectiva de pocas URLs específicas (files)
    if (!purgeAll && urls.length > 0 && urls.length <= threshold) {
      const fullUrls = urls.map((u) => {
        if (u.startsWith('http://') || u.startsWith('https://')) {
          return u;
        }
        const host = tenantHost || baseDomain;
        const normalizedPath = u.startsWith('/') ? u : `/${u}`;
        return `https://${host}${normalizedPath}`;
      });

      payload = { files: fullUrls };
      console.log(`[Cloudflare Purge] Purga selectiva (${fullUrls.length} URLs):`, fullUrls);
    } 
    // CASO 2: Purga masiva por Hostname (subdominio completo del inquilino)
    else if (tenantHost) {
      payload = { hosts: [tenantHost] };
      console.log(`[Cloudflare Purge] Purga masiva por Hostname: ${tenantHost}`);
    } 
    // CASO 3: Purga global de la zona completa
    else {
      payload = { purge_everything: true };
      console.log('[Cloudflare Purge] Purga de zona completa...');
    }

    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/purge_cache`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!data.success) {
      console.warn(`[Cloudflare Purge] Advertencia al purgar caché:`, data.errors);
      // Fallback: Si falló porque "hosts" requiere plan Enterprise, reintentar con purge_everything (soportado en plan Free)
      const isEnterpriseError = data.errors?.some((e: any) =>
        e.code === 1000 ||
        String(e.message || '').toLowerCase().includes('enterprise')
      );
      if (isEnterpriseError) {
        console.log('[Cloudflare Purge] Fallback a purga de zona completa (purge_everything: true)...');
        await fetch(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/purge_cache`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cfToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ purge_everything: true }),
        });
      }
    } else {
      console.log(`[Cloudflare Purge] Caché purgada exitosamente.`);
    }
  } catch (err) {
    console.error('[Cloudflare Purge] Error ejecutando purga en Cloudflare:', err);
  }
}
