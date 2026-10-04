import { NextRequest, NextResponse } from 'next/server';
import { recordMetricEvent } from '@/lib/analytics-buffer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { tenant_id, path, title, event_type } = body;

    if (!tenant_id || typeof tenant_id !== 'string') {
      return NextResponse.json({ error: 'tenant_id requerido' }, { status: 400 });
    }

    recordMetricEvent(
      tenant_id,
      path || '/',
      title || 'Catálogo Principal',
      event_type === 'whatsapp' ? 'whatsapp' : 'view'
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
