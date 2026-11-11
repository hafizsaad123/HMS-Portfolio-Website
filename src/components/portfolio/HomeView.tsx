"use client";

/**
 * Home — the always-moving work gallery (client view).
 *
 * The server page bakes the current content in as initialData (SEO +
 * instant paint); this view then refreshes it from GET /api/content so
 * admin edits (new projects, new covers, reordered tiles…) appear live.
 */

import { Sidebar } from "./Sidebar";
import { FloatingNav } from "./FloatingNav";
import { WorkMarquee } from "./WorkMarquee";
import { useContent } from "./SiteData";
import { byDisplayOrder } from "@/data/projects";
import type { ContentPayload } from "@/data/types";

export function HomeView({ initial }: { initial?: ContentPayload }) {
  const { data } = useContent(initial);
  const ordered = data ? byDisplayOrder(data.projects.filter((p) => p.showOnHome)) : [];

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:flex-row lg:overflow-hidden">
      <Sidebar />

      <main className="relative min-w-0 flex-1 lg:h-dvh">
        {data ? (
          <>
            {data.site ? (
              <h1 className="sr-only">
                {data.site.name} — {data.site.role}. Selected work gallery.
              </h1>
            ) : null}
            {ordered.length > 0 ? (
              <WorkMarquee projects={ordered} />
            ) : (
              <div className="flex h-[72vh] items-center justify-center px-6 sm:h-[80vh]">
                <p className="max-w-sm text-center text-sm leading-relaxed text-soft">
                  The work gallery is being curated right now — check back soon.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-[72vh] items-center justify-center sm:h-[80vh]" role="status">
            <span
              className="h-10 w-10 animate-spin rounded-full border-[3px] border-line border-t-brand"
              aria-hidden="true"
            />
          </div>
        )}
      </main>

      {data ? <FloatingNav resumeUrl={data.site.resumeUrl} email={data.site.email} /> : null}
    </div>
  );
}
