import type { Metadata } from "next";
import { WorkView } from "@/components/portfolio/WorkView";
import { getContentPayload, getSiteConfig, getTexts } from "@/lib/content";

// Live sync: always read the latest content from Supabase (never build-frozen).
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [texts, site] = await Promise.all([getTexts(), getSiteConfig()]);
  return {
    title: "My Work",
    description: texts["work.metaDescription"] || site.bio,
    alternates: { canonical: "/work" },
  };
}

/**
 * Work — "My Work" heading, subheading, functional sort control and the
 * 2-column card grid from the Work export. Only this main column scrolls
 * at lg+; the sidebar stays pinned (rule #1).
 *
 * Server-rendered with current content, refreshed live from the API
 * (PHP + MySQL on the live host) by the client view.
 */
export default async function WorkPage() {
  const payload = await getContentPayload();
  return <WorkView initial={payload} />;
}
