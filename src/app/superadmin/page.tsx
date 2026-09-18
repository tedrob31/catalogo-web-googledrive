'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  FaUsers,
  FaImages,
  FaHdd,
  FaBan,
  FaCheck,
  FaExternalLinkAlt,
  FaShieldAlt,
  FaSignOutAlt,
  FaCrown,
  FaLock,
} from 'react-icons/fa';

export const dynamic = 'force-dynamic';

export default function SuperAdminDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    totalPhotos: 0,
    totalStorageMB: 0,
  });

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  async function checkAccessAndLoad() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    setCurrentUserEmail(user.email || null);

    // 1. Verificar si el usuario autenticado tiene rol superadmin
    const { data: myRoles } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('user_id', user.id);

    const isSuper = myRoles?.some((r: any) => r.role === 'superadmin');

    if (!isSuper) {
      setLoading(false);
      setAccessDenied(true);
      return;
    }

    setIsSuperAdmin(true);
    setAccessDenied(false);

    // Cargar todos los inquilinos
    const { data: dbTenants } = await supabase
      .from('tenants')
      .select(`
        *,
        subscription_plans (*)
      `)
      .order('created_at', { ascending: false });

    // Cargar planes
    const { data: dbPlans } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('price_monthly', { ascending: true });

    if (dbTenants) {
      setTenants(dbTenants);

      const totalTenants = dbTenants.length;
      const activeTenants = dbTenants.filter((t) => t.status === 'active').length;
      const totalPhotos = dbTenants.reduce((acc, t) => acc + (t.current_photos_count || 0), 0);
      const totalBytes = dbTenants.reduce((acc, t) => acc + Number(t.current_storage_bytes || 0), 0);
      const totalStorageMB = Math.round(totalBytes / (1024 * 1024));

      setGlobalStats({
        totalTenants,
        activeTenants,
        totalPhotos,
        totalStorageMB,
      });
    }

    if (dbPlans) setPlans(dbPlans);

    setLoading(false);
  }

  async function handleToggleStatus(tenantId: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const confirmMsg =
      newStatus === 'suspended'
        ? '¿Deseas suspender este catálogo? El público no podrá verlo hasta que sea reactivado.'
        : '¿Deseas reactivar este catálogo?';

    if (!confirm(confirmMsg)) return;

    const { error } = await supabase
      .from('tenants')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', tenantId);

    if (error) {
      alert('Error actualizando estado: ' + error.message);
    } else {
      checkAccessAndLoad();
    }
  }

  async function handleChangePlan(tenantId: string, newPlanId: string) {
    const { error } = await supabase
      .from('tenants')
      .update({ plan_id: newPlanId, updated_at: new Date().toISOString() })
      .eq('id', tenantId);

    if (error) {
      alert('Error cambiando plan: ' + error.message);
    } else {
      checkAccessAndLoad();
    }
  }

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'c4talogo.com';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Cargando Panel Maestro SuperAdmin...</span>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center mb-4 text-2xl shadow-lg shadow-amber-500/10">
          <FaLock />
        </div>
        <h1 className="text-2xl font-black mb-2 tracking-tight">Acceso Restringido</h1>
        <p className="text-slate-400 max-w-md text-sm mb-6 leading-relaxed">
          Has iniciado sesión como <span className="text-white font-semibold">{currentUserEmail}</span>, pero esta cuenta no tiene privilegios de SuperAdministrador en la plataforma.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Ir a mi Dashboard de Inquilino
          </button>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/login');
            }}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-rose-500/20 cursor-pointer"
          >
            Cerrar sesión e ingresar con otra cuenta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-rose-500/20 bg-black/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center font-black text-white text-sm shadow-lg shadow-rose-600/30">
              <FaShieldAlt />
            </div>
            <div>
              <span className="font-extrabold text-sm text-white tracking-wide">
                C4TALOGO MAESTRO
              </span>
              <span className="block text-[11px] text-rose-400 font-mono">
                app.{baseDomain} (SuperAdmin)
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              supabase.auth.signOut().then(() => router.push('/login'));
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
          >
            <FaSignOutAlt />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full space-y-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Inquilinos Registrados</span>
              <FaUsers className="text-rose-400" />
            </div>
            <div className="text-3xl font-black text-white">{globalStats.totalTenants}</div>
            <span className="text-xs text-emerald-400 font-medium mt-1 block">
              {globalStats.activeTenants} tiendas activas
            </span>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Fotos Alojadas (R2)</span>
              <FaImages className="text-amber-400" />
            </div>
            <div className="text-3xl font-black text-white">{globalStats.totalPhotos}</div>
            <span className="text-xs text-slate-500 font-medium mt-1 block">
              Optimizadas con Imgproxy
            </span>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Almacenamiento Usado</span>
              <FaHdd className="text-blue-400" />
            </div>
            <div className="text-3xl font-black text-white">
              {globalStats.totalStorageMB < 1024
                ? `${globalStats.totalStorageMB} MB`
                : `${(globalStats.totalStorageMB / 1024).toFixed(2)} GB`}
            </div>
            <span className="text-xs text-slate-500 font-medium mt-1 block">
              Bucket Cloudflare R2
            </span>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Planes de Suscripción</span>
              <FaCrown className="text-yellow-400" />
            </div>
            <div className="text-3xl font-black text-white">{plans.length}</div>
            <span className="text-xs text-slate-500 font-medium mt-1 block">
              Gratuito, Pro, Enterprise
            </span>
          </div>
        </div>

        {/* Tenants Table */}
        <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-white">Todos los Inquilinos (Tenants)</h2>
            <span className="text-xs text-slate-400 font-mono">
              Total: {tenants.length} tiendas
            </span>
          </div>

          {tenants.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              Aún no hay inquilinos registrados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 border-b border-white/10 font-medium">
                  <tr>
                    <th className="pb-3">Tienda / Subdominio</th>
                    <th className="pb-3">Estado</th>
                    <th className="pb-3">Plan Asignado</th>
                    <th className="pb-3">Fotos</th>
                    <th className="pb-3">Almacenamiento</th>
                    <th className="pb-3">Fecha Alta</th>
                    <th className="pb-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tenants.map((t) => (
                    <tr key={t.id} className="text-slate-300 hover:bg-white/[0.02] transition">
                      <td className="py-3">
                        <div className="font-semibold text-white">{t.name}</div>
                        <a
                          href={`https://${t.subdomain}.${baseDomain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                        >
                          <span>{t.subdomain}.{baseDomain}</span>
                          <FaExternalLinkAlt className="text-[9px]" />
                        </a>
                      </td>

                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            t.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {t.status === 'active' ? 'Activo' : 'Suspendido'}
                        </span>
                      </td>

                      <td className="py-3">
                        <select
                          value={t.plan_id || ''}
                          onChange={(e) => handleChangePlan(t.id, e.target.value)}
                          className="bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                        >
                          {plans.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.max_photos} fotos)
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3 font-mono">
                        {t.current_photos_count || 0}
                      </td>

                      <td className="py-3 font-mono text-slate-400">
                        {Math.round((t.current_storage_bytes || 0) / (1024 * 1024))} MB
                      </td>

                      <td className="py-3 text-slate-500 font-mono">
                        {new Date(t.created_at).toLocaleDateString('es-PE')}
                      </td>

                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleToggleStatus(t.id, t.status)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                            t.status === 'active'
                              ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                              : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'
                          }`}
                        >
                          {t.status === 'active' ? 'Suspender' : 'Reactivar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
