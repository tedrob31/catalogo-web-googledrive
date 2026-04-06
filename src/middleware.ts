import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const response = NextResponse.next();

    // Interceptar peticiones que solicita el App Router (peticiones _rsc)
    const isRSCRequest = request.nextUrl.searchParams.has('_rsc') || request.headers.has('RSC');

    if (isRSCRequest) {
        // 1. Eliminar cualquier caché persistente o "stale-while-revalidate" que Next.js intente poner por defecto.
        // 2. Obligar al navegador (Chrome/Safari) a NUNCA guardar el JSON en el "Disk Cache" (Disco Duro local).
        // De esta manera, cada click en un <Link> obliga a tocar la red real (bajando hasta Cloudflare).
        response.headers.set('Cache-Control', 'no-store, no-cache, max-age=0, must-revalidate, proxy-revalidate');
    } else {
        // Para el HTML estándar (la primera visita o al dar F5):
        // Permitimos que Cloudflare reciba la orden de cachear (s-maxage=86400 que es 1 día)
        // pero le decimos al navegador del usuario que NO guarde el HTML rígido (max-age=0).
        response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=86400, must-revalidate');
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Aplica el middleware a TODAS las rutas HTML y RSC del catálogo.
         * Ignoramos archivos estáticos pesados que SÍ queremos que se queden en el disco duro:
         * - _next/static (código compilado de JS y CSS base)
         * - _next/image (imágenes procesadas)
         * - archivos con extensiones directas (svg, png, jpg, ico)
         * - /api/ (los endpoints backend no necesitan esto)
         */
        '/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|webp|ico|gz)$).*)',
    ],
};
