'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  FaEye,
  FaWhatsapp,
  FaChartLine,
  FaFolder,
  FaSyncAlt,
  FaCalendarAlt,
  FaArrowUp,
  FaPercent,
} from 'react-icons/fa';

export default function AnalyticsDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [chartView, setChartView] = useState<'views' | 'whatsapp'>('views');

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
      <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
        <FaSyncAlt className="animate-spin text-2xl text-amber-500" />
        <span className="text-sm font-medium">Cargando métricas de tu catálogo...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center text-red-400 space-y-3">
        <p className="text-sm font-semibold">No se pudieron cargar las analíticas: {error}</p>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-white rounded-xl text-xs font-bold transition cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const summary = data?.summary || {
    totalViews: 0,
    totalWhatsapp: 0,
    conversionRate: 0,
    topPage: 'Ninguna',
  };

  const dailyTrend = data?.dailyTrend || [];
  const topContent = data?.topContent || [];
  const maxViewsInTop = Math.max(...topContent.map((c: any) => c.views), 1);

  return (
    <div className="space-y-6">
      {/* 1. Header con control de recarga */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/50 border border-white/10 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <FaChartLine className="text-amber-400 text-lg" />
            <h2 className="text-base font-bold text-white">Rendimiento de tu Catálogo</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <FaCalendarAlt className="text-slate-500 text-[11px]" />
            <span>Métricas reales y agregadas de los últimos <strong>30 días</strong></span>
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-slate-200 transition disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <FaSyncAlt className={`text-xs ${refreshing ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
          <span>{refreshing ? 'Actualizando...' : 'Actualizar Métricas'}</span>
        </button>
      </div>

      {/* 2. Tarjetas de Métricas Clave */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Visitas */}
        <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Visitas al Catálogo</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <FaEye />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{summary.totalViews.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">Últimos 30 días</div>
        </div>

        {/* Clics a WhatsApp */}
        <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Pedidos por WhatsApp</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FaWhatsapp />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400">{summary.totalWhatsapp.toLocaleString()}</div>
          <div className="text-[11px] text-emerald-500/80 font-medium mt-1">Clics en botón WhatsApp</div>
        </div>

        {/* Tasa de Conversión */}
        <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Tasa de Conversión</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <FaPercent className="text-xs" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{summary.conversionRate}%</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">Visitas convertidas a pedido</div>
        </div>

        {/* Sección más popular */}
        <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Sección Más Visitada</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FaFolder className="text-xs" />
            </div>
          </div>
          <div className="text-lg font-black text-white truncate" title={summary.topPage}>
            {summary.topPage}
          </div>
          <div className="text-[11px] text-blue-400 font-medium mt-2">Mayor interés de clientes</div>
        </div>
      </div>

      {/* 3. Gráfica Interactiva de Tendencia Diaria */}
      <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-sm font-bold text-white">Evolución de Tráfico Diario</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Fluctuación de interacciones por día en tu tienda
            </p>
          </div>

          {/* Toggle entre Visitas y WhatsApp */}
          <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-white/10 self-start sm:self-auto">
            <button
              onClick={() => setChartView('views')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                chartView === 'views'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FaEye className="text-[10px]" />
              <span>Visitas</span>
            </button>
            <button
              onClick={() => setChartView('whatsapp')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                chartView === 'whatsapp'
                  ? 'bg-emerald-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FaWhatsapp className="text-[10px]" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="whatsappGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis
                dataKey="shortDate"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#090d16',
                  borderColor: '#ffffff20',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                itemStyle={{ color: chartView === 'views' ? '#f59e0b' : '#10b981' }}
              />
              {chartView === 'views' ? (
                <Area
                  type="monotone"
                  dataKey="views"
                  name="Visitas"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#viewsGradient)"
                />
              ) : (
                <Area
                  type="monotone"
                  dataKey="whatsapp"
                  name="Pedidos WhatsApp"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#whatsappGradient)"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Tabla de Secciones / Álbumes Más Vistos */}
      <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 shadow-xl">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Secciones y Álbumes Más Visitados</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Descubre qué productos o categorías generan mayor interés y conversión
          </p>
        </div>

        {topContent.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            Aún no se registran visitas en este período. Comienza a compartir tu enlace de catálogo con tus clientes.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-white/5 font-medium">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Sección / Álbum</th>
                  <th className="py-3 px-4 w-1/3">Popularidad</th>
                  <th className="py-3 px-4 text-center">Visitas</th>
                  <th className="py-3 px-4 text-center">WhatsApp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {topContent.map((item: any, idx: number) => {
                  const percentage = Math.round((item.views / maxViewsInTop) * 100);
                  return (
                    <tr key={idx} className="hover:bg-white/[0.02] transition text-slate-300">
                      <td className="py-3 px-4 text-center font-bold text-slate-500">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <FaFolder className="text-amber-500/70 text-xs" />
                          <span>{item.title}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({item.path})</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-amber-500 to-rose-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-white">
                        {item.views.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-400">
                        {item.whatsapp > 0 ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            <FaWhatsapp className="text-[10px]" />
                            <span>{item.whatsapp}</span>
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
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
    </div>
  );
}
