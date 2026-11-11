import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { createRevision } from "@/lib/content";
import { TABLES, dbToApi, explainDbError } from "@/lib/supabase-tables";
import { apiError, makeCollectionHandlers } from "@/lib/admin/crud";

const handlers = makeCollectionHandlers("services");

export const GET = handlers.GET;
export const POST = handlers.POST;

/**
 * PATCH — replace ALL services-diagram labels in one call (the About page
 * diagram: 12 slots in reading order; an empty string renders the solid
 * node).
 */
const patchSchema = z.object({
  labels: z.array(z.string().max(80)).length(12, "Exactly 12 node labels are required"),
});

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    const { labels } = patchSchema.parse(await req.json());
    const client = await createClient();

    const { error: deleteError } = await client.from(TABLES.services).delete();
    if (deleteError) throw explainDbError(deleteError);

    const rows = labels.map((label, index) => ({ label: label.trim(), sort_order: index + 1 }));
    const { data: items, error: insertError } = await client
      .from(TABLES.services)
      .insert(rows)
      .select("*")
      .order("sort_order", { ascending: true });
    if (insertError) throw explainDbError(insertError);

    await createRevision("Updated the services diagram");
    return NextResponse.json({ items: (items ?? []).map((row) => dbToApi(row)) });
  } catch (error) {
    return apiError(error);
  }
}
