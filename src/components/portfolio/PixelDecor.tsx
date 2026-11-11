/**
 * Pixel-art decorations, drawn from the supplied exports.
 * - variant "header": the small L-shaped pixel cluster at the top-right of
 *   the sidebar header (dark + bright purple squares).
 * - variant "stair": the stair-step cascade at the white→black boundary of
 *   the About page sidebar (blue-purple, bright purple, lavender, deep).
 */

const SQ = 11; // square size in px
const GAP = 5;

export function PixelDecor({ variant }: { variant: "header" | "stair" }) {
  if (variant === "header") {
    // L-shape: 3 across the top + 2 down the left, mixed shades.
    const cells: Array<{ x: number; y: number; c: string }> = [
      { x: 0, y: 0, c: "#170146" },
      { x: 1, y: 0, c: "#8750f6" },
      { x: 2, y: 0, c: "#170146" },
      { x: 0, y: 1, c: "#8750f6" },
      { x: 0, y: 2, c: "#c3a7ff" },
      { x: 1, y: 2, c: "#170146" },
    ];
    return (
      <div aria-hidden="true" className="relative hidden sm:block" style={{ width: 3 * SQ + 2 * GAP, height: 3 * SQ + 2 * GAP }}>
        {cells.map((cell, i) => (
          <span
            key={i}
            className="absolute rounded-[2px]"
            style={{
              width: SQ,
              height: SQ,
              left: cell.x * (SQ + GAP),
              top: cell.y * (SQ + GAP),
              backgroundColor: cell.c,
            }}
          />
        ))}
      </div>
    );
  }

  // "stair": descending cascade, top-left of the About sidebar boundary.
  const cells: Array<{ x: number; y: number; c: string }> = [
    { x: 0, y: 0, c: "#5555ff" },
    { x: 1, y: 1, c: "#8750f6" },
    { x: 2, y: 2, c: "#c3a7ff" },
    { x: 3, y: 3, c: "#170146" },
  ];
  return (
    <div aria-hidden="true" className="relative" style={{ width: 4 * SQ + 3 * GAP, height: 4 * SQ + 3 * GAP }}>
      {cells.map((cell, i) => (
        <span
          key={i}
          className="absolute rounded-[2px]"
          style={{
            width: SQ,
            height: SQ,
            left: cell.x * (SQ + GAP),
            top: cell.y * (SQ + GAP),
            backgroundColor: cell.c,
          }}
        />
      ))}
    </div>
  );
}
