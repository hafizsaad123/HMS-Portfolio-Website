/**
 * Company marks for the experience pills (sidebar) and cards (About page).
 *
 * All companies carry their REAL brand logos — supplied by Saad as tiny
 * uploads (14-23px), professionally re-processed: 5× upscaled with bicubic
 * interpolation + gentle unsharp so the gradient marks stay smooth yet
 * defined, transparent borders trimmed tight. The sources are true gradient
 * logos (raster is the authentic medium), oversampled 2.7-5× at every
 * display size on the site (12px pills, 22px cards, 2× retina) so they
 * render crisp everywhere.
 */

import Image from "next/image";
import type { CompanyMarkId } from "@/data/experience";

/** Real logo files in /public/images/marks (natural pixel sizes).
 *
 * The novelops / ai-matterz files carry `?v=2` — their contents were
 * corrected (swapped) after the first release, and the query string
 * changes the /_next/image cache key so every visitor gets the fixed
 * marks instead of a stale pre-swap copy from browser cache. */
const logoFiles: Partial<Record<CompanyMarkId, { src: string; w: number; h: number }>> = {
  "ai-matterz": { src: "/images/marks/ai-matterz.png?v=2", w: 88, h: 75 },
  "uplynk-pk": { src: "/images/marks/uplynk-pk.png", w: 88, h: 89 },
  "surplus-pakistan": { src: "/images/marks/surplus-pakistan.png", w: 110, h: 65 },
  novelops: { src: "/images/marks/novelops.png?v=2", w: 93, h: 97 },
  count3: { src: "/images/marks/count3.png", w: 110, h: 69 },
  simulationsx: { src: "/images/marks/simulationsx.png", w: 75, h: 95 },
};

export function CompanyMark({ id, size = 24 }: { id: CompanyMarkId; size?: number }) {
  const logo = logoFiles[id];

  // real brand logo — natural width/height attributes (exact intrinsic
  // ratio, no rounding drift) with CSS locking the height and letting the
  // width follow automatically, so the aspect ratio is always preserved.
  if (logo) {
    return (
      <Image
        src={logo.src}
        alt=""
        width={logo.w}
        height={logo.h}
        className="shrink-0 object-contain"
        style={{ height: size, width: "auto" }}
        // purely decorative — the pill text carries the meaning
        aria-hidden
        draggable={false}
      />
    );
  }

  // graceful no-op for ids without a mark (e.g. restored legacy rows)
  return null;
}
