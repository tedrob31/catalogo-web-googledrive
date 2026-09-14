import { NextResponse } from 'next/server';

// Endpoint deprecado: En la arquitectura SaaS Multi-Tenant las imágenes se sirven directamente a través de Imgproxy y Cloudflare R2
export async function GET() {
    return NextResponse.json(
        { error: 'Endpoint deprecado. Las imágenes se procesan mediante Imgproxy y Cloudflare R2.' },
        { status: 410 }
    );
}
