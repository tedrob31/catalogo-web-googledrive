import type { NextConfig } from "next";

const nextConfig = {
  output: "standalone",
  images: {
    // unoptimized: false, // Default is false. We want optimization!
    // We can add domains if we ever switch to direct Drive links
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
