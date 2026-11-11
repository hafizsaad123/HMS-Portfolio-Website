/**
 * Project content architecture.
 *
 * Every entry is a real engagement from the supplied About-page work
 * experience (company, role, dates — nothing fabricated). Descriptions and
 * services are derived strictly from the supplied role titles and the
 * supplied skills/services lists.
 *
 * `url` is intentionally optional: while empty, cards open an in-page
 * viewer (lightbox) with the real data above. Set `url` to make the card's
 * arrow button open the real project destination instead.
 */

import type { CaseStudyBlock } from "@/lib/blocks";
import type { RichDoc } from "@/lib/rich";

export type TileRatio = "square" | "landscape";

export interface Project {
  /** Stable identifier (never rely on array position). */
  slug: string;
  title: string;
  /** One-liner shown under the title on Work cards. */
  shortDescription: string;
  /** The role held, exactly as supplied. */
  role: string;
  category: string;
  cover: string;
  /** Display period, exactly as supplied. */
  period: string;
  /** Start date for sorting: "YYYY-MM". */
  start: string;
  /** End date "YYYY-MM", or null when ongoing ("Present"). */
  end: string | null;
  /** Disciplines from the supplied skills/service lists. */
  services: string[];
  /** External destination — empty until a real one exists. */
  url: string | null;
  featured: boolean;
  order: number;
  /** Aspect ratio used by the Home masonry gallery. */
  homeTile: TileRatio;
  /** Include this project's tile in the homepage sliders. */
  showOnHome: boolean;
  /** Case study page content (/work/<slug>) — built in the admin editor. */
  content: CaseStudyBlock[];
  /** Rich text editor document (new format — takes precedence over content). */
  doc?: RichDoc | null;
}

export const projects: Project[] = [
  {
    slug: "ai-matterz",
    title: "AI Matterz",
    shortDescription: "Founding designer — brand identity & digital product design",
    role: "Founding Designer",
    category: "Brand & Product Design",
    cover: "/images/projects/ai-matterz.png",
    period: "Dec 2025 - Present",
    start: "2025-12",
    end: null,
    services: ["Brand Identity Design", "UI/UX Design"],
    url: null,
    featured: true,
    order: 1,
    homeTile: "square",
    showOnHome: true,
    content: [],
  },
  {
    slug: "uplynk-pk",
    title: "Uplynk.pk",
    shortDescription: "Founding designer — web experience & brand design",
    role: "Founding Designer",
    category: "Web & Brand Design",
    cover: "/images/projects/uplynk-pk.png",
    period: "Oct 2025 - May 2026",
    start: "2025-10",
    end: "2026-05",
    services: ["Web Design", "Brand Identity Design"],
    url: null,
    featured: true,
    order: 2,
    homeTile: "landscape",
    showOnHome: true,
    content: [],
  },
  {
    slug: "surplus-pakistan",
    title: "Surplus Pakistan",
    shortDescription: "Visual graphic designer — social & brand graphics",
    role: "Visual Graphic Designer",
    category: "Visual & Brand Graphics",
    cover: "/images/projects/surplus-pakistan.png",
    period: "Oct 2025 - Present",
    start: "2025-10",
    end: null,
    services: ["Social Media Posts", "Ad Creatives"],
    url: null,
    featured: true,
    order: 3,
    homeTile: "square",
    showOnHome: true,
    content: [],
  },
  {
    slug: "novelops",
    title: "NovelOPS PVT LTD",
    shortDescription: "UI/UX designer — product & interface design",
    role: "UI/UX Designer",
    category: "UI/UX Design",
    cover: "/images/projects/novelops.png",
    period: "Dec 2025 - Present",
    start: "2025-12",
    end: null,
    services: ["UI/UX Design", "Web Design"],
    url: null,
    featured: true,
    order: 4,
    homeTile: "square",
    showOnHome: true,
    content: [],
  },
  {
    slug: "count3",
    title: "Count3",
    shortDescription: "Founding designer — product & brand design",
    role: "Founding Designer",
    category: "Product & App Design",
    cover: "/images/projects/count3.png",
    period: "Oct 2025 - May 2026",
    start: "2025-10",
    end: "2026-05",
    services: ["UI/UX Design", "Brand Identity Design"],
    url: null,
    featured: false,
    order: 5,
    homeTile: "landscape",
    showOnHome: true,
    content: [],
  },
  {
    slug: "simulationsx",
    title: "SimulationsX",
    shortDescription: "Creative graphic designer — ad creatives & social visuals",
    role: "Creative Graphic Designer",
    category: "Creative & Motion Design",
    cover: "/images/projects/simulationsx.png",
    period: "Oct 2025 - May 2026",
    start: "2025-10",
    end: "2026-05",
    services: ["Ad Creatives", "Social Media Posts"],
    url: null,
    featured: false,
    order: 6,
    homeTile: "square",
    showOnHome: true,
    content: [],
  },
  {
    slug: "freelance",
    title: "Freelance",
    shortDescription: "Senior brand designer — brand identity & strategy",
    role: "Senior Brand Designer",
    category: "Brand Identity",
    cover: "/images/projects/freelance.png",
    period: "Oct 2025 - May 2026",
    start: "2025-10",
    end: "2026-05",
    services: ["Brand Strategy", "Brand Identity Design"],
    url: null,
    featured: false,
    order: 7,
    homeTile: "square",
    showOnHome: true,
    content: [],
  },
];

/** Default ordering = supplied About-page card order. */
export function byDisplayOrder(list: Project[]): Project[] {
  return [...list].sort((a, b) => a.order - b.order);
}

/** "Recent" = latest activity first (ongoing engagements first, then latest end date). */
export function byRecent(list: Project[]): Project[] {
  return [...list].sort((a, b) => {
    const endA = a.end ?? "9999-12";
    const endB = b.end ?? "9999-12";
    if (endA !== endB) return endA > endB ? -1 : 1;
    return a.start > b.start ? -1 : a.start < b.start ? 1 : 0;
  });
}

/** "Oldest" = reverse of recent. */
export function byOldest(list: Project[]): Project[] {
  return byRecent(list).reverse();
}

export type SortMode = "recent" | "oldest";
