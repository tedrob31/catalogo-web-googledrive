'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  FaFolder,
  FaGoogle,
  FaSync,
  FaExternalLinkAlt,
  FaCog,
  FaImages,
  FaCheckCircle,
  FaExclamationCircle,
  FaSearch,
  FaSignOutAlt,
  FaCrown,
  FaPalette,
  FaMagic,
  FaStore,
  FaShareAlt,
} from 'react-icons/fa';
import StorefrontBuilder from '@/components/admin/StorefrontBuilder';

export default function TenantDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [integration, setIntegration] = useState<any>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'drive' | 'design' | 'effects' | 'branding' | 'storefront' | 'history'>('drive');

  // Drive state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchingFolders, setSearchingFolders] = useState(false);
  const [folders, setFolders] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCatalogFolder, setSelectedCatalogFolder] = useState<{ id: string; name: string } | null>(null);
  const [selectedCoverFolder, setSelectedCoverFolder] = useState<{ id: string; name: string } | null>(null);
  const [savingFolders, setSavingFolders] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncLiveStatus, setSyncLiveStatus] = useState<any>(null);

  // Unified Configuration state (stored in Supabase tenant_configs + settings JSONB)
  const [savingConfig, setSavingConfig] = useState(false);
  const [configForm, setConfigForm] = useState({
    name: '',
    subdomain: '',
    title: '',
    subtitle: '',
    whatsapp: '',
    logo_url: '',
    favicon_url: '',
    og_image: '',
    force_global_og_image: false,
    primary_color: '#111827',
    secondary_color: '#ffffff',
    text_color: '#000000',
    theme: 'light',
    grid_columns: 5,
    mobile_grid_columns: 2,
    card_border_width: 1,
    card_border_color: '#e5e7eb',
    hide_album_titles: false,
    seasonal_effect: 'none',
    seasonal_custom_icon: '',
    seasonal_duration: 0,
    click_effect: 'none',
    folder_covers: {} as Record<string, string>,
  });

  // Storefront builder dependencies
  const [availableCovers, setAvailableCovers] = useState<string[]>([]);
  const [tenantAlbums, setTenantAlbums] = useState<any[]>([]);
  const [tenantAlbumUrls, setTenantAlbumUrls] = useState<string[]>([]);

  // Logs state
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }
    setUser(user);

    // 1. Cargar membresía y tenant
    const { data: membership } = await supabase
      .from('tenant_users')
      .select('role, tenant_id, tenants (*, subscription_plans (*))')
      .eq('user_id', user.id)
      .single();

    if (!membership || !membership.tenants) {
      setLoading(false);
      return;
    }

    const t = membership.tenants as any;
    setTenant(t);
    setPlan(t.subscription_plans);

    // 2. Cargar configuración completa desde Supabase (tenant_configs + settings JSONB)
    const { data: cfg } = await supabase
      .from('tenant_configs')
      .select('*')
      .eq('tenant_id', t.id)
      .single();

    if (cfg) {
      const rawSettings = (cfg.settings as Record<string, any>) || {};
      setConfigForm({
        name: t.name,
        subdomain: t.subdomain,
        title: cfg.title || t.name,
        subtitle: cfg.subtitle || '',
        whatsapp: cfg.whatsapp || '',
        logo_url: cfg.logo_url || '',
        favicon_url: cfg.favicon_url || '',
        og_image: rawSettings.og_image || '',
        force_global_og_image: Boolean(rawSettings.force_global_og_image),
        primary_color: cfg.primary_color || '#111827',
        secondary_color: rawSettings.secondary_color || '#ffffff',
        text_color: rawSettings.text_color || '#000000',
        theme: cfg.theme || 'light',
        grid_columns: rawSettings.grid_columns || 5,
        mobile_grid_columns: rawSettings.mobile_grid_columns || 2,
        card_border_width: rawSettings.card_border_width !== undefined ? Number(rawSettings.card_border_width) : 1,
        card_border_color: rawSettings.card_border_color || '#e5e7eb',
        hide_album_titles: Boolean(rawSettings.hide_album_titles),
        seasonal_effect: rawSettings.seasonal_effect || 'none',
        seasonal_custom_icon: rawSettings.seasonal_custom_icon || '',
        seasonal_duration: Number(rawSettings.seasonal_duration) || 0,
        click_effect: rawSettings.click_effect || 'none',
        folder_covers: rawSettings.folder_covers || {},
      });
    }

    // 3. Cargar google_integrations de forma SEGURA (Sin exponer refresh_token al navegador)
    const { data: integ } = await supabase
      .from('google_integrations')
      .select('tenant_id, google_email, catalog_folder_id, catalog_folder_name, cover_folder_id, cover_folder_name, last_synced_at, is_connected')
      .eq('tenant_id', t.id)
      .single();

    if (integ) {
      setIntegration(integ);
      if (integ.catalog_folder_id) {
        setSelectedCatalogFolder({
          id: integ.catalog_folder_id,
          name: integ.catalog_folder_name || 'Carpeta Principal',
        });
      }
      if (integ.cover_folder_id) {
        setSelectedCoverFolder({
          id: integ.cover_folder_id,
          name: integ.cover_folder_name || 'Carpeta de Portadas',
        });
      }
    }

    // 4. Cargar álbumes para el constructor de Storefront
    const { data: dbAlbums } = await supabase
      .from('albums')
      .select('id, name, slug, path')
      .eq('tenant_id', t.id)
      .order('order_index');

    if (dbAlbums) {
      setTenantAlbums(dbAlbums.map((a) => ({ id: a.id, name: a.name, photos: [], subAlbums: [] })));
      setTenantAlbumUrls(dbAlbums.map((a) => a.path || a.slug));
    }

    // 5. Cargar portadas disponibles vía API multi-tenant
    fetch('/api/covers')
      .then((res) => res.json())
      .then((data) => {
        if (data.covers) setAvailableCovers(data.covers);
      })
      .catch((err) => console.error('Error cargando portadas:', err));

    // 6. Cargar historial de logs
    const { data: dbLogs } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('tenant_id', t.id)
      .order('started_at', { ascending: false })
      .limit(6);

    if (dbLogs) {
      setLogs(dbLogs);
      if (dbLogs[0]?.status === 'syncing') {
        setSyncing(true);
        pollSync(dbLogs[0].id);
      }
    }

    setLoading(false);
  }

  async function handleSearchFolders() {
    // Seguridad: verificar conectividad sin requerir el token en el cliente
    if (!integration?.is_connected) {
      alert('Debes conectar tu cuenta de Google Drive primero.');
      return;
    }
    setSearchingFolders(true);
    try {
      const res = await fetch(`/api/drive/folders?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.folders) {
        setFolders(data.folders);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingFolders(false);
    }
  }

  async function handleSaveFolders() {
    if (!selectedCatalogFolder) {
      alert('Por favor selecciona la carpeta principal de tu catálogo.');
      return;
    }
    setSavingFolders(true);
    try {
      const res = await fetch('/api/drive/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalog_folder_id: selectedCatalogFolder.id,
          catalog_folder_name: selectedCatalogFolder.name,
          cover_folder_id: selectedCoverFolder?.id || null,
          cover_folder_name: selectedCoverFolder?.name || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Carpetas configuradas correctamente en Supabase.');
        loadDashboardData();
      } else {
        alert(data.error || 'Error al guardar carpetas');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingFolders(false);
    }
  }

  function pollSync(logId: string) {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/sync?logId=${logId}`);
        const data = await res.json();
        if (data.success && data.log) {
          setSyncLiveStatus(data.log);
          if (data.log.status === 'completed') {
            clearInterval(interval);
            setSyncing(false);
            setSyncLiveStatus(null);
            alert(`¡Sincronización completada con éxito! Se procesaron ${data.log.items_processed || 0} fotos nuevas.`);
            loadDashboardData();
          } else if (data.log.status === 'failed') {
            clearInterval(interval);
            setSyncing(false);
            setSyncLiveStatus(null);
            alert(`Error en sincronización: ${data.log.error_message || 'Desconocido'}`);
            loadDashboardData();
          }
        }
      } catch (e) {
        console.error('Error en polling de sincronización:', e);
      }
    }, 2500);
  }

  async function handleSyncNow() {
    setSyncing(true);
    setSyncLiveStatus(null);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.logId) {
        pollSync(data.logId);
      } else {
        alert(data.error || data.message || 'Error al iniciar sincronización');
        setSyncing(false);
      }
    } catch (err: any) {
      alert(err.message || 'Error durante la sincronización');
      setSyncing(false);
    }
  }

  async function handleSaveConfig(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setSavingConfig(true);
    try {
      // 1. Si cambió el subdominio o nombre, actualizar la tabla tenants
      const cleanSub = configForm.subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (cleanSub !== tenant.subdomain || configForm.name !== tenant.name) {
        const { error: tErr } = await supabase
          .from('tenants')
          .update({
            name: configForm.name,
            subdomain: cleanSub,
            updated_at: new Date().toISOString(),
          })
          .eq('id', tenant.id);

        if (tErr) throw tErr;
      }

      // 2. Guardar toda la configuración visual y efectos en Supabase vía /api/config
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteTitle: configForm.title,
          siteDescription: configForm.subtitle,
          whatsappNumber: configForm.whatsapp,
          logoUrl: configForm.logo_url,
          favicon: configForm.favicon_url,
          primaryColor: configForm.primary_color,
          secondaryColor: configForm.secondary_color,
          textColor: configForm.text_color,
          theme: configForm.theme,
          gridColumns: configForm.grid_columns,
          mobileGridColumns: configForm.mobile_grid_columns,
          hideAlbumTitles: configForm.hide_album_titles,
          cardBorderWidth: configForm.card_border_width,
          cardBorderColor: configForm.card_border_color,
          seasonalEffect: configForm.seasonal_effect,
          seasonalCustomIcon: configForm.seasonal_custom_icon,
          seasonalDuration: configForm.seasonal_duration,
          clickEffect: configForm.click_effect,
          ogImage: configForm.og_image,
          forceGlobalOgImage: configForm.force_global_og_image,
          folderCovers: configForm.folder_covers,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar la configuración');

      alert('¡Configuración guardada exitosamente en Supabase!');
      loadDashboardData();
    } catch (err: any) {
      alert(err.message || 'Error guardando cambios');
    } finally {
      setSavingConfig(false);
    }
  }

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'c4talogo.com';
  const storefrontUrl = tenant
    ? `https://${tenant.subdomain}.${baseDomain}`
    : '#';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Cargando tu tienda...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center font-black text-white text-sm shadow-md">
              C4
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">{tenant?.name || 'Mi Tienda'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium flex items-center gap-1">
                  <FaCrown className="text-[10px]" />
                  {plan?.name || 'Gratuito'}
                </span>
              </div>
              <a
                href={storefrontUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-amber-400/90 hover:text-amber-300 flex items-center gap-1 font-mono transition"
              >
                <span>{tenant?.subdomain}.{baseDomain}</span>
                <FaExternalLinkAlt className="text-[9px]" />
              </a>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900/40 border border-white/10 rounded-xl p-4">
            <div className="text-xs text-slate-400 font-medium mb-1 flex items-center gap-1.5">
              <FaImages className="text-amber-400" />
              <span>Fotos en Catálogo</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {tenant?.current_photos_count || 0}
              <span className="text-xs text-slate-500 font-normal ml-1">
                / {plan?.max_photos || 500} máx
              </span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    ((tenant?.current_photos_count || 0) / (plan?.max_photos || 500)) * 100
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="bg-slate-900/40 border border-white/10 rounded-xl p-4">
            <div className="text-xs text-slate-400 font-medium mb-1 flex items-center gap-1.5">
              <FaGoogle className="text-rose-400" />
              <span>Cuenta de Google Drive</span>
            </div>
            <div className="text-sm font-semibold text-white truncate">
              {integration?.google_email || 'No vinculada'}
            </div>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              {integration?.is_connected ? (
                <>
                  <FaCheckCircle className="text-emerald-400 text-xs" />
                  <span className="text-emerald-400 font-medium">Conectado y Autorizado</span>
                </>
              ) : (
                <>
                  <FaExclamationCircle className="text-amber-400 text-xs" />
                  <span>Requiere autorización</span>
                </>
              )}
            </div>
          </div>

          <div className="bg-slate-900/40 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
            <div className="text-xs text-slate-400 font-medium mb-1">Última Sincronización</div>
            <div className="text-sm font-semibold text-white">
              {integration?.last_synced_at
                ? new Date(integration.last_synced_at).toLocaleString('es-PE')
                : 'Nunca sincronizado'}
            </div>
            <button
              onClick={handleSyncNow}
              disabled={syncing || !integration?.catalog_folder_id}
              className="mt-2 flex items-center justify-center gap-2 py-1.5 px-3 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:pointer-events-none"
            >
              <FaSync className={syncing ? 'animate-spin' : ''} />
              <span>
                {syncing
                  ? syncLiveStatus
                    ? `Sincronizando (${syncLiveStatus.total_photos || 0} fotos)...`
                    : 'Iniciando en 2do plano...'
                  : 'Sincronizar Catálogo'}
              </span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 mb-6 gap-6 text-sm font-medium overflow-x-auto">
          <button
            onClick={() => setActiveTab('drive')}
            className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'drive'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FaGoogle />
            <span>Google Drive</span>
          </button>
          <button
            onClick={() => setActiveTab('design')}
            className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'design'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FaPalette />
            <span>Diseño y Grilla</span>
          </button>
          <button
            onClick={() => setActiveTab('effects')}
            className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'effects'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FaMagic />
            <span>Efectos Interactivos</span>
          </button>
          <button
            onClick={() => setActiveTab('branding')}
            className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'branding'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FaShareAlt />
            <span>Subdominio y SEO</span>
          </button>
          <button
            onClick={() => setActiveTab('storefront')}
            className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'storefront'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FaStore />
            <span>Creador Storefront</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'history'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FaSync />
            <span>Historial</span>
          </button>
        </div>

        {/* TAB 1: GOOGLE DRIVE & FOLDERS */}
        {activeTab === 'drive' && (
          <div className="space-y-6">
            <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
              <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-mono">1</span>
                <span>Vincular Cuenta de Google Drive</span>
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Autoriza a c4talogo.com a leer tus carpetas y fotos de Google Drive en modo de solo lectura.
              </p>

              {integration?.is_connected ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                  <div className="flex items-center gap-2 font-medium">
                    <FaCheckCircle className="text-emerald-400" />
                    <span>Conectado como {integration.google_email}</span>
                  </div>
                  <a
                    href="/api/auth/google"
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
                  >
                    Reconectar cuenta
                  </a>
                </div>
              ) : (
                <a
                  href="/api/auth/google"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-gray-900 hover:bg-gray-100 font-semibold text-xs rounded-xl transition shadow-md"
                >
                  <FaGoogle className="text-red-500" />
                  <span>Conectar con Google Drive</span>
                </a>
              )}
            </div>

            <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
              <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-mono">2</span>
                <span>Seleccionar Carpetas de Catálogo y Portadas</span>
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Busca en tu Drive la carpeta principal donde tienes organizados tus álbumes.
              </p>

              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
                  <input
                    type="text"
                    placeholder="Escribe el nombre de tu carpeta en Drive (ej. Catálogo 2026)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchFolders()}
                    className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
                <button
                  onClick={handleSearchFolders}
                  disabled={searchingFolders}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-xl transition disabled:opacity-50"
                >
                  {searchingFolders ? 'Buscando...' : 'Buscar'}
                </button>
              </div>

              {folders.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto mb-6 pr-1">
                  <div className="text-xs font-medium text-slate-400 mb-1">Resultados de búsqueda:</div>
                  {folders.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FaFolder className="text-amber-400 shrink-0" />
                        <span className="truncate text-white font-medium">{f.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setSelectedCatalogFolder(f)}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                            selectedCatalogFolder?.id === f.id
                              ? 'bg-amber-500 text-white'
                              : 'bg-white/10 hover:bg-white/20 text-slate-300'
                          }`}
                        >
                          {selectedCatalogFolder?.id === f.id ? 'Catálogo Seleccionado' : 'Elegir como Catálogo'}
                        </button>
                        <button
                          onClick={() => setSelectedCoverFolder(f)}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                            selectedCoverFolder?.id === f.id
                              ? 'bg-rose-500 text-white'
                              : 'bg-white/10 hover:bg-white/20 text-slate-300'
                          }`}
                        >
                          {selectedCoverFolder?.id === f.id ? 'Portadas Seleccionadas' : 'Elegir Portadas'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Carpeta Principal del Catálogo:</label>
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs flex items-center justify-between">
                    <span className="font-semibold text-amber-400 truncate">
                      {selectedCatalogFolder ? selectedCatalogFolder.name : 'Ninguna seleccionada'}
                    </span>
                    {selectedCatalogFolder && (
                      <span className="text-[10px] font-mono text-slate-500">{selectedCatalogFolder.id.slice(0, 8)}...</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Carpeta de Portadas (Opcional):</label>
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs flex items-center justify-between">
                    <span className="font-semibold text-rose-400 truncate">
                      {selectedCoverFolder ? selectedCoverFolder.name : 'Ninguna (usará primera foto)'}
                    </span>
                    {selectedCoverFolder && (
                      <span className="text-[10px] font-mono text-slate-500">{selectedCoverFolder.id.slice(0, 8)}...</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveFolders}
                disabled={savingFolders || !selectedCatalogFolder}
                className="mt-6 w-full py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs rounded-xl transition disabled:opacity-50"
              >
                {savingFolders ? 'Guardando...' : 'Guardar Selección de Carpetas'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: DISEÑO Y GRILLA */}
        {activeTab === 'design' && (
          <form onSubmit={handleSaveConfig} className="space-y-6">
            <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6 space-y-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FaPalette className="text-amber-400" />
                <span>Estructura de Grilla y Columnas</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Columnas en Pantallas de Escritorio (Desktop):
                  </label>
                  <select
                    value={configForm.grid_columns}
                    onChange={(e) => setConfigForm({ ...configForm, grid_columns: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value={2}>2 Columnas (Editorial grande)</option>
                    <option value={3}>3 Columnas</option>
                    <option value={4}>4 Columnas (Estándar)</option>
                    <option value={5}>5 Columnas (Recomendado)</option>
                    <option value={6}>6 Columnas (Compacto)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Columnas en Teléfonos Móviles:
                  </label>
                  <select
                    value={configForm.mobile_grid_columns}
                    onChange={(e) => setConfigForm({ ...configForm, mobile_grid_columns: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value={1}>1 Columna (Foto completa)</option>
                    <option value={2}>2 Columnas (Estándar tipo Instagram)</option>
                    <option value={3}>3 Columnas (Galería compacta)</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Ocultar Títulos de Álbumes</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Muestra las portadas como banners limpios de catálogo sin texto visible debajo de la foto.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={configForm.hide_album_titles}
                  onChange={(e) => setConfigForm({ ...configForm, hide_album_titles: e.target.checked })}
                  className="w-5 h-5 rounded bg-slate-800 border-white/10 text-amber-500 focus:ring-amber-500 cursor-pointer"
                />
              </div>

              <h2 className="text-base font-bold text-white pt-4 border-t border-white/10">
                Paleta de Colores y Tarjetas
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Color Primario (Encabezados/Botones):</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={configForm.primary_color}
                      onChange={(e) => setConfigForm({ ...configForm, primary_color: e.target.value })}
                      className="w-10 h-10 rounded-lg border border-white/20 bg-transparent cursor-pointer p-0.5"
                    />
                    <span className="text-xs font-mono text-slate-300">{configForm.primary_color}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Color Secundario (Fondo/Superficies):</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={configForm.secondary_color}
                      onChange={(e) => setConfigForm({ ...configForm, secondary_color: e.target.value })}
                      className="w-10 h-10 rounded-lg border border-white/20 bg-transparent cursor-pointer p-0.5"
                    />
                    <span className="text-xs font-mono text-slate-300">{configForm.secondary_color}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Color de Textos:</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={configForm.text_color}
                      onChange={(e) => setConfigForm({ ...configForm, text_color: e.target.value })}
                      className="w-10 h-10 rounded-lg border border-white/20 bg-transparent cursor-pointer p-0.5"
                    />
                    <span className="text-xs font-mono text-slate-300">{configForm.text_color}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Grosor de Borde de Tarjetas (px):</label>
                  <input
                    type="number"
                    min={0}
                    max={8}
                    value={configForm.card_border_width}
                    onChange={(e) => setConfigForm({ ...configForm, card_border_width: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Color del Borde de Tarjetas:</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={configForm.card_border_color}
                      onChange={(e) => setConfigForm({ ...configForm, card_border_color: e.target.value })}
                      className="w-10 h-10 rounded-lg border border-white/20 bg-transparent cursor-pointer p-0.5"
                    />
                    <span className="text-xs font-mono text-slate-300">{configForm.card_border_color}</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingConfig}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs rounded-xl transition disabled:opacity-50"
              >
                {savingConfig ? 'Guardando...' : 'Guardar Diseño en Supabase'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: EFECTOS INTERACTIVOS */}
        {activeTab === 'effects' && (
          <form onSubmit={handleSaveConfig} className="space-y-6">
            <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6 space-y-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FaMagic className="text-amber-400" />
                <span>Animaciones de Temporada (Efectos de Caída)</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Tipo de Caída:</label>
                  <select
                    value={configForm.seasonal_effect}
                    onChange={(e) => setConfigForm({ ...configForm, seasonal_effect: e.target.value })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="none">Desactivado (Ninguno)</option>
                    <option value="snow">Nieve (Copos invernales)</option>
                    <option value="hearts">Corazones flotantes (San Valentín/Amor)</option>
                    <option value="custom">Icono Personalizado (URL)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Duración del Efecto (Segundos):
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={configForm.seasonal_duration}
                    onChange={(e) => setConfigForm({ ...configForm, seasonal_duration: Number(e.target.value) })}
                    placeholder="0 = Infinito"
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Usa 0 para que caiga permanentemente mientras el cliente navega.</p>
                </div>
              </div>

              {configForm.seasonal_effect === 'custom' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    URL del Icono Personalizado (PNG transparente o SVG):
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={configForm.seasonal_custom_icon}
                    onChange={(e) => setConfigForm({ ...configForm, seasonal_custom_icon: e.target.value })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <h2 className="text-base font-bold text-white pt-4 border-t border-white/10">
                Efectos al Hacer Clic / Toque
              </h2>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Efecto de Explosión al Clic:</label>
                <select
                  value={configForm.click_effect}
                  onChange={(e) => setConfigForm({ ...configForm, click_effect: e.target.value })}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="none">Sin efecto de clic</option>
                  <option value="stars">Chispas / Estrellas brillantes</option>
                  <option value="hearts">Minicorazones</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">Genera una microanimación lúdica cada vez que un visitante toca la pantalla.</p>
              </div>

              <button
                type="submit"
                disabled={savingConfig}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs rounded-xl transition disabled:opacity-50"
              >
                {savingConfig ? 'Guardando...' : 'Guardar Efectos en Supabase'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 4: SUBDOMINIO Y SEO */}
        {activeTab === 'branding' && (
          <form onSubmit={handleSaveConfig} className="space-y-6">
            <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6 space-y-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FaShareAlt className="text-amber-400" />
                <span>Identidad y Dirección Web (Subdominio)</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Nombre Comercial de la Tienda:</label>
                  <input
                    type="text"
                    required
                    value={configForm.name}
                    onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Subdominio propio:</label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      required
                      value={configForm.subdomain}
                      onChange={(e) => setConfigForm({ ...configForm, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      className="w-full bg-slate-800 border border-white/10 rounded-l-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                    <span className="bg-slate-800 border border-l-0 border-white/10 px-3 py-2 text-xs text-slate-400 font-mono rounded-r-xl">
                      .{baseDomain}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Título de la Pestaña (Site Title):</label>
                  <input
                    type="text"
                    value={configForm.title}
                    onChange={(e) => setConfigForm({ ...configForm, title: e.target.value })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">WhatsApp para Pedidos:</label>
                  <input
                    type="text"
                    placeholder="Ej: +51 987654321"
                    value={configForm.whatsapp}
                    onChange={(e) => setConfigForm({ ...configForm, whatsapp: e.target.value })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Descripción / Subtítulo (SEO & Google):</label>
                <textarea
                  rows={2}
                  value={configForm.subtitle}
                  onChange={(e) => setConfigForm({ ...configForm, subtitle: e.target.value })}
                  placeholder="Catálogo de calzado, ropa y accesorios de alta calidad..."
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <h2 className="text-base font-bold text-white pt-4 border-t border-white/10">
                Logotipo, Favicon e Imagen de Previsualización (OG Image)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">URL del Logo (Opcional):</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={configForm.logo_url}
                    onChange={(e) => setConfigForm({ ...configForm, logo_url: e.target.value })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">URL del Favicon (Icono de pestaña):</label>
                  <input
                    type="url"
                    placeholder="https://... o /favicon.ico"
                    value={configForm.favicon_url}
                    onChange={(e) => setConfigForm({ ...configForm, favicon_url: e.target.value })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  URL de Portada para Redes Sociales (Facebook, WhatsApp, Twitter):
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={configForm.og_image}
                  onChange={(e) => setConfigForm({ ...configForm, og_image: e.target.value })}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Forzar Imagen Global en Todo el Sitio</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Si está activo, al compartir enlaces de álbumes se mostrará siempre tu portada global en lugar de la foto del álbum específico.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={configForm.force_global_og_image}
                  onChange={(e) => setConfigForm({ ...configForm, force_global_og_image: e.target.checked })}
                  className="w-5 h-5 rounded bg-slate-800 border-white/10 text-amber-500 focus:ring-amber-500 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={savingConfig}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs rounded-xl transition disabled:opacity-50"
              >
                {savingConfig ? 'Guardando...' : 'Guardar Marca y SEO en Supabase'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 5: CREADOR VISUAL STOREFRONT */}
        {activeTab === 'storefront' && (
          <div className="bg-white rounded-2xl p-6 text-gray-900 shadow-xl">
            <StorefrontBuilder
              availableCovers={availableCovers}
              allAlbums={tenantAlbums}
              allAlbumUrls={tenantAlbumUrls}
            />
          </div>
        )}

        {/* TAB 6: HISTORIAL DE SINCRONIZACIÓN */}
        {activeTab === 'history' && (
          <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
            <h2 className="text-base font-bold text-white mb-4">Historial de Sincronizaciones</h2>
            {logs.length === 0 ? (
              <p className="text-xs text-slate-500">Aún no hay registros de sincronización.</p>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            log.status === 'completed'
                              ? 'bg-emerald-400'
                              : log.status === 'syncing'
                              ? 'bg-amber-400 animate-pulse'
                              : 'bg-rose-500'
                          }`}
                        />
                        <span className="font-semibold text-white uppercase tracking-wider text-[10px]">
                          {log.status}
                        </span>
                      </div>
                      <span className="text-slate-400 text-[11px]">
                        Inicio: {new Date(log.started_at).toLocaleString('es-PE')}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-white font-mono font-medium">
                        {log.total_photos || 0} fotos
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {log.items_processed || 0} fotos nuevas subidas a R2
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
