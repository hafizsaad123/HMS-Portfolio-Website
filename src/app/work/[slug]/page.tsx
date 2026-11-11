import type { Metadata } from "next";
import { CaseStudyView } from "@/components/portfolio/CaseStudyView";
import { getContentPayload, getProjectBySlug, getSiteConfig } from "@/lib/content";

// Live sync: new/edited projects appear immediately (never build-frozen).
export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hafiz-m-saad.vercel.app";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const [project, site] = await Promise.all([getProjectBySlug(slug), getSiteConfig()]);
  if (!project) return { title: "Case Study Not Found" };
  const title = `${project.title} — Case Study`;
  const description =
    project.shortDescription || `Case study — ${project.category} by ${site.name}.`;
  return {
    title,
    description,
    alternates: { canonical: `/work/${project.slug}` },
    openGraph: {
      type: "article",
      siteName: `${site.name} — Portfolio`,
      title: `${project.title} — ${site.name}`,
      description,
      url: `${siteUrl}/work/${project.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${project.title} — ${site.name}`,
      description,
    },
  };
}

/**
 * Case study — each project gets its own /work/<slug> page: hero with the
 * real engagement data, then the WYSIWYG body, then prev/next navigation.
 *
 * Server-rendered with the current content baked in; the client view
 * refreshes it live from the API and reads the slug from the URL, so it
 * also powers the dynamic fallback page that serves projects created
 * after this export. Emits Article + BreadcrumbList JSON-LD for search
 * and answer engines.
 */
export default async function CaseStudyPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [payload, project] = await Promise.all([getContentPayload(), getProjectBySlug(slug)]);

  const jsonLd: unknown[] = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "My Work", item: `${siteUrl}/work` },
      ],
    },
  ];

  if (project) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: `${project.title} — Case Study`,
      description: project.shortDescription || `Case study — ${project.category}.`,
      url: `${siteUrl}/work/${project.slug}`,
      image: `${siteUrl}${project.cover}`,
      articleSection: project.category,
      inLanguage: "en",
      author: {
        "@type": "Person",
        name: payload?.site.name ?? "Hafiz Muhammad Saad",
        url: siteUrl,
      },
      ...(project.start
        ? { datePublished: `${project.start}-01` }
        : {}),
    });
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CaseStudyView initial={payload} />
    </>
  );
}
