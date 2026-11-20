'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FaLock, FaKey, FaCheckCircle, FaTimes, FaShieldAlt } from 'react-icons/fa';

interface AccountSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

const inputCls =
  'w-full rounded-md border border-shell-line-strong bg-shell-raised px-2.5 py-2 text-[12.5px] text-shell-ink placeholder:text-shell-muted transition focus:outline-none focus:ring-2 focus:ring-shell-accent/60';

const labelCls = 'mb-1 flex items-center gap-1.5 text-[12px] font-medium text-shell-ink-soft';

export default function AccountSecurityModal({
  isOpen,
  onClose,
  userEmail,
}: AccountSecurityModalProps) {
  const supabase = createClient();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 6) {
      setError('La contraseña debe tener un mínimo de 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message || 'Error al actualizar la contraseña');
      } else {
        setSuccess(
          '¡Contraseña asignada con éxito! Ahora puedes iniciar sesión tanto con tu cuenta de Google como ingresando tu correo y esta contraseña.'
        );
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setError(err?.message || 'Error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-shell-bg/80 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="security-modal-title"
        className="animate-in fade-in zoom-in-95 relative w-full max-w-md rounded-lg border border-shell-line bg-shell-surface p-5 duration-200"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar seguridad y contraseña"
          className="absolute right-3 top-3 cursor-pointer rounded-md p-1.5 text-shell-muted transition hover:bg-shell-raised hover:text-shell-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60"
        >
          <FaTimes className="text-sm" aria-hidden="true" />
        </button>

        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md border border-shell-line bg-shell-raised text-sm text-shell-accent">
          <FaShieldAlt aria-hidden="true" />
        </div>

        <h3 id="security-modal-title" className="mb-1 text-[15px] font-semibold text-shell-ink">
          Seguridad y Contraseña de Acceso
        </h3>
        <p className="mb-4 text-[12px] text-shell-muted">
          Asigna o actualiza una contraseña para acceder con tu correo electrónico (
          <strong className="font-semibold text-shell-ink">{userEmail}</strong>) sin depender
          exclusivamente de Google.
        </p>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-shell-danger/40 bg-shell-danger/10 p-2.5 text-[12px] text-shell-danger"
          >
            <strong className="font-semibold">Error:</strong> {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-4 flex items-start gap-2 rounded-md border border-shell-accent/40 bg-shell-accent/10 p-2.5 text-[12px] text-shell-accent"
          >
            <FaCheckCircle className="mt-0.5 shrink-0 text-sm" aria-hidden="true" />
            <span>
              <strong className="font-semibold">Listo:</strong> {success}
            </span>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-3.5">
          <div>
            <label className={labelCls}>
              <FaKey className="text-[10px] text-shell-accent" aria-hidden="true" />
              <span>Nueva Contraseña:</span>
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>
              <FaLock className="text-[10px] text-shell-accent" aria-hidden="true" />
              <span>Confirmar Nueva Contraseña:</span>
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Repite la nueva contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-shell-accent bg-shell-accent px-4 py-2 text-[12.5px] font-semibold text-shell-accent-ink transition focus:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span>Guardando contraseña...</span>
              ) : (
                <>
                  <FaKey aria-hidden="true" />
                  <span>Guardar Contraseña</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-md border border-shell-line bg-shell-raised px-4 py-2 text-[12.5px] font-medium text-shell-ink-soft transition hover:border-shell-line-strong hover:text-shell-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60"
            >
              Cerrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
