import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');
    const filenameParam = searchParams.get('filename') || 'foto.jpg';

    if (!imageUrl) {
      return NextResponse.json({ error: 'URL requerida' }, { status: 400 });
    }

    // 1. Validar que la URL pertenezca a dominios autorizados (prevención de SSRF)
    const parsed = new URL(imageUrl);
    const allowedHosts = [
      'cdn.c4talogo.com',
      'imgproxy.r4tlabs.com',
      'c4talogo.com',
    ];

    const isAllowed =
      allowedHosts.includes(parsed.hostname) ||
      parsed.hostname.endsWith('.c4talogo.com') ||
      parsed.hostname.endsWith('.r2.cloudflarestorage.com');

    if (!isAllowed) {
      return NextResponse.json({ error: 'Host no autorizado para descarga' }, { status: 403 });
    }

    // 2. Fetch directo en backend (sin restricciones de CORS de navegador)
    const upstream = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'c4talogo-downloader/1.0',
      },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Error al obtener imagen remota (${upstream.status})` },
        { status: upstream.status }
      );
    }

    // 3. Sanitizar y normalizar nombre de archivo
    let cleanFilename = filenameParam.replace(/[/\\?%*:|"<>]/g, '_').trim();
    if (!cleanFilename) cleanFilename = 'foto.jpg';
    if (!/\.[a-zA-Z0-9]{3,4}$/.test(cleanFilename)) {
      cleanFilename += '.jpg';
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';

    // 4. Servir stream binario directamente con Content-Disposition para forzar descarga inmediata
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${cleanFilename}"; filename*=UTF-8''${encodeURIComponent(cleanFilename)}`,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    console.error('[API Download] Error procesando descarga:', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}

