import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Define sensitive paths/methods that require authentication
    const isSensitiveApi = (
        (path.startsWith('/api/config') && request.method === 'POST') ||
        (path.startsWith('/api/sync') && request.method === 'POST') ||
        (path.startsWith('/api/upload') && request.method === 'POST')
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

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/api/config',
        '/api/sync',
        '/api/upload',
    ],
};
