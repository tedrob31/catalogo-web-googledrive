import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Next 16 renombro la convencion: middlewares -> proxy, y el export debe llamarse igual
// (o ser el export default). Este archivo rutea por hostname a los 9 inquilinos.
export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host')?.toLowerCase().split(':')[0] || 'localhost';
  const pathname = url.pathname;

  // 1. Omitir archivos estáticos e internos de Next.js
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    const response = NextResponse.next();
    applyCacheHeaders(response, request);
    return response;
  }

  // 2. Extraer subdominio
  const baseDomain = (process.env.NEXT_PUBLIC_BASE_DOMAIN || 'c4talogo.com').toLowerCase();
  let subdomain: string | null = null;

  if (hostname.endsWith(`.${baseDomain}`)) {
    subdomain = hostname.replace(`.${baseDomain}`, '');
  } else if (hostname.endsWith('.localhost')) {
    subdomain = hostname.replace('.localhost', '');
  }

  // 3. Enrutamiento según el tipo de host:

  // CASO A: Panel Maestro SuperAdmin (app.c4talogo.com)
  if (subdomain === 'app') {
    // Si la ruta solicitada es login u otra ruta global, servir directamente sin prefijo /superadmin
    if (
      pathname === '/login' ||
      pathname.startsWith('/login/') ||
      pathname === '/dashboard' ||
      pathname.startsWith('/dashboard/') ||
      pathname === '/privacy' ||
      pathname === '/terms'
    ) {
      const response = NextResponse.next();
      applyCacheHeaders(response, request);
      return response;
    }

    // Si entra a la raíz o a /superadmin, servir la vista del panel maestro
    if (pathname === '/' || pathname === '/superadmin') {
      url.pathname = '/superadmin';
    } else {
      url.pathname = `/superadmin${pathname}`;
    }

    const response = NextResponse.rewrite(url);
    applyCacheHeaders(response, request);
    return response;
  }

  // CASO B: Subdominio de Inquilino / Tenant Storefront (juanito.c4talogo.com)
  if (subdomain && subdomain !== 'www') {
    url.pathname = `/t/${subdomain}${pathname === '/' ? '' : pathname}`;
    const response = NextResponse.rewrite(url);
    applyCacheHeaders(response, request);
    return response;
  }

  // CASO C: Dominio Personalizado de Inquilino (ej. mitienda.pe)
  const isRootDomain =
    hostname === baseDomain ||
    hostname === `www.${baseDomain}` ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1';

  if (!isRootDomain) {
    // Si la solicitud llega por IP directa (ej. 217.216.90.115), dominios de infraestructura o dominios inválidos,
    // responder 404 inmediato para no enrutar a /t/ ni consultar la base de datos con bots/scanners.
    const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(':');
    const isInfrastructureHost =
      hostname.endsWith('r4tlabs.com') ||
      hostname.endsWith('ono.com') ||
      !hostname.includes('.');

    if (isIpAddress || isInfrastructureHost) {
      return new NextResponse('Not found', { status: 404 });
    }

    url.pathname = `/t/${hostname}${pathname === '/' ? '' : pathname}`;
    const response = NextResponse.rewrite(url);
    applyCacheHeaders(response, request);
    return response;
  }

  // CASO D: Dominio Raíz (c4talogo.com)
  // Sirve la landing page, login de usuarios y panel de inquilino (/dashboard)
  const response = NextResponse.next();
  applyCacheHeaders(response, request);
  return response;
}

/**
 * Los encabezados de seguridad (HSTS, CSP, X-Frame-Options, Permissions-Policy, etc.)
 * viven UNICAMENTE en next.config.ts, en `async headers()` con source '/(.*)'.
 *
 * Estaban duplicados aqui, caracter por caracter. Eran dos fuentes de verdad para el mismo
 * set: actualizar una desincronizaba la otra en silencio. Ademas la configuracion de Next los
 * aplica a toda respuesta, incluidas las que este proxy no matchea (assets estaticos), asi que
 * ahi la cobertura es mayor. Verificado: una respuesta reescrita por el proxy conserva su CSP.
 *
 * Aqui queda solo lo propio del proxy: los encabezados de cache.
 */
function applyCacheHeaders(response: NextResponse, request: NextRequest) {

  const isRSCRequest = request.nextUrl.searchParams.has('_rsc') || request.headers.has('RSC');

  if (isRSCRequest) {
    // Evita congelamientos al dar atrás/adelante en el navegador
    response.headers.set('Cache-Control', 'no-store, no-cache, max-age=0, must-revalidate, proxy-revalidate');
  } else {
    // El HTML dinámico se sirve en ~10ms desde la RAM de Next.js.
    // Obligamos a que el navegador y Cloudflare NO retengan HTML antiguo en memoria ni disco, forzando a recargar siempre la versión actual a 0ms.
    response.headers.set('Cache-Control', 'no-store, no-cache, max-age=0, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }
}

export const config = {
  matcher: [
    /*
     * Aplica a todas las rutas excepto archivos estáticos pesados
     */
    '/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|webp|ico|gz)$).*)',
  ],
};
