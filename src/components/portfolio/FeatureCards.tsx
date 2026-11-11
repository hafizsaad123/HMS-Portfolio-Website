"use client";

/**
 * FeatureCards — the two cards from the approved home design: "My Resume"
 * (lavender-white document sheet with dog-ear, bottom-center, cropped by
 * the card edge) and "My Projects" (lavender bento mosaic bleeding off
 * the right edge).
 *
 * Motion language — restraint over decoration:
 *   • a restrained 3D lean toward the cursor (±3°, spring-smoothed)
 *   • the artwork rides a counter-parallax (--px/--py), drifting against
 *     the card's lean so the illustration sits deeper than the surface
 *   • the dog-ear folds a touch further open on hover — a detail you
 *     only notice the second time
 *   • the hairline border warms to soft violet and a neutral shadow
 *     lifts the card; no glow, no looping animations
 * Touch devices and reduced-motion users get the resting card.
 *
 * Labels come from the content query (admin-managed text keys
 * home.resumeCard / home.projectsCard).
 */

import Link from "next/link";
import { useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail } from "lucide-react";

/* ————————————————————————————————————————————————
   3D lean — the card tilts a few degrees toward the cursor.
   The same pointer feed drives the artwork's counter-parallax
   (--px/--py, 0..1) via CSS vars — one handler, two effects.
   Pointer events only (touch + reduced-motion rest).
———————————————————————————————————————————————— */
function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(my, [0, 1], [3, -3]), { stiffness: 240, damping: 26 });
  const rotateY = useSpring(useTransform(mx, [0, 1], [-3.5, 3.5]), { stiffness: 240, damping: 26 });

  return (
    <div className="[perspective:1100px]">
      <motion.div
        ref={ref}
        className={`tilt-card ${className ?? ""}`}
        style={reduce ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}
        onPointerMove={(e) => {
          if (!ref.current) return;
          if (reduce || e.pointerType === "touch") return;
          const rect = ref.current.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width;
          const py = (e.clientY - rect.top) / rect.height;
          // the artwork's counter-parallax (CSS vars inherit to .feat-art)
          ref.current.style.setProperty("--px", px.toFixed(4));
          ref.current.style.setProperty("--py", py.toFixed(4));
          mx.set(px);
          my.set(py);
        }}
        onPointerLeave={() => {
          mx.set(0.5);
          my.set(0.5);
          ref.current?.style.setProperty("--px", "0.5");
          ref.current?.style.setProperty("--py", "0.5");
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/* ————————————————————————————————————————————————
   The resume illustration — measured from the approved design: a pale
   lavender-white document sheet with a dog-eared top-right corner, a
   second sheet tucked behind it (stacked paper), and four glossy blue
   text bars — the first short, the rest full width. The sheet is
   seated center-right and cropped by the card's bottom edge.
———————————————————————————————————————————————— */
function ResumeIllustration() {
  return (
    <svg
      viewBox="0 0 312 175"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id="rc-bar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#85c6f6" />
          <stop offset="100%" stopColor="#4d9fec" />
        </linearGradient>
      </defs>
      <g className="feat-art" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        {/* the sheet behind — peeking out, gently skewed */}
        <rect
          x="173"
          y="26"
          width="120"
          height="124"
          rx="18"
          fill="#dfe4f3"
          transform="rotate(3 233 88)"
        />
        {/* the front sheet — top-right corner cut for the dog-ear */}
        <path
          d="M179 35 H267 L281 49 V141 A18 18 0 0 1 263 159 H179 A18 18 0 0 1 161 141 V53 A18 18 0 0 1 179 35 Z"
          fill="#edf0fa"
        />
        {/* the dog-ear flap — folds a touch further open on hover */}
        <path className="dogear" d="M267 35 L281 49 H272 A5 5 0 0 1 267 44 Z" fill="#d3daf0" />
        {/* text bars — glossy blue, short then full */}
        <rect x="185" y="85" width="30" height="10" rx="5" fill="url(#rc-bar)" />
        <rect x="185" y="103" width="68" height="10" rx="5" fill="url(#rc-bar)" />
        <rect x="185" y="121" width="68" height="10" rx="5" fill="url(#rc-bar)" />
        <rect x="185" y="139" width="12" height="10" rx="5" fill="url(#rc-bar)" />
      </g>
    </svg>
  );
}

/* ————————————————————————————————————————————————
   The projects illustration — measured from the approved design: a
   quiet bento mosaic of rounded lavender tiles stepping across the
   card's lower-right, saturation rising toward the right, one tall
   tile anchoring the grid, edge tiles cropped by the card boundary —
   an abstract of the work grid it opens onto.
———————————————————————————————————————————————— */
function ProjectsIllustration() {
  return (
    <svg
      viewBox="0 0 312 175"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id="pc-t1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f3edfc" />
        </linearGradient>
        <linearGradient id="pc-t2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f7f2fd" />
          <stop offset="100%" stopColor="#eadffa" />
        </linearGradient>
        <linearGradient id="pc-t3" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#eee6fb" />
          <stop offset="100%" stopColor="#dfcff8" />
        </linearGradient>
        <linearGradient id="pc-t4" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#e6dbf9" />
          <stop offset="100%" stopColor="#d5c2f5" />
        </linearGradient>
      </defs>
      <g className="feat-art" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        {/* row one */}
        <rect x="128" y="52" width="56" height="30" rx="8" fill="url(#pc-t1)" />
        <rect x="190" y="52" width="56" height="30" rx="8" fill="url(#pc-t2)" />
        <rect x="252" y="52" width="70" height="30" rx="8" fill="url(#pc-t3)" />
        {/* row two — the tall anchor tile on the left */}
        <rect x="128" y="88" width="56" height="87" rx="8" fill="url(#pc-t2)" />
        <rect x="190" y="88" width="56" height="30" rx="8" fill="url(#pc-t3)" />
        <rect x="252" y="88" width="70" height="30" rx="8" fill="url(#pc-t4)" />
        {/* row three — cropped by the card's bottom edge */}
        <rect x="190" y="124" width="56" height="51" rx="8" fill="url(#pc-t3)" />
        <rect x="252" y="124" width="70" height="51" rx="8" fill="url(#pc-t4)" />
      </g>
    </svg>
  );
}

/* ————————————————————————————————————————————————
   The pair of cards. Shared surface: hairline border that warms to
   soft violet on hover, a neutral (never colored) shadow, and the
   title shifting from navy to deep violet over 300ms.
———————————————————————————————————————————————— */
const CARD_SURFACE =
  "relative h-[175px] overflow-hidden rounded-[10px] border border-line bg-white " +
  "transition-[border-color,box-shadow] duration-300 ease-out " +
  "hover:border-[#ddd0fa] hover:shadow-[0_12px_32px_-16px_rgba(17,24,39,0.18)]";

const CARD_TITLE =
  "relative z-10 block px-6 pt-6 text-[20px] font-bold tracking-tight text-[#1e1b4b] " +
  "transition-colors duration-300 group-hover:text-brand-deep";

export function FeatureCards({
  resumeUrl,
  email,
  resumeLabel = "My Resume",
  projectsLabel = "My Projects",
}: {
  resumeUrl?: string | null;
  email?: string;
  resumeLabel?: string;
  projectsLabel?: string;
}) {
  const [resumeOpen, setResumeOpen] = useState(false);

  const resumeCard = (
    <TiltCard className={CARD_SURFACE}>
      <span className={CARD_TITLE}>{resumeLabel}</span>
      <ResumeIllustration />
    </TiltCard>
  );

  return (
    <div className="grid grid-cols-1 gap-[28px] sm:grid-cols-2">
      {/* ——— resume ——— */}
      {resumeUrl ? (
        <a
          href={resumeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group rounded-[10px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          aria-label={`${resumeLabel} — opens in a new tab`}
        >
          {resumeCard}
        </a>
      ) : (
        <button
          type="button"
          onClick={() => setResumeOpen(true)}
          className="group rounded-[10px] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          aria-label={`${resumeLabel} — request a copy`}
        >
          {resumeCard}
        </button>
      )}

      {/* ——— projects ——— */}
      <Link
        href="/work"
        className="group rounded-[10px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label={`${projectsLabel} — browse the work page`}
      >
        <TiltCard className={CARD_SURFACE}>
          <span className={CARD_TITLE}>{projectsLabel}</span>
          <ProjectsIllustration />
        </TiltCard>
      </Link>

      <Dialog open={resumeOpen} onOpenChange={setResumeOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg text-ink">Resume isn’t available yet</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-body">
              The resume file hasn’t been added to this site. You can email me
              directly and I’ll share it with you.
            </DialogDescription>
          </DialogHeader>
          <a
            href={`mailto:${email ?? ""}?subject=${encodeURIComponent("Resume request — via portfolio")}`}
            className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-medium text-white transition-colors hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            {email}
          </a>
        </DialogContent>
      </Dialog>
    </div>
  );
}
