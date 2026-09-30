'use client';

import { FaImages, FaHdd, FaGoogle, FaSync, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

interface DashboardMetricsProps {
  tenant: any;
  plan: any;
  integration: any;
  syncing: boolean;
  syncLiveStatus: any;
  onSyncNow: () => void;
}

export default function DashboardMetrics({
  tenant,
  plan,
  integration,
  syncing,
  syncLiveStatus,
  onSyncNow,
}: DashboardMetricsProps) {
  // 1. Métricas de Fotos
  const currentPhotos = tenant?.current_photos_count || 0;
  const maxPhotos = plan?.max_photos || 500;
  const photoPercentage = Math.min(100, Math.round((currentPhotos / maxPhotos) * 100));

  // 2. Métricas de Almacenamiento (MB)
  const currentStorageBytes = tenant?.current_storage_bytes || 0;
  const currentStorageMB = Number((currentStorageBytes / (1024 * 1024)).toFixed(1));
  const maxStorageMB = plan?.max_storage_mb || 512;
  const storagePercentage = Math.min(100, Math.round((currentStorageMB / maxStorageMB) * 100));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* 1. Fotos en Catálogo */}
      <div className="bg-slate-900/40 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
        <div>
          <div className="text-xs text-slate-400 font-medium mb-1 flex items-center gap-1.5">
            <FaImages className="text-amber-400" />
            <span>Fotos en Catálogo</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {currentPhotos}
            <span className="text-xs text-slate-500 font-normal ml-1">
              / {maxPhotos} máx
            </span>
          </div>
        </div>
        <div className="w-full bg-white/5 rounded-full h-1.5 mt-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-amber-500 to-rose-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${photoPercentage}%` }}
          />
        </div>
      </div>

      {/* 2. Almacenamiento Consumido */}
      <div className="bg-slate-900/40 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
        <div>
          <div className="text-xs text-slate-400 font-medium mb-1 flex items-center gap-1.5">
            <FaHdd className="text-cyan-400" />
            <span>Almacenamiento</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {currentStorageMB}
            <span className="text-xs text-slate-300 font-medium ml-1">MB</span>
            <span className="text-xs text-slate-500 font-normal ml-1">
              / {maxStorageMB} MB
            </span>
          </div>
        </div>
        <div className="w-full bg-white/5 rounded-full h-1.5 mt-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${storagePercentage}%` }}
          />
        </div>
      </div>

      {/* 3. Cuenta de Google Drive */}
      <div className="bg-slate-900/40 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
        <div>
          <div className="text-xs text-slate-400 font-medium mb-1 flex items-center gap-1.5">
            <FaGoogle className="text-rose-400" />
            <span>Google Drive</span>
          </div>
          <div className="text-sm font-semibold text-white truncate" title={integration?.google_email || 'No vinculada'}>
            {integration?.google_email || 'No vinculada'}
          </div>
        </div>
        <div className="text-xs text-slate-500 mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {integration?.is_connected ? (
              <>
                <FaCheckCircle className="text-emerald-400 text-xs" />
                <span className="text-emerald-400 font-medium">Conectado</span>
              </>
            ) : (
              <>
                <FaExclamationCircle className="text-amber-400 text-xs" />
                <span className="text-amber-400 font-medium truncate">
                  {integration?.google_email ? 'Sesión expirada (7d)' : 'Por autorizar'}
                </span>
              </>
            )}
          </div>
          {!integration?.is_connected && integration?.google_email && (
            <a
              href="/api/auth/google"
              className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded font-semibold text-[11px] transition"
            >
              Reconectar
            </a>
          )}
        </div>
      </div>

      {/* 4. Última Sincronización */}
      <div className="bg-slate-900/40 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
        <div>
          <div className="text-xs text-slate-400 font-medium mb-1">Última Sincronización</div>
          <div className="text-xs font-semibold text-white truncate">
            {integration?.last_synced_at
              ? new Date(integration.last_synced_at).toLocaleString('es-PE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Nunca sincronizado'}
          </div>
        </div>
        <button
          onClick={onSyncNow}
          disabled={syncing || !integration?.catalog_folder_id}
          className="mt-3 flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow"
        >
          <FaSync className={syncing ? 'animate-spin' : ''} />
          <span>
            {syncing
              ? syncLiveStatus
                ? `Sync (${syncLiveStatus.total_photos || 0})...`
                : 'Iniciando...'
              : 'Sincronizar'}
          </span>
        </button>
      </div>
    </div>
  );
}

