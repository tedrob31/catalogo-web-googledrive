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

const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https: https://cdn.c4talogo.com https://img.c4talogo.com https://*.googleusercontent.com https://lh3.googleusercontent.com https://*.r2.cloudflarestorage.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https: wss: https://*.supabase.co wss://*.supabase.co https://accounts.google.com https://www.googleapis.com https://cdn.c4talogo.com https://img.c4talogo.com https://api.whatsapp.com https://wa.me",
  "frame-src 'self' https://accounts.google.com https://content.googleapis.com https://docs.google.com",
  "frame-ancestors 'self'",
  "form-action 'self' https://accounts.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "upgrade-insecure-requests",
].join('; ');

/**
 * Aplica encabezados estrictos de seguridad recomendados por OWASP / CASA
 */
function applySecurityHeaders(response: NextResponse) {
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=()');
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Content-Security-Policy', CSP_POLICY);
}

/**
 * Aplica los encabezados de caché garantizados para navegación fluida y Cloudflare Edge Caching
 */
function applyCacheHeaders(response: NextResponse, request: NextRequest) {
  applySecurityHeaders(response);

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
