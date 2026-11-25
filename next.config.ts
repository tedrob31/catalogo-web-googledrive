import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',

  trailingSlash: true,
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX,

  images: {
    unoptimized: true,
  },
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 30,
    },
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // metadataBase removed to prevent config error

  // El build falla si hay un error de tipos. Estaba en `true`, que hacia que `next build`
  // terminara en verde con errores de tipos, y como el workflow de CI construye y publica la
  // imagen, un error de tipos podia llegar a produccion sin que nadie lo viera.
  // Se activo en 2026-11-19 con `tsc --noEmit` en 0 y el build verificado.

  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    const scriptSrc = isProd
      ? "script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com https://static.cloudflareinsights.com https://cloudflareinsights.com"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com https://static.cloudflareinsights.com https://cloudflareinsights.com";

    const cspDirectives = [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https: https://cdn.c4talogo.com https://img.c4talogo.com https://*.googleusercontent.com https://lh3.googleusercontent.com https://*.r2.cloudflarestorage.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com https://www.googleapis.com https://oauth2.googleapis.com https://cdn.c4talogo.com https://img.c4talogo.com https://imgproxy.r4tlabs.com https://api.whatsapp.com https://wa.me https://cloudflareinsights.com https://static.cloudflareinsights.com",
      "frame-src 'self' https://accounts.google.com https://content.googleapis.com https://docs.google.com",
      "frame-ancestors 'self'",
      "form-action 'self' https://accounts.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "upgrade-insecure-requests",
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Content-Security-Policy',
            value: cspDirectives,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
