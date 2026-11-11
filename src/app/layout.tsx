import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { getSiteConfig } from "@/lib/content";
import { AppProviders } from "@/components/portfolio/SiteData";
import { StudioCursor } from "@/components/portfolio/StudioCursor";

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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hafiz-m-saad.vercel.app";

/** Identity metadata is managed from the /admin portal (database-backed). */
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteConfig();
  const title = `${site.name} — ${site.role}`;
  const description = `${site.name} is a ${site.role.replace("&", "and")} in ${site.location} — brand identities, SaaS landing pages, product UI/UX and ad creatives for 6+ company brands.`;
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: title,
      template: `%s — ${site.name}`,
    },
    description,
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
      "Hafiz Muhammad Saad",
    ],
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: `${site.name} — Portfolio`,
      title,
      description,
      url: siteUrl,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#8750f6",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Entity JSON-LD (GEO/AEO): Person + WebSite — the answer engines' key.
  // Deduped with the metadata call via React cache (single query).
  const site = await getSiteConfig();
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: site.name,
    alternateName: "Saad",
    jobTitle: site.role,
    description: `${site.name} is a ${site.role} in ${site.location}.`,
    email: `mailto:${site.email}`,
    url: siteUrl,
    image: `${siteUrl}${site.portraitPath}`,
    homeLocation: {
      "@type": "Place",
      name: site.location,
      address: { "@type": "PostalAddress", addressLocality: "Karachi", addressCountry: "PK" },
    },
    knowsAbout: [
      "UI/UX Design",
      "Brand Identity Design",
      "Brand Strategy",
      "Web Design",
      "Logo Design",
      "Creative Graphic Design",
      "AI Assisted Frontend Development",
    ],
    sameAs: [
      "https://www.linkedin.com/in/hafizsaad-design",
      "https://www.instagram.com/saad.brandarch/",
      "https://www.behance.net/saadnagorigraphics",
    ],
    worksFor: { "@type": "Organization", name: "NovelOPS" },
  };
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: `${site.name} — Portfolio`,
    url: siteUrl,
    inLanguage: "en",
    author: { "@type": "Person", name: site.name },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground font-sans`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([personJsonLd, websiteJsonLd]),
          }}
        />
        <AppProviders>{children}</AppProviders>
        {/* the brand pixel becomes the pointer — public pages, fine pointers only */}
        <StudioCursor />
      </body>
    </html>
  );
}
