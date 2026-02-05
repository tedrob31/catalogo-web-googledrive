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

export async function generateMetadata() {
  const config = await getConfig();
  return {
    title: config.siteTitle || "Photo Catalog",
    description: "A professional photo catalog",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getConfig();

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
