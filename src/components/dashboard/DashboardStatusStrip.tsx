'use client';

interface Props {
  driveConnected: boolean | null;
  syncing: boolean;
  onSyncNow: () => void;
  onCancelSync?: () => void;
  cancellingSync?: boolean;
  syncProgress?: { processed: number; total: number; albums: number } | null;
  lastSyncAt?: string | null;
  photosCount?: number;
  /** Cupo de fotos del plan contratado. Sin esto no se ve cuánto margen queda. */
  photosLimit?: number | null;
  albumsCount?: number;
  onOpenNav: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

function relativeTime(iso?: string | null): string {
  if (!iso) return 'nunca';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'nunca';
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return 'recién';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} d`;
}

/**
 * Franja de estado con la acción principal siempre a la vista.
 *
 * Sincronizar es lo que se hace todos los días, así que vive acá y no dentro de una pestaña:
 * queda fija arriba mientras el contenido scrollea. También es donde vive el menú, porque en
 * pantallas chicas la navegación era inalcanzable.
 */
export default function DashboardStatusStrip({
  driveConnected,
  syncing,
  onSyncNow,
  onCancelSync,
  cancellingSync = false,
  syncProgress,
  lastSyncAt,
  photosCount,
  photosLimit,
  albumsCount,
  onOpenNav,
  theme,
  onToggleTheme,
}: Props) {
  const connected = driveConnected === true;
  const photosPercent =
    typeof photosCount === 'number' && typeof photosLimit === 'number' && photosLimit > 0
      ? Math.round((photosCount / photosLimit) * 100)
      : 0;

  return (
    <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-shell-line bg-shell-surface/95 px-3 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-shell-surface/80 sm:px-5">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Abrir navegación"
        className="shrink-0 cursor-pointer rounded-md p-1.5 text-shell-ink-soft hover:bg-shell-raised hover:text-shell-ink"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      <span className="hidden text-[10px] font-bold uppercase tracking-[0.1em] text-shell-muted sm:block">
        Drive
      </span>

      <span className="flex items-baseline gap-1.5 text-[13px]">
        <b
          className="font-semibold"
          style={{ color: connected ? 'var(--color-shell-accent)' : 'var(--color-shell-warn)' }}
        >
          {driveConnected === null ? 'verificando' : connected ? 'Conectado' : 'Sin conectar'}
        </b>
      </span>

      {connected && (
        <>
          <span className="hidden items-baseline gap-1.5 text-[13px] sm:flex">
            <span className="text-[11.5px] text-shell-muted">sync</span>
            <b className="font-semibold text-shell-ink">{relativeTime(lastSyncAt)}</b>
          </span>
          {typeof photosCount === 'number' && (
            <span className="hidden items-center gap-1.5 text-[13px] md:flex">
              <span className="text-[11.5px] text-shell-muted">fotos</span>
              <b className="font-semibold tabular-nums text-shell-ink">{photosCount}</b>
              {typeof photosLimit === 'number' && photosLimit > 0 && (
                <>
                  <span className="tabular-nums text-shell-muted">/ {photosLimit}</span>
                  <span
                    className="h-1 w-12 shrink-0 overflow-hidden rounded-full bg-shell-raised"
                    title={`${photosPercent}% del cupo del plan`}
                  >
                    <span
                      className={`block h-full ${photosPercent >= 90 ? 'bg-shell-warn' : 'bg-shell-accent'}`}
                      style={{ width: `${Math.min(100, photosPercent)}%` }}
                    />
                  </span>
                </>
              )}
            </span>
          )}
          {typeof albumsCount === 'number' && (
            <span className="hidden items-baseline gap-1.5 text-[13px] md:flex">
              <span className="text-[11.5px] text-shell-muted">álbumes</span>
              <b className="font-semibold tabular-nums text-shell-ink">{albumsCount}</b>
            </span>
          )}
        </>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
          className="cursor-pointer rounded-md p-1.5 text-shell-ink-soft hover:bg-shell-raised hover:text-shell-ink"
        >
          {theme === 'dark' ? (
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

        {syncing && onCancelSync && (
          <button
            type="button"
            onClick={onCancelSync}
            disabled={cancellingSync}
            className="cursor-pointer rounded-md border border-shell-line-strong bg-shell-raised px-2.5 py-[6px] text-[12px] font-medium text-shell-ink-soft transition hover:border-shell-danger/50 hover:text-shell-danger disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancellingSync ? 'Cancelando…' : 'Cancelar'}
          </button>
        )}

        <button
          onClick={onSyncNow}
          disabled={syncing || !connected}
          title={connected ? undefined : 'Conectá Google Drive para sincronizar'}
          className="flex cursor-pointer items-center gap-1.5 rounded-md border border-shell-accent bg-shell-accent px-3 py-[6px] text-[12.5px] font-semibold text-shell-accent-ink transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {syncing
            ? syncProgress && syncProgress.processed > 0
              ? `Sincronizando (${syncProgress.processed})…`
              : 'Sincronizando…'
            : 'Sincronizar'}
        </button>
      </div>
    </div>
  );
}
