import { NextResponse } from 'next/server';

// En SaaS Multi-Tenant, las métricas y analytics de inquilinos se consultan vía Supabase y Dashboard
export async function GET() {
    return NextResponse.json({
        activeUsers: [],
        topPages: [],
        message: 'Endpoint de analíticas integrado en el Panel Maestro SuperAdmin.'
    });
}
