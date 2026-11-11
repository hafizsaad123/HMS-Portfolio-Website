import type { Metadata } from "next";
import { WorkView } from "@/components/portfolio/WorkView";
import { getContentPayload, getSiteConfig, getTexts } from "@/lib/content";

// Live sync: always read the latest content from Supabase (never build-frozen).
export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hafiz-m-saad.vercel.app";

export async function generateMetadata(): Promise<Metadata> {
  const [texts, site] = await Promise.all([getTexts(), getSiteConfig()]);
  const description =
    texts["work.metaDescription"] ||
    `Selected projects by ${site.name} — brand identities, SaaS landing pages, product UI/UX and ad creatives.`;
  return {
    title: "My Work",
    description,
    alternates: { canonical: "/work" },
    openGraph: {
      title: `My Work — ${site.name}`,
      description,
      url: `${siteUrl}/work`,
    },
    twitter: {
      card: "summary_large_image",
      title: `My Work — ${site.name}`,
      description,
    },
  };
}

/**
 * Work — the centered gallery inside the framed canvas: "My Work"
 * heading, subheading, functional sort control and the 2-column card
 * grid with hover micro-interactions.
 *
 * Server-rendered with current content, refreshed live from the API
 * by the client view. Emits BreadcrumbList + CollectionPage JSON-LD
 * for search and answer engines.
 */
export default async function WorkPage() {
  const [payload, texts] = await Promise.all([
    getContentPayload(),
    getTexts(),
  ]);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "My Work", item: `${siteUrl}/work` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: texts["work.heading"] || "My Work",
      description:
        texts["work.metaDescription"] ||
        "Selected projects and design engagements by Hafiz Muhammad Saad.",
      url: `${siteUrl}/work`,
      isPartOf: { "@type": "WebSite", name: "Hafiz Muhammad Saad — Portfolio", url: siteUrl },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: (payload?.projects ?? []).map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: p.title,
          url: `${siteUrl}/work/${p.slug}`,
        })),
      },
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <WorkView initial={payload} />
    </>
  );
}
