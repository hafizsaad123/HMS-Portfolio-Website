import type { Metadata } from "next";
import { AboutView } from "@/components/portfolio/AboutView";
import { getContentPayload, getSiteConfig, getTexts } from "@/lib/content";

// Live sync: always read the latest content from Supabase (never build-frozen).
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [texts, site] = await Promise.all([getTexts(), getSiteConfig()]);
  return {
    title: "About Me",
    description: texts["about.metaDescription"] || site.bio,
    alternates: { canonical: "/about" },
  };
}

/**
 * About — availability badge, hero headline, introduction, services
 * network, work experience grid, sign-off block and footer.
 *
 * Server-rendered with current content, refreshed live from the API
 * (PHP + MySQL on the live host) by the client view.
 */
export default async function AboutPage() {
  const payload = await getContentPayload();
  return <AboutView initial={payload} />;
}
