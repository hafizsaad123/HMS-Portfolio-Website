import type { Metadata } from "next";
import { CaseStudyView } from "@/components/portfolio/CaseStudyView";
import { getContentPayload, getProjectBySlug } from "@/lib/content";

// Live sync: new/edited projects appear immediately (never build-frozen).
export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return { title: "Case Study Not Found" };
  return {
    title: `${project.title} — Case Study`,
    description: project.shortDescription || `Case study — ${project.category}`,
    alternates: { canonical: `/work/${project.slug}` },
  };
}

/**
 * Case study — each project gets its own /work/<slug> page: hero with the
 * real engagement data, then the WYSIWYG body, then prev/next navigation.
 *
 * Server-rendered with the current content baked in; the client view
 * refreshes it live from the API (PHP + MySQL on the live host) and reads
 * the slug from the URL, so it also powers the dynamic fallback page that
 * serves projects created after this export.
 */
export default async function CaseStudyPage({ params }: { params: Params }) {
  const payload = await getContentPayload();
  return <CaseStudyView initial={payload} />;
}
