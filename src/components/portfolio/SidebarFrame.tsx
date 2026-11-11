/**
 * Sidebar corner frame — recreated from Saad's supplied reference
 * (upload/pasted_image_1792674597377.png, a 300×784 export of the sidebar
 * container), later relaxed for more breathing room per Saad's feedback:
 *
 *  - four light-gray squares (#F2F2F2, radius 0) marking the card corners.
 *    TL/TR are inset a few px from the top edge (they used to sit flush
 *    under the top border, which read as if they were escaping the card —
 *    they now keep clear daylight from the border on every side);
 *    BL/BR still sit directly on the gradient bar, flush with the sides;
 *  - four thin frame lines (#E7E7E7) extending the squares' inner edges,
 *    forming an inner rectangle. The top line sits deeper than the sides
 *    (19px / 27px at lg) so the whole top decor cluster — line + corner
 *    squares + cascade — is unmistakably INSIDE the card;
 *  - two pixel cascades of sharp squares (#8750F6 bright + #170146 dark)
 *    tucked into the inner rectangle's top-right and bottom-left corners
 *    (the bottom-left cluster is the top-right rotated 180°):
 *
 *      top-right              bottom-left
 *      B . D                  D . .
 *      . B .                  . B .
 *      . . D                  D . B
 *
 *  - a gradient bar (#170146 → #8750F6) closing the card's bottom edge
 *    (full-bleed by design).
 *
 * Reference scale (300px-wide card) on small screens; ×1.48 for the ~444px
 * lg sidebar. All corners perfectly sharp — radius 0, per the design.
 * The card itself also carries overflow-hidden, so nothing can ever
 * render outside the sidebar — guaranteed.
 */

const BRIGHT = "bg-brand"; // #8750F6
const DARK = "bg-brand-deep"; // #170146
const SQUARE = "bg-[#f2f2f2]"; // corner squares
const LINE = "bg-[#e7e7e7]"; // frame lines

/** One cascade square: 8px on small screens, 12px at lg+. */
function CascadeSquare({
  className,
  color,
}: {
  className: string;
  color: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`absolute h-2 w-2 lg:h-3 lg:w-3 ${color} ${className}`}
    />
  );
}

export function SidebarFrame() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 select-none"
    >
      {/* ——— frame lines (inner rectangle) ——— the top line sits deeper
          (19px / 27px) than the sides so the top decor keeps clear
          daylight from the card border */}
      <span className={`absolute top-[19px] right-0 left-0 h-px lg:top-[27px] ${LINE}`} />
      <span className={`absolute bottom-[23px] right-0 left-0 h-px lg:bottom-[33px] ${LINE}`} />
      <span className={`absolute top-0 bottom-[7px] left-[15px] w-px lg:bottom-[10px] lg:left-[22px] ${LINE}`} />
      <span className={`absolute top-0 bottom-[7px] right-[15px] w-px lg:bottom-[10px] lg:right-[22px] ${LINE}`} />

      {/* ——— light-gray corner squares ——— TL/TR inset from the top edge
          (clear of the border); BL/BR on the gradient bar, flush sides */}
      <span className={`absolute top-[4px] left-0 h-[14px] w-[14px] lg:top-[5px] lg:h-[21px] lg:w-[21px] ${SQUARE}`} />
      <span className={`absolute top-[4px] right-0 h-[14px] w-[14px] lg:top-[5px] lg:h-[21px] lg:w-[21px] ${SQUARE}`} />
      <span className={`absolute bottom-[7px] left-0 h-[14px] w-[14px] lg:bottom-[10px] lg:h-[21px] lg:w-[21px] ${SQUARE}`} />
      <span className={`absolute bottom-[7px] right-0 h-[14px] w-[14px] lg:bottom-[10px] lg:h-[21px] lg:w-[21px] ${SQUARE}`} />

      {/* ——— top-right cascade (bright B / dark D) ——— tucked into the
          inner rectangle's corner, safely inside the card
          B . D
          . B .
          . . D            */}
      <CascadeSquare className="top-[19px] right-[35px] lg:top-[27px] lg:right-[51px]" color={BRIGHT} />
      <CascadeSquare className="top-[19px] right-[19px] lg:top-[27px] lg:right-[27px]" color={DARK} />
      <CascadeSquare className="top-[27px] right-[27px] lg:top-[39px] lg:right-[39px]" color={BRIGHT} />
      <CascadeSquare className="top-[35px] right-[19px] lg:top-[51px] lg:right-[27px]" color={DARK} />

      {/* ——— bottom-left cascade (the same cluster rotated 180°) ———
          D . .
          . B .
          D . B            */}
      <CascadeSquare className="bottom-[39px] left-[19px] lg:bottom-[57px] lg:left-[27px]" color={DARK} />
      <CascadeSquare className="bottom-[31px] left-[27px] lg:bottom-[45px] lg:left-[39px]" color={BRIGHT} />
      <CascadeSquare className="bottom-[23px] left-[19px] lg:bottom-[33px] lg:left-[27px]" color={DARK} />
      <CascadeSquare className="bottom-[23px] left-[35px] lg:bottom-[33px] lg:left-[51px]" color={BRIGHT} />

      {/* ——— gradient bar closing the bottom edge ——— */}
      <span className="absolute right-0 bottom-0 left-0 h-[7px] bg-gradient-to-r from-brand-deep to-brand lg:h-[10px]" />
    </div>
  );
}
