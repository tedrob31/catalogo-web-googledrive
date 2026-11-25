/**
 * Traduce un header Host al identificador canonico de un tenant.
 *
 * Vive en su propio modulo, sin dependencias, para poder ejercitarlo con casos
 * concretos sin levantar la app.
 *
 * El tenant NO se toma nunca del cuerpo del request: un visitante anonimo podria
 * declarar cualquier tenant. El Host es lo unico que el visitante no elige
 * libremente al navegar una tienda.
 */

/** Dominios de infraestructura (Traefik, health checks): nunca son tiendas. */
const INFRA_HOST_SUFFIXES = ['r4tlabs.com', 'ono.com'];

/** Subdominios reservados por la plataforma. `app` es el panel de superadmin. */
const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'localhost']);

/**
 * Hostname valido: etiquetas alfanumericas separadas por puntos.
 * Es una barrera de seguridad, no cosmetica: el valor se interpola en un filtro
 * PostgREST (`.or(...)`), y caracteres como `,` o parentesis permitirian inyectar
 * condiciones adicionales en esa consulta.
 */
const VALID_HOST = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;

/**
 * Valida que una clave de tenant (subdominio o dominio propio) sea estrictamente un
 * hostname/etiqueta desnudo, seguro para interpolar en filtros PostgREST (`.or(...)`).
 */
export function isValidTenantKey(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false;
  return VALID_HOST.test(value);
}

function isIpAddress(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':');
}

/**
 * Devuelve la clave del tenant tal como se guarda en la tabla `tenants`
 * (el subdominio, o el hostname completo cuando es un dominio propio), o null
 * cuando el host no puede corresponder a una tienda.
 */
export function tenantKeyFromHost(rawHost: string | null | undefined): string | null {
  const hostname = (rawHost || '').toLowerCase().split(':')[0].trim();

  if (!hostname || !hostname.includes('.') || isIpAddress(hostname)) return null;
  if (!VALID_HOST.test(hostname)) return null;

  const baseDomain = (process.env.NEXT_PUBLIC_BASE_DOMAIN || 'c4talogo.com').toLowerCase();

  // Dominio raiz de la plataforma: landing y login, no una tienda.
  if (hostname === baseDomain || hostname === `www.${baseDomain}`) return null;
  if (hostname === 'localhost') return null;

  // En desarrollo las tiendas se sirven como <subdominio>.localhost, tal como
  // src/proxy.ts las reescribe a /t/<subdominio>. No existe ningun dominio publico
  // terminado en .localhost, asi que esto solo puede afectar al entorno local.
  if (hostname.endsWith('.localhost')) {
    const subdomain = hostname.slice(0, -'.localhost'.length);
    if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) return null;
    return subdomain;
  }
  if (INFRA_HOST_SUFFIXES.some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`))) return null;

  if (hostname.endsWith(`.${baseDomain}`)) {
    const subdomain = hostname.slice(0, -(baseDomain.length + 1));
    if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) return null;
    return subdomain;
  }

  // Dominio propio: el hostname completo es la clave en tenants.custom_domain.
  return hostname;
}
