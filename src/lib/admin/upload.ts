"use client";

/**
 * Smart upload pipeline — runs in the browser BEFORE anything leaves the PC,
 * then uploads DIRECTLY to Supabase Storage (never through the app server).
 *
 * Why direct-to-storage:
 *  - the file bytes bypass the hosting gateway/app server entirely, so
 *    multi-MB phone photos on slow connections can never hit proxy or
 *    server timeouts anymore (the old ~10 s "Upload failed" bug);
 *  - the upload runs with your signed-in Supabase session, so the storage
 *    RLS policies (authenticated = admin) enforce access control;
 *  - only a tiny JSON metadata call goes to /api/admin/media afterwards.
 *
 * What it does to RASTER images (png / jpeg / webp / avif / bmp):
 *  - decodes with EXIF orientation applied → tilted phone photos upload
 *    already-straightened (rotation baked into the pixels)
 *  - caps the longest side at 2200 px (more than any on-screen use)
 *  - re-encodes as WebP q≈0.87 (falls back to JPEG q0.9 on old browsers)
 *  - keeps the original when compression wouldn't help (already small,
 *    SVG, GIF — re-encoding would kill animation — videos, PDFs)
 */

import { api } from "@/lib/admin/client";
import { createClient } from "@/utils/supabase/client";
import { MEDIA_BUCKET } from "@/lib/supabase-tables";
import { validateMediaFile, MediaValidationError } from "@/lib/media-rules";

const MAX_DIMENSION = 2200;
/** Files already this small are uploaded untouched. */
const SKIP_COMPRESSION_BYTES = 300 * 1024;
const WEBP_QUALITY = 0.87;
const JPEG_FALLBACK_QUALITY = 0.9;

const RASTER_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/avif",
  "image/bmp",
]);

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
}

/**
 * Prepare a file for upload — compress + straighten raster images, pass
 * everything else through untouched. Never throws: on any decode problem the
 * original file is returned and validation gives a clear error.
 */
export async function prepareUpload(file: File): Promise<File> {
  if (!RASTER_TYPES.has(file.type) || file.size <= SKIP_COMPRESSION_BYTES) {
    return file;
  }
  try {
    const bitmap = await createImageBitmap(file); // EXIF orientation applied by modern browsers
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, MAX_DIMENSION / longest);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    let mime = "image/webp";
    let blob = await canvasToBlob(canvas, mime, WEBP_QUALITY);
    if (!blob || blob.type !== "image/webp") {
      // browser can't encode WebP (very old Safari) → JPEG
      mime = "image/jpeg";
      blob = await canvasToBlob(canvas, mime, JPEG_FALLBACK_QUALITY);
    }
    if (!blob || blob.size >= file.size) {
      return file; // no size win → keep the original bits
    }

    const ext = mime === "image/webp" ? ".webp" : ".jpg";
    const base = (file.name || "image").replace(/\.[^.]+$/, "") || "image";
    const name = base.slice(0, 80) + ext;
    return new File([blob], name, { type: mime, lastModified: Date.now() });
  } catch {
    return file; // undecodable here (e.g. HEIC on desktop Chrome) → validation explains
  }
}

/** Image dimensions measured in the browser (SVG via <img>, rest via bitmap). */
async function measureImage(file: File): Promise<{ width: number | null; height: number | null }> {
  if (!file.type.startsWith("image/")) return { width: null, height: null };
  try {
    if (file.type === "image/svg+xml") {
      const url = URL.createObjectURL(file);
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error("decode failed"));
          el.src = url;
        });
        return { width: img.naturalWidth || null, height: img.naturalHeight || null };
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    bitmap.close();
    return { width, height };
  } catch {
    return { width: null, height: null };
  }
}

/**
 * Turn low-level fetch/network failures into a message a human can act on.
 */
export function friendlyUploadError(error: unknown, what = "Upload"): string {
  const message = error instanceof Error && error.message ? error.message : String(error ?? "");
  if (
    error instanceof TypeError ||
    /failed to fetch|networkerror|load failed|aborted|fetch failed/i.test(message)
  ) {
    return `${what} couldn't reach Supabase — the connection dropped or the file is too big to send. ` +
      `Images are compressed automatically; if this keeps happening, try a smaller file or check your internet and retry.`;
  }
  if (/bucket.*not.*found|bucket not found/i.test(message)) {
    return `${what} failed — the media bucket isn't set up yet. Run supabase/migration.sql in the Supabase SQL Editor, then try again.`;
  }
  if (/row-level security|unauthorized|jwt|forbidden/i.test(message)) {
    return `${what} failed — your session expired. Sign in again and retry.`;
  }
  return message || `${what} failed.`;
}

export interface UploadedMedia {
  id: string;
  url: string;
  filename: string;
  originalName: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
}

/**
 * Upload one file to the media library:
 *  1. compress/straighten raster images in the browser
 *  2. validate type + size (same rules the API enforces)
 *  3. upload the bytes straight to Supabase Storage with your session
 *  4. register the metadata row via POST /api/admin/media
 */
export async function uploadMedia(file: File): Promise<UploadedMedia> {
  const prepared = await prepareUpload(file);

  // client-side validation — same rules as the API, friendlier timing
  const spec = validateMediaFile(prepared); // throws MediaValidationError on bad input
  const { width, height } = await measureImage(prepared);
  const filename = `${crypto.randomUUID()}${spec.ext}`;

  const supabase = createClient();
  const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(filename, prepared, {
    contentType: spec.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError) {
    throw new Error(friendlyUploadError(uploadError, "Upload"));
  }

  // register the metadata row (tiny JSON call — no file bytes involved)
  const registered = await api<{ item: UploadedMedia }>("/api/admin/media", {
    method: "POST",
    body: JSON.stringify({
      filename,
      originalName: prepared.name || filename,
      mime: spec.type,
      size: prepared.size,
      width,
      height,
    }),
  });
  return registered.item;
}

export { MediaValidationError };
