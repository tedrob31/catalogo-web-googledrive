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

export const metadata = {
  title: 'c4talogo.com | Tu Catálogo Digital conectado a Google Drive',
  description:
    'Sincroniza tus fotos de Google Drive y crea un catálogo profesional para tus clientes con subdominio propio en minutos.',
};

export default function LandingPage() {
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
              className="text-xs font-semibold px-4 py-2 text-slate-300 hover:text-white transition"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/login"
              className="text-xs font-semibold px-4 py-2 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white rounded-xl shadow-md transition active:scale-95"
            >
              Crear Catálogo Gratis
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
              <span>Comenzar Ahora Mismo</span>
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
              <FaCheck className="text-emerald-400" /> Sin tarjetas de crédito
            </span>
            <span className="flex items-center gap-1.5">
              <FaCheck className="text-emerald-400" /> Subdominio gratis
            </span>
            <span className="flex items-center gap-1.5">
              <FaCheck className="text-emerald-400" /> Setup en 2 minutos
            </span>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="caracteristicas" className="py-20 border-t border-white/10 bg-slate-900/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Todo lo que necesitas para vender más
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Diseñado para alta velocidad, miles de visitas simultáneas y cero fricción.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/30 transition">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-lg mb-4">
                <FaGoogleDrive />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Conexión Google Drive</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Organiza tus carpetas en Drive como siempre lo has hecho. Nuestro sistema sincroniza álbumes y fotos al instante.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-rose-500/30 transition">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center text-lg mb-4">
                <FaGlobe />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Subdominio Personalizado</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Obtén tu dirección única como <code className="text-rose-400 font-mono">mitienda.c4talogo.com</code> para compartir en Instagram, TikTok o WhatsApp.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/30 transition">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-lg mb-4">
                <FaBolt />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Cloudflare CDN & R2</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tus clientes verán tus fotos en WebP/AVIF cargando en milisegundos sin ralentizar tu servidor gracias a Imgproxy y Cloudflare.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10 bg-black text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 c4talogo.com — Plataforma SaaS Multi-Tenant de Catálogos Digitales.</p>
          <div className="flex items-center gap-6 text-slate-400">
            <Link href="/privacy" className="hover:text-amber-400 transition">
              Política de Privacidad
            </Link>
            <Link href="/terms" className="hover:text-amber-400 transition">
              Términos de Servicio
            </Link>
            <a href="mailto:contacto@c4talogo.com" className="hover:text-amber-400 transition">
              Soporte
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
