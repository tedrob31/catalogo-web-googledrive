'use client';

export interface ShellToastItem {
  id: number;
  kind: 'ok' | 'error' | 'warn';
  text: string;
}

interface ShellToastStackProps {
  toasts: ShellToastItem[];
  onDismiss: (id: number) => void;
}

export default function ShellToastStack({ toasts, onDismiss }: ShellToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
    >
      {toasts.map((t) => {
        const toneBorder =
          t.kind === 'error'
            ? 'border-shell-danger/50'
            : t.kind === 'warn'
              ? 'border-shell-warn/50'
              : 'border-shell-accent/50';
        const toneDot =
          t.kind === 'error'
            ? 'bg-shell-danger'
            : t.kind === 'warn'
              ? 'bg-shell-warn'
              : 'bg-shell-accent';

        return (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={`flex items-start gap-2.5 rounded-md border ${toneBorder} bg-shell-surface px-3.5 py-2.5 text-[12.5px] text-shell-ink shadow-lg`}
          >
            <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${toneDot}`} />
            <p className="flex-1 leading-relaxed">{t.text}</p>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Cerrar notificación"
              className="shrink-0 cursor-pointer rounded px-1 text-[13px] text-shell-muted transition-colors hover:text-shell-ink"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
