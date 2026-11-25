import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getConfiguredMediaHosts(): Set<string> {
  const hosts = new Set<string>([
    'cdn.c4talogo.com',
    'img.c4talogo.com',
    'imgproxy.r4tlabs.com',
    'c4talogo.com',
  ]);

  for (const envVal of [
    process.env.R2_PUBLIC_DOMAIN,
    process.env.NEXT_PUBLIC_CDN_URL,
    process.env.IMGPROXY_URL,
  ]) {
    if (!envVal) continue;
    try {
      hosts.add(new URL(envVal).hostname.toLowerCase());
    } catch {
      // Ignorar URL malformada en entorno
    }
  }
  return hosts;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');
    const filenameParam = searchParams.get('filename') || 'foto.jpg';

    if (!imageUrl) {
      return NextResponse.json({ error: 'URL requerida' }, { status: 400 });
    }

    // 1. Validar protocolo HTTPS y host estrictamente autorizado (prevención de SSRF)
    let parsed: URL;
    try {
      parsed = new URL(imageUrl);
    } catch {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
    }

    if (parsed.protocol !== 'https:') {
      return NextResponse.json({ error: 'Solo se permiten descargas por HTTPS' }, { status: 403 });
    }

    const hostname = parsed.hostname.toLowerCase();
    const allowedHosts = getConfiguredMediaHosts();
    const isAllowed = allowedHosts.has(hostname) || hostname.endsWith('.c4talogo.com');

    if (!isAllowed) {
      return NextResponse.json({ error: 'Host no autorizado para descarga' }, { status: 403 });
    }

    // 2. Fetch directo en backend sin seguir redirecciones externas (evita bypass de SSRF)
    const upstream = await fetch(parsed.toString(), {
      redirect: 'error',
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

    const rawContentType = (upstream.headers.get('content-type') || 'image/jpeg').split(';')[0].trim().toLowerCase();
    if (!rawContentType.startsWith('image/') && rawContentType !== 'application/octet-stream') {
      return NextResponse.json({ error: 'El recurso remoto no corresponde a una imagen válida' }, { status: 415 });
    }

    // 3. Sanitizar y normalizar nombre de archivo (incluyendo caracteres de control \r\n)
    let cleanFilename = filenameParam.replace(/[\x00-\x1f\x7f/\\?%*:|"<>]/g, '_').trim();
    if (!cleanFilename) cleanFilename = 'foto.jpg';
    if (!/\.[a-zA-Z0-9]{3,4}$/.test(cleanFilename)) {
      cleanFilename += '.jpg';
    }

    // 4. Servir stream binario directamente con Content-Disposition para forzar descarga inmediata
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': rawContentType,
        'Content-Disposition': `attachment; filename="${cleanFilename}"; filename*=UTF-8''${encodeURIComponent(cleanFilename)}`,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('[API Download] Error procesando descarga:', err);
    return NextResponse.json({ error: 'Error interno al procesar la descarga' }, { status: 500 });
  }
}
