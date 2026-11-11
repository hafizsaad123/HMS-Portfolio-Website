/**
 * Full backup engine — the "never lose anything" layer.
 *
 * A FULL backup is a single .zip that contains:
 *  - backup.json   → complete content snapshot (every project, text, list,
 *                    setting and media record — the same engine the revision
 *                    history uses)
 *  - uploads/*     → EVERY media file: local db/uploads copies (legacy) plus
 *                    every object in the Supabase "media" storage bucket
 *  - manifest.json → file list with sizes + SHA-256 checksums
 *  - README.txt    → what this is and how to restore it
 *
 * Restoring (.zip) writes the files back into the Supabase storage bucket
 * (upsert) and replaces the content from the snapshot. A safety revision of
 * the current state is always taken first.
 *
 * Serverless note: there are no more on-server auto-snapshots (no disk on
 * Vercel). The revision history + Supabase's built-in backups cover that,
 * and a full .zip can be downloaded anytime from Settings.
 */

import { createHash } from "crypto";
import { readdir, readFile, stat } from "fs/promises";
import path from "path";
import AdmZip from "adm-zip";
import { applySnapshot, buildSnapshot, type ContentSnapshot } from "@/lib/content";
import { UPLOAD_DIR } from "@/lib/media";
import { createClient } from "@/utils/supabase/server";
import { MEDIA_BUCKET } from "@/lib/supabase-tables";
import { isSafeStorageName } from "@/lib/media-rules";

/** Error thrown for files that aren't valid backups (→ HTTP 400, not 500). */
export class BackupFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupFileError";
  }
}

export interface FullBackup {
  buffer: Buffer;
  filename: string;
  fileCount: number;
}

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogv": "video/ogg",
  ".mov": "video/quicktime",
};

function mimeFor(name: string): string {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

// ————————————————————————————————————————————————
// Creating backups
// ————————————————————————————————————————————————

/** Safe-named files still present locally (legacy SQLite-era copies). */
async function listLocalFiles(): Promise<string[]> {
  try {
    const entries = await readdir(UPLOAD_DIR, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && isSafeStorageName(e.name) && !e.name.startsWith("."))
      .map((e) => e.name);
  } catch {
    return []; // no local folder (e.g. on Vercel) — storage is the source
  }
}

/** Object names currently in the Supabase media bucket. */
async function listStorageFiles(client: Awaited<ReturnType<typeof createClient>>): Promise<string[]> {
  const { data, error } = await client.storage
    .from(MEDIA_BUCKET)
    .list("", { limit: 1000, sortBy: { column: "name", order: "asc" } });
  if (error) throw new Error(`Couldn't list the media bucket: ${error.message}`);
  return (data ?? [])
    .filter((o) => o.id !== null && isSafeStorageName(o.name))
    .map((o) => o.name);
}

function timestampName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}` +
    `-${pad(date.getUTCHours())}-${pad(date.getUTCMinutes())}-${pad(date.getUTCSeconds())}`
  );
}

const README = (created: string, files: number) => `SAAD PORTFOLIO — FULL BACKUP
Created: ${created} (UTC)
Files included: ${files}

What is inside:
  backup.json   — all site content (projects, texts, lists, settings, media records)
  uploads/      — every uploaded file (pictures, CV, videos) exactly as stored
  manifest.json — file list with sizes and SHA-256 checksums

How to restore:
  Open the admin portal → Settings → "Restore from a backup file" → choose
  this .zip. Everything comes back — content AND files.
  (Programmatically: POST the zip to /api/admin/backup/restore.)

Keep this file anywhere safe — Google Drive, email, your computer.
It is a complete, self-contained copy of your portfolio.
`;

/** Build the complete backup zip (content + every uploaded file). */
export async function createFullBackupZip(): Promise<FullBackup> {
  const client = await createClient();
  const snapshot = await buildSnapshot();

  const [localNames, storageNames] = await Promise.all([
    listLocalFiles(),
    listStorageFiles(client),
  ]);
  // local copies win (identical names) — they're the original bits
  const names = Array.from(new Set([...localNames, ...storageNames])).sort();

  const zip = new AdmZip();
  const root = "saad-portfolio-backup";
  const created = new Date().toISOString();

  zip.addFile(`${root}/backup.json`, Buffer.from(JSON.stringify(snapshot, null, 2)));

  const manifest: { created: string; files: Array<{ name: string; size: number; sha256: string }> } = {
    created,
    files: [],
  };

  for (const name of names) {
    // local copy first, otherwise download from Supabase Storage
    let data: Buffer | null = null;
    const localPath = path.join(UPLOAD_DIR, name);
    const hasLocal = await stat(localPath).then((s) => s.isFile()).catch(() => false);
    if (hasLocal) {
      data = await readFile(localPath);
    } else {
      const { data: blob, error } = await client.storage.from(MEDIA_BUCKET).download(name);
      if (!error && blob) {
        data = Buffer.from(await blob.arrayBuffer());
      }
    }
    if (!data) continue; // vanished between listing and download — skip safely

    zip.addFile(`${root}/uploads/${name}`, data);
    manifest.files.push({
      name,
      size: data.length,
      sha256: createHash("sha256").update(data).digest("hex"),
    });
  }

  zip.addFile(`${root}/manifest.json`, Buffer.from(JSON.stringify(manifest, null, 2)));
  zip.addFile(`${root}/README.txt`, Buffer.from(README(created, manifest.files.length)));

  return {
    buffer: zip.toBuffer(),
    filename: `saad-portfolio-full-backup-${timestampName()}.zip`,
    fileCount: manifest.files.length,
  };
}

// ————————————————————————————————————————————————
// Restoring backups
// ————————————————————————————————————————————————

export interface RestoreResult {
  ok: true;
  /** Uploaded files written back to Supabase Storage. */
  files: number;
  /** Projects restored from the snapshot. */
  projects: number;
}

function normalizeEntry(name: string): string[] {
  return name.replace(/\\/g, "/").split("/").filter((s) => s.length > 0);
}

/**
 * Restore a full backup zip: writes every uploaded file back into the
 * Supabase media bucket (upsert — never deletes), then replaces the content
 * from backup.json. A safety revision of the current state is taken
 * automatically first (inside applySnapshot).
 */
export async function restoreFullBackupZip(buffer: Buffer): Promise<RestoreResult> {
  let zip: AdmZip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    throw new BackupFileError("That file isn't a valid .zip backup.");
  }

  const entries = zip.getEntries().filter((e) => !e.isDirectory());
  if (entries.length === 0) {
    throw new BackupFileError("That .zip is empty — it isn't a backup.");
  }

  // find backup.json (any folder depth, case-insensitive)
  const backupEntry = entries
    .filter((e) => normalizeEntry(e.entryName).pop()?.toLowerCase() === "backup.json")
    .sort((a, b) => normalizeEntry(a.entryName).length - normalizeEntry(b.entryName).length)[0];
  if (!backupEntry) {
    throw new BackupFileError("This .zip doesn't contain a backup.json — it isn't a full backup.");
  }

  let snapshot: ContentSnapshot;
  try {
    snapshot = JSON.parse(backupEntry.getData().toString("utf8")) as ContentSnapshot;
  } catch {
    throw new BackupFileError("The backup.json inside this .zip is corrupted.");
  }

  // write every uploads/<file> entry into the storage bucket (upsert — never deletes)
  const client = await createClient();
  let files = 0;
  for (const entry of entries) {
    const segs = normalizeEntry(entry.entryName);
    const base = segs.pop() as string;
    if (!base || base.startsWith("._") || base.startsWith(".")) continue;
    const lower = base.toLowerCase();
    if (lower === "backup.json" || lower === "manifest.json" || lower === "readme.txt") continue;
    if (segs[segs.length - 1]?.toLowerCase() !== "uploads") continue;
    if (!isSafeStorageName(base)) continue; // no traversal, ever

    const { error } = await client.storage.from(MEDIA_BUCKET).upload(base, entry.getData(), {
      contentType: mimeFor(base),
      upsert: true,
      cacheControl: "31536000",
    });
    if (error) {
      throw new Error(`Couldn't restore “${base}” to Supabase Storage: ${error.message}`);
    }
    files += 1;
  }

  await applySnapshot(snapshot, "full backup restore");

  return { ok: true, files, projects: Array.isArray(snapshot.projects) ? snapshot.projects.length : 0 };
}
