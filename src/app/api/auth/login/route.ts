import { NextResponse } from 'next/server';

// Endpoint deprecado: La autenticación se realiza de forma segura mediante Supabase Auth en /login
export async function POST() {
    return NextResponse.json(
        { error: 'Endpoint deprecado. Inicia sesión en /login mediante Supabase Auth.' },
        { status: 410 }
    );
}
