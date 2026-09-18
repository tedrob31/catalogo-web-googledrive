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
  const currentPhotos = tenant?.current_photos_count || 0;
  const maxPhotos = plan?.max_photos || 500;
  const percentage = Math.min(100, Math.round((currentPhotos / maxPhotos) * 100));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {/* 1. Fotos en Catálogo */}
      <div className="bg-slate-900/40 border border-white/10 rounded-xl p-4">
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
        <div className="w-full bg-white/5 rounded-full h-1.5 mt-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-amber-500 to-rose-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* 2. Cuenta de Google Drive */}
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

      {/* 3. Última Sincronización */}
      <div className="bg-slate-900/40 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
        <div>
          <div className="text-xs text-slate-400 font-medium mb-1">Última Sincronización</div>
          <div className="text-sm font-semibold text-white">
            {integration?.last_synced_at
              ? new Date(integration.last_synced_at).toLocaleString('es-PE')
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
                ? `Sincronizando (${syncLiveStatus.total_photos || 0} fotos)...`
                : 'Iniciando en 2do plano...'
              : 'Sincronizar Catálogo'}
          </span>
        </button>
      </div>
    </div>
  );
}
