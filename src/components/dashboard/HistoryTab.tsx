'use client';

interface HistoryTabProps {
  logs: any[];
}

const STATUS_LABEL: Record<string, string> = {
  completed: 'completada',
  syncing: 'en curso',
  running: 'en curso',
  failed: 'falló',
  error: 'falló',
  cancelled: 'cancelada',
};

export default function HistoryTab({ logs = [] }: HistoryTabProps) {
  return (
    <div>
      <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-shell-ink">Historial</h1>
      <p className="mb-6 mt-1 max-w-[66ch] text-[13px] text-shell-muted">
        Cada sincronización que disparaste, con cuántas fotos procesó y si algo falló.
      </p>

      {logs.length === 0 ? (
        <p className="rounded-md border border-dashed border-shell-line px-4 py-8 text-center text-[12.5px] text-shell-muted">
          Todavía no hay sincronizaciones registradas.
        </p>
      ) : (
        <ul className="border-t border-shell-line">
          {logs.map((log) => {
            const failed = log.status === 'failed' || log.status === 'error';
            const running = log.status === 'syncing' || log.status === 'running';
            return (
              <li
                key={log.id}
                className="flex flex-col gap-1 border-b border-shell-line py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                        failed
                          ? 'border-shell-danger/40 text-shell-danger'
                          : running
                            ? 'border-shell-warn/40 text-shell-warn'
                            : 'border-shell-accent/40 text-shell-accent'
                      }`}
                    >
                      {STATUS_LABEL[log.status] || log.status}
                    </span>
                    <span className="text-[12px] tabular-nums text-shell-ink-soft">
                      {new Date(log.started_at).toLocaleString('es-PE')}
                    </span>
                  </div>
                  {log.error_message && (
                    <p className="mt-1 truncate text-[11.5px] text-shell-danger" title={log.error_message}>
                      {log.error_message}
                    </p>
                  )}
                </div>

                <div className="shrink-0 text-[12px] sm:text-right">
                  <div className="tabular-nums text-shell-ink">
                    <b className="font-semibold">{log.items_processed || 0}</b> subidas a R2
                  </div>
                  <div className="text-[11px] tabular-nums text-shell-muted">
                    {log.total_photos || 0} fotos en el catálogo
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
