'use client';

interface HistoryTabProps {
  logs: any[];
}

export default function HistoryTab({ logs = [] }: HistoryTabProps) {
  return (
    <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
      <h2 className="text-base font-bold text-white mb-4">Historial de Sincronizaciones</h2>
      {logs.length === 0 ? (
        <p className="text-xs text-slate-500">Aún no hay registros de sincronización.</p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-3.5 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between text-xs hover:bg-white/[0.07] transition"
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
                  {log.error_message && (
                    <span className="text-rose-400 text-[10px] truncate max-w-xs">
                      ({log.error_message})
                    </span>
                  )}
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
                  {log.items_processed || 0} fotos subidas a Cloudflare R2
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
