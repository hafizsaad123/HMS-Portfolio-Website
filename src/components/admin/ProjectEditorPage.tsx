"use client";

/**
 * Case study WYSIWYG editor — /admin/projects/<id>.
 *
 * Client component: the project row is loaded from the admin API
 * (Next.js in development, PHP on the live host), which also makes this
 * page work for projects created after the static export (served through
 * the /admin/projects/dynamic/ fallback). Legacy block content (the
 * pre-WYSIWYG format) is migrated in place so nothing is ever lost.
 */

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/admin/client";
import { blocksToDoc, parseDocJson, type RichDoc } from "@/lib/rich";
import { RichTextEditor } from "@/components/admin/rich/RichTextEditor";

interface AdminProject {
  id: string;
  title: string;
  slug: string;
  content: unknown[];
  contentDoc: string;
}

/** "/admin/projects/<id>" → "<id>" (from the real URL — useParams would
 *  return the baked "dynamic" param on the fallback page). */
function idFromPathname(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  return parts.length >= 3 ? parts[parts.length - 1] : "";
}

export function ProjectEditorPage() {
  const pathname = usePathname() ?? "";
  const id = idFromPathname(pathname);

  const [project, setProject] = useState<AdminProject | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">(
    () => (id ? "loading" : "missing"),
  );

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api<{ items: AdminProject[] }>("/api/admin/projects")
      .then((data) => {
        if (cancelled) return;
        const found = (data.items ?? []).find((p) => p.id === id) ?? null;
        if (found) {
          setProject(found);
          setStatus("ready");
        } else {
          setStatus("missing");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const doc: RichDoc | null = useMemo(() => {
    if (!project) return null;
    const parsed = parseDocJson(project.contentDoc);
    if (parsed) return parsed;
    // legacy blocks → doc migration (kept until the next save overwrites)
    const blocks = Array.isArray(project.content) ? project.content : [];
    return blocks.length > 0 ? blocksToDoc(blocks) : { type: "doc", content: [{ type: "paragraph" }] };
  }, [project]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" role="status">
        <span
          className="h-10 w-10 animate-spin rounded-full border-[3px] border-line border-t-brand"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (status === "error" || status === "missing") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-line bg-white px-8 py-12 text-center">
          <p className="text-[15px] font-semibold text-ink">
            {status === "error" ? "The admin API didn’t respond." : "Project not found."}
          </p>
          <p className="text-sm leading-relaxed text-soft">
            {status === "error"
              ? "Make sure the API is reachable, then reload this page."
              : "It may have been deleted — pick another project from the list."}
          </p>
          <Link
            href="/admin/projects"
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand px-6 text-sm font-medium text-white transition-colors hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All projects
          </Link>
        </div>
      </div>
    );
  }

  if (!project || !doc) return null;

  return (
    <RichTextEditor projectId={project.id} title={project.title} slug={project.slug} initialDoc={doc} />
  );
}
