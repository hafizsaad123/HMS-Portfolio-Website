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

/**
 * My Work section — heading + subheading + functional sort control +
 * 2-column card grid, per the Work export. Heading text is managed from
 * the admin portal (passed in by the server page).
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
        <div>
          <h1 id="my-work-heading" className="text-[28px] leading-tight font-bold tracking-tight text-ink sm:text-3xl">
            {heading}
          </h1>
          <p className="mt-1.5 text-sm text-soft">
            {subheading}
          </p>
        </div>
        <SortControl value={sort} onChange={setSort} />
      </div>

      <ul className="mt-9 grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2">
        {sorted.map((project) => (
          <li key={project.slug}>
            <ProjectCard project={project} />
          </li>
        ))}
      </ul>
    </section>
  );
}
