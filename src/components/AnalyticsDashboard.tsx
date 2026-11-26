'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { FaEye, FaWhatsapp, FaFolder, FaSyncAlt, FaUsers } from 'react-icons/fa';

export default function AnalyticsDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [chartView, setChartView] = useState<'uniqueVisitors' | 'views' | 'whatsapp'>('uniqueVisitors');

  const fetchAnalytics = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const res = await fetch('/api/analytics/');
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Error al obtener analíticas');
      }
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 border border-shell-line px-4 py-12 text-center">
        <FaSyncAlt aria-hidden="true" className="animate-spin text-2xl text-shell-accent" />
        <span className="text-[13px] font-medium text-shell-muted">
          Cargando métricas de tu catálogo...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="space-y-3 border border-shell-danger/40 px-4 py-6 text-center">
        <p className="text-[13px] font-semibold text-shell-danger">
          No se pudieron cargar las analíticas: {error}
        </p>
        <button
          onClick={fetchAnalytics}
          className="cursor-pointer rounded-md border border-shell-danger/40 px-3 py-1.5 text-[12.5px] font-semibold text-shell-danger transition hover:bg-shell-danger/10"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const summary = data?.summary || {
    totalUniqueVisitors: 0,
    totalViews: 0,
    totalCategoryViews: 0,
    totalWhatsapp: 0,
    conversionRate: 0,
    topPage: 'Ninguna',
  };

  const dailyTrend = data?.dailyTrend || [];
  const topContent = data?.topContent || [];
  const maxViewsInTop = Math.max(...topContent.map((c: any) => c.views), 1);

  const cellLabelCls = 'text-[11px] font-semibold uppercase tracking-[0.08em] text-shell-muted';
  const cellValueCls = 'mt-1 text-[18px] font-semibold tabular-nums text-shell-ink';

  return (
    <div className="space-y-6">
      {/* 1. Encabezado con control de recarga */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-shell-ink">
            Rendimiento de tu catálogo
          </h1>
          <p className="mt-1 max-w-[66ch] text-[13px] text-shell-muted">
            Visitantes únicos diarios separados de las vistas por categoría (últimos 30 días).
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={refreshing}
          className="flex shrink-0 cursor-pointer items-center gap-2 rounded-md border border-shell-line-strong bg-shell-raised px-3 py-1.5 text-[12.5px] font-semibold text-shell-ink transition hover:bg-shell-surface disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FaSyncAlt
            aria-hidden="true"
            className={`text-xs ${refreshing ? 'animate-spin text-shell-accent' : 'text-shell-muted'}`}
          />
          <span>{refreshing ? 'Actualizando...' : 'Actualizar métricas'}</span>
        </button>
      </div>

      {/* 2. Franja única de métricas clave */}
      <div className="grid grid-cols-1 divide-y divide-shell-line border border-shell-line sm:grid-cols-2 lg:grid-cols-5 lg:divide-x lg:divide-y-0">
        <div className="px-4 py-3">
          <div className={cellLabelCls}>Visitantes únicos</div>
          <div className={cellValueCls}>
            {Number(summary.totalUniqueVisitors ?? 0).toLocaleString()}
          </div>
          <div className="mt-0.5 text-[11px] text-shell-muted">1 por día por dispositivo</div>
        </div>

        <div className="px-4 py-3">
          <div className={cellLabelCls}>Vistas en categorías</div>
          <div className={cellValueCls}>
            {Number(summary.totalCategoryViews ?? summary.totalViews ?? 0).toLocaleString()}
          </div>
          <div className="mt-0.5 text-[11px] text-shell-muted">Exploraciones en álbumes</div>
        </div>

        <div className="px-4 py-3">
          <div className={cellLabelCls}>Pedidos por WhatsApp</div>
          <div className={cellValueCls}>{Number(summary.totalWhatsapp ?? 0).toLocaleString()}</div>
        </div>

        <div className="px-4 py-3">
          <div className={cellLabelCls}>Tasa de conversión</div>
          <div className={cellValueCls}>{summary.conversionRate}%</div>
          <div className="mt-0.5 text-[11px] text-shell-muted">Sobre visitantes únicos</div>
        </div>

        <div className="px-4 py-3">
          <div className={cellLabelCls}>Categoría más visitada</div>
          <div className={`${cellValueCls} truncate`} title={summary.topPage}>
            {summary.topPage}
          </div>
        </div>
      </div>

      {/* 3. Tendencia diaria */}
      <section aria-labelledby="h-tendencia">
        <div className="mb-2 flex flex-col gap-2 border-b border-shell-line pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              id="h-tendencia"
              className="text-[12px] font-bold uppercase tracking-[0.08em] text-shell-muted"
            >
              Evolución de tráfico diario
            </h2>
            <p className="mt-0.5 text-[11.5px] text-shell-muted">
              Compara visitantes únicos diarios, vistas de categorías y clics a WhatsApp.
            </p>
          </div>

          {/* Toggle entre Únicos, Categorías y WhatsApp */}
          <div className="inline-flex shrink-0 self-start rounded-md border border-shell-line bg-shell-raised p-0.5 sm:self-auto">
            <button
              onClick={() => setChartView('uniqueVisitors')}
              aria-pressed={chartView === 'uniqueVisitors'}
              className={`flex cursor-pointer items-center gap-1.5 rounded-[4px] px-2.5 py-1 text-[11.5px] font-semibold transition ${
                chartView === 'uniqueVisitors'
                  ? 'bg-shell-accent text-shell-accent-ink'
                  : 'text-shell-muted hover:text-shell-ink'
              }`}
            >
              <FaUsers aria-hidden="true" className="text-[10px]" />
              <span>Únicos</span>
            </button>
            <button
              onClick={() => setChartView('views')}
              aria-pressed={chartView === 'views'}
              className={`flex cursor-pointer items-center gap-1.5 rounded-[4px] px-2.5 py-1 text-[11.5px] font-semibold transition ${
                chartView === 'views'
                  ? 'bg-shell-accent text-shell-accent-ink'
                  : 'text-shell-muted hover:text-shell-ink'
              }`}
            >
              <FaEye aria-hidden="true" className="text-[10px]" />
              <span>Categorías</span>
            </button>
            <button
              onClick={() => setChartView('whatsapp')}
              aria-pressed={chartView === 'whatsapp'}
              className={`flex cursor-pointer items-center gap-1.5 rounded-[4px] px-2.5 py-1 text-[11.5px] font-semibold transition ${
                chartView === 'whatsapp'
                  ? 'bg-shell-accent text-shell-accent-ink'
                  : 'text-shell-muted hover:text-shell-ink'
              }`}
            >
              <FaWhatsapp aria-hidden="true" className="text-[10px]" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>

        <div className="border border-shell-line px-2 py-3">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-shell-accent)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-shell-accent)" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="whatsappGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-shell-warn)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-shell-warn)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-shell-line)"
                  vertical={false}
                />
                <XAxis
                  dataKey="shortDate"
                  stroke="var(--color-shell-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--color-shell-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-shell-surface)',
                    borderColor: 'var(--color-shell-line)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: 'var(--color-shell-ink-soft)', fontWeight: 'bold' }}
                  itemStyle={{
                    color:
                      chartView === 'whatsapp'
                        ? 'var(--color-shell-warn)'
                        : 'var(--color-shell-accent)',
                  }}
                />
                {chartView === 'uniqueVisitors' ? (
                  <Area
                    type="monotone"
                    dataKey="uniqueVisitors"
                    name="Visitantes únicos"
                    stroke="var(--color-shell-accent)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#viewsGradient)"
                  />
                ) : chartView === 'views' ? (
                  <Area
                    type="monotone"
                    dataKey="views"
                    name="Vistas de secciones"
                    stroke="var(--color-shell-accent)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#viewsGradient)"
                  />
                ) : (
                  <Area
                    type="monotone"
                    dataKey="whatsapp"
                    name="Pedidos WhatsApp"
                    stroke="var(--color-shell-warn)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#whatsappGradient)"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* 4. Secciones y álbumes más visitados */}
      <section aria-labelledby="h-secciones">
        <div className="mb-2 border-b border-shell-line pb-2">
          <h2
            id="h-secciones"
            className="text-[12px] font-bold uppercase tracking-[0.08em] text-shell-muted"
          >
            Secciones y álbumes más visitados
          </h2>
          <p className="mt-0.5 text-[11.5px] text-shell-muted">
            Descubre qué productos o categorías generan mayor interés y conversión.
          </p>
        </div>

        <div className="border border-shell-line">
          {topContent.length === 0 ? (
            <p className="px-4 py-8 text-center text-[12.5px] text-shell-muted">
              Todavía no hay visitas en este período.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12.5px]">
                <thead className="border-b border-shell-line text-[11px] uppercase tracking-[0.06em] text-shell-muted">
                  <tr>
                    <th className="w-12 px-3 py-2 text-center font-semibold">#</th>
                    <th className="px-3 py-2 font-semibold">Sección / Álbum</th>
                    <th className="w-1/3 px-3 py-2 font-semibold">Popularidad</th>
                    <th className="px-3 py-2 text-center font-semibold">Visitas</th>
                    <th className="px-3 py-2 text-center font-semibold">WhatsApp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-shell-line">
                  {topContent.map((item: any, idx: number) => {
                    const percentage = Math.round((item.views / maxViewsInTop) * 100);
                    return (
                      <tr key={idx} className="text-shell-ink-soft transition hover:bg-shell-raised">
                        <td className="px-3 py-2 text-center font-semibold tabular-nums text-shell-muted">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <FaFolder aria-hidden="true" className="text-xs text-shell-muted" />
                            <span className="font-semibold text-shell-ink">{item.title}</span>
                            <span className="font-mono text-[10.5px] text-shell-muted">
                              ({item.path})
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-shell-line">
                            <div
                              className="h-1.5 rounded-full bg-shell-accent transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center font-semibold tabular-nums text-shell-ink">
                          {item.views.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-center font-semibold tabular-nums">
                          {item.whatsapp > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-shell-line bg-shell-raised px-2 py-0.5 text-shell-ink-soft">
                              <FaWhatsapp aria-hidden="true" className="text-[10px]" />
                              <span>{item.whatsapp}</span>
                            </span>
                          ) : (
                            <span className="text-shell-muted">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
