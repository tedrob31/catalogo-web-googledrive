import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-pathname', request.nextUrl.pathname);

    // RESTORED: Define sensitive paths/methods that require authentication
    const path = request.nextUrl.pathname;
    const isSensitiveApi = (
        (path.startsWith('/api/config') && request.method === 'POST') ||
        (path.startsWith('/api/sync') && request.method === 'POST')
    );

    if (isSensitiveApi) {
        const session = request.cookies.get('admin_session');
        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }
    }

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|images|favicon.ico).*)'],
};
