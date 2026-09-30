import Link from 'next/link';
import {
  FaStore,
  FaGoogleDrive,
  FaShieldAlt,
  FaLock,
  FaArrowRight,
  FaInfoCircle,
  FaExternalLinkAlt,
} from 'react-icons/fa';

export default function LandingMinimal() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-amber-500 selection:text-black">
      {/* Top Navbar */}
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center font-black text-white text-sm shadow-lg shadow-rose-500/20">
              C4
            </div>
            <span className="font-extrabold text-lg tracking-tight">c4talogo.com</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-semibold px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/15 text-white rounded-xl transition flex items-center gap-1.5"
            >
              <FaLock className="text-amber-400 text-[10px]" />
              <span>Acceso a Tiendas</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center py-16 px-4 relative overflow-hidden">
        {/* Glow ambient */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-gradient-to-tr from-amber-500/10 via-rose-500/10 to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-2xl w-full mx-auto text-center relative z-10 space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Plataforma en Fase de Pruebas Privada</span>
          </div>

          {/* Title */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              ¿Buscabas el catálogo <br />
              <span className="bg-gradient-to-r from-amber-400 via-rose-400 to-orange-400 bg-clip-text text-transparent">
                de una tienda?
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl mx-auto">
              En <strong className="text-white">c4talogo.com</strong>, cada tienda, distribuidor o mayorista cuenta con su propia dirección web personalizada (por ejemplo: <code className="bg-white/10 px-2 py-0.5 rounded text-amber-300 font-mono text-xs">mitienda.c4talogo.com</code>).
            </p>
          </div>

          {/* Cards explicativas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-2">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm space-y-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-sm">
                <FaStore />
              </div>
              <h2 className="text-sm font-bold text-white">¿Eres cliente o comprador?</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Si compras en una tienda aliada, solicítale su <strong>enlace oficial de catálogo</strong> o búscalo en sus redes sociales para ver sus fotos y precios actualizados.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm space-y-2">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 text-sm">
                <FaGoogleDrive />
              </div>
              <h2 className="text-sm font-bold text-white">¿Qué es C4talogo?</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Es la plataforma SaaS que sincroniza fotos de <strong>Google Drive</strong> y las publica automáticamente en un catálogo web ultrarrápido con pedidos por WhatsApp.
              </p>
            </div>
          </div>

          {/* Call to action para tiendas autorizadas */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-white/10 rounded-2xl p-6 text-center space-y-3 shadow-xl">
            <p className="text-xs text-slate-400">
              ¿Administras una tienda autorizada con acceso a nuestra beta privada?
            </p>
            <div className="flex justify-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-500/20 transition active:scale-95"
              >
                <span>Iniciar Sesión en el Panel</span>
                <FaArrowRight className="text-[10px]" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 bg-slate-950 text-slate-500 text-xs">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center font-bold text-white text-[10px]">
              C4
            </div>
            <span className="font-semibold text-slate-400">c4talogo.com</span>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <Link href="/privacy" className="hover:text-slate-300 transition">
              Privacidad
            </Link>
            <Link href="/terms" className="hover:text-slate-300 transition">
              Términos
            </Link>
            <Link href="/login" className="hover:text-slate-300 transition">
              Acceso a Tiendas
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
