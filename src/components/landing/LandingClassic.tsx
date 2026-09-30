import Link from 'next/link';
import {
  FaGoogleDrive,
  FaBolt,
  FaGlobe,
  FaShieldAlt,
  FaImages,
  FaWhatsapp,
  FaArrowRight,
  FaCheck,
} from 'react-icons/fa';

export default function LandingClassic() {
  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-amber-500 selection:text-black">
      {/* Top Navbar */}
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center font-black text-white text-sm shadow-lg shadow-rose-500/20">
              C4
            </div>
            <span className="font-extrabold text-lg tracking-tight">c4talogo.com</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-semibold px-4 py-2 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white rounded-xl shadow-md transition active:scale-95"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(244,63,94,0.15),rgba(255,255,255,0))]" />

        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-amber-400 mb-8">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Plataforma SaaS Multi-Tenant para Comercio y Mayoristas</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.1]">
            Tu Catálogo en la Web <br />
            <span className="bg-gradient-to-r from-amber-400 via-rose-400 to-orange-400 bg-clip-text text-transparent">
              Directo desde Google Drive
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
            Solo subes tus fotos a Google Drive y tu tienda en línea se actualiza automáticamente con fotos optimizadas en la nube, pedidos por WhatsApp y subdominio propio.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-sm rounded-xl shadow-xl shadow-rose-500/20 transition active:scale-95"
            >
              <span>Acceder a Mi Catálogo</span>
              <FaArrowRight className="text-xs" />
            </Link>
            <a
              href="#caracteristicas"
              className="w-full sm:w-auto px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-semibold text-sm rounded-xl transition"
            >
              Ver Características
            </a>
          </div>

          <div className="mt-12 flex items-center justify-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <FaCheck className="text-emerald-400" /> Sincronización Espejo
            </span>
            <span className="flex items-center gap-1.5">
              <FaCheck className="text-emerald-400" /> Subdominio Propio
            </span>
            <span className="flex items-center gap-1.5">
              <FaCheck className="text-emerald-400" /> Cloudflare CDN Ultrarrápido
            </span>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="caracteristicas" className="py-20 border-t border-white/10 bg-slate-900/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Diseñado para Negocios y Mayoristas Modernos
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              Olvídate de subir fotos producto por producto a paneles complicados. Gestiona todo directamente desde tus carpetas en Google Drive.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 hover:border-amber-500/50 transition">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-xl mb-4">
                <FaGoogleDrive />
              </div>
              <h3 className="font-bold text-white text-base mb-2">Google Drive Nativo</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tus carpetas de Google Drive se convierten en categorías y tus imágenes en fotos de catálogo sin esfuerzo manual.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 hover:border-rose-500/50 transition">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 text-xl mb-4">
                <FaBolt />
              </div>
              <h3 className="font-bold text-white text-base mb-2">Velocidad Extrema (Edge CDN)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Fotos cacheadas y optimizadas con WebP en Cloudflare R2 e Imgproxy para aperturas instantáneas sin esperas ni ralentizaciones.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 hover:border-emerald-500/50 transition">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl mb-4">
                <FaWhatsapp />
              </div>
              <h3 className="font-bold text-white text-base mb-2">Ventas Directas por WhatsApp</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tus clientes seleccionan productos o capturan fotos y te envían sus pedidos con un solo clic directamente a tu WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10 bg-slate-950 text-slate-500 text-xs">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center font-bold text-white text-[10px]">
              C4
            </div>
            <span className="font-semibold text-slate-400">c4talogo.com</span>
            <span>&copy; {new Date().getFullYear()} Todos los derechos reservados.</span>
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
