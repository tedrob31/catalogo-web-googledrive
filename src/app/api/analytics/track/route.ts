import { NextRequest, NextResponse } from 'next/server';
import { recordMetricEvent } from '@/lib/analytics-buffer';
import { resolveTenantIdFromHost } from '@/lib/tenant-resolver';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { path, title, event_type } = body;
    const isUniqueDaily = event_type !== 'whatsapp' && body?.is_unique_daily === true;

    // El tenant se resuelve desde el Host y NUNCA desde el cuerpo: el endpoint es
    // anonimo, asi que un tenant declarado por el cliente permitiria inflar las
    // metricas de cualquier inquilino.
    const tenantId = await resolveTenantIdFromHost(req.headers.get('host'));

    if (!tenantId) {
      // Host desconocido (dominio raiz, reservado, IP o dominio no registrado):
      // se descarta en silencio, sin revelar si el tenant existe.
      return NextResponse.json({ ok: true });
    }

    recordMetricEvent(
      tenantId,
      path || '/',
      title || 'Catálogo Principal',
      event_type === 'whatsapp' ? 'whatsapp' : 'view',
      isUniqueDaily
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Analytics Track] Error:', error);
    return NextResponse.json({ error: 'Error procesando evento' }, { status: 500 });
  }
}
