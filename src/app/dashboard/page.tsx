'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  FaGoogle,
  FaPalette,
  FaMagic,
  FaShareAlt,
  FaStore,
  FaSync,
} from 'react-icons/fa';

import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardMetrics from '@/components/dashboard/DashboardMetrics';
import DriveTab, { AlbumItem } from '@/components/dashboard/DriveTab';
import DesignTab from '@/components/dashboard/DesignTab';
import EffectsTab from '@/components/dashboard/EffectsTab';
import BrandingTab from '@/components/dashboard/BrandingTab';
import HistoryTab from '@/components/dashboard/HistoryTab';
import CoverSelectorModal from '@/components/dashboard/CoverSelectorModal';
import StorefrontBuilder from '@/components/admin/StorefrontBuilder';

export const dynamic = 'force-dynamic';

export default function TenantDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [integration, setIntegration] = useState<any>(null);

  // Pestaña activa
  const [activeTab, setActiveTab] = useState<
    'drive' | 'design' | 'effects' | 'branding' | 'storefront' | 'history'
  >('drive');

  // Estado de Drive y Carpetas
  const [searchQuery, setSearchQuery] = useState('');
  const [searchingFolders, setSearchingFolders] = useState(false);
  const [folders, setFolders] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCatalogFolder, setSelectedCatalogFolder] = useState<{ id: string; name: string } | null>(null);
  const [selectedCoverFolder, setSelectedCoverFolder] = useState<{ id: string; name: string } | null>(null);
  const [savingFolders, setSavingFolders] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncLiveStatus, setSyncLiveStatus] = useState<any>(null);

  // Álbumes e Imágenes para el gestor de portadas
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [availableCovers, setAvailableCovers] = useState<string[]>([]);
  const [detailedPhotos, setDetailedPhotos] = useState<any[]>([]);

  // Para Storefront Builder
  const [tenantAlbums, setTenantAlbums] = useState<any[]>([]);
  const [tenantAlbumUrls, setTenantAlbumUrls] = useState<string[]>([]);

  // Configuración Unificada (tenant_configs + settings JSONB)
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

  // Logs
  const [logs, setLogs] = useState<any[]>([]);

  // Modal de selección de portadas
  const [coverModal, setCoverModal] = useState<{
    isOpen: boolean;
    targetType: 'album' | 'media';
    targetId: string;
    title: string;
  }>({
    isOpen: false,
    targetType: 'album',
    targetId: '',
    title: '',
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

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

    // 2. Cargar configuración completa desde Supabase
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
        card_border_width:
          rawSettings.card_border_width !== undefined ? Number(rawSettings.card_border_width) : 1,
        card_border_color: rawSettings.card_border_color || '#e5e7eb',
        hide_album_titles: Boolean(rawSettings.hide_album_titles),
        seasonal_effect: rawSettings.seasonal_effect || 'none',
        seasonal_custom_icon: rawSettings.seasonal_custom_icon || '',
        seasonal_duration: Number(rawSettings.seasonal_duration) || 0,
        click_effect: rawSettings.click_effect || 'none',
        folder_covers: rawSettings.folder_covers || {},
      });
    }

    // 3. Cargar google_integrations
    const { data: integ } = await supabase
      .from('google_integrations')
      .select(
        'tenant_id, google_email, catalog_folder_id, catalog_folder_name, cover_folder_id, cover_folder_name, last_synced_at, is_connected'
      )
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

    // 4. Cargar portadas y fotos disponibles vía API
    let photosMap = new Map<string, any>();
    try {
      const res = await fetch('/api/covers');
      const data = await res.json();
      if (data.covers) setAvailableCovers(data.covers);
      if (data.photos) {
        setDetailedPhotos(data.photos);
        data.photos.forEach((p: any) => photosMap.set(p.id, p));
      }
    } catch (err) {
      console.error('Error cargando portadas:', err);
    }

    // 5. Cargar álbumes para el gestor de portadas y Storefront
    const { data: dbAlbums } = await supabase
      .from('albums')
      .select('id, name, slug, path, parent_id, cover_photo_r2_key, photos(id, r2_key, name)')
      .eq('tenant_id', t.id)
      .not('path', 'like', '_covers%')
      .order('order_index');

    if (dbAlbums) {
      const mappedAlbums: AlbumItem[] = dbAlbums.map((a: any) => {
        const albumPhotos = a.photos || [];
        const firstP = albumPhotos[0];
        const matchFirst = firstP ? photosMap.get(firstP.id) : null;
        return {
          id: a.id,
          name: a.name,
          slug: a.slug,
          path: a.path,
          photosCount: albumPhotos.length,
          firstPhotoThumb: matchFirst?.thumbnailUrl || matchFirst?.url || undefined,
        };
      });
      setAlbums(mappedAlbums);

      setTenantAlbums(
        dbAlbums.map((a) => ({ id: a.id, name: a.name, photos: [], subAlbums: [] }))
      );
      setTenantAlbumUrls(dbAlbums.map((a) => a.path || a.slug));
    }

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
            alert(`¡Sincronización completada! Se procesaron ${data.log.items_processed || 0} fotos nuevas.`);
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

  // Manejo de Selección de Portada
  function handleOpenCoverSelector(albumId: string) {
    const album = albums.find((a) => a.id === albumId);
    setCoverModal({
      isOpen: true,
      targetType: 'album',
      targetId: albumId,
      title: `Elegir Portada para: ${album?.name || 'Álbum'}`,
    });
  }

  function handleOpenMediaSelector(field: '__LOGO__' | '__FAVICON__' | '__OG__') {
    const titles: Record<string, string> = {
      __LOGO__: 'Seleccionar Imagen para el Logotipo',
      __FAVICON__: 'Seleccionar Icono para el Favicon',
      __OG__: 'Seleccionar Portada para Redes Sociales (OG Image)',
    };
    setCoverModal({
      isOpen: true,
      targetType: 'media',
      targetId: field,
      title: titles[field] || 'Seleccionar Imagen',
    });
  }

  async function handleSelectCover(url: string, r2Key?: string) {
    if (!coverModal.targetId) return;

    if (coverModal.targetType === 'album') {
      const albumId = coverModal.targetId;
      const newCovers = { ...configForm.folder_covers, [albumId]: url };
      setConfigForm((prev) => ({ ...prev, folder_covers: newCovers }));

      if (r2Key) {
        await supabase
          .from('albums')
          .update({ cover_photo_r2_key: r2Key })
          .eq('id', albumId);
      }

      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderCovers: newCovers }),
      });
    } else if (coverModal.targetType === 'media') {
      if (coverModal.targetId === '__LOGO__') {
        setConfigForm((prev) => ({ ...prev, logo_url: url }));
      } else if (coverModal.targetId === '__FAVICON__') {
        setConfigForm((prev) => ({ ...prev, favicon_url: url }));
      } else if (coverModal.targetId === '__OG__') {
        setConfigForm((prev) => ({ ...prev, og_image: url }));
      }
    }
  }

  async function handleResetCover(albumId: string) {
    const newCovers = { ...configForm.folder_covers };
    delete newCovers[albumId];
    setConfigForm((prev) => ({ ...prev, folder_covers: newCovers }));

    await supabase
      .from('albums')
      .update({ cover_photo_r2_key: null })
      .eq('id', albumId);

    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderCovers: newCovers }),
    });
  }

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'c4talogo.com';

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
      {/* 1. Header Modular */}
      <DashboardHeader
        tenant={tenant}
        plan={plan}
        baseDomain={baseDomain}
        onSignOut={() => supabase.auth.signOut().then(() => router.push('/login'))}
      />

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        {/* 2. Métricas Modulares */}
        <DashboardMetrics
          tenant={tenant}
          plan={plan}
          integration={integration}
          syncing={syncing}
          syncLiveStatus={syncLiveStatus}
          onSyncNow={handleSyncNow}
        />

        {/* 3. Navegación de Pestañas */}
        <div className="flex border-b border-white/10 mb-6 gap-6 text-sm font-medium overflow-x-auto">
          <button
            onClick={() => setActiveTab('drive')}
            className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
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
            className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
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
            className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
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
            className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
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
            className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
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
            className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'history'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FaSync />
            <span>Historial</span>
          </button>
        </div>

        {/* 4. Contenido Modular de Cada Pestaña */}
        {activeTab === 'drive' && (
          <DriveTab
            integration={integration}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchingFolders={searchingFolders}
            folders={folders}
            selectedCatalogFolder={selectedCatalogFolder}
            setSelectedCatalogFolder={setSelectedCatalogFolder}
            selectedCoverFolder={selectedCoverFolder}
            setSelectedCoverFolder={setSelectedCoverFolder}
            savingFolders={savingFolders}
            onSearchFolders={handleSearchFolders}
            onSaveFolders={handleSaveFolders}
            albums={albums}
            folderCovers={configForm.folder_covers}
            onOpenCoverSelector={handleOpenCoverSelector}
            onResetCover={handleResetCover}
          />
        )}

        {activeTab === 'design' && (
          <DesignTab
            configForm={configForm}
            setConfigForm={setConfigForm}
            savingConfig={savingConfig}
            onSaveConfig={handleSaveConfig}
          />
        )}

        {activeTab === 'effects' && (
          <EffectsTab
            configForm={configForm}
            setConfigForm={setConfigForm}
            savingConfig={savingConfig}
            onSaveConfig={handleSaveConfig}
          />
        )}

        {activeTab === 'branding' && (
          <BrandingTab
            configForm={configForm}
            setConfigForm={setConfigForm}
            baseDomain={baseDomain}
            savingConfig={savingConfig}
            onSaveConfig={handleSaveConfig}
            onOpenMediaSelector={handleOpenMediaSelector}
          />
        )}

        {activeTab === 'storefront' && (
          <div className="bg-white rounded-2xl p-6 text-gray-900 shadow-xl">
            <StorefrontBuilder
              availableCovers={availableCovers}
              allAlbums={tenantAlbums}
              allAlbumUrls={tenantAlbumUrls}
            />
          </div>
        )}

        {activeTab === 'history' && <HistoryTab logs={logs} />}
      </main>

      {/* 5. Modal Reutilizable de Selección de Portadas */}
      <CoverSelectorModal
        isOpen={coverModal.isOpen}
        onClose={() => setCoverModal({ isOpen: false, targetType: 'album', targetId: '', title: '' })}
        onSelect={handleSelectCover}
        title={coverModal.title}
        availableCovers={availableCovers}
        detailedPhotos={detailedPhotos}
      />
    </div>
  );
}
