import type { MetadataRoute } from "next";
import { getContentPayload } from "@/lib/content";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hafiz-m-saad.vercel.app";

/**
 * Sitemap — every public page, including each case study, pulled live
 * from the content layer so projects created in the admin portal are
 * indexed from the moment they exist.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${siteUrl}/work`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
  ];

  try {
    const payload = await getContentPayload();
    for (const project of payload.projects) {
      entries.push({
        url: `${siteUrl}/work/${project.slug}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.8,
      });
    }
  } catch {
    // The content layer never throws for the public site, but the
    // sitemap must not break either — the static entries above still ship.
  }

  return entries;
}
