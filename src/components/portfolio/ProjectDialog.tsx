"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Project } from "@/data/projects";

/**
 * In-page project viewer. Shows only real, supplied data (title, role,
 * period, category, services, cover). When a project gains a real external
 * URL, the buttons link there instead (see ProjectCard / ProjectTile).
 */
export function ProjectDialog({
  project,
  open,
  onOpenChange,
}: {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-hidden rounded-2xl p-0 sm:max-w-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{project.title}</DialogTitle>
          <DialogDescription>{project.shortDescription}</DialogDescription>
        </DialogHeader>

        <div className="relative aspect-[16/10] w-full">
          <Image
            src={project.cover}
            alt={`${project.title} — ${project.category} cover artwork`}
            fill
            sizes="(min-width: 640px) 576px, 100vw"
            className="object-cover"
          />
        </div>

        <div className="flex flex-col gap-4 px-6 pb-6">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
            <div className="min-w-0">
              <p className="text-lg leading-tight font-semibold text-ink">{project.title}</p>
              <p className="mt-1 text-sm text-body">{project.shortDescription}</p>
            </div>
            {project.url ? (
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-brand px-5 text-sm font-medium text-white transition-colors hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Visit project
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : null}
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-4 text-[13px] sm:grid-cols-4">
            <div>
              <dt className="text-soft">Role</dt>
              <dd className="mt-0.5 font-medium text-ink">{project.role}</dd>
            </div>
            <div>
              <dt className="text-soft">Period</dt>
              <dd className="mt-0.5 font-medium text-ink">{project.period}</dd>
            </div>
            <div>
              <dt className="text-soft">Category</dt>
              <dd className="mt-0.5 font-medium text-ink">{project.category}</dd>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <dt className="text-soft">Services</dt>
              <dd className="mt-0.5 font-medium text-ink">{project.services.join(", ")}</dd>
            </div>
          </dl>
        </div>
      </DialogContent>
    </Dialog>
  );
}
