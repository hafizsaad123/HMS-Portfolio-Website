"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/data/projects";

/**
 * Work page project card — the design's near-square-cornered cover with a
 * light sweep on hover, bold title + short description, and the purple
 * arrow circle that spins 45° (pointing dead-ahead) as the card lifts.
 * Opens the project's own case study page at /work/<slug>.
 */
export function ProjectCard({ project, eager = false }: { project: Project; eager?: boolean }) {
  return (
    <Link
      href={`/work/${project.slug}`}
      className="group flex w-full flex-col rounded-[6px] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      aria-label={`Open the ${project.title} case study — ${project.category}`}
    >
      <span className="relative block aspect-[8/5] w-full overflow-hidden rounded-[6px] bg-tile">
        <Image
          src={project.cover}
          alt={`${project.title} — ${project.category}`}
          fill
          sizes="(min-width: 640px) 45vw, 92vw"
          priority={eager}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
        />
        {/* shine sweep */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
        />
      </span>

      <span className="mt-4 flex items-start justify-between gap-4">
        <span className="min-w-0">
          <span className="block truncate text-[18px] leading-tight font-semibold tracking-tight text-ink transition-colors duration-200 group-hover:text-brand">
            {project.title}
          </span>
          <span className="mt-1.5 block text-[13px] leading-snug text-soft">
            {project.shortDescription}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-white shadow-[0_8px_20px_-8px_rgba(135,80,246,0.6)] transition-all duration-300 ease-out group-hover:rotate-45 group-hover:scale-110 group-hover:bg-brand-deep"
        >
          <ArrowUpRight className="h-[17px] w-[17px]" />
        </span>
      </span>
    </Link>
  );
}
