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
import ClientGatekeeper from "@/components/ClientGatekeeper";

// Removed 'next/headers' to allow static export
// import { headers } from 'next/headers';
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

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientGatekeeper initialStatus={status.state} />
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
