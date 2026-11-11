"use client";

/**
 * Work page (client view) — heading, subheading, sort control and the
 * 2-column card grid. Heading text comes from the content query
 * (admin-managed); the server page bakes the current content in as
 * initialData and this view refreshes it live from the API.
 */

import { Sidebar } from "./Sidebar";
import { FloatingNav } from "./FloatingNav";
import { WorkSection } from "./WorkSection";
import { useContent } from "./SiteData";
import { byDisplayOrder } from "@/data/projects";
import type { ContentPayload } from "@/data/types";

export function WorkView({ initial }: { initial?: ContentPayload }) {
  const { data } = useContent(initial);
  const ordered = data ? byDisplayOrder(data.projects) : [];

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:flex-row lg:overflow-hidden">
      <Sidebar />

      <main className="nice-scroll min-w-0 flex-1 px-4 pt-8 pb-36 sm:px-6 lg:h-dvh lg:overflow-y-auto lg:px-8">
        {data ? (
          <WorkSection
            projects={ordered}
            heading={data.texts["work.heading"] || "My Work"}
            subheading={
              data.texts["work.subheading"] || "See my top insane high quality versatile projects"
            }
          />
        ) : (
          <div className="flex min-h-[50vh] items-center justify-center" role="status">
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
