import type { NextConfig } from "next";

const nextConfig = {
  output: "standalone",
  images: {
    // unoptimized: false, // Re-enable optimization
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'r4tlabs.com',
      },
      {
        protocol: 'https',
        hostname: 'www.r4tlabs.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
    dangerouslyAllowSVG: true,
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
