import Image from "next/image";
import type { Project } from "@/data/projects";

/**
 * Home gallery — the always-moving work sliders:
 * four columns of project tiles scrolling forever. The two middle
 * columns travel downward, the two outer columns travel upward.
 *
 * Per the design, the tiles carry no labels and get no hover effects —
 * this is a living gallery wall. (Interactive project cards live on
 * the Work page.)
 */

function rotate<T>(list: T[], offset: number): T[] {
  const n = list.length;
  const k = ((offset % n) + n) % n;
  return [...list.slice(k), ...list.slice(0, k)];
}

function Tile({ project, decorative = false }: { project: Project; decorative?: boolean }) {
  const ratio = project.homeTile === "landscape" ? "aspect-[2/1]" : "aspect-square";
  return (
    <div className={`relative w-full overflow-hidden rounded-md bg-tile ${ratio}`}>
      <Image
        src={project.cover}
        alt={decorative ? "" : `${project.title} — ${project.category}`}
        fill
        sizes="(min-width: 1024px) 17vw, 23vw"
        className="object-cover"
      />
    </div>
  );
}

export function WorkMarquee({ projects }: { projects: Project[] }) {
  /* Outer columns (1 & 4) move up · middle columns (2 & 3) move down. */
  const columns = [
    { offset: 0, direction: "up", duration: "46s" },
    { offset: 2, direction: "down", duration: "54s" },
    { offset: 4, direction: "down", duration: "50s" },
    { offset: 1, direction: "up", duration: "58s" },
  ] as const;

  return (
    <section
      aria-label="Selected work — continuously scrolling gallery"
      className="h-[72vh] sm:h-[80vh] lg:h-full"
    >
      <div className="grid h-full grid-cols-4 gap-3 px-4 pt-4 sm:gap-4 lg:gap-5 lg:px-5 lg:pt-5">
        {columns.map((col) => {
          const list = rotate(projects, col.offset);
          return (
            <div key={col.offset} className="relative h-full overflow-hidden">
              <div
                className={`marquee-track ${col.direction === "up" ? "marquee-up" : "marquee-down"}`}
                style={{ "--marquee-duration": col.duration } as React.CSSProperties}
              >
                <ul className="flex flex-col gap-3 pb-3 sm:gap-4 sm:pb-4 lg:gap-5 lg:pb-5">
                  {list.map((project) => (
                    <li key={project.slug}>
                      <Tile project={project} />
                    </li>
                  ))}
                </ul>
                {/* seamless loop — an identical, non-interactive copy */}
                <ul aria-hidden="true" className="flex flex-col gap-3 pb-3 sm:gap-4 sm:pb-4 lg:gap-5 lg:pb-5">
                  {list.map((project) => (
                    <li key={`ghost-${project.slug}`}>
                      <Tile project={project} decorative />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
