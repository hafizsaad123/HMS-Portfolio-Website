import Image from "next/image";

/**
 * Saad's Quaid-e-Azam mazar illustration — the pale lavender line-art
 * landmark, anchored to the BOTTOM-LEFT of the sidebar card on every
 * page. Recreated from the supplied reference (upload/
 * pasted_image_1792680283526.png): the export's faint lavender lines
 * are the brand purple #8750F6 at up to ~20% opacity over white, so the
 * art was reconstructed as purple strokes with recovered alpha — it
 * renders pixel-identically to the reference on the white card.
 *
 * The illustration stays clear of the corner-frame's bottom band (the
 * gradient bar, the gray corner squares and the bottom-left cascade):
 * on small screens it stops above the card's bottom edge, and at lg+
 * it lives in the flexible bottom section — keeping its natural size
 * when there's room, shrinking fluidly when space is tight, and hiding
 * entirely on very short viewports (.sidebar-art) so the pinned sidebar
 * never needs to scroll.
 *
 * The image source is managed from the admin portal (sidebar artwork in
 * Site Content → Images); it defaults to the bundled illustration.
 */
export function SidebarArtwork({ src = "/images/mazar.png" }: { src?: string }) {
  return (
    <div
      aria-hidden="true"
      className="sidebar-art pointer-events-none relative mr-auto mb-[56px] aspect-[421/306] w-[84%] max-w-[380px] select-none lg:mb-0 lg:aspect-auto lg:min-h-0 lg:w-full lg:max-w-none lg:flex-1"
    >
      {/* the drawable area stops above the frame band (cascade top ≈ 69px
          above the card bottom at lg) so the pixel squares stay unobstructed */}
      <div className="absolute inset-0 lg:bottom-[77px]">
        <Image
          src={src}
          alt=""
          fill
          sizes="(min-width: 1024px) 340px, 84vw"
          className="object-contain object-left object-bottom"
          priority={false}
        />
      </div>
    </div>
  );
}
