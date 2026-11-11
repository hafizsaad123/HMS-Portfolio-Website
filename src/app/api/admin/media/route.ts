import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { createRevision } from "@/lib/content";
import { TABLES, dbToApi, publicMediaUrl, explainDbError } from "@/lib/supabase-tables";
import { ALLOWED_MEDIA, MAX_UPLOAD_BYTES, MAX_VIDEO_BYTES, isSafeStorageName } from "@/lib/media-rules";
import { apiError } from "@/lib/admin/crud";

/** Media library (metadata) — the files themselves live in Supabase Storage. */

export async function GET() {
  try {
    await requireAdmin();
    const client = await createClient();
    const { data, error } = await client
      .from(TABLES.media)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw explainDbError(error);
    return NextResponse.json({ items: (data ?? []).map((row) => dbToApi(row)) });
  } catch (error) {
    return apiError(error);
  }
}

const registerSchema = z.object({
  filename: z.string().min(4),
  originalName: z.string().min(1).max(300),
  mime: z.string().min(3).max(100),
  size: z.number().int().min(1),
  width: z.number().int().nullable().default(null),
  height: z.number().int().nullable().default(null),
});

/**
 * Register an uploaded file (the browser uploads the bytes straight to
 * Supabase Storage, then calls this with the metadata). Validates the
 * filename, MIME type, size AND that the object actually exists in the
 * bucket before inserting the row.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = registerSchema.parse(await req.json());

    if (!isSafeStorageName(body.filename)) {
      return NextResponse.json({ error: "Invalid filename." }, { status: 400 });
    }
    const spec = ALLOWED_MEDIA[body.mime];
    if (!spec) {
      return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
    }
    const isVideo = body.mime.startsWith("video/");
    const maxSize = isVideo ? MAX_VIDEO_BYTES : MAX_UPLOAD_BYTES;
    if (body.size > maxSize) {
      return NextResponse.json(
        { error: `Files must be ${isVideo ? "64 MB" : "8 MB"} or smaller.` },
        { status: 400 },
      );
    }

    const client = await createClient();

    // the object must genuinely exist in the media bucket
    const { data: listed, error: listError } = await client.storage
      .from("media")
      .list("", { search: body.filename, limit: 100 });
    if (listError) throw explainDbError(listError);
    const exists = (listed ?? []).some((o) => o.name === body.filename);
    if (!exists) {
      return NextResponse.json(
        { error: "That file isn't in the media bucket — upload it again." },
        { status: 400 },
      );
    }

    const row = {
      filename: body.filename,
      url: publicMediaUrl(body.filename),
      original_name: body.originalName,
      mime: spec.type,
      size: body.size,
      width: body.width,
      height: body.height,
    };
    const { data: item, error } = await client
      .from(TABLES.media)
      .insert(row)
      .select("*")
      .single();
    if (error) throw explainDbError(error);

    await createRevision(`Uploaded image “${body.originalName}”`);
    return NextResponse.json({ item: dbToApi(item) }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
