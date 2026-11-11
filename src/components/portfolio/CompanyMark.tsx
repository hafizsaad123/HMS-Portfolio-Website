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

/** Real logo files in /public/images/marks (natural pixel sizes). */
const logoFiles: Partial<Record<CompanyMarkId, { src: string; w: number; h: number }>> = {
  "ai-matterz": { src: "/images/marks/ai-matterz.png", w: 93, h: 97 },
  "uplynk-pk": { src: "/images/marks/uplynk-pk.png", w: 88, h: 89 },
  "surplus-pakistan": { src: "/images/marks/surplus-pakistan.png", w: 110, h: 65 },
  novelops: { src: "/images/marks/novelops.png", w: 88, h: 75 },
  count3: { src: "/images/marks/count3.png", w: 110, h: 69 },
  simulationsx: { src: "/images/marks/simulationsx.png", w: 75, h: 95 },
};

export function CompanyMark({ id, size = 24 }: { id: CompanyMarkId; size?: number }) {
  const logo = logoFiles[id];

  // real brand logo — aspect preserved, fits inside a size×size box
  if (logo) {
    const scale = size / Math.max(logo.w, logo.h);
    const w = Math.max(1, Math.round(logo.w * scale));
    const h = Math.max(1, Math.round(logo.h * scale));
    return (
      <Image
        src={logo.src}
        alt=""
        width={w}
        height={h}
        sizes={`${size}px`}
        className="shrink-0 object-contain"
        // purely decorative — the pill text carries the meaning
        aria-hidden
        draggable={false}
      />
    );
  }

  // graceful no-op for ids without a mark (e.g. restored legacy rows)
  return null;
}
