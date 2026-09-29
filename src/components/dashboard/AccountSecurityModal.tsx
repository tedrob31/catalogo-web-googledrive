'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FaLock, FaKey, FaCheckCircle, FaTimes, FaShieldAlt } from 'react-icons/fa';

interface AccountSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition cursor-pointer"
        >
          <FaTimes className="text-sm" />
        </button>

        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4 text-xl">
          <FaShieldAlt />
        </div>

        <h3 className="text-base font-bold text-white mb-1">
          Seguridad y Contraseña de Acceso
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Asigna o actualiza una contraseña para acceder con tu correo electrónico (
          <strong className="text-white">{userEmail}</strong>) sin depender exclusivamente de Google.
        </p>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-xl mb-4 flex items-start gap-2">
            <FaCheckCircle className="text-emerald-400 text-sm shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <FaKey className="text-amber-400 text-[10px]" />
              <span>Nueva Contraseña:</span>
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <FaLock className="text-amber-400 text-[10px]" />
              <span>Confirmar Nueva Contraseña:</span>
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Repite la nueva contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-semibold text-xs rounded-xl shadow-lg transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Guardando contraseña...</span>
              ) : (
                <>
                  <FaKey />
                  <span>Guardar Contraseña</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-white/10 hover:bg-white/20 text-slate-300 text-xs rounded-xl font-medium transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
