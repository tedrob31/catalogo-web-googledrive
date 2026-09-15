import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "c4talogo.com | Plataforma de Catálogos Digitales",
  description: "Crea y administra catálogos profesionales conectados a Google Drive con subdominio propio.",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Inyección de variables de entorno en tiempo de ejecución (runtime) para el navegador
  const env = process.env;
  let rawUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || env['SUPABASE_URL'] || '';
  if (rawUrl.includes('/auth/v1')) {
    rawUrl = rawUrl.split('/auth/v1')[0];
  }
  const runtimeSupabaseUrl = rawUrl.trim().replace(/\/+$/, '');
  const runtimeSupabaseAnonKey = (env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || env['SUPABASE_ANON_KEY'] || '').trim();
  const runtimeBaseDomain = env['NEXT_PUBLIC_BASE_DOMAIN'] || 'c4talogo.com';

  return (
    <html lang="es">
      <head>
        <script
          id="supabase-runtime-env"
          dangerouslySetInnerHTML={{
            __html: `window.__ENV__ = Object.assign(window.__ENV__ || {}, {
              NEXT_PUBLIC_SUPABASE_URL: ${JSON.stringify(runtimeSupabaseUrl)},
              NEXT_PUBLIC_SUPABASE_ANON_KEY: ${JSON.stringify(runtimeSupabaseAnonKey)},
              NEXT_PUBLIC_BASE_DOMAIN: ${JSON.stringify(runtimeBaseDomain)}
            });`
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
