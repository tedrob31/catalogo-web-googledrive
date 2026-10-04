import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // 1. Obtener el tenant del usuario autenticado
    const { data: membership } = await adminSupabase
      .from('tenant_users')
      .select('tenant_id, role, tenants (id, name, subdomain)')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership || !membership.tenant_id) {
      return NextResponse.json({ error: 'No tienes una tienda asignada' }, { status: 403 });
    }

    const tenantId = membership.tenant_id;
    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // 2. Consultar métricas de los últimos 30 días
    const { data: rows, error: metricsErr } = await adminSupabase
      .from('tenant_page_metrics')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('date', startDate)
      .order('date', { ascending: true });

    if (metricsErr) {
      console.error('[Analytics GET Error]:', metricsErr);
      return NextResponse.json({ error: metricsErr.message }, { status: 500 });
    }

    // 3. Procesar y agregar datos para el dashboard
    let totalViews = 0;
    let totalWhatsapp = 0;
    const dailyMap = new Map<string, { views: number; whatsapp: number }>();
    const contentMap = new Map<string, { path: string; title: string; views: number; whatsapp: number }>();

    // Inicializar los últimos 30 días en el mapa para que la gráfica no tenga huecos
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dStr = d.toISOString().split('T')[0];
      dailyMap.set(dStr, { views: 0, whatsapp: 0 });
    }

    for (const r of rows || []) {
      totalViews += r.views_count || 0;
      totalWhatsapp += r.whatsapp_clicks || 0;

      // Agregación diaria
      const dayData = dailyMap.get(r.date) || { views: 0, whatsapp: 0 };
      dayData.views += r.views_count || 0;
      dayData.whatsapp += r.whatsapp_clicks || 0;
      dailyMap.set(r.date, dayData);

      // Agregación por contenido / álbum
      const contentKey = r.path || '/';
      const cData = contentMap.get(contentKey) || {
        path: contentKey,
        title: r.title || contentKey,
        views: 0,
        whatsapp: 0,
      };
      cData.views += r.views_count || 0;
      cData.whatsapp += r.whatsapp_clicks || 0;
      if (r.title && r.title !== 'Catálogo Principal') {
        cData.title = r.title;
      }
      contentMap.set(contentKey, cData);
    }

    // Formatear array de tendencia diaria para Recharts
    const dailyTrend = Array.from(dailyMap.entries()).map(([dateStr, val]) => {
      const parts = dateStr.split('-');
      const shortDate = `${parts[2]}/${parts[1]}`;
      return {
        date: dateStr,
        shortDate,
        views: val.views,
        whatsapp: val.whatsapp,
      };
    });

    // Formatear array de contenidos más populares ordenados por visitas
    const topContent = Array.from(contentMap.values())
      .sort((a, b) => b.views - a.views)
      .slice(0, 15);

    const conversionRate = totalViews > 0 ? ((totalWhatsapp / totalViews) * 100).toFixed(1) : '0.0';

    return NextResponse.json({
      success: true,
      tenant: membership.tenants,
      periodDays: 30,
      summary: {
        totalViews,
        totalWhatsapp,
        conversionRate: parseFloat(conversionRate),
        topPage: topContent[0]?.title || 'Ninguna aún',
      },
      dailyTrend,
      topContent,
    });
  } catch (error: any) {
    console.error('[Analytics GET Handler Exception]:', error);
    return NextResponse.json({ error: error?.message || 'Error consultando métricas' }, { status: 500 });
  }
}
