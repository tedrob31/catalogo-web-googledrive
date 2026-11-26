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

    // 2. Ejecutar agregación atómica en PostgreSQL vía RPC (0ms, ultra-liviano y sin tope de 1,000 filas)
    const { data: summaryData, error: metricsErr } = await adminSupabase
      .rpc('get_tenant_analytics_summary', {
        p_tenant_id: tenantId,
        p_start_date: startDate,
      });

    if (metricsErr) {
      console.error('[Analytics GET Error]:', metricsErr);
      return NextResponse.json({ error: 'Error consultando métricas' }, { status: 500 });
    }

    const rawSummary = summaryData as {
      total_unique_visitors?: number;
      total_views: number;
      total_category_views?: number;
      total_whatsapp: number;
      daily_trend: Array<{
        date: string;
        unique_visitors?: number;
        views: number;
        whatsapp: number;
      }>;
      top_content: Array<{
        path: string;
        title: string;
        views: number;
        unique_visitors?: number;
        whatsapp: number;
      }>;
      top_page: string;
    } | null;

    const totalUniqueVisitors = Number(rawSummary?.total_unique_visitors || 0);
    const totalViews = Number(rawSummary?.total_views || 0);
    const totalCategoryViews = Number(rawSummary?.total_category_views ?? totalViews);
    const totalWhatsapp = Number(rawSummary?.total_whatsapp || 0);
    const topPage = rawSummary?.top_page || 'Ninguna aún';
    const topContent = (rawSummary?.top_content || []).map((item) => ({
      ...item,
      views: Number(item.views || 0),
      uniqueVisitors: Number(item.unique_visitors || 0),
      whatsapp: Number(item.whatsapp || 0),
    }));

    // 3. Crear mapa con los 30 días para garantizar que la gráfica no tenga huecos
    const dailyMap = new Map<string, { uniqueVisitors: number; views: number; whatsapp: number }>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dStr = d.toISOString().split('T')[0];
      dailyMap.set(dStr, { uniqueVisitors: 0, views: 0, whatsapp: 0 });
    }

    // Rellenar con los días agregados devueltos por la base de datos
    for (const d of rawSummary?.daily_trend || []) {
      if (dailyMap.has(d.date)) {
        dailyMap.set(d.date, {
          uniqueVisitors: Number(d.unique_visitors || 0),
          views: Number(d.views || 0),
          whatsapp: Number(d.whatsapp || 0),
        });
      }
    }

    // Formatear array de tendencia diaria para Recharts
    const dailyTrend = Array.from(dailyMap.entries()).map(([dateStr, val]) => {
      const parts = dateStr.split('-');
      const shortDate = `${parts[2]}/${parts[1]}`;
      return {
        date: dateStr,
        shortDate,
        uniqueVisitors: val.uniqueVisitors,
        views: val.views,
        whatsapp: val.whatsapp,
      };
    });

    const conversionDenominator = totalUniqueVisitors > 0 ? totalUniqueVisitors : totalViews;
    const conversionRate =
      conversionDenominator > 0 ? ((totalWhatsapp / conversionDenominator) * 100).toFixed(1) : '0.0';

    return NextResponse.json({
      success: true,
      tenant: membership.tenants,
      periodDays: 30,
      summary: {
        totalUniqueVisitors,
        totalViews,
        totalCategoryViews,
        totalWhatsapp,
        conversionRate: parseFloat(conversionRate),
        topPage,
      },
      dailyTrend,
      topContent,
    });
  } catch (error) {
    console.error('[Analytics GET Handler Exception]:', error);
    return NextResponse.json({ error: 'Error consultando métricas' }, { status: 500 });
  }
}
