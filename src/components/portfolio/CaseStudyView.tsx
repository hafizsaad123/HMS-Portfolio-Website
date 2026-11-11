"use client";

/**
 * Case study page (client view) — /work/<slug>.
 *
 * The slug is read from the URL, so this one component serves every
 * project page: the pre-rendered ones (baked at export time with their
 * content as initialData) AND pages for projects created later on the
 * live host (served through the /work/dynamic/ fallback, which fetches
 * everything from the API).
 */

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { FloatingNav } from "./FloatingNav";
import { RichDocRenderer } from "@/components/case-study/RichDocRenderer";
import { useContent } from "./SiteData";
import { blocksToDoc, docIsEmpty, type RichDoc } from "@/lib/rich";
import { byDisplayOrder } from "@/data/projects";
import type { ContentPayload } from "@/data/types";

/** "/work/ai-matterz/" → "ai-matterz" */
function slugFromPathname(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 1] : "";
}

export function CaseStudyView({ initial }: { initial?: ContentPayload }) {
  const pathname = usePathname() ?? "";
  const slug = slugFromPathname(pathname);
  const { data, isError, refetch } = useContent(initial);

  if (!data) {
    return (
      <div className="flex min-h-dvh items-center justify-center" role="status">
        <span
          className="h-10 w-10 animate-spin rounded-full border-[3px] border-line border-t-brand"
          aria-hidden="true"
        />
      </div>
    );
  }

  const project = data.projects.find((p) => p.slug === slug) ?? null;

  if (!project) {
    return (
      <div className="flex min-h-dvh flex-col lg:h-dvh lg:flex-row lg:overflow-hidden">
        <Sidebar />
        <main className="flex min-w-0 flex-1 items-center justify-center px-6">
          <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-line bg-white px-8 py-12 text-center">
            <p className="text-[15px] font-semibold text-ink">This case study isn’t available.</p>
            <p className="text-sm leading-relaxed text-soft">
              It may have been renamed or removed. Head back to the work grid to see everything.
            </p>
            <Link
              href="/work"
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand px-6 text-sm font-medium text-white transition-colors hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              All work
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const ordered = byDisplayOrder(data.projects);
  const index = ordered.findIndex((p) => p.slug === project.slug);
  const prev = index > 0 ? ordered[index - 1] : null;
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;

  // Body: the WYSIWYG doc (new format) wins; legacy block content migrates
  // on the fly so nothing written before the upgrade is ever lost.
  const doc: RichDoc | null =
    project.doc ?? (project.content.length > 0 ? blocksToDoc(project.content) : null);
  const hasBody = !docIsEmpty(doc);
  const unavailable = isError && !initial; // API down with nothing baked in

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:flex-row lg:overflow-hidden">
      <Sidebar />

      <main className="nice-scroll min-w-0 flex-1 px-4 pt-8 pb-32 sm:px-6 lg:h-dvh lg:overflow-y-auto lg:px-8">
        <div className="mx-auto w-full max-w-[50rem]">
          {/* ——— back ——— */}
          <Link
            href="/work"
            className="inline-flex items-center gap-1.5 rounded-sm text-sm text-body transition-colors hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All Work
          </Link>

          {/* ——— hero ——— */}
          <header className="mt-6 flex flex-col gap-5">
            {project.category ? (
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand">
                {project.category}
              </p>
            ) : null}
            <h1 className="text-[2rem] font-bold leading-[1.12] tracking-tight text-ink sm:text-[2.6rem]">
              {project.title}
            </h1>
            {project.shortDescription ? (
              <p className="text-[16px] leading-relaxed text-body sm:text-[17px]">{project.shortDescription}</p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              {project.url ? (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-brand px-6 text-sm font-medium text-white transition-colors hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Visit live project
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </a>
              ) : null}
              {project.services.map((service) => (
                <span
                  key={service}
                  className="inline-flex items-center rounded-full bg-badge px-3.5 py-2 text-[12.5px] font-medium text-body"
                >
                  {service}
                </span>
              ))}
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line py-5 text-[13.5px] sm:grid-cols-3">
              <div>
                <dt className="text-soft">Role</dt>
                <dd className="mt-1 font-semibold text-ink">{project.role || "—"}</dd>
              </div>
              <div>
                <dt className="text-soft">Period</dt>
                <dd className="mt-1 font-semibold text-ink">{project.period || "—"}</dd>
              </div>
              <div>
                <dt className="text-soft">Category</dt>
                <dd className="mt-1 font-semibold text-ink">{project.category || "—"}</dd>
              </div>
            </dl>
          </header>

          {/* ——— cover ——— */}
          {project.cover ? (
            <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-tile">
              <Image
                src={project.cover}
                alt={`${project.title} — cover artwork`}
                width={1600}
                height={1000}
                sizes="(min-width: 864px) 800px, 94vw"
                className="h-auto w-full object-cover"
                priority
              />
            </div>
          ) : null}

          {/* ——— body ——— */}
          {unavailable ? (
            <div className="mt-12 rounded-2xl border border-dashed border-line bg-badge/40 px-6 py-10 text-center">
              <p className="text-[15px] font-medium text-ink">Live content couldn’t load.</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-4 h-10 rounded-full bg-brand px-6 text-sm font-medium text-white transition-colors hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Try again
              </button>
            </div>
          ) : hasBody && doc ? (
            <div className="mt-12">
              <RichDocRenderer doc={doc} />
            </div>
          ) : (
            <div className="mt-12 rounded-2xl border border-dashed border-line bg-badge/40 px-6 py-14 text-center">
              <p className="text-[15px] font-medium text-ink">Full case study coming soon.</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-soft">
                The story of this engagement — process, decisions and outcomes — is being written
                right now. The essentials live above in the meantime.
              </p>
            </div>
          )}

          {/* ——— prev / next ——— */}
          <nav aria-label="More projects" className="mt-20 grid grid-cols-1 gap-3 border-t border-line pt-8 sm:grid-cols-2">
            {prev ? (
              <Link
                href={`/work/${prev.slug}`}
                rel="prev"
                className="group flex min-w-0 items-center gap-3 rounded-xl border border-line bg-white p-4 transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <ChevronLeft className="h-5 w-5 shrink-0 text-soft transition-colors group-hover:text-brand" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-soft">Previous</span>
                  <span className="block truncate text-[15px] font-semibold text-ink group-hover:text-brand">{prev.title}</span>
                </span>
              </Link>
            ) : (
              <span aria-hidden="true" className="hidden sm:block" />
            )}
            {next ? (
              <Link
                href={`/work/${next.slug}`}
                rel="next"
                className="group flex min-w-0 items-center justify-end gap-3 rounded-xl border border-line bg-white p-4 text-right transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-soft">Next</span>
                  <span className="block truncate text-[15px] font-semibold text-ink group-hover:text-brand">{next.title}</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-soft transition-colors group-hover:text-brand" aria-hidden="true" />
              </Link>
            ) : null}
          </nav>
        </div>
      </main>

      <FloatingNav resumeUrl={data.site.resumeUrl} email={data.site.email} />
    </div>
  );
}
