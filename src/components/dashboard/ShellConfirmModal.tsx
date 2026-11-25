'use client';

interface ShellConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'warn' | 'accent';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ShellConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'warn',
  busy = false,
  onConfirm,
  onCancel,
}: ShellConfirmModalProps) {
  if (!isOpen) return null;

  const confirmCls =
    tone === 'danger'
      ? 'border-shell-danger bg-shell-danger text-shell-accent-ink'
      : tone === 'accent'
        ? 'border-shell-accent bg-shell-accent text-shell-accent-ink'
        : 'border-shell-warn bg-shell-warn text-shell-accent-ink';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-shell-bg/80 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shell-confirm-title"
        className="w-full max-w-md rounded-lg border border-shell-line-strong bg-shell-surface p-5 shadow-xl"
      >
        <h3 id="shell-confirm-title" className="text-[15px] font-semibold text-shell-ink">
          {title}
        </h3>
        <p className="mt-2 whitespace-pre-line text-[12.5px] leading-relaxed text-shell-ink-soft">
          {message}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="cursor-pointer rounded-md border border-shell-line-strong bg-shell-raised px-3.5 py-1.5 text-[12.5px] font-medium text-shell-ink-soft transition hover:text-shell-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`cursor-pointer rounded-md border px-3.5 py-1.5 text-[12.5px] font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${confirmCls}`}
          >
            {busy ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
