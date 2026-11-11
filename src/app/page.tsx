import type { Metadata } from "next";
import { HomeView } from "@/components/portfolio/HomeView";
import { getContentPayload, getSiteConfig } from "@/lib/content";

// Render on every request — admin portal edits appear on the live site
// immediately (Supabase is read fresh each time; never frozen at build).
export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hafiz-m-saad.vercel.app";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteConfig();
  const title = `${site.name} — ${site.role}`;
  const description = `${site.name} is a ${site.role.replace("&", "and")} in ${site.location} — brand identities, SaaS landing pages, product UI/UX and ad creatives for 6+ company brands.`;
  return {
    title,
    description,
    keywords: [
      "Hafiz Muhammad Saad",
      "UI/UX designer",
      "brand designer",
      "portfolio",
      "Karachi",
      "brand identity",
      "web design",
      "product design",
      "logo design",
      "brand strategy",
    ],
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: `${site.name} — Portfolio`,
      title,
      description,
      url: `${siteUrl}/`,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

/**
 * Home — the centered profile canvas: avatar/name/role/bio, the Tools,
 * Skills and Experience chip sections, Connect With Me, and the My
 * Resume / My Projects feature cards — all inside the framed canvas
 * with the floating Home/Work dock.
 *
 * The page is server-rendered with the current content baked in (SEO +
 * instant paint); the client view then refreshes it from /api/content
 * so admin edits show up without redeploying.
 */
export default async function HomePage() {
  const payload = await getContentPayload();
  return <HomeView initial={payload} />;
}
