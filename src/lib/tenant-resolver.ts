import { createAdminClient } from '@/lib/supabase/admin';
import { tenantKeyFromHost } from '@/lib/tenant-host';

/**
 * Resuelve el id del tenant a partir del Host del request.
 *
 * El beacon de analitica es fire-and-forget y puede llegar muchas veces por
 * minuto, asi que el mapeo host -> tenant se cachea en memoria (aciertos y
 * fallos) para no golpear la base en cada vista de pagina.
 */

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

const hostCache = new Map<string, { tenantId: string | null; expiresAt: number }>();

export async function resolveTenantIdFromHost(rawHost: string | null | undefined): Promise<string | null> {
  const key = tenantKeyFromHost(rawHost);
  if (!key) return null;

  const now = Date.now();
  const cached = hostCache.get(key);
  if (cached && cached.expiresAt > now) return cached.tenantId;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('tenants')
    .select('id')
    .or(`subdomain.eq.${key},custom_domain.eq.${key}`)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    // No se cachea: un error persistente debe seguir siendo visible.
    console.error('[Tenant Resolver] No se pudo resolver el tenant desde el host:', error.message);
    return null;
  }

  const tenantId = data?.id ?? null;

  if (hostCache.size >= CACHE_MAX_ENTRIES) hostCache.clear();
  hostCache.set(key, { tenantId, expiresAt: now + CACHE_TTL_MS });

  return tenantId;
}
