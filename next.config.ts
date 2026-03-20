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
      static: 0,
    },
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // metadataBase removed to prevent config error

  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
