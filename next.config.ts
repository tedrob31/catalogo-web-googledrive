import type { NextConfig } from "next";

const nextConfig = {
  // Use default output (undefined) for 'next start', 'export' only when triggered
  output: process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true' ? 'export' : undefined,

  images: {
    unoptimized: true,
  },
  experimental: {
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
