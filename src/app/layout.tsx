import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { getSiteConfig } from "@/lib/content";
import { AppProviders } from "@/components/portfolio/SiteData";

/** Self-hosted Geist (latin, variable 100–900) — no build-time network
 *  needed; the exact same font files the live site serves. */
const geistSans = localFont({
  src: "./fonts/geist-latin.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-geist-mono",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Identity metadata is managed from the /admin portal (database-backed). */
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteConfig();
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${site.name} — ${site.role}`,
      template: `%s — ${site.name}`,
    },
    description: site.bio,
    applicationName: site.name,
    authors: [{ name: site.name }],
    creator: site.name,
    keywords: [
      "UI/UX designer",
      "brand designer",
      "portfolio",
      "Karachi",
      "brand identity",
      "web design",
      "product design",
    ],
    openGraph: {
      type: "website",
      siteName: `${site.name} — Portfolio`,
      title: `${site.name} — ${site.role}`,
      description: site.bio,
      url: siteUrl,
      locale: "en_US",
    },
    twitter: {
      card: "summary",
      title: `${site.name} — ${site.role}`,
      description: site.bio,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#8750f6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground font-sans`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
