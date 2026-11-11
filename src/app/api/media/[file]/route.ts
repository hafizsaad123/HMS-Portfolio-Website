import { NextRequest, NextResponse } from "next/server";
import { readStoredFile } from "@/lib/media";
import { publicMediaUrl } from "@/lib/supabase-tables";
import { isSafeStorageName } from "@/lib/media-rules";

const MIME: Record<string, string> = {
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

/**
 * Serve media files.
 *
 *  1. LEGACY: a local copy in db/uploads (SQLite-era files) is served
 *     directly — with single-range support so case-study videos stream.
 *  2. Otherwise: redirect to the object's public Supabase Storage URL
 *     (immutable + CDN-cached; Storage handles range requests natively).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!isSafeStorageName(file)) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const data = await readStoredFile(file);

  if (!data) {
    // no local copy → Supabase Storage (files are uploaded there directly)
    return NextResponse.redirect(publicMediaUrl(file), 307);
  }

  const ext = file.slice(file.lastIndexOf(".")).toLowerCase();
  const type = MIME[ext] ?? "application/octet-stream";
  const disposition = ext === ".svg" ? "attachment" : `inline; filename="${file}"`;
  const headers: Record<string, string> = {
    "Content-Type": type,
    // SVGs download (they can carry scripts); everything else opens inline
    "Content-Disposition": disposition,
    "Cache-Control": "public, max-age=31536000, immutable",
    "Accept-Ranges": "bytes",
  };

  // Single-range support (what browsers ask for when playing <video>).
  const range = req.headers.get("range");
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (match) {
      let start: number;
      let end: number;
      if (match[1] === "" && match[2] !== "") {
        // suffix range: "bytes=-N" → last N bytes
        start = Math.max(0, data.length - Number.parseInt(match[2], 10));
        end = data.length - 1;
      } else {
        start = match[1] ? Number.parseInt(match[1], 10) : 0;
        end = match[2] ? Number.parseInt(match[2], 10) : data.length - 1;
      }
      end = Math.min(end, data.length - 1);
      if (Number.isNaN(start) || start > end || start >= data.length) {
        return new NextResponse(null, {
          status: 416,
          headers: { ...headers, "Content-Range": `bytes */${data.length}` },
        });
      }
      const chunk = data.subarray(start, end + 1);
      return new NextResponse(new Uint8Array(chunk), {
        status: 206,
        headers: {
          ...headers,
          "Content-Range": `bytes ${start}-${end}/${data.length}`,
          "Content-Length": String(chunk.length),
        },
      });
    }
  }

  return new NextResponse(new Uint8Array(data), {
    headers: { ...headers, "Content-Length": String(data.length) },
  });
}
