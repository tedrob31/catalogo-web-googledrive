'use client';

interface HistoryTabProps {
  logs: any[];
}

export default function HistoryTab({ logs = [] }: HistoryTabProps) {
  return (
    <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-6 shadow-sm">
      <h2 className="text-base font-bold text-zinc-100 mb-4">Historial de Sincronizaciones</h2>
      {logs.length === 0 ? (
        <p className="text-xs text-zinc-500">Aún no hay registros de sincronización.</p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl flex items-center justify-between text-xs hover:bg-zinc-800/40 transition"
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
                  <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[10px]">
                    {log.status}
                  </span>
                  {log.error_message && (
                    <span className="text-rose-400 text-[10px] truncate max-w-xs">
                      ({log.error_message})
                    </span>
                  )}
                </div>
                <span className="text-zinc-400 text-[11px]">
                  Inicio: {new Date(log.started_at).toLocaleString('es-PE')}
                </span>
              </div>

              <div className="text-right">
                <div className="text-zinc-100 font-mono font-medium">
                  {log.total_photos || 0} fotos
                </div>
                <div className="text-[10px] text-zinc-500">
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
