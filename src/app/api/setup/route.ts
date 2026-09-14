import { NextResponse } from 'next/server';

// Endpoint deprecado: En la arquitectura SaaS Multi-Tenant la configuración y vinculación se realiza en /dashboard con Supabase y OAuth 2.0
export async function POST() {
    return NextResponse.json(
        { error: 'Endpoint deprecado. Usa el panel de inquilino en /dashboard.' },
        { status: 410 }
    );
}
