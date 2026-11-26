'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { FaArrowLeft, FaCheckCircle, FaKey, FaLock, FaShieldAlt } from 'react-icons/fa';

export const dynamic = 'force-dynamic';

export default function ResetPasswordPage() {
  const [supabase] = useState(() => createClient());
  const [checkingLink, setCheckingLink] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        setSessionReady(true);
        setError(null);
        setCheckingLink(false);
      }
    });

    async function initRecoverySession() {
      try {
        const url = new URL(window.location.href);
        const queryError =
          url.searchParams.get('error_description') || url.searchParams.get('error');
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const hashError = hashParams.get('error_description') || hashParams.get('error');

        if (queryError || hashError) {
          if (active) {
            setError(
              'El enlace de recuperación expiró o ya fue utilizado. Solicita uno nuevo desde el inicio de sesión.'
            );
            setCheckingLink(false);
          }
          return;
        }

        const code = url.searchParams.get('code');
        const tokenHash = url.searchParams.get('token_hash');
        const type = url.searchParams.get('type');

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            // Fallback por si el cliente SSR ya intercambió el código automáticamente
            const { data: sessionData } = await supabase.auth.getSession();
            if (active && sessionData.session) {
              setSessionReady(true);
              setCheckingLink(false);
              return;
            }
            if (active) {
              setError(
                'No pudimos validar el enlace de recuperación (puede haber expirado o abrirse en otro navegador). Solicita uno nuevo.'
              );
              setCheckingLink(false);
            }
            return;
          }
          if (active) {
            setSessionReady(true);
            setCheckingLink(false);
          }
          return;
        }

        if (tokenHash && type === 'recovery') {
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          if (otpError) {
            if (active) {
              setError('El enlace de recuperación ya venció o no es válido. Solicita uno nuevo.');
              setCheckingLink(false);
            }
            return;
          }
          if (active) {
            setSessionReady(true);
            setCheckingLink(false);
          }
          return;
        }

        const { data: existing } = await supabase.auth.getSession();
        if (active) {
          if (existing.session) {
            setSessionReady(true);
          } else {
            setError('Enlace inválido o expirado. Solicita un nuevo correo desde Iniciar Sesión.');
          }
          setCheckingLink(false);
        }
      } catch {
        if (active) {
          setError('Error al validar el enlace de recuperación. Solicita uno nuevo.');
          setCheckingLink(false);
        }
      }
    }

    initRecoverySession();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden. Verifícalas antes de continuar.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        throw updateError;
      }
      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : null;
      setError(msg || 'No se pudo actualizar la contraseña. Solicita un nuevo enlace.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 mb-4 shadow-lg shadow-rose-500/20">
            <FaShieldAlt className="text-2xl text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Restablecer Contraseña</h1>
          <p className="text-xs text-gray-400 mt-2">
            Define una nueva contraseña para ingresar con tu correo electrónico
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium leading-relaxed"
          >
            {error}
          </div>
        )}

        {checkingLink ? (
          <div className="py-8 text-center text-sm text-gray-300">
            Validando enlace de recuperación…
          </div>
        ) : success ? (
          <div className="space-y-5 text-center">
            <div
              role="status"
              className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs leading-relaxed flex flex-col items-center gap-2"
            >
              <FaCheckCircle className="text-2xl text-emerald-400" />
              <p className="font-semibold text-sm text-white">¡Contraseña actualizada!</p>
              <p>Ya puedes ingresar a tu panel con tu nueva contraseña.</p>
            </div>
            <Link
              href="/dashboard/"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-semibold text-sm transition-all shadow-lg shadow-rose-500/25"
            >
              Ir a mi Panel
            </Link>
          </div>
        ) : sessionReady ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Nueva Contraseña
              </label>
              <div className="relative">
                <FaKey className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <FaLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu contraseña"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-semibold text-sm transition-all shadow-lg shadow-rose-500/25 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {submitting ? 'Guardando contraseña…' : 'Guardar Nueva Contraseña'}
            </button>
          </form>
        ) : (
          <div className="text-center">
            <Link
              href="/login/"
              className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-sm font-semibold text-white transition"
            >
              <FaArrowLeft className="text-xs" />
              <span>Solicitar un nuevo enlace</span>
            </Link>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/login/"
            className="text-xs text-gray-400 hover:text-amber-400 transition underline"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
