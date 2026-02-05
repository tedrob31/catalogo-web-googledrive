import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const { username, password } = await request.json();

    const adminUser = process.env.ADMIN_USER;
    const adminPass = process.env.ADMIN_PASS;

    if (username === adminUser && password === adminPass) {
        // In a real app, set a cookie. Here we just return success and let client handle state,
        // or set a simple cookie for middleware protection if we were using middleware.
        // For "Login simple", client-side state after this success is often enough for the scope,
        // but a cookie is better for persistence.
        // We'll set a cookie manually.
        const response = NextResponse.json({ success: true });
        response.cookies.set('admin_session', 'authenticated', { httpOnly: true, path: '/' });
        return response;
    }

    return NextResponse.json({ success: false }, { status: 401 });
}
