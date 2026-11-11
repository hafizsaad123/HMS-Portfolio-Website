import type { Metadata } from "next";
import { ProjectEditorPage } from "@/components/admin/ProjectEditorPage";

export const metadata: Metadata = {
  title: "Case Study Editor",
  robots: { index: false, follow: false },
};

/**
 * Case study WYSIWYG editor — /admin/projects/<id>.
 *
 * The editor itself is a client component (it loads the project from the
 * admin API — Next.js in development, PHP on the live host — and reads
 * the id from the URL, so it also powers the /admin/projects/dynamic/
 * fallback for projects created after a static export).
 */
export default function AdminCaseStudyPage() {
  return <ProjectEditorPage />;
}
