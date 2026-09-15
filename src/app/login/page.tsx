'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaGoogle, FaEnvelope, FaLock, FaArrowRight } from 'react-icons/fa';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isAppSubdomain, setIsAppSubdomain] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  // Detectar si estamos accediendo desde el subdominio de administración app.c4talogo.com
  const getRedirectTarget = () => {
    if (typeof window === 'undefined') return '/dashboard';
    const params = new URLSearchParams(window.location.search);
    const redirectParam = params.get('redirect');
    if (redirectParam) return redirectParam;
    return window.location.hostname.startsWith('app.') ? '/' : '/dashboard';
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const destination = getRedirectTarget();
      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${destination}`,
          },
        });
        if (error) throw error;
        setMessage('¡Cuenta creada con éxito! Revisa tu correo o inicia sesión.');
        setIsRegister(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(destination);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      const destination = getRedirectTarget();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${destination}`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Error al conectar con Google');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 mb-4 shadow-lg shadow-rose-500/20">
            <span className="text-2xl font-black text-white">C4</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isRegister ? 'Crear tu Catálogo SaaS' : 'Bienvenido a c4talogo.com'}
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            {isRegister
              ? 'Registra tu tienda y conecta tus carpetas de Google Drive en minutos'
              : 'Accede al panel de control de tu catálogo o administración'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            {message}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white text-gray-900 hover:bg-gray-100 font-semibold text-sm transition-all shadow-md active:scale-[0.98] mb-6"
        >
          <FaGoogle className="text-red-500 text-lg" />
          <span>Continuar con Google</span>
        </button>

        <div className="relative flex items-center justify-center my-6">
          <div className="border-t border-white/10 w-full" />
          <span className="bg-transparent px-3 text-xs text-gray-500 uppercase tracking-widest font-mono">
            o con tu email
          </span>
          <div className="border-t border-white/10 w-full" />
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Correo Electrónico
            </label>
            <div className="relative">
              <FaEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@negocio.com"
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <FaLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-semibold text-sm transition-all shadow-lg shadow-rose-500/25 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2"
          >
            <span>{loading ? 'Cargando...' : isRegister ? 'Registrar Mi Tienda' : 'Iniciar Sesión'}</span>
            <FaArrowRight className="text-xs" />
          </button>
        </form>

        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
              setMessage(null);
            }}
            className="text-xs text-gray-400 hover:text-white transition"
          >
            {isRegister
              ? '¿Ya tienes una cuenta registrada? Inicia Sesión'
              : '¿No tienes una cuenta aún? Crea tu catálogo gratis'}
          </button>

          <p className="text-[11px] text-gray-500 mt-4 leading-relaxed">
            Al continuar, aceptas nuestros{' '}
            <Link href="/terms" className="text-gray-400 underline hover:text-amber-400">
              Términos de Servicio
            </Link>{' '}
            y nuestra{' '}
            <Link href="/privacy" className="text-gray-400 underline hover:text-amber-400">
              Política de Privacidad
            </Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
