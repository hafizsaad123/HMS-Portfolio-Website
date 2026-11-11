"use client";

/**
 * Reveal — the site's motion language, one small primitive.
 *
 * Sections glide up into place the moment they enter the viewport
 * (once only — never re-triggering while scrolling back). All motion
 * respects prefers-reduced-motion by resting in the final state.
 */

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/** Signature easing — fast start, long silky settle. */
export const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

export function Reveal({
  children,
  delay = 0,
  y = 20,
  duration = 0.6,
  className,
  as = "div",
}: {
  children: ReactNode;
  /** seconds — stagger sections/chips with small increments */
  delay?: number;
  /** vertical travel in px */
  y?: number;
  duration?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span" | "h1" | "h2" | "p";
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as];

  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-36px" }}
      transition={{ duration, delay, ease: EASE_OUT_EXPO }}
    >
      {children}
    </Tag>
  );
}

/** Spring pop — used for the avatar, copy-checkmark and card tilts. */
export const SPRING = { type: "spring", stiffness: 320, damping: 26 } as const;
