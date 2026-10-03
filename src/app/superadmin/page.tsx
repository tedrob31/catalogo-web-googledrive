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
  FaPlus,
  FaTrash,
  FaCopy,
  FaEye,
  FaEyeSlash,
  FaGlobe,
  FaStore,
  FaKey,
  FaCheckCircle,
  FaExclamationTriangle,
  FaEnvelope,
  FaUserShield,
  FaToggleOn,
  FaToggleOff,
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

  // Configuración de Portada Principal
  const [activeLanding, setActiveLanding] = useState<'minimal' | 'classic'>('minimal');
  const [savingLanding, setSavingLanding] = useState(false);
  const [landingNotice, setLandingNotice] = useState<string | null>(null);

  // Whitelist / Fase Beta
  const [whitelist, setWhitelist] = useState<any[]>([]);
  const [closedBetaEnabled, setClosedBetaEnabled] = useState(true);
  const [newWhitelistEmail, setNewWhitelistEmail] = useState('');
  const [addingWhitelist, setAddingWhitelist] = useState(false);
  const [whitelistNotice, setWhitelistNotice] = useState<string | null>(null);

  // Edición de Planes
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

  // Estadísticas Globales
  const [globalStats, setGlobalStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    totalPhotos: 0,
    totalStorageMB: 0,
  });

  // Modal: Crear Tienda / Usuario con Contraseña
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    subdomain: '',
    email: '',
    password: '',
    plan_id: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdSuccessData, setCreatedSuccessData] = useState<any>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  // Modal: Dar de Baja Tienda (Eliminación en Cascada R2 + Supabase)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    tenant: any | null;
    confirmText: string;
    deleting: boolean;
    error: string | null;
  }>({
    isOpen: false,
    tenant: null,
    confirmText: '',
    deleting: false,
    error: null,
  });

  useEffect(() => {
    checkAccessAndLoad();
    loadSystemSettings();
    loadWhitelist();
  }, []);

  async function loadSystemSettings() {
    try {
      const res = await fetch('/api/superadmin/settings');
      if (res.ok) {
        const data = await res.json();
        if (data?.active_landing) {
          setActiveLanding(data.active_landing);
        }
      }
    } catch (err) {
      console.error('Error cargando configuración:', err);
    }
  }

  async function loadWhitelist() {
    try {
      const res = await fetch('/api/superadmin/whitelist');
      if (res.ok) {
        const data = await res.json();
        setWhitelist(data.whitelist || []);
        if (typeof data.closed_beta_enabled === 'boolean') {
          setClosedBetaEnabled(data.closed_beta_enabled);
        }
      }
    } catch (e) {
      console.error('Error cargando whitelist:', e);
    }
  }

  async function handleToggleClosedBeta() {
    const nextState = !closedBetaEnabled;
    try {
      const res = await fetch('/api/superadmin/whitelist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closed_beta_enabled: nextState }),
      });
      if (res.ok) {
        setClosedBetaEnabled(nextState);
        setWhitelistNotice(
          nextState
            ? '✓ Modo Prueba Cerrada Activado: Solo correos autorizados pueden acceder.'
            : '✓ Modo Abierto Activado: Cualquier usuario puede registrarse.'
        );
        setTimeout(() => setWhitelistNotice(null), 4000);
      }
    } catch (e) {
      alert('Error cambiando modo beta');
    }
  }

  async function handleAddWhitelistEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!newWhitelistEmail.trim()) return;
    setAddingWhitelist(true);
    try {
      const res = await fetch('/api/superadmin/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newWhitelistEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al agregar correo');

      setNewWhitelistEmail('');
      setWhitelistNotice(`✓ Correo ${data.email} autorizado exitosamente`);
      setTimeout(() => setWhitelistNotice(null), 3000);
      loadWhitelist();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAddingWhitelist(false);
    }
  }

  async function handleRemoveWhitelistEmail(email: string) {
    if (!confirm(`¿Deseas revocar el acceso a ${email}? Si no tiene tienda activa, ya no podrá ingresar.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/superadmin/whitelist?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadWhitelist();
      }
    } catch (e) {
      alert('Error eliminando de la lista');
    }
  }

  async function checkAccessAndLoad() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

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

    // 2. Cargar inquilinos enriquecidos con su correo desde la API
    try {
      const res = await fetch('/api/superadmin/tenants');
      if (res.ok) {
        const data = await res.json();
        if (data.tenants) {
          setTenants(data.tenants);

          const dbTenants = data.tenants;
          const totalTenants = dbTenants.length;
          const activeTenants = dbTenants.filter((t: any) => t.status === 'active').length;
          const totalPhotos = dbTenants.reduce((acc: number, t: any) => acc + (t.current_photos_count || 0), 0);
          const totalBytes = dbTenants.reduce((acc: number, t: any) => acc + Number(t.current_storage_bytes || 0), 0);
          const totalStorageMB = Math.round(totalBytes / (1024 * 1024));

          setGlobalStats({
            totalTenants,
            activeTenants,
            totalPhotos,
            totalStorageMB,
          });
        }
      }
    } catch (err) {
      console.error('Error cargando tenants:', err);
    }

    // 3. Cargar planes
    const { data: dbPlans } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('price_monthly', { ascending: true });

    if (dbPlans) {
      setPlans(dbPlans);
      if (dbPlans.length > 0 && !createForm.plan_id) {
        setCreateForm((prev) => ({ ...prev, plan_id: dbPlans[0].id }));
      }
    }

    setLoading(false);
  }

  async function handleSwitchLanding(type: 'minimal' | 'classic') {
    setSavingLanding(true);
    setLandingNotice(null);
    try {
      const res = await fetch('/api/superadmin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_landing: type }),
      });
      if (res.ok) {
        setActiveLanding(type);
        setLandingNotice(
          type === 'minimal'
            ? '✓ Portada cambiada a Minimalista / Informativa (Beta Cerrada)'
            : '✓ Portada cambiada a SaaS Comercial Completo'
        );
        setTimeout(() => setLandingNotice(null), 4000);
      } else {
        alert('Error al actualizar la portada');
      }
    } catch (e: any) {
      alert(e?.message || 'Error al cambiar portada');
    } finally {
      setSavingLanding(false);
    }
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

  function generateRandomPassword() {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
    let pass = 'C4_';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCreateForm((prev) => ({ ...prev, password: pass }));
  }

  async function handleCreateTenantSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreatingTenant(true);
    setCreateError(null);

    try {
      const res = await fetch('/api/superadmin/tenants/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al crear tienda');
      }

      setCreatedSuccessData(data);
      checkAccessAndLoad();
      loadWhitelist();
    } catch (err: any) {
      setCreateError(err.message || 'Error al procesar el alta');
    } finally {
      setCreatingTenant(false);
    }
  }

  function copyCredentialsToClipboard() {
    if (!createdSuccessData?.credentials) return;
    const cred = createdSuccessData.credentials;
    const text =
      `🎉 ¡Tu tienda en c4talogo.com ha sido dada de alta!\n\n` +
      `🌐 Catálogo Web: https://${cred.subdomain}.${baseDomain}\n` +
      `⚙️ Panel de Administración: ${cred.loginUrl}\n` +
      `✉️ Correo de acceso: ${cred.email}\n` +
      `🔑 Contraseña temporal: ${cred.password}\n\n` +
      `Una vez dentro de tu panel podrás vincular tu Google Drive y cambiar tu contraseña cuando desees.`;

    navigator.clipboard.writeText(text);
    setCopiedCredentials(true);
    setTimeout(() => setCopiedCredentials(false), 3000);
  }

  async function handleExecuteDelete() {
    if (!deleteModal.tenant) return;
    if (deleteModal.confirmText.trim().toLowerCase() !== deleteModal.tenant.subdomain.toLowerCase()) {
      alert(`Debes escribir exactamente '${deleteModal.tenant.subdomain}' para confirmar.`);
      return;
    }

    setDeleteModal((prev) => ({ ...prev, deleting: true, error: null }));

    try {
      const res = await fetch('/api/superadmin/tenants/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: deleteModal.tenant.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al eliminar la tienda');
      }

      alert(data.message || 'Tienda eliminada exitosamente');
      setDeleteModal({
        isOpen: false,
        tenant: null,
        confirmText: '',
        deleting: false,
        error: null,
      });
      checkAccessAndLoad();
      loadWhitelist();
    } catch (err: any) {
      setDeleteModal((prev) => ({ ...prev, deleting: false, error: err.message }));
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-rose-500 selection:text-white">
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
              <div className="text-[11px] text-slate-400 font-mono">
                app.{baseDomain} (SuperAdmin)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 font-mono hidden md:inline">
              {currentUserEmail}
            </span>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/login');
              }}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer"
            >
              <FaSignOutAlt className="text-xs" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Global KPI Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
              <span>Total Tiendas</span>
              <FaUsers className="text-rose-400 text-sm" />
            </div>
            <div className="text-3xl font-black text-white">{globalStats.totalTenants}</div>
            <div className="text-xs text-emerald-400 font-medium mt-1">
              {globalStats.activeTenants} activas actualmente
            </div>
          </div>

          <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
              <span>Fotos Indexadas</span>
              <FaImages className="text-amber-400 text-sm" />
            </div>
            <div className="text-3xl font-black text-white">{globalStats.totalPhotos}</div>
            <div className="text-xs text-slate-400 mt-1">Sincronizadas desde Google Drive</div>
          </div>

          <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
              <span>Almacenamiento Total</span>
              <FaHdd className="text-cyan-400 text-sm" />
            </div>
            <div className="text-3xl font-black text-white">
              {globalStats.totalStorageMB}{' '}
              <span className="text-sm font-normal text-slate-400">MB</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">Almacenado en Cloudflare R2</div>
          </div>

          <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
              <span>Planes Activos</span>
              <FaCrown className="text-emerald-400 text-sm" />
            </div>
            <div className="text-3xl font-black text-white">{plans.length}</div>
            <div className="text-xs text-emerald-400 font-medium mt-1">Básico, Pro, Premium</div>
          </div>
        </div>

        {/* 1. Selector de Portada Principal (c4talogo.com) */}
        <div className="bg-gradient-to-r from-slate-900/80 via-slate-900/50 to-slate-900/80 border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <FaGlobe className="text-amber-400 text-base" />
                <h2 className="text-base font-bold text-white">Página de Inicio Principal (c4talogo.com)</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Elige qué diseño ven los usuarios al ingresar a la raíz <span className="text-white font-mono font-semibold">{baseDomain}</span>.
              </p>
            </div>

            {landingNotice && (
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                {landingNotice}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Opción 1: Minimalista / Informativa (Beta Cerrada) */}
            <div
              onClick={() => handleSwitchLanding('minimal')}
              className={`p-4 rounded-xl border transition cursor-pointer relative ${
                activeLanding === 'minimal'
                  ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/10'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold mb-2">
                    RECOMENDADA EN BETA
                  </div>
                  <h3 className="text-sm font-bold text-white">Minimalista e Informativa</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Explica a compradores que los catálogos están en sus subdominios oficiales (<code className="text-amber-300">tienda.{baseDomain}</code>) y ofrece acceso privado a administradores. Sin registro público.
                  </p>
                </div>
                <div className="shrink-0 mt-1">
                  <input
                    type="radio"
                    name="landing_type"
                    checked={activeLanding === 'minimal'}
                    onChange={() => handleSwitchLanding('minimal')}
                    className="accent-amber-500 w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Opción 2: SaaS Comercial Completo */}
            <div
              onClick={() => handleSwitchLanding('classic')}
              className={`p-4 rounded-xl border transition cursor-pointer relative ${
                activeLanding === 'classic'
                  ? 'bg-rose-500/10 border-rose-500 shadow-lg shadow-rose-500/10'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold mb-2">
                    GOOGLE VERIFICADO
                  </div>
                  <h3 className="text-sm font-bold text-white">SaaS Comercial Completo</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Landing page comercial original con características completas de la plataforma, arquitectura Google Drive nativa, WhatsApp y comparativas de valor.
                  </p>
                </div>
                <div className="shrink-0 mt-1">
                  <input
                    type="radio"
                    name="landing_type"
                    checked={activeLanding === 'classic'}
                    onChange={() => handleSwitchLanding('classic')}
                    className="accent-rose-500 w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Lista Blanca de Acceso (Fase Beta Cerrada) */}
        <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FaUserShield className="text-rose-400 text-base" />
                <h2 className="text-base font-bold text-white">Lista Blanca de Acceso (Whitelist — Fase Beta)</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Controla exactamente qué correos tienen permiso de entrar o crear tiendas durante la prueba cerrada.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleClosedBeta}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                  closedBetaEnabled
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                }`}
              >
                {closedBetaEnabled ? <FaToggleOn className="text-base" /> : <FaToggleOff className="text-base" />}
                <span>{closedBetaEnabled ? 'Modo Beta Cerrada: ACTIVO' : 'Acceso Público: ABIERTO'}</span>
              </button>
            </div>
          </div>

          {whitelistNotice && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl font-medium">
              {whitelistNotice}
            </div>
          )}

          {/* Formulario para agregar correo */}
          <form onSubmit={handleAddWhitelistEmail} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <FaEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
              <input
                type="email"
                required
                value={newWhitelistEmail}
                onChange={(e) => setNewWhitelistEmail(e.target.value)}
                placeholder="autorizar.nuevo.usuario@gmail.com"
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={addingWhitelist}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white rounded-xl text-xs font-bold transition shadow disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <FaPlus className="text-[10px]" />
              <span>{addingWhitelist ? 'Autorizando...' : 'Autorizar Correo'}</span>
            </button>
          </form>

          {/* Tabla de correos en whitelist */}
          <div className="overflow-x-auto border border-white/5 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-white/5 font-medium">
                <tr>
                  <th className="py-2.5 px-4">Correo Autorizado</th>
                  <th className="py-2.5 px-4">Estado de Tienda</th>
                  <th className="py-2.5 px-4">Fecha Autorización</th>
                  <th className="py-2.5 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {whitelist.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-500 text-xs">
                      No hay correos en la lista blanca aún.
                    </td>
                  </tr>
                ) : (
                  whitelist.map((w) => (
                    <tr key={w.email} className="hover:bg-white/[0.02] transition text-slate-300">
                      <td className="py-2.5 px-4 font-mono font-medium text-white flex items-center gap-2">
                        <FaEnvelope className="text-slate-500 text-[10px]" />
                        <span>{w.email}</span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            w.has_active_store
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {w.has_active_store ? 'Tienda Activa' : 'Pendiente / Sin Tienda'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(w.created_at).toLocaleDateString('es-PE')}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => handleRemoveWhitelistEmail(w.email)}
                          className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[11px] transition cursor-pointer"
                          title="Revocar autorización"
                        >
                          Revocar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Subscription Plans Management */}
        <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-white">Configuración de Planes y Límites</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Personaliza fotos máximas, cuota de almacenamiento en MB y precio de suscripción.
              </p>
            </div>
            <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-mono">
              En Vivo (Supabase)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p) => {
              const isEditing = editingPlanId === p.id;
              const isFree = p.slug === 'free';
              const isEnterprise = p.slug === 'enterprise';

              return (
                <div
                  key={p.id}
                  className={`bg-slate-900/80 border rounded-xl p-5 flex flex-col justify-between transition ${
                    isEditing
                      ? 'border-amber-500/80 ring-1 ring-amber-500/50'
                      : isEnterprise
                      ? 'border-rose-500/40 shadow-lg shadow-rose-500/5'
                      : isFree
                      ? 'border-white/10'
                      : 'border-amber-500/30'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={planForm.name}
                          onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                          className="bg-slate-800 border border-white/20 rounded px-2 py-1 text-sm font-bold text-white w-full mr-2"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-white">{p.name}</h3>
                          {isEnterprise && (
                            <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                              Top
                            </span>
                          )}
                        </div>
                      )}

                      <span className="text-[10px] text-slate-500 font-mono uppercase bg-white/5 px-2 py-0.5 rounded">
                        {p.slug}
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="space-y-3 text-xs mb-4">
                        <div>
                          <label className="block text-slate-400 mb-1">Fotos Máximas:</label>
                          <input
                            type="number"
                            value={planForm.max_photos}
                            onChange={(e) =>
                              setPlanForm({ ...planForm, max_photos: Number(e.target.value) })
                            }
                            className="w-full bg-slate-800 border border-white/20 rounded px-2 py-1 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Almacenamiento (MB):</label>
                          <input
                            type="number"
                            value={planForm.max_storage_mb}
                            onChange={(e) =>
                              setPlanForm({ ...planForm, max_storage_mb: Number(e.target.value) })
                            }
                            className="w-full bg-slate-800 border border-white/20 rounded px-2 py-1 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Precio Mensual ($):</label>
                          <input
                            type="number"
                            step="0.01"
                            value={planForm.price_monthly}
                            onChange={(e) =>
                              setPlanForm({ ...planForm, price_monthly: Number(e.target.value) })
                            }
                            className="w-full bg-slate-800 border border-white/20 rounded px-2 py-1 text-white font-mono"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 text-xs mb-4">
                        <div className="flex justify-between py-1 border-b border-white/5 text-slate-300">
                          <span>Fotos Límite:</span>
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

        {/* 4. Tenants Table & Management */}
        <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-base font-bold text-white">Todos los Inquilinos (Tenants)</h2>
              <span className="text-xs text-slate-400 font-mono">
                Total: {tenants.length} tiendas registradas
              </span>
            </div>

            <button
              onClick={() => {
                setCreatedSuccessData(null);
                setCreateError(null);
                generateRandomPassword();
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-rose-500/20 active:scale-95 cursor-pointer"
            >
              <FaPlus className="text-[10px]" />
              <span>+ Nueva Tienda / Invitar Cliente</span>
            </button>
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
                    <th className="pb-3">Tienda / Subdominio / Correo</th>
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
                          <span>
                            {t.subdomain}.{baseDomain}
                          </span>
                          <FaExternalLinkAlt className="text-[9px]" />
                        </a>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-1 font-mono">
                          <FaEnvelope className="text-slate-500 text-[10px]" />
                          <span>{t.owner_email || t.google_email || 'Sin correo asociado'}</span>
                        </div>
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

                      <td className="py-3 font-mono">{t.current_photos_count || 0}</td>

                      <td className="py-3 font-mono text-slate-400">
                        {Math.round((t.current_storage_bytes || 0) / (1024 * 1024))} MB
                      </td>

                      <td className="py-3 text-slate-500 font-mono">
                        {new Date(t.created_at).toLocaleDateString('es-PE')}
                      </td>

                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleStatus(t.id, t.status)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                              t.status === 'active'
                                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400'
                                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'
                            }`}
                          >
                            {t.status === 'active' ? 'Suspender' : 'Reactivar'}
                          </button>

                          <button
                            onClick={() => {
                              setDeleteModal({
                                isOpen: true,
                                tenant: t,
                                confirmText: '',
                                deleting: false,
                                error: null,
                              });
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-400 transition cursor-pointer flex items-center gap-1"
                            title="Eliminar tienda de Supabase y fotos de R2"
                          >
                            <FaTrash className="text-[10px]" />
                            <span>Dar de baja</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* MODAL 1: NUEVA TIENDA / INVITAR USUARIO */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm">
                  <FaStore />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Alta de Nueva Tienda</h3>
                  <p className="text-[11px] text-slate-400">
                    Crea la tienda, el subdominio y las credenciales de acceso iniciales.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            {createdSuccessData ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <FaCheckCircle />
                    <span>¡Tienda creada y autorizada con éxito!</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Comparte las siguientes credenciales con el cliente para que pueda ingresar a su panel:
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-white/10 space-y-2 font-mono text-xs">
                  <div>
                    <span className="text-slate-500">Catálogo Web:</span>{' '}
                    <span className="text-amber-400 font-semibold">
                      https://{createdSuccessData.credentials.subdomain}.{baseDomain}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Panel Login:</span>{' '}
                    <span className="text-white">https://{baseDomain}/login</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Usuario (Email):</span>{' '}
                    <span className="text-emerald-400 font-semibold">
                      {createdSuccessData.credentials.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Contraseña temporal:</span>{' '}
                    <span className="text-rose-400 font-bold">
                      {createdSuccessData.credentials.password}
                    </span>
                  </div>
                </div>

                <button
                  onClick={copyCredentialsToClipboard}
                  className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/15 border border-white/20 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FaCopy />
                  <span>
                    {copiedCredentials
                      ? '✓ ¡Copiado al Portapapeles!'
                      : 'Copiar Mensaje Completo para WhatsApp'}
                  </span>
                </button>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setCreatedSuccessData(null);
                    }}
                    className="px-5 py-2 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateTenantSubmit} className="space-y-4">
                {createError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-medium">
                    {createError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nombre del Negocio o Tienda
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const autoSubdomain = name
                        .toLowerCase()
                        .trim()
                        .replace(/[^a-z0-9]/g, '');
                      setCreateForm((prev) => ({
                        ...prev,
                        name,
                        subdomain: prev.subdomain ? prev.subdomain : autoSubdomain,
                      }));
                    }}
                    placeholder="Ej. Modas Camila"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Subdominio asignado
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      required
                      value={createForm.subdomain}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                        })
                      }
                      placeholder="modascamila"
                      className="flex-1 bg-slate-950 border border-white/10 rounded-l-xl px-3 py-2 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                    />
                    <span className="bg-slate-800 border border-l-0 border-white/10 px-3 py-2 rounded-r-xl text-xs text-slate-400 font-mono">
                      .{baseDomain}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Correo Electrónico del Cliente
                  </label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="cliente@gmail.com"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-300">
                      Contraseña Asignada
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <FaKey className="text-[9px]" /> Generar aleatoria
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={createForm.password}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, password: e.target.value })
                      }
                      placeholder="Contraseña segura"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 pr-10 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs cursor-pointer"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Plan de Suscripción
                  </label>
                  <select
                    value={createForm.plan_id}
                    onChange={(e) => setCreateForm({ ...createForm, plan_id: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.max_photos} fotos, {p.max_storage_mb} MB)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTenant}
                    className="px-5 py-2 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-rose-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    {creatingTenant ? 'Creando...' : 'Crear Tienda y Autorizar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: DAR DE BAJA TIENDA (ELIMINACIÓN EN CASCADA) */}
      {deleteModal.isOpen && deleteModal.tenant && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-lg">
                <FaExclamationTriangle />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Dar de baja Tienda</h3>
                <p className="text-[11px] text-red-400/90 font-medium">
                  Eliminación irreversible en cascada
                </p>
              </div>
            </div>

            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-slate-300 leading-relaxed space-y-2">
              <p>
                Estás a punto de eliminar definitivamente la tienda:{' '}
                <strong className="text-white">{deleteModal.tenant.name}</strong> (
                <code className="text-amber-300 font-mono">{deleteModal.tenant.subdomain}</code>).
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                <li>Se borrarán todas las fotos del bucket de Cloudflare R2.</li>
                <li>Se eliminarán álbumes, fotos y configuraciones de Supabase.</li>
                <li>Se revocará el subdominio y se quitará de la lista blanca de acceso.</li>
              </ul>
            </div>

            {deleteModal.error && (
              <div className="p-2.5 bg-red-500/20 border border-red-500/40 rounded-lg text-xs text-red-300">
                {deleteModal.error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Para confirmar, escribe el subdominio:{' '}
                <code className="text-amber-400 font-mono font-bold">
                  {deleteModal.tenant.subdomain}
                </code>
              </label>
              <input
                type="text"
                value={deleteModal.confirmText}
                onChange={(e) =>
                  setDeleteModal({ ...deleteModal, confirmText: e.target.value })
                }
                placeholder={deleteModal.tenant.subdomain}
                className="w-full bg-slate-950 border border-red-500/30 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() =>
                  setDeleteModal({
                    isOpen: false,
                    tenant: null,
                    confirmText: '',
                    deleting: false,
                    error: null,
                  })
                }
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={
                  deleteModal.deleting ||
                  deleteModal.confirmText.trim().toLowerCase() !==
                    deleteModal.tenant.subdomain.toLowerCase()
                }
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-red-600/30 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
              >
                <FaTrash className="text-[10px]" />
                <span>
                  {deleteModal.deleting ? 'Eliminando en R2 y DB...' : 'Eliminar Definitivamente'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
