"use client";

/**
 * PageCanvas — every page sits inside the signature frame from the approved
 * designs: a hairline #d9d9d9 rectangle inset 22px from the viewport edges,
 * the pixel-square brand motifs tucked into its corners, and the gradient
 * signature bar (deep violet → brand purple) along the very bottom.
 */

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { PixelCluster } from "./PixelCluster";
import { EASE_OUT_EXPO } from "./Reveal";

export function PageCanvas({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-white">
      {/* ——— the quiet page pins — 21px corner tabs outside the frame ——— */}
      <span aria-hidden="true" className="absolute left-0 top-0 h-[21px] w-[21px] bg-[#f2f2f2] print:hidden" />
      <span aria-hidden="true" className="absolute right-0 top-0 h-[21px] w-[21px] bg-[#f2f2f2] print:hidden" />

      {/* ——— the framed canvas — settles in with the content stagger ——— */}
      <motion.div
        className="page-frame relative mx-[22px] mt-[21px] mb-[22px] flex-1 border border-[#d9d9d9] bg-white"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
      >
        <PixelCluster corner="top-right" />
        <PixelCluster corner="bottom-left" />
        <div className="relative z-10 min-h-full">{children}</div>
      </motion.div>

      {/* ——— the signature bar — a 10px gradient, deep violet → brand ——— */}
      <footer
        aria-hidden="true"
        className="relative h-[10px] w-full shrink-0 print:hidden"
        style={{ background: "linear-gradient(to right, #160144 0%, #8750ff 72%)" }}
      >
        <span aria-hidden="true" className="absolute bottom-full left-0 h-[21px] w-[21px] bg-[#f2f2f2] print:hidden" />
        <span aria-hidden="true" className="absolute bottom-full right-0 h-[21px] w-[21px] bg-[#f2f2f2] print:hidden" />
      </footer>
    </div>
  );
}
