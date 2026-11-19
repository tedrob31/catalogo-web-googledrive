'use client';

interface Props {
  driveConnected: boolean | null;
  syncing: boolean;
  onSyncNow: () => void;
  lastSyncAt?: string | null;
  photosCount?: number;
  albumsCount?: number;
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
 * queda fija arriba mientras el contenido scrollea.
 */
export default function DashboardStatusStrip({
  driveConnected,
  syncing,
  onSyncNow,
  lastSyncAt,
  photosCount,
  albumsCount,
}: Props) {
  const connected = driveConnected === true;

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-shell-line bg-shell-surface/95 px-5 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-shell-surface/80">
      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-shell-muted">Drive</span>

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
          <span className="flex items-baseline gap-1.5 text-[13px]">
            <span className="text-[11.5px] text-shell-muted">sync</span>
            <b className="font-semibold text-shell-ink">{relativeTime(lastSyncAt)}</b>
          </span>
          {typeof photosCount === 'number' && (
            <span className="flex items-baseline gap-1.5 text-[13px]">
              <span className="text-[11.5px] text-shell-muted">fotos</span>
              <b className="font-semibold tabular-nums text-shell-ink">{photosCount}</b>
            </span>
          )}
          {typeof albumsCount === 'number' && (
            <span className="flex items-baseline gap-1.5 text-[13px]">
              <span className="text-[11.5px] text-shell-muted">álbumes</span>
              <b className="font-semibold tabular-nums text-shell-ink">{albumsCount}</b>
            </span>
          )}
        </>
      )}

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onSyncNow}
          disabled={syncing || !connected}
          title={connected ? undefined : 'Conectá Google Drive para sincronizar'}
          className="flex cursor-pointer items-center gap-1.5 rounded-md border border-shell-accent bg-shell-accent px-3 py-[6px] text-[12.5px] font-semibold text-shell-accent-ink transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {syncing ? 'Sincronizando…' : 'Sincronizar'}
        </button>
      </div>
    </div>
  );
}
