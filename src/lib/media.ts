/**
 * Media storage — Supabase Storage, with a local-disk fallback for legacy
 * files.
 *
 * NEW uploads go straight from the browser to the Supabase "media" bucket
 * (see lib/admin/upload.ts) — the app server never proxies file bytes, so
 * big phone photos can't hit gateway/server timeouts anymore. Only the
 * metadata row is registered through POST /api/admin/media.
 *
 * LEGACY content (migrated from the SQLite era) references
 * /api/media/<filename> URLs. That route serves the local db/uploads copy
 * when it exists (dev/preview) and otherwise redirects to the object's
 * public Supabase Storage URL — after `bun scripts/seed-supabase-storage.ts`
 * runs, everything resolves from Supabase.
 */

import { readFile } from "fs/promises";
import path from "path";
import { createPublicClient } from "@/utils/supabase/public";
import { TABLES } from "@/lib/supabase-tables";
import { isSafeStorageName } from "@/lib/media-rules";

export const UPLOAD_DIR = path.join(process.cwd(), "db", "uploads");

/** Safely resolve a stored filename to an absolute path (no traversal). */
export function resolveStoredFile(filename: string): string | null {
  if (!isSafeStorageName(filename)) return null;
  return path.join(UPLOAD_DIR, filename);
}

/** Read a locally stored file (null when missing/invalid). */
export async function readStoredFile(filename: string): Promise<Buffer | null> {
  const filePath = resolveStoredFile(filename);
  if (!filePath) return null;
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}

/** Find every place a media URL is referenced by site content. */
export async function findMediaReferences(url: string): Promise<string[]> {
  const client = createPublicClient();
  const refs: string[] = [];

  const [site, projects, texts] = await Promise.all([
    client.from(TABLES.site).select("*").eq("id", 1).maybeSingle(),
    client.from(TABLES.projects).select("title, cover, content_json, content_doc"),
    client.from(TABLES.texts).select("key, value"),
  ]);

  if (site.data) {
    const s = site.data as Record<string, unknown>;
    const imageRefs: Array<[string, string | null]> = [
      ["Profile picture (sidebar)", s.avatar_path as string | null],
      ["Portrait (About sign-off)", s.portrait_path as string | null],
      ["Signature (About sign-off)", s.signature_path as string | null],
      ["Sidebar artwork", s.artwork_path as string | null],
    ];
    for (const [label, value] of imageRefs) {
      if (value === url) refs.push(label);
    }
  }

  for (const p of (projects.data as Array<Record<string, unknown>> | null) ?? []) {
    if (p.cover === url) refs.push(`Project cover — ${p.title}`);
    const contentJson = JSON.stringify(p.content_json ?? "");
    if (typeof contentJson === "string" && contentJson.includes(url)) {
      refs.push(`Case study page (legacy blocks) — ${p.title}`);
    }
    const contentDoc = String(p.content_doc ?? "");
    if (contentDoc.includes(url)) {
      refs.push(`Case study page — ${p.title}`);
    }
  }

  for (const t of (texts.data as Array<{ key: string; value: string }> | null) ?? []) {
    if (t.value.includes(url)) refs.push(`Text — ${t.key}`);
  }
  return refs;
}
