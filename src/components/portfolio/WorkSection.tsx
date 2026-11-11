"use client";

import { useMemo, useState } from "react";
import {
  byDisplayOrder,
  byOldest,
  byRecent,
  type Project,
  type SortMode,
} from "@/data/projects";
import { ProjectCard } from "./ProjectCard";
import { SortControl } from "./SortControl";
import { Reveal } from "./Reveal";

/**
 * My Work section — heading + subheading + functional sort control +
 * the 2-column card grid. Cards cascade in with a staggered reveal;
 * heading text is managed from the admin portal.
 */
export function WorkSection({
  projects,
  heading = "My Work",
  subheading = "See my top insane high quality versatile projects",
}: {
  projects: Project[];
  heading?: string;
  subheading?: string;
}) {
  const [sort, setSort] = useState<SortMode>("recent");

  const sorted = useMemo(() => {
    if (sort === "oldest") return byOldest(projects);
    if (sort === "recent") return byRecent(projects);
    return byDisplayOrder(projects);
  }, [projects, sort]);

  return (
    <section aria-labelledby="my-work-heading">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <Reveal delay={0.05}>
          <div>
            <h1
              id="my-work-heading"
              className="text-[34px] leading-[1.15] font-bold tracking-[-0.02em] text-ink sm:text-[36px]"
            >
              {heading}
            </h1>
            <p className="mt-3.5 text-pretty text-[15px] text-soft">{subheading}</p>
          </div>
        </Reveal>
        <Reveal delay={0.12}>
          <SortControl value={sort} onChange={setSort} />
        </Reveal>
      </div>

      <ul className="mt-9 grid grid-cols-1 gap-x-[22px] gap-y-[46px] sm:grid-cols-2">
        {sorted.map((project, i) => (
          <Reveal as="li" key={project.slug} delay={Math.min(i * 0.07, 0.35)} y={26}>
            <ProjectCard project={project} eager={i < 2} />
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
