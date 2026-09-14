import { Metadata } from 'next';
import Link from 'next/link';
import { FaShieldAlt, FaArrowLeft } from 'react-icons/fa';

export const metadata: Metadata = {
  title: 'Política de Privacidad | c4talogo.com',
  description: 'Política de Privacidad y cumplimiento de la directiva de datos de usuario de las APIs de Google para c4talogo.com',
};

export default function PrivacyPolicyPage() {
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
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-xl">
            <FaShieldAlt />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Política de Privacidad
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Última actualización: 12 de septiembre de 2026
            </p>
          </div>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-slate-300 leading-relaxed">
          <section className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-3">1. Introducción</h2>
            <p>
              Bienvenido a <strong>c4talogo.com</strong> («nosotros», «nuestro» o «la Plataforma»). Respetamos profundamente la privacidad de nuestros usuarios y clientes. Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y protegemos la información personal y los datos obtenidos a través de nuestros servicios y la integración con las interfaces de programación de aplicaciones (APIs) de Google.
            </p>
          </section>

          <section className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-3">2. Información que Recopilamos</h2>
            <ul className="list-disc pl-5 space-y-2 text-xs">
              <li>
                <strong>Información de la Cuenta:</strong> Nombre, dirección de correo electrónico, nombre comercial y credenciales de acceso cuando te registras en la plataforma.
              </li>
              <li>
                <strong>Datos de Configuración de la Tienda:</strong> Títulos, descripciones, número de WhatsApp para contacto comercial, configuraciones de diseño y subdominio seleccionado.
              </li>
              <li>
                <strong>Datos de Google Drive (Google User Data):</strong> Cuando decides conectar tu cuenta de Google Drive para sincronizar tu catálogo de productos, solicitamos acceso de solo lectura mediante el alcance (scope) <code className="text-amber-400 font-mono">https://www.googleapis.com/auth/drive.readonly</code>. A través de este permiso, únicamente accedemos a:
                <ul className="list-circle pl-5 mt-1 space-y-1">
                  <li>Nombres e identificadores (IDs) de las carpetas que buscas y seleccionas explícitamente.</li>
                  <li>Archivos de imagen (JPG, PNG, WebP) ubicados dentro de la carpeta seleccionada como Catálogo o Portadas.</li>
                </ul>
              </li>
            </ul>
          </section>

          {/* GOOGLE API LIMITED USE DISCLOSURE - CRITICAL FOR GOOGLE VERIFICATION */}
          <section className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-amber-400 mb-3 flex items-center gap-2">
              <span>3. Cumplimiento de la Política de Datos de Usuario de Google APIs</span>
            </h2>
            <div className="p-4 bg-slate-900/80 rounded-xl border border-amber-500/20 mb-4 font-mono text-xs text-amber-200 leading-relaxed">
              El uso y la transferencia que <strong>c4talogo.com</strong> haga a cualquier otra aplicación de la información recibida a través de las APIs de Google se adherirá a la{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 underline hover:text-amber-300 font-bold"
              >
                Política de Datos de Usuario de los Servicios de Google API
              </a>
              , incluidos los requisitos de Uso Limitado (Limited Use requirements).
            </div>
            <p className="text-xs text-slate-300">
              Específicamente garantizamos:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-xs text-slate-300">
              <li><strong>Sin fines publicitarios:</strong> Los datos de usuario de Google nunca se utilizan para servir anuncios ni para publicidad personalizada.</li>
              <li><strong>Sin venta de datos:</strong> No vendemos, comercializamos ni transferimos datos de usuario de Google a terceros.</li>
              <li><strong>Sin entrenamiento de Inteligencia Artificial (IA/ML):</strong> Los datos y fotos obtenidos de Google Drive nunca se utilizan para entrenar, evaluar ni mejorar modelos generalizados de aprendizaje automático o inteligencia artificial.</li>
              <li><strong>Acceso de solo lectura:</strong> Nuestra aplicación nunca modifica, elimina ni sobrescribe archivos en tu cuenta de Google Drive.</li>
            </ul>
          </section>

          <section className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-3">4. Cómo Usamos tu Información</h2>
            <p className="text-xs mb-3">
              Los datos obtenidos se emplean exclusivamente con la finalidad de:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>Generar y mantener tu catálogo digital de productos en tu subdominio asignado (ejemplo: <code>mitienda.c4talogo.com</code>).</li>
              <li>Transmitir de forma cifrada las imágenes hacia almacenamiento en la nube (Cloudflare R2) para optimizarlas mediante Imgproxy y servirlas a alta velocidad en formatos modernos (WebP/AVIF) a los visitantes de tu catálogo.</li>
              <li>Permitir a tus clientes finales contactarte por WhatsApp para realizar consultas o compras.</li>
            </ul>
          </section>

          <section className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-3">5. Almacenamiento, Seguridad y Retención</h2>
            <p className="text-xs mb-2">
              Implementamos rigurosas medidas de seguridad técnicas y organizativas:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>Aislamiento estricto de datos por inquilino mediante <strong>Row Level Security (RLS)</strong> en base de datos.</li>
              <li>Comunicaciones y streaming de datos protegidos en tránsito mediante cifrado TLS/HTTPS de última generación.</li>
              <li>Tokens de acceso OAuth almacenados de forma protegida en el servidor; el navegador del cliente nunca tiene acceso a los tokens de actualización (refresh token).</li>
            </ul>
          </section>

          <section className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-3">6. Desconexión y Eliminación de Datos</h2>
            <p className="text-xs mb-2">
              Tienes el control total de tus datos en cualquier momento:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-xs">
              <li>
                <strong>Desde tu Panel de Administración:</strong> Puedes desvincular tu cuenta de Google Drive o solicitar la baja de tu tienda. Al hacerlo, eliminamos los tokens de sesión y los registros vinculados.
              </li>
              <li>
                <strong>Desde tu Cuenta de Google:</strong> Puedes revocar el acceso de nuestra aplicación en cualquier momento visitando la página de seguridad de Google en{' '}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 underline hover:text-amber-300"
                >
                  myaccount.google.com/permissions
                </a>.
              </li>
            </ul>
          </section>

          <section className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-3">7. Contacto</h2>
            <p className="text-xs">
              Si tienes preguntas, dudas o inquietudes sobre esta Política de Privacidad o el tratamiento de tus datos, puedes ponerte en contacto con nuestro equipo a través de:
            </p>
            <p className="text-xs mt-2 font-mono text-amber-400">
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
