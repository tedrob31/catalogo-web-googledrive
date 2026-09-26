import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
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
 * Aplica los encabezados de caché garantizados para navegación fluida y Cloudflare Edge Caching
 */
function applyCacheHeaders(response: NextResponse, request: NextRequest) {
  const isRSCRequest = request.nextUrl.searchParams.has('_rsc') || request.headers.has('RSC');

  if (isRSCRequest) {
    // Evita congelamientos al dar atrás/adelante en el navegador
    response.headers.set('Cache-Control', 'no-store, no-cache, max-age=0, must-revalidate, proxy-revalidate');
  } else {
    // El HTML dinámico se sirve en ~10ms desde la RAM de Next.js.
    // Obligamos a que el navegador y Cloudflare no retengan HTML antiguo en su Edge, permitiendo ver cambios al instante (0s).
    response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
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
