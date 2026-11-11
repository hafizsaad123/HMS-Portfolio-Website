"use client";

/**
 * Work page (client view) — the centered gallery inside the framed
 * canvas: heading, subheading, sort control and the 2-column card grid.
 * Heading text comes from the content query (admin-managed); the server
 * page bakes the current content in as initialData and this view
 * refreshes it live from the API.
 */

import { PageCanvas } from "./PageCanvas";
import { FloatingNav } from "./FloatingNav";
import { WorkSection } from "./WorkSection";
import { useContent, PageLoading } from "./SiteData";
import { byDisplayOrder } from "@/data/projects";
import type { ContentPayload } from "@/data/types";

export function WorkView({ initial }: { initial?: ContentPayload }) {
  const { data } = useContent(initial);
  const ordered = data ? byDisplayOrder(data.projects) : [];

  return (
    <>
      <PageCanvas>
        <main className="nice-scroll min-w-0 px-5 pb-[150px] pt-16 sm:px-6 sm:pt-[132px] lg:px-0">
          <div className="mx-auto w-full max-w-[875px]">
            {data ? (
              <WorkSection
                projects={ordered}
                heading={data.texts["work.heading"] || "My Work"}
                subheading={
                  data.texts["work.subheading"] ||
                  "See my top insane high quality versatile projects"
                }
              />
            ) : (
              <PageLoading label="Loading the work…" />
            )}
          </div>
        </main>
      </PageCanvas>

      {data ? <FloatingNav resumeUrl={data.site.resumeUrl} email={data.site.email} /> : null}
    </>
  );
}
