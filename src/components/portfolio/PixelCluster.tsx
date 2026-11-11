/**
 * PixelCluster — the brand motif from the approved designs, recreated at
 * the exact measured coordinates:
 *
 *   · top-right  — a stepped pair of purple + deep-violet 12px squares
 *                  hugging the frame's inner corner
 *   · bottom-left — the mirrored staircase straddling the frame corner
 *   · top-left   — the quiet 8px whisper of a square outside the corner
 *
 * Every square "breathes" on its own schedule (staggered, very subtle) —
 * the clusters always LOOK like the static design, just faintly alive.
 * Patterns are hand-tuned and deterministic (no randomness) so server and
 * client render identically.
 */

export type PixelCorner = "top-right" | "bottom-left";

type Dot = {
  /** square size in px */
  s: number;
  /** offset from the cluster's anchor corner (px) */
  x: number;
  y: number;
  color: string;
  /** blink delay in seconds */
  d: number;
  radius?: number;
};

const BRAND = "#8750f6"; // design sample: #8750ff (imperceptible delta)
const DEEP = "#170146"; // exact match

/**
 * Top-right — measured 1:1 from the export (offsets from the frame's
 * inner top-right corner): purple(22,1) deep(-2,1) purple(10,11) deep(-2,23).
 * The deep squares straddle the border exactly as drawn.
 */
const TOP_RIGHT: Dot[] = [
  { s: 12, x: 22, y: 1, color: BRAND, d: 0 },
  { s: 12, x: -2, y: 1, color: DEEP, d: 1.1 },
  { s: 12, x: 10, y: 11, color: BRAND, d: 2.2 },
  { s: 12, x: -2, y: 23, color: DEEP, d: 3.0 },
];

/**
 * Bottom-left — mirrored staircase, measured 1:1 (offsets from the
 * frame's inner bottom-left corner): deep(-1,21) purple(11,11) deep(-1,-1) purple(23,-1).
 */
const BOTTOM_LEFT: Dot[] = [
  { s: 12, x: -1, y: 21, color: DEEP, d: 0.4 },
  { s: 12, x: 11, y: 11, color: BRAND, d: 1.5 },
  { s: 12, x: -1, y: -1, color: DEEP, d: 2.4 },
  { s: 12, x: 23, y: -1, color: BRAND, d: 3.2 },
];

export function PixelCluster({ corner }: { corner: PixelCorner }) {
  const dots = corner === "top-right" ? TOP_RIGHT : BOTTOM_LEFT;
  const isTop = corner === "top-right";

  return (
    <>
      {dots.map((dot, i) => (
        <span
          key={i}
          className="pixel-dot absolute block print:hidden"
          style={{
            width: dot.s,
            height: dot.s,
            borderRadius: dot.radius ?? 2,
            backgroundColor: dot.color,
            right: isTop ? dot.x : undefined,
            top: isTop ? dot.y : undefined,
            left: isTop ? undefined : dot.x,
            bottom: isTop ? undefined : dot.y,
            animationDelay: `${dot.d}s`,
          }}
        />
      ))}
    </>
  );
}
