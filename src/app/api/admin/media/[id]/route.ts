import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { createRevision } from "@/lib/content";
import { findMediaReferences } from "@/lib/media";
import { TABLES, dbToApi, explainDbError } from "@/lib/supabase-tables";
import { apiError } from "@/lib/admin/crud";

function notFound() {
  return NextResponse.json({ error: "That image no longer exists — refresh the library." }, { status: 404 });
}

/**
 * DELETE — removes the image from the library. The storage object is kept
 * so history/revisions can always recover it.
 * Refuses while the image is referenced by site content.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const client = await createClient();
    const { data: asset, error: fetchError } = await client
      .from(TABLES.media)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw explainDbError(fetchError);
    if (!asset) return notFound();

    const references = await findMediaReferences(asset.url);
    if (references.length > 0) {
      return NextResponse.json(
        { error: `This image is in use (${references.join(", ")}) — replace it there first.` },
        { status: 409 },
      );
    }

    const { error } = await client.from(TABLES.media).delete().eq("id", id);
    if (error) throw explainDbError(error);
    await createRevision(`Removed image “${asset.original_name}” from the library`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

/** PUT — edit the alt text. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { alt } = z.object({ alt: z.string().trim().max(300) }).parse(await req.json());
    const client = await createClient();
    const { data: updated, error } = await client
      .from(TABLES.media)
      .update({ alt: alt || null })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw explainDbError(error);
    if (!updated) return notFound();
    return NextResponse.json({ item: dbToApi(updated) });
  } catch (error) {
    return apiError(error);
  }
}
