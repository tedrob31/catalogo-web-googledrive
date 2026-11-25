'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  FaExternalLinkAlt,
  FaShieldAlt,
  FaSignOutAlt,
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
  FaSearch,
} from 'react-icons/fa';
import ShellToastStack, { ShellToastItem } from '@/components/dashboard/ShellToast';
import ShellConfirmModal from '@/components/dashboard/ShellConfirmModal';

export const dynamic = 'force-dynamic';

const cardCls = 'rounded-lg border border-shell-line bg-shell-surface p-5';
const fieldCls =
  'w-full rounded-md border border-shell-line-strong bg-shell-raised px-2.5 py-1.5 text-[12.5px] text-shell-ink placeholder:text-shell-muted focus:outline-none focus:ring-2 focus:ring-shell-accent/60';
const btnCls =
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-shell-line-strong bg-shell-raised px-3 py-1.5 text-[12px] font-semibold text-shell-ink transition-colors hover:bg-shell-surface disabled:cursor-not-allowed disabled:opacity-50';
const btnPrimaryCls =
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-shell-accent bg-shell-accent px-3 py-1.5 text-[12px] font-semibold text-shell-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50';
const btnDangerCls =
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-shell-danger/40 bg-shell-danger/10 px-2.5 py-1 text-[11.5px] font-semibold text-shell-danger transition-colors hover:bg-shell-danger/20 disabled:cursor-not-allowed disabled:opacity-40';

export default function SuperAdminDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);

  // Tema compartido del panel (oscuro / claro)
  const [shellTheme, setShellTheme] = useState<'dark' | 'light'>('dark');
  useEffect(() => {
    const saved = window.localStorage.getItem('c4talogo.shell-theme');
    if (saved === 'light' || saved === 'dark') setShellTheme(saved);
  }, []);

  const toggleShellTheme = () => {
    setShellTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem('c4talogo.shell-theme', next);
      return next;
    });
  };

  // Toasts y diálogo de confirmación (sin alert / confirm / prompt nativos)
  const [toasts, setToasts] = useState<ShellToastItem[]>([]);
  const pushToast = useCallback((kind: ShellToastItem['kind'], text: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev.slice(-3), { id, kind, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    tone?: 'danger' | 'warn' | 'accent';
    onConfirm: () => void | Promise<void>;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Filtros de tabla de inquilinos
  const [tenantSearch, setTenantSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  // Configuración de Portada Principal
  const [activeLanding, setActiveLanding] = useState<'minimal' | 'classic'>('minimal');
  const [savingLanding, setSavingLanding] = useState(false);

  // Whitelist / Fase Beta
  const [whitelist, setWhitelist] = useState<any[]>([]);
  const [closedBetaEnabled, setClosedBetaEnabled] = useState(true);
  const [newWhitelistEmail, setNewWhitelistEmail] = useState('');
  const [addingWhitelist, setAddingWhitelist] = useState(false);

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

  // Modal: Asignar / Editar Dominio Personalizado
  const [domainModal, setDomainModal] = useState<{
    isOpen: boolean;
    tenant: any | null;
    value: string;
    saving: boolean;
  }>({ isOpen: false, tenant: null, value: '', saving: false });

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
        pushToast(
          'ok',
          nextState
            ? 'Modo Beta Cerrada activado: solo correos autorizados pueden crear tienda.'
            : 'Acceso público abierto para registros nuevos.'
        );
      } else {
        pushToast('error', 'No se pudo cambiar el modo beta.');
      }
    } catch {
      pushToast('error', 'Error de conexión cambiando el modo beta.');
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
      pushToast('ok', `Correo ${data.email} autorizado en la lista blanca.`);
      loadWhitelist();
    } catch (err: any) {
      pushToast('error', err.message || 'Error al autorizar correo.');
    } finally {
      setAddingWhitelist(false);
    }
  }

  function handleRemoveWhitelistEmail(email: string) {
    setConfirmDialog({
      isOpen: true,
      title: 'Revocar acceso de lista blanca',
      message: `¿Deseas revocar el acceso a ${email}? Si no tiene una tienda activa, ya no podrá ingresar.`,
      confirmLabel: 'Revocar',
      tone: 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/superadmin/whitelist?email=${encodeURIComponent(email)}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            pushToast('ok', `Acceso revocado para ${email}.`);
            loadWhitelist();
          } else {
            pushToast('error', 'No se pudo revocar el correo.');
          }
        } catch {
          pushToast('error', 'Error de conexión eliminando de la lista.');
        }
      },
    });
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

    setAccessDenied(false);

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
    try {
      const res = await fetch('/api/superadmin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_landing: type }),
      });
      if (res.ok) {
        setActiveLanding(type);
        pushToast(
          'ok',
          type === 'minimal'
            ? 'Portada cambiada a Minimalista e Informativa.'
            : 'Portada cambiada a SaaS Comercial Completo.'
        );
      } else {
        pushToast('error', 'Error al actualizar la portada.');
      }
    } catch {
      pushToast('error', 'Error de conexión al cambiar portada.');
    } finally {
      setSavingLanding(false);
    }
  }

  function handleToggleStatus(tenant: any) {
    const newStatus = tenant.status === 'active' ? 'suspended' : 'active';
    setConfirmDialog({
      isOpen: true,
      title: newStatus === 'suspended' ? `Suspender "${tenant.name}"` : `Reactivar "${tenant.name}"`,
      message:
        newStatus === 'suspended'
          ? 'El catálogo público dejará de mostrarse de inmediato (RAM y Cloudflare purgados) hasta que sea reactivado.'
          : 'El catálogo volverá a estar visible de inmediato en su subdominio.',
      confirmLabel: newStatus === 'suspended' ? 'Suspender' : 'Reactivar',
      tone: newStatus === 'suspended' ? 'warn' : 'accent',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch('/api/superadmin/tenants/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenant_id: tenant.id, status: newStatus }),
          });
          const data = await res.json();
          if (!res.ok) {
            pushToast('error', data.error || 'No se pudo actualizar el estado.');
          } else {
            pushToast(
              'ok',
              newStatus === 'suspended' ? 'Tienda suspendida y caché purgada.' : 'Tienda reactivada.'
            );
            checkAccessAndLoad();
          }
        } catch {
          pushToast('error', 'Error de conexión al actualizar estado.');
        }
      },
    });
  }

  async function handleChangePlan(tenantId: string, newPlanId: string) {
    try {
      const res = await fetch('/api/superadmin/tenants/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId, plan_id: newPlanId }),
      });
      const data = await res.json();
      if (!res.ok) {
        pushToast('error', data.error || 'No se pudo cambiar el plan.');
      } else {
        pushToast('ok', 'Plan actualizado correctamente.');
        checkAccessAndLoad();
      }
    } catch {
      pushToast('error', 'Error de conexión al cambiar plan.');
    }
  }

  function handleToggleCustomDomain(tenant: any) {
    const nextState = !tenant.custom_domain_enabled;
    setConfirmDialog({
      isOpen: true,
      title: nextState
        ? `Habilitar dominio propio para "${tenant.name}"`
        : `Deshabilitar dominio propio para "${tenant.name}"`,
      message: nextState
        ? 'El comerciante podrá vincular su propio dominio y servir el catálogo desde ahí.'
        : 'El catálogo dejará de responder por su dominio propio y solo usará su subdominio.',
      confirmLabel: nextState ? 'Habilitar' : 'Deshabilitar',
      tone: nextState ? 'accent' : 'warn',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch('/api/superadmin/tenants/custom-domain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenant_id: tenant.id,
              custom_domain_enabled: nextState,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            pushToast('error', data.error || 'No se pudo actualizar el permiso de dominio.');
            return;
          }
          pushToast('ok', nextState ? 'Dominio propio habilitado.' : 'Dominio propio deshabilitado.');
          checkAccessAndLoad();
        } catch {
          pushToast('error', 'Error de conexión al actualizar dominio propio.');
        }
      },
    });
  }

  function openCustomDomainModal(tenant: any) {
    setDomainModal({
      isOpen: true,
      tenant,
      value: tenant.custom_domain || '',
      saving: false,
    });
  }

  async function handleSaveCustomDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!domainModal.tenant) return;
    setDomainModal((prev) => ({ ...prev, saving: true }));
    try {
      const res = await fetch('/api/superadmin/tenants/custom-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: domainModal.tenant.id,
          custom_domain: domainModal.value.trim(),
          custom_domain_enabled: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        pushToast('error', data.error || 'No se pudo guardar el dominio.');
        setDomainModal((prev) => ({ ...prev, saving: false }));
        return;
      }
      pushToast('ok', 'Dominio personalizado actualizado.');
      setDomainModal({ isOpen: false, tenant: null, value: '', saving: false });
      checkAccessAndLoad();
    } catch {
      pushToast('error', 'Error de conexión al guardar dominio.');
      setDomainModal((prev) => ({ ...prev, saving: false }));
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
        pushToast('error', 'Error actualizando plan: ' + error.message);
      } else {
        pushToast('ok', 'Plan actualizado correctamente.');
        setEditingPlanId(null);
        checkAccessAndLoad();
      }
    } catch (err: any) {
      pushToast('error', err?.message || 'Error al guardar plan.');
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
      pushToast('ok', `Tienda "${createForm.subdomain}" creada y autorizada.`);
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
    pushToast('ok', 'Credenciales copiadas al portapapeles.');
    setTimeout(() => setCopiedCredentials(false), 3000);
  }

  async function handleExecuteDelete() {
    if (!deleteModal.tenant) return;
    if (deleteModal.confirmText.trim().toLowerCase() !== deleteModal.tenant.subdomain.toLowerCase()) {
      pushToast('warn', `Escribe exactamente "${deleteModal.tenant.subdomain}" para confirmar.`);
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

      pushToast('ok', data.message || 'Tienda eliminada exitosamente.');
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

  const filteredTenants = useMemo(() => {
    const q = tenantSearch.trim().toLowerCase();
    return tenants.filter((t) => {
      if (statusFilter === 'active' && t.status !== 'active') return false;
      if (statusFilter === 'suspended' && t.status === 'active') return false;
      if (!q) return true;
      return (
        String(t.name || '').toLowerCase().includes(q) ||
        String(t.subdomain || '').toLowerCase().includes(q) ||
        String(t.custom_domain || '').toLowerCase().includes(q) ||
        String(t.owner_email || t.google_email || '').toLowerCase().includes(q)
      );
    });
  }, [tenants, tenantSearch, statusFilter]);

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'c4talogo.com';
  const rootCls = shellTheme === 'light' ? 'theme-light' : '';

  if (loading) {
    return (
      <div className={`min-h-screen bg-shell-bg text-shell-ink flex items-center justify-center p-4 ${rootCls}`}>
        <div className="flex items-center gap-3 text-shell-muted">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-shell-accent border-t-transparent" />
          <span className="text-[13px] font-medium">Cargando Consola SuperAdmin…</span>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className={`min-h-screen bg-shell-bg text-shell-ink flex flex-col items-center justify-center p-6 text-center ${rootCls}`}>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-shell-warn/40 bg-shell-warn/10 text-lg text-shell-warn">
          <FaLock />
        </div>
        <h1 className="mb-2 text-[20px] font-semibold tracking-tight text-shell-ink">Acceso Restringido</h1>
        <p className="mb-6 max-w-md text-[12.5px] leading-relaxed text-shell-muted">
          Has iniciado sesión como <span className="font-semibold text-shell-ink">{currentUserEmail}</span>, pero esta cuenta no tiene privilegios de SuperAdministrador en la plataforma.
        </p>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <button onClick={() => router.push('/dashboard')} className={btnCls}>
            Ir a mi Panel de Inquilino
          </button>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/login');
            }}
            className={btnPrimaryCls}
          >
            Cerrar sesión e ingresar con otra cuenta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-shell-bg text-shell-ink flex flex-col font-sans ${rootCls}`}>
      {/* Header Consola Densa */}
      <header className="sticky top-0 z-30 border-b border-shell-line bg-shell-surface/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-shell-accent/40 bg-shell-accent/15 text-[13px] text-shell-accent">
              <FaShieldAlt />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold tracking-wide text-shell-ink">C4TALOGO MAESTRO</span>
                <span className="rounded border border-shell-accent/40 bg-shell-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-shell-accent">
                  SuperAdmin
                </span>
              </div>
              <div className="font-mono text-[11px] text-shell-muted">app.{baseDomain}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden font-mono text-[11.5px] text-shell-muted md:inline">{currentUserEmail}</span>

            <button
              type="button"
              onClick={toggleShellTheme}
              aria-label={shellTheme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              title={shellTheme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
              className="cursor-pointer rounded-md p-1.5 text-shell-ink-soft hover:bg-shell-raised hover:text-shell-ink"
            >
              {shellTheme === 'dark' ? (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.5" />
                  <path
                    d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3.1 3.1l1.1 1.1M11.8 11.8l1.1 1.1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M13.5 9.6A5.8 5.8 0 0 1 6.4 2.5a5.8 5.8 0 1 0 7.1 7.1Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/login');
              }}
              className={btnCls}
            >
              <FaSignOutAlt className="text-[11px]" />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6">
        {/* KPIs compactos */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className={cardCls}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-shell-muted">Tiendas</div>
            <div className="mt-1 font-mono text-[26px] font-bold tabular-nums text-shell-ink">
              {globalStats.totalTenants}
            </div>
            <div className="mt-0.5 text-[11.5px] text-shell-accent">{globalStats.activeTenants} activas</div>
          </div>

          <div className={cardCls}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-shell-muted">
              Fotos Indexadas
            </div>
            <div className="mt-1 font-mono text-[26px] font-bold tabular-nums text-shell-ink">
              {globalStats.totalPhotos.toLocaleString('es-PE')}
            </div>
            <div className="mt-0.5 text-[11.5px] text-shell-muted">Sincronizadas desde Drive</div>
          </div>

          <div className={cardCls}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-shell-muted">
              Almacenamiento R2
            </div>
            <div className="mt-1 font-mono text-[26px] font-bold tabular-nums text-shell-ink">
              {globalStats.totalStorageMB} <span className="text-[13px] font-normal text-shell-muted">MB</span>
            </div>
            <div className="mt-0.5 text-[11.5px] text-shell-muted">Objeto directo sin Sharp</div>
          </div>

          <div className={cardCls}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-shell-muted">
              Planes Activos
            </div>
            <div className="mt-1 font-mono text-[26px] font-bold tabular-nums text-shell-ink">{plans.length}</div>
            <div className="mt-0.5 text-[11.5px] text-shell-muted">Básico, Pro, Premium</div>
          </div>
        </div>

        {/* 1. Portada Principal + Whitelist lado a lado en desktop */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className={`${cardCls} space-y-4 lg:col-span-5`}>
            <div>
              <h2 className="text-[12px] font-bold uppercase tracking-[0.08em] text-shell-muted">
                Portada Principal ({baseDomain})
              </h2>
              <p className="mt-1 text-[12px] text-shell-ink-soft">
                Diseño visible en el dominio raíz para visitantes y evaluadores.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                disabled={savingLanding}
                onClick={() => handleSwitchLanding('minimal')}
                className={`w-full cursor-pointer rounded-md border p-3.5 text-left transition ${
                  activeLanding === 'minimal'
                    ? 'border-shell-accent bg-shell-accent/10'
                    : 'border-shell-line bg-shell-raised hover:border-shell-line-strong'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-shell-ink">Minimalista e Informativa</span>
                  <span className="rounded border border-shell-accent/40 px-1.5 py-0.5 text-[10px] font-semibold text-shell-accent">
                    {activeLanding === 'minimal' ? 'Activa' : 'Beta'}
                  </span>
                </div>
                <p className="mt-1 text-[11.5px] leading-relaxed text-shell-muted">
                  Redirige a los subdominios oficiales y muestra acceso privado sin registro abierto.
                </p>
              </button>

              <button
                type="button"
                disabled={savingLanding}
                onClick={() => handleSwitchLanding('classic')}
                className={`w-full cursor-pointer rounded-md border p-3.5 text-left transition ${
                  activeLanding === 'classic'
                    ? 'border-shell-accent bg-shell-accent/10'
                    : 'border-shell-line bg-shell-raised hover:border-shell-line-strong'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-shell-ink">SaaS Comercial Completo</span>
                  <span className="rounded border border-shell-line-strong px-1.5 py-0.5 text-[10px] font-semibold text-shell-ink-soft">
                    {activeLanding === 'classic' ? 'Activa' : 'Google Verificado'}
                  </span>
                </div>
                <p className="mt-1 text-[11.5px] leading-relaxed text-shell-muted">
                  Landing comercial completa con arquitectura Drive, WhatsApp y planes.
                </p>
              </button>
            </div>
          </section>

          <section className={`${cardCls} space-y-4 lg:col-span-7`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[12px] font-bold uppercase tracking-[0.08em] text-shell-muted">
                  Lista Blanca (Whitelist)
                </h2>
                <p className="mt-1 text-[12px] text-shell-ink-soft">
                  Correos autorizados para auto-aprovisionar tienda durante la beta.
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleClosedBeta}
                className={`cursor-pointer rounded-md border px-2.5 py-1 text-[11.5px] font-semibold transition ${
                  closedBetaEnabled
                    ? 'border-shell-accent/40 bg-shell-accent/10 text-shell-accent'
                    : 'border-shell-warn/40 bg-shell-warn/10 text-shell-warn'
                }`}
              >
                {closedBetaEnabled ? 'Beta Cerrada: ACTIVA' : 'Registro Público: ABIERTO'}
              </button>
            </div>

            <form onSubmit={handleAddWhitelistEmail} className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-shell-muted" />
                <input
                  type="email"
                  required
                  value={newWhitelistEmail}
                  onChange={(e) => setNewWhitelistEmail(e.target.value)}
                  placeholder="autorizar.usuario@gmail.com"
                  className={`${fieldCls} pl-8 font-mono`}
                />
              </div>
              <button type="submit" disabled={addingWhitelist} className={btnPrimaryCls}>
                <FaPlus className="text-[10px]" />
                <span>{addingWhitelist ? 'Autorizando…' : 'Autorizar'}</span>
              </button>
            </form>

            <div className="max-h-56 overflow-y-auto rounded-md border border-shell-line">
              <table className="w-full text-left text-[12px]">
                <thead className="sticky top-0 border-b border-shell-line bg-shell-raised text-shell-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Correo</th>
                    <th className="px-3 py-2 font-medium">Estado</th>
                    <th className="px-3 py-2 font-medium">Alta</th>
                    <th className="px-3 py-2 text-right font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-shell-line">
                  {whitelist.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-shell-muted">
                        Sin correos en la lista blanca.
                      </td>
                    </tr>
                  ) : (
                    whitelist.map((w) => (
                      <tr key={w.email} className="hover:bg-shell-raised/60">
                        <td className="px-3 py-2 font-mono text-shell-ink">{w.email}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                              w.has_active_store
                                ? 'border-shell-accent/40 bg-shell-accent/10 text-shell-accent'
                                : 'border-shell-line-strong bg-shell-raised text-shell-muted'
                            }`}
                          >
                            {w.has_active_store ? 'Activa' : 'Pendiente'}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-shell-muted">
                          {new Date(w.created_at).toLocaleDateString('es-PE')}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveWhitelistEmail(w.email)}
                            className={btnDangerCls}
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
          </section>
        </div>

        {/* 2. Planes */}
        <section className={`${cardCls} space-y-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[12px] font-bold uppercase tracking-[0.08em] text-shell-muted">
                Planes y Límites
              </h2>
              <p className="mt-0.5 text-[12px] text-shell-ink-soft">
                Fotos máximas, cuota de almacenamiento y precio mensual en Supabase.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {plans.map((p) => {
              const isEditing = editingPlanId === p.id;
              return (
                <div
                  key={p.id}
                  className={`flex flex-col justify-between rounded-md border bg-shell-raised p-4 ${
                    isEditing ? 'border-shell-accent' : 'border-shell-line'
                  }`}
                >
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={planForm.name}
                          onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                          className={fieldCls}
                        />
                      ) : (
                        <h3 className="text-[14px] font-semibold text-shell-ink">{p.name}</h3>
                      )}
                      <span className="rounded border border-shell-line-strong bg-shell-surface px-1.5 py-0.5 font-mono text-[10px] uppercase text-shell-muted">
                        {p.slug}
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="mb-4 space-y-2.5 text-[12px]">
                        <div>
                          <label className="mb-1 block text-shell-muted">Fotos Máximas</label>
                          <input
                            type="number"
                            value={planForm.max_photos}
                            onChange={(e) => setPlanForm({ ...planForm, max_photos: Number(e.target.value) })}
                            className={`${fieldCls} font-mono`}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-shell-muted">Almacenamiento (MB)</label>
                          <input
                            type="number"
                            value={planForm.max_storage_mb}
                            onChange={(e) => setPlanForm({ ...planForm, max_storage_mb: Number(e.target.value) })}
                            className={`${fieldCls} font-mono`}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-shell-muted">Precio Mensual ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={planForm.price_monthly}
                            onChange={(e) => setPlanForm({ ...planForm, price_monthly: Number(e.target.value) })}
                            className={`${fieldCls} font-mono`}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4 space-y-1.5 text-[12px]">
                        <div className="flex justify-between border-b border-shell-line py-1">
                          <span className="text-shell-muted">Fotos límite</span>
                          <strong className="font-mono text-shell-ink">{p.max_photos}</strong>
                        </div>
                        <div className="flex justify-between border-b border-shell-line py-1">
                          <span className="text-shell-muted">Almacenamiento</span>
                          <strong className="font-mono text-shell-ink">
                            {p.max_storage_mb >= 1024
                              ? `${(p.max_storage_mb / 1024).toFixed(1)} GB`
                              : `${p.max_storage_mb} MB`}
                          </strong>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-shell-muted">Precio mensual</span>
                          <strong className="font-mono text-shell-accent">
                            {Number(p.price_monthly) === 0 ? 'Gratis ($0.00)' : `$${Number(p.price_monthly).toFixed(2)}`}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 border-t border-shell-line pt-3">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSavePlan(p.id)}
                          disabled={savingPlan}
                          className={`${btnPrimaryCls} flex-1`}
                        >
                          <FaSave />
                          <span>{savingPlan ? 'Guardando…' : 'Guardar'}</span>
                        </button>
                        <button type="button" onClick={() => setEditingPlanId(null)} className={btnCls}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => startEditPlan(p)} className={`${btnCls} w-full`}>
                        <FaEdit className="text-[11px] text-shell-accent" />
                        <span>Editar Plan</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. Tabla de Inquilinos con Búsqueda y Filtros */}
        <section className={`${cardCls} space-y-4`}>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-[12px] font-bold uppercase tracking-[0.08em] text-shell-muted">
                Inquilinos ({filteredTenants.length} / {tenants.length})
              </h2>
              <p className="mt-0.5 text-[12px] text-shell-ink-soft">
                Suspender o cambiar plan invalida caché en RAM y purga Cloudflare al instante.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setCreatedSuccessData(null);
                setCreateError(null);
                generateRandomPassword();
                setIsCreateModalOpen(true);
              }}
              className={btnPrimaryCls}
            >
              <FaPlus className="text-[10px]" />
              <span>Nueva Tienda</span>
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-shell-muted" />
              <input
                type="text"
                value={tenantSearch}
                onChange={(e) => setTenantSearch(e.target.value)}
                placeholder="Buscar por nombre, subdominio, dominio propio o correo…"
                className={`${fieldCls} pl-8`}
              />
            </div>

            <div className="flex items-center gap-1 rounded-md border border-shell-line-strong bg-shell-raised p-0.5 text-[11.5px]">
              {(['all', 'active', 'suspended'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`cursor-pointer rounded px-2.5 py-1 font-medium transition ${
                    statusFilter === st
                      ? 'bg-shell-accent text-shell-accent-ink'
                      : 'text-shell-muted hover:text-shell-ink'
                  }`}
                >
                  {st === 'all' ? 'Todos' : st === 'active' ? 'Activos' : 'Suspendidos'}
                </button>
              ))}
            </div>
          </div>

          {filteredTenants.length === 0 ? (
            <div className="rounded-md border border-dashed border-shell-line py-8 text-center text-[12.5px] text-shell-muted">
              No se encontraron tiendas con ese criterio.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-shell-line">
              <table className="w-full text-left text-[12px]">
                <thead className="border-b border-shell-line bg-shell-raised text-shell-muted">
                  <tr>
                    <th className="px-3.5 py-2.5 font-medium">Tienda / Subdominio / Correo</th>
                    <th className="px-3.5 py-2.5 font-medium">Dominio Propio</th>
                    <th className="px-3.5 py-2.5 font-medium">Estado</th>
                    <th className="px-3.5 py-2.5 font-medium">Plan</th>
                    <th className="px-3.5 py-2.5 font-medium">Fotos</th>
                    <th className="px-3.5 py-2.5 font-medium">Alta</th>
                    <th className="px-3.5 py-2.5 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-shell-line">
                  {filteredTenants.map((t) => (
                    <tr key={t.id} className="hover:bg-shell-raised/50">
                      <td className="px-3.5 py-3">
                        <div className="font-semibold text-shell-ink">{t.name}</div>
                        <a
                          href={`https://${t.subdomain}.${baseDomain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[11px] text-shell-accent hover:underline"
                        >
                          <span>{t.subdomain}.{baseDomain}</span>
                          <FaExternalLinkAlt className="text-[9px]" />
                        </a>
                        <div className="mt-0.5 font-mono text-[11px] text-shell-muted">
                          {t.owner_email || t.google_email || 'Sin correo asociado'}
                        </div>
                      </td>

                      <td className="px-3.5 py-3">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleCustomDomain(t)}
                            className={`inline-flex w-fit cursor-pointer items-center gap-1.5 rounded border px-2 py-0.5 text-[10.5px] font-semibold ${
                              t.custom_domain_enabled
                                ? 'border-shell-accent/40 bg-shell-accent/10 text-shell-accent'
                                : 'border-shell-line-strong bg-shell-raised text-shell-muted'
                            }`}
                          >
                            <FaGlobe className="text-[10px]" />
                            <span>{t.custom_domain_enabled ? 'Habilitado' : 'Deshabilitado'}</span>
                          </button>

                          {t.custom_domain ? (
                            <div className="flex items-center gap-1.5">
                              <a
                                href={`https://${t.custom_domain}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-mono text-[11px] text-shell-ink hover:underline"
                              >
                                <span>{t.custom_domain}</span>
                                <FaExternalLinkAlt className="text-[8px]" />
                              </a>
                              <button
                                type="button"
                                onClick={() => openCustomDomainModal(t)}
                                title="Editar o quitar dominio"
                                className="cursor-pointer p-0.5 text-shell-muted hover:text-shell-accent"
                              >
                                <FaEdit className="text-[10px]" />
                              </button>
                            </div>
                          ) : t.custom_domain_enabled ? (
                            <button
                              type="button"
                              onClick={() => openCustomDomainModal(t)}
                              className="cursor-pointer text-left text-[11px] text-shell-accent hover:underline"
                            >
                              + Asignar dominio
                            </button>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-3.5 py-3">
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[10.5px] font-semibold ${
                            t.status === 'active'
                              ? 'border-shell-accent/40 bg-shell-accent/10 text-shell-accent'
                              : 'border-shell-danger/40 bg-shell-danger/10 text-shell-danger'
                          }`}
                        >
                          {t.status === 'active' ? 'Activo' : 'Suspendido'}
                        </span>
                      </td>

                      <td className="px-3.5 py-3">
                        <select
                          value={t.plan_id || ''}
                          onChange={(e) => handleChangePlan(t.id, e.target.value)}
                          className="rounded-md border border-shell-line-strong bg-shell-raised px-2 py-1 text-[11.5px] text-shell-ink focus:outline-none focus:ring-2 focus:ring-shell-accent/60"
                        >
                          {plans.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.max_photos})
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-3.5 py-3 font-mono tabular-nums text-shell-ink">
                        {t.current_photos_count || 0}
                      </td>

                      <td className="px-3.5 py-3 font-mono text-[11px] text-shell-muted">
                        {new Date(t.created_at).toLocaleDateString('es-PE')}
                      </td>

                      <td className="px-3.5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(t)}
                            className={btnCls}
                          >
                            {t.status === 'active' ? 'Suspender' : 'Reactivar'}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDeleteModal({
                                isOpen: true,
                                tenant: t,
                                confirmText: '',
                                deleting: false,
                                error: null,
                              })
                            }
                            className={btnDangerCls}
                            title="Eliminar tienda de Supabase y fotos de R2"
                          >
                            <FaTrash className="text-[10px]" />
                            <span>Baja</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* MODAL 1: NUEVA TIENDA */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-shell-bg/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg space-y-4 rounded-lg border border-shell-line-strong bg-shell-surface p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-shell-line pb-3">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-md border border-shell-accent/40 bg-shell-accent/10 text-shell-accent">
                  <FaStore />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-shell-ink">Alta de Nueva Tienda</h3>
                  <p className="text-[11.5px] text-shell-muted">Crea tienda, subdominio y credenciales iniciales.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="cursor-pointer rounded px-2 py-1 text-[16px] text-shell-muted hover:text-shell-ink"
              >
                ×
              </button>
            </div>

            {createdSuccessData ? (
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 rounded-md border border-shell-accent/40 bg-shell-accent/10 p-3 text-[12.5px] font-semibold text-shell-accent">
                  <FaCheckCircle />
                  <span>¡Tienda creada y autorizada con éxito!</span>
                </div>

                <div className="space-y-1.5 rounded-md border border-shell-line bg-shell-raised p-3.5 font-mono text-[12px]">
                  <div>
                    <span className="text-shell-muted">Catálogo:</span>{' '}
                    <span className="font-semibold text-shell-accent">
                      https://{createdSuccessData.credentials.subdomain}.{baseDomain}
                    </span>
                  </div>
                  <div>
                    <span className="text-shell-muted">Login:</span>{' '}
                    <span className="text-shell-ink">https://{baseDomain}/login</span>
                  </div>
                  <div>
                    <span className="text-shell-muted">Email:</span>{' '}
                    <span className="text-shell-ink">{createdSuccessData.credentials.email}</span>
                  </div>
                  <div>
                    <span className="text-shell-muted">Contraseña:</span>{' '}
                    <span className="font-semibold text-shell-warn">{createdSuccessData.credentials.password}</span>
                  </div>
                </div>

                <button type="button" onClick={copyCredentialsToClipboard} className={`${btnCls} w-full`}>
                  <FaCopy />
                  <span>{copiedCredentials ? 'Copiado al portapapeles' : 'Copiar mensaje completo para WhatsApp'}</span>
                </button>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setCreatedSuccessData(null);
                    }}
                    className={btnPrimaryCls}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateTenantSubmit} className="space-y-3.5">
                {createError && (
                  <div className="rounded-md border border-shell-danger/40 bg-shell-danger/10 p-2.5 text-[12px] text-shell-danger">
                    {createError}
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-shell-ink-soft">Nombre de la tienda</label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const autoSubdomain = name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                      setCreateForm((prev) => ({
                        ...prev,
                        name,
                        subdomain: prev.subdomain ? prev.subdomain : autoSubdomain,
                      }));
                    }}
                    placeholder="Ej. Modas Camila"
                    className={fieldCls}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-shell-ink-soft">Subdominio</label>
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
                      className={`${fieldCls} rounded-r-none font-mono`}
                    />
                    <span className="shrink-0 rounded-r-md border border-l-0 border-shell-line-strong bg-shell-surface px-2.5 py-1.5 font-mono text-[12px] text-shell-muted">
                      .{baseDomain}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-shell-ink-soft">Correo del cliente</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="cliente@gmail.com"
                    className={fieldCls}
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-[12px] font-medium text-shell-ink-soft">Contraseña</label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-shell-accent hover:underline"
                    >
                      <FaKey className="text-[9px]" /> Generar aleatoria
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      className={`${fieldCls} pr-9 font-mono`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-[12px] text-shell-muted hover:text-shell-ink"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-shell-ink-soft">Plan</label>
                  <select
                    value={createForm.plan_id}
                    onChange={(e) => setCreateForm({ ...createForm, plan_id: e.target.value })}
                    className={fieldCls}
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.max_photos} fotos, {p.max_storage_mb} MB)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 border-t border-shell-line pt-3">
                  <button type="button" onClick={() => setIsCreateModalOpen(false)} className={btnCls}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={creatingTenant} className={btnPrimaryCls}>
                    {creatingTenant ? 'Creando…' : 'Crear Tienda'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: DOMINIO PERSONALIZADO */}
      {domainModal.isOpen && domainModal.tenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-shell-bg/80 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveCustomDomain}
            className="w-full max-w-md space-y-4 rounded-lg border border-shell-line-strong bg-shell-surface p-5 shadow-2xl"
          >
            <div>
              <h3 className="text-[15px] font-semibold text-shell-ink">
                Dominio Propio — {domainModal.tenant.name}
              </h3>
              <p className="mt-1 text-[12px] text-shell-muted">
                Ej: <code className="font-mono">tiendajuan.com</code> o{' '}
                <code className="font-mono">catalogo.tiendajuan.com</code>. Déjalo vacío para quitarlo.
              </p>
            </div>

            <input
              type="text"
              value={domainModal.value}
              onChange={(e) => setDomainModal((prev) => ({ ...prev, value: e.target.value }))}
              placeholder="catalogo.mitienda.com"
              className={`${fieldCls} font-mono`}
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={domainModal.saving}
                onClick={() => setDomainModal({ isOpen: false, tenant: null, value: '', saving: false })}
                className={btnCls}
              >
                Cancelar
              </button>
              <button type="submit" disabled={domainModal.saving} className={btnPrimaryCls}>
                {domainModal.saving ? 'Guardando…' : 'Guardar Dominio'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: DAR DE BAJA TIENDA */}
      {deleteModal.isOpen && deleteModal.tenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-shell-bg/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-lg border border-shell-danger/50 bg-shell-surface p-5 shadow-2xl">
            <div className="flex items-center gap-3 text-shell-danger">
              <div className="grid h-9 w-9 place-items-center rounded-md border border-shell-danger/40 bg-shell-danger/10">
                <FaExclamationTriangle />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-shell-ink">Dar de baja Tienda</h3>
                <p className="text-[11.5px] text-shell-danger">Eliminación irreversible en cascada</p>
              </div>
            </div>

            <div className="space-y-1.5 rounded-md border border-shell-danger/30 bg-shell-danger/10 p-3 text-[12px] text-shell-ink-soft">
              <p>
                Vas a eliminar definitivamente <strong className="text-shell-ink">{deleteModal.tenant.name}</strong> (
                <code className="font-mono text-shell-warn">{deleteModal.tenant.subdomain}</code>).
              </p>
              <ul className="list-inside list-disc space-y-0.5 text-[11.5px] text-shell-muted">
                <li>Se borrarán todas sus fotos en Cloudflare R2.</li>
                <li>Se eliminarán álbumes, fotos y configuración en Supabase.</li>
                <li>Se revocará su subdominio y lista blanca.</li>
              </ul>
            </div>

            {deleteModal.error && (
              <div className="rounded-md border border-shell-danger/40 bg-shell-danger/10 p-2.5 text-[12px] text-shell-danger">
                {deleteModal.error}
              </div>
            )}

            <div>
              <label className="mb-1 block text-[12px] text-shell-ink-soft">
                Escribe <code className="font-mono font-bold text-shell-warn">{deleteModal.tenant.subdomain}</code>{' '}
                para confirmar:
              </label>
              <input
                type="text"
                value={deleteModal.confirmText}
                onChange={(e) => setDeleteModal({ ...deleteModal, confirmText: e.target.value })}
                placeholder={deleteModal.tenant.subdomain}
                className={`${fieldCls} font-mono`}
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-shell-line pt-3">
              <button
                type="button"
                onClick={() =>
                  setDeleteModal({ isOpen: false, tenant: null, confirmText: '', deleting: false, error: null })
                }
                className={btnCls}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={
                  deleteModal.deleting ||
                  deleteModal.confirmText.trim().toLowerCase() !== deleteModal.tenant.subdomain.toLowerCase()
                }
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-shell-danger bg-shell-danger px-3.5 py-1.5 text-[12px] font-semibold text-shell-accent-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FaTrash className="text-[10px]" />
                <span>{deleteModal.deleting ? 'Eliminando…' : 'Eliminar Definitivamente'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ShellConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        tone={confirmDialog.tone}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      <ShellToastStack
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((item) => item.id !== id))}
      />
    </div>
  );
}
