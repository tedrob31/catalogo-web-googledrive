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
  FaEdit,
  FaSave,
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
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState<{
    id: string;
    name: string;
    max_photos: number;
    max_storage_mb: number;
    price_monthly: number;
  }>({
    id: '',
    name: '',
    max_photos: 500,
    max_storage_mb: 1024,
    price_monthly: 0,
  });
  const [savingPlan, setSavingPlan] = useState(false);
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

  function startEditPlan(plan: any) {
    setEditingPlanId(plan.id);
    setPlanForm({
      id: plan.id,
      name: plan.name,
      max_photos: plan.max_photos,
      max_storage_mb: plan.max_storage_mb,
      price_monthly: Number(plan.price_monthly),
    });
  }

  async function handleSavePlan(planId: string) {
    setSavingPlan(true);
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update({
          name: planForm.name,
          max_photos: Number(planForm.max_photos),
          max_storage_mb: Number(planForm.max_storage_mb),
          price_monthly: Number(planForm.price_monthly),
        })
        .eq('id', planId);

      if (error) {
        alert('Error actualizando plan: ' + error.message);
      } else {
        alert('¡Plan actualizado correctamente!');
        setEditingPlanId(null);
        checkAccessAndLoad();
      }
    } catch (err: any) {
      alert(err?.message || 'Error al guardar plan');
    } finally {
      setSavingPlan(false);
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
            <span className="text-xs text-slate-500 font-medium mt-1 block truncate">
              {plans.map((p) => p.name).join(', ') || 'Básico, Pro, Premium'}
            </span>
          </div>
        </div>

        {/* Plans Management Section */}
        <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FaCrown className="text-amber-400 text-sm" />
                <span>Gestión de Planes de Suscripción</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Configura los nombres, límites de fotos, almacenamiento y precios de cada plan. Los cambios aplican de inmediato en toda la plataforma.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg font-mono">
              {plans.length} Planes Activos
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((p) => {
              const isEditing = editingPlanId === p.id;
              return (
                <div
                  key={p.id}
                  className={`rounded-xl border p-5 transition flex flex-col justify-between ${
                    isEditing
                      ? 'bg-slate-800/90 border-amber-500/50 shadow-lg shadow-amber-500/5'
                      : 'bg-slate-900/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                        Slug: <strong className="text-white">{p.slug}</strong>
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          p.slug === 'free'
                            ? 'bg-blue-500/20 text-blue-400'
                            : p.slug === 'pro'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {p.name}
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                            Nombre del Plan:
                          </label>
                          <input
                            type="text"
                            value={planForm.name}
                            onChange={(e) =>
                              setPlanForm((prev) => ({ ...prev, name: e.target.value }))
                            }
                            className="w-full bg-slate-800 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                            Límite de Fotos:
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={planForm.max_photos}
                            onChange={(e) =>
                              setPlanForm((prev) => ({
                                ...prev,
                                max_photos: Number(e.target.value),
                              }))
                            }
                            className="w-full bg-slate-800 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                            Límite Almacenamiento (MB):
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={planForm.max_storage_mb}
                            onChange={(e) =>
                              setPlanForm((prev) => ({
                                ...prev,
                                max_storage_mb: Number(e.target.value),
                              }))
                            }
                            className="w-full bg-slate-800 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                            Precio Mensual ($):
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            value={planForm.price_monthly}
                            onChange={(e) =>
                              setPlanForm((prev) => ({
                                ...prev,
                                price_monthly: Number(e.target.value),
                              }))
                            }
                            className="w-full bg-slate-800 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 my-2 text-xs">
                        <div className="text-xl font-extrabold text-white">
                          {p.name}
                        </div>
                        <div className="flex justify-between py-1 border-b border-white/5 text-slate-300">
                          <span>Límite de Fotos:</span>
                          <strong className="text-white font-mono">{p.max_photos} fotos</strong>
                        </div>
                        <div className="flex justify-between py-1 border-b border-white/5 text-slate-300">
                          <span>Almacenamiento:</span>
                          <strong className="text-white font-mono">
                            {p.max_storage_mb >= 1024
                              ? `${(p.max_storage_mb / 1024).toFixed(1)} GB`
                              : `${p.max_storage_mb} MB`}
                          </strong>
                        </div>
                        <div className="flex justify-between py-1 text-slate-300">
                          <span>Precio Mensual:</span>
                          <strong className="text-emerald-400 font-mono">
                            {Number(p.price_monthly) === 0
                              ? 'Gratis ($0.00)'
                              : `$${Number(p.price_monthly).toFixed(2)}`}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-2 border-t border-white/10 flex gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleSavePlan(p.id)}
                          disabled={savingPlan}
                          className="flex-1 py-1.5 px-3 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 shadow"
                        >
                          <FaSave />
                          <span>{savingPlan ? 'Guardando...' : 'Guardar'}</span>
                        </button>
                        <button
                          onClick={() => setEditingPlanId(null)}
                          className="py-1.5 px-3 bg-white/10 hover:bg-white/20 text-slate-300 rounded-lg text-xs transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEditPlan(p)}
                        className="w-full py-1.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <FaEdit className="text-amber-400 text-[10px]" />
                        <span>Editar Configuración</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
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
