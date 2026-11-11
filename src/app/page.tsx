import type { Metadata } from "next";
import { HomeView } from "@/components/portfolio/HomeView";
import { getContentPayload, getSiteConfig } from "@/lib/content";

// Render on every request — admin portal edits appear on the live site
// immediately (Supabase is read fresh each time; never frozen at build).
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteConfig();
  return {
    title: `${site.name} — ${site.role}`,
    description: site.bio,
    alternates: { canonical: "/" },
  };
}

/**
 * Home — the always-moving work gallery: four columns of project tiles
 * (outer columns travelling up, middle columns travelling down), beside
 * the pinned sidebar. At lg+ only the main column can scroll — the
 * sidebar never does (rule #1).
 *
 * The page is server-rendered with the current content baked in (SEO +
 * instant paint); the client view then refreshes it from the API
 * (/api/content → PHP + MySQL on the live host) so admin edits show up
 * without redeploying.
 */
export default async function HomePage() {
  const payload = await getContentPayload();
  return <HomeView initial={payload} />;
}
