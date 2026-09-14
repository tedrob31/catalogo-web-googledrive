import { Metadata } from 'next';
import Link from 'next/link';
import { FaFileContract, FaArrowLeft } from 'react-icons/fa';

export const metadata: Metadata = {
  title: 'Términos de Servicio | c4talogo.com',
  description: 'Términos y Condiciones de Uso del servicio de catálogos digitales c4talogo.com',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition">
            <FaArrowLeft />
            <span>Volver a c4talogo.com</span>
          </Link>
          <div className="flex items-center gap-2 font-bold text-sm text-white">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-xs">
              C4
            </div>
            <span>c4talogo.com</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center text-xl">
            <FaFileContract />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Términos de Servicio
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Última actualización: 12 de septiembre de 2026
            </p>
          </div>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-slate-300 leading-relaxed">
          <section className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-3">1. Aceptación de los Términos</h2>
            <p>
              Al registrarte o utilizar los servicios de <strong>c4talogo.com</strong>, aceptas cumplir con estos Términos de Servicio y con nuestra{' '}
              <Link href="/privacy" className="text-amber-400 underline hover:text-amber-300">
                Política de Privacidad
              </Link>
              . Si no estás de acuerdo con alguno de los términos, debes abstenerte de utilizar la plataforma.
            </p>
          </section>

          <section className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-3">2. Descripción del Servicio</h2>
            <p className="text-xs">
              c4talogo.com es una plataforma de software como servicio (SaaS) que permite a emprendedores y comercios conectar sus carpetas de Google Drive para crear y publicar catálogos de productos interactivos en línea bajo subdominios personalizados.
            </p>
          </section>

          <section className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-3">3. Cuentas y Responsabilidades del Usuario</h2>
            <ul className="list-disc pl-5 space-y-2 text-xs">
              <li>El usuario es el único responsable de mantener la confidencialidad de sus credenciales de acceso.</li>
              <li>El usuario garantiza que posee los derechos de autor, licencias y autorizaciones necesarias sobre las imágenes y productos que sincronice y publique en su catálogo.</li>
              <li>Queda estrictamente prohibido el uso de la plataforma para publicar contenido ilegal, violento, fraudulento o que infrinja los derechos de terceros.</li>
            </ul>
          </section>

          <section className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-3">4. Integración con Google Drive</h2>
            <p className="text-xs">
              La integración con Google Drive opera bajo autorización explícita del usuario mediante el protocolo OAuth 2.0. c4talogo.com solo accede a las carpetas seleccionadas con fines de lectura para la generación del catálogo. El usuario puede desvincular su cuenta en cualquier momento desde su panel de control o revocando los permisos en la configuración de seguridad de Google.
            </p>
          </section>

          <section className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-3">5. Disponibilidad y Limitación de Responsabilidad</h2>
            <p className="text-xs">
              Nos esforzamos por mantener una alta disponibilidad del servicio mediante redes globales de distribución de contenido (CDN). Sin embargo, el servicio se ofrece «tal cual» («as is») y no podemos garantizar un funcionamiento ininterrumpido ante fallos de proveedores externos o conexiones de red.
            </p>
          </section>

          <section className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-3">6. Modificaciones de los Términos</h2>
            <p className="text-xs">
              Nos reservamos el derecho de actualizar o modificar estos términos cuando sea necesario para reflejar mejoras en el servicio o cambios normativos. Las modificaciones se notificarán a través de nuestro sitio web.
            </p>
          </section>

          <section className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-3">7. Contacto</h2>
            <p className="text-xs font-mono text-amber-400">
              contacto@c4talogo.com
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500">
        <p>© 2026 c4talogo.com — Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
