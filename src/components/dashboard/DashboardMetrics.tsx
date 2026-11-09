'use client';

import { FaImages, FaGoogle, FaSync, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

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
  // Métricas de Fotos
  const currentPhotos = tenant?.current_photos_count || 0;
  const maxPhotos = plan?.max_photos || 500;
  const photoPercentage = Math.min(100, Math.round((currentPhotos / maxPhotos) * 100));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {/* 1. Fotos en Catálogo */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 backdrop-blur-sm group">
        <div>
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-zinc-800/80 text-zinc-300 border border-zinc-700/40">
                <FaImages className="text-xs" />
              </span>
              <span>Fotos en Catálogo</span>
            </span>
            <span className="text-[11px] font-mono text-zinc-500">{photoPercentage}% cupo</span>
          </div>
          <div className="mt-4 mb-3">
            <div className="text-3xl font-bold tracking-tight text-zinc-100 font-mono">
              {currentPhotos.toLocaleString('es-PE')}
              <span className="text-sm font-normal text-zinc-500 ml-1.5 font-sans">
                / {maxPhotos.toLocaleString('es-PE')} máx
              </span>
            </div>
          </div>
        </div>
        <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-amber-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${photoPercentage}%` }}
          />
        </div>
      </div>

      {/* 2. Cuenta de Google Drive */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 backdrop-blur-sm group">
        <div>
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-zinc-800/80 text-zinc-300 border border-zinc-700/40">
                <FaGoogle className="text-xs" />
              </span>
              <span>Google Drive</span>
            </span>
            {integration?.is_connected ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Conectado</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>{integration?.google_email ? 'Sesión expirada' : 'Por autorizar'}</span>
              </span>
            )}
          </div>
          <div className="mt-4 mb-2">
            <div
              className="text-sm font-semibold text-zinc-100 truncate tracking-tight"
              title={integration?.google_email || 'No vinculada'}
            >
              {integration?.google_email || 'No vinculada'}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5 truncate">
              {integration?.catalog_folder_name
                ? `Carpeta: ${integration.catalog_folder_name}`
                : 'Carpeta de catálogo pendiente'}
            </p>
          </div>
        </div>
        {!integration?.is_connected && integration?.google_email ? (
          <a
            href="/api/auth/google"
            className="mt-2 inline-flex items-center justify-center w-full py-1.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 rounded-xl font-medium text-xs transition"
          >
            Reconectar cuenta
          </a>
        ) : (
          <div className="text-[11px] text-zinc-500 pt-1">Sincronización incremental activa</div>
        )}
      </div>

      {/* 3. Última Sincronización */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 backdrop-blur-sm group">
        <div>
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-zinc-800/80 text-zinc-300 border border-zinc-700/40">
                <FaSync className="text-xs" />
              </span>
              <span>Sincronización</span>
            </span>
            <span className="text-[11px] font-mono text-zinc-500">Espejo Cloudflare R2</span>
          </div>
          <div className="mt-4 mb-2">
            <div className="text-xs text-zinc-400">Última actualización:</div>
            <div className="text-sm font-semibold text-zinc-100 truncate mt-0.5">
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
        </div>
        <button
          onClick={onSyncNow}
          disabled={syncing || !integration?.catalog_folder_id}
          className="mt-2 flex items-center justify-center gap-2 w-full py-2 px-3 bg-zinc-100 hover:bg-white text-zinc-900 rounded-xl text-xs font-semibold transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
        >
          <FaSync className={`text-xs ${syncing ? 'animate-spin' : ''}`} />
          <span>
            {syncing
              ? syncLiveStatus
                ? `Sync (${syncLiveStatus.total_photos || 0})...`
                : 'Iniciando...'
              : 'Sincronizar ahora'}
          </span>
        </button>
      </div>
    </div>
  );
}

