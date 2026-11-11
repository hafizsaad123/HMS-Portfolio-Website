"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/data/projects";

/**
 * Work page project card — image block (3:2) + text row with the purple
 * circle action button at the far right, per the Work export. Opens the
 * project's own case study page at /work/<slug>.
 */
export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/work/${project.slug}`}
      className="group flex w-full flex-col text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-md"
      aria-label={`Open the ${project.title} case study — ${project.category}`}
    >
      <span className="relative block aspect-[3/2] w-full overflow-hidden rounded-md bg-tile">
        <Image
          src={project.cover}
          alt={`${project.title} — ${project.category}`}
          fill
          sizes="(min-width: 640px) 45vw, 92vw"
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
        />
      </span>

      <span className="mt-3 flex items-center justify-between gap-4">
        <span className="min-w-0">
          <span className="block truncate text-[17px] leading-tight font-semibold text-ink group-hover:text-brand">
            {project.title}
          </span>
          <span className="mt-1 block text-sm leading-snug text-soft">
            {project.shortDescription}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-white transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        >
          <ArrowUpRight className="h-5 w-5" />
        </span>
      </span>
    </Link>
  );
}
