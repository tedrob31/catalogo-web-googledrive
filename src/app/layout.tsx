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

import { getConfig } from "@/lib/config";
import { GoogleAnalytics } from '@next/third-parties/google';

import SeasonalEffects from "@/components/SeasonalEffects";
import ClickEffects from "@/components/ClickEffects";

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSystemStatus } from '@/lib/status';

export async function generateMetadata() {
  const config = await getConfig();
  return {
    title: config.siteTitle || "Photo Catalog",
    description: "A professional photo catalog",
    icons: {
      icon: config.favicon || '/favicon.ico',
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getConfig();
  const status = await getSystemStatus();

  // Gatekeeper Logic
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '/';

  // 1. SETUP MODE
  if (status.state === 'SETUP') {
    if (pathname !== '/setup' && !pathname.startsWith('/api/setup')) {
      redirect('/setup');
    }
  }

  // 2. MAINTENANCE MODE
  // Allow /admin to bypass maintenance to fix things
  else if (status.state === 'MAINTENANCE') {
    if (pathname !== '/maintenance' && !pathname.startsWith('/admin') && !pathname.startsWith('/api') && !pathname.startsWith('/modaadmin')) {
      redirect('/maintenance');
    }
  }

  // 3. ACTIVE MODE
  else if (status.state === 'ACTIVE') {
    if (pathname === '/setup' || pathname === '/maintenance') {
      redirect('/');
    }
  }

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SeasonalEffects config={config} />
        <ClickEffects config={config} />
        {children}
        {config.googleAnalyticsId && (
          <GoogleAnalytics gaId={config.googleAnalyticsId} />
        )}
      </body>
    </html>
  );
}
