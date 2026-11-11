/**
 * Media validation rules — client-safe (imported by the browser upload
 * pipeline AND the API routes, so both sides enforce the exact same rules).
 */

export const ALLOWED_MEDIA: Record<string, { ext: string; type: string }> = {
  "image/png": { ext: ".png", type: "image/png" },
  "image/jpeg": { ext: ".jpg", type: "image/jpeg" },
  "image/jpg": { ext: ".jpg", type: "image/jpeg" },
  "image/webp": { ext: ".webp", type: "image/webp" },
  "image/gif": { ext: ".gif", type: "image/gif" },
  "image/svg+xml": { ext: ".svg", type: "image/svg+xml" },
  "image/avif": { ext: ".avif", type: "image/avif" },
  "application/pdf": { ext: ".pdf", type: "application/pdf" },
  "video/mp4": { ext: ".mp4", type: "video/mp4" },
  "video/webm": { ext: ".webm", type: "video/webm" },
  "video/ogg": { ext: ".ogv", type: "video/ogg" },
  "video/quicktime": { ext: ".mov", type: "video/quicktime" },
};

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB (images & PDFs)
export const MAX_VIDEO_BYTES = 64 * 1024 * 1024; // 64 MB (case study videos)

/** A validation failure that should surface as HTTP 400 (not 500). */
export class MediaValidationError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = "MediaValidationError";
  }
}

/** Validate a candidate upload; returns the storage spec or throws. */
export function validateMediaFile(file: { name: string; type: string; size: number }): {
  ext: string;
  type: string;
} {
  const lowerName = file.name.toLowerCase();
  const spec = ALLOWED_MEDIA[file.type];
  if (!spec) {
    if (/\.(heic|heif)$/.test(lowerName) || file.type === "image/heic" || file.type === "image/heif") {
      throw new MediaValidationError(
        "Apple HEIC photos aren't supported — on iPhone use Settings → Camera → Formats → “Most Compatible”, or share the photo to convert it to JPG, then upload again."
      );
    }
    throw new MediaValidationError("Unsupported file type. Use PNG, JPG, WebP, GIF, AVIF, SVG, PDF, MP4, WebM or MOV.");
  }
  if (file.size <= 0) throw new MediaValidationError("The file is empty.");
  const isVideo = file.type.startsWith("video/");
  const maxSize = isVideo ? MAX_VIDEO_BYTES : MAX_UPLOAD_BYTES;
  if (file.size > maxSize) {
    throw new MediaValidationError(`Files must be ${isVideo ? "64 MB" : "8 MB"} or smaller.`);
  }
  return spec;
}

/** Legal stored-object names (uuid + extension, no traversal). */
export const SAFE_STORAGE_NAME = /^[A-Za-z0-9._-]+$/;

export function isSafeStorageName(filename: string): boolean {
  return SAFE_STORAGE_NAME.test(filename) && !filename.includes("..");
}
