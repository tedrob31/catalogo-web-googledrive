import type { NextConfig } from "next";

const nextConfig = {
  output: process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true' ? 'export' : 'standalone',
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Fix for Metadata API requiring absolute URLs
  // This ensures og:image works correctly even behind proxies
  metadataBase: new URL(process.env.SITE_URL || 'https://r4tlabs.com'),

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
