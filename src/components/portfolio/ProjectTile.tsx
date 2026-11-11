"use client";

import Image from "next/image";
import { useState } from "react";
import type { Project } from "@/data/projects";
import { ProjectDialog } from "./ProjectDialog";

/**
 * Home gallery tile. Ratio follows the project's homeTile ("square" ≈ 1:1,
 * "landscape" ≈ 2:1) producing the staggered masonry from the Home export.
 * The whole tile opens the project viewer (real interaction, real data).
 */
export function ProjectTile({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  const ratio = project.homeTile === "landscape" ? "aspect-[2/1]" : "aspect-square";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group relative block w-full ${ratio} mb-5 break-inside-avoid overflow-hidden rounded-md bg-tile focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`}
        aria-label={`View ${project.title} — ${project.category}`}
      >
        <Image
          src={project.cover}
          alt={`${project.title} — ${project.category}`}
          fill
          sizes="(min-width: 1280px) 28vw, (min-width: 640px) 45vw, 92vw"
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-md ring-1 ring-black/5 transition-shadow duration-300 group-hover:shadow-[inset_0_0_0_9999px_rgba(23,1,70,0.08)]"
        />
      </button>
      <ProjectDialog project={project} open={open} onOpenChange={setOpen} />
    </>
  );
}
