import Image from "next/image";

/**
 * The faint line-art blazer illustration from the sidebar exports.
 * Decorative only — rendered ghosted at the bottom of the sidebar.
 */
export function BlazerIllustration() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-[280px] sm:w-[320px] lg:w-[380px] aspect-square opacity-100 select-none pointer-events-none">
      <Image
        src="/images/blazer.png"
        alt=""
        fill
        sizes="380px"
        className="object-contain object-bottom"
        priority={false}
      />
    </div>
  );
}
