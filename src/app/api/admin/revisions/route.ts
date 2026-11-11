import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { TABLES, explainDbError } from "@/lib/supabase-tables";
import { apiError } from "@/lib/admin/crud";

/** Revision history (newest first) — snapshot bodies excluded. */
export async function GET() {
  try {
    await requireAdmin();
    const client = await createClient();
    const { data, error } = await client
      .from(TABLES.revisions)
      .select("id, label, created_at")
      .order("id", { ascending: false });
    if (error) throw explainDbError(error);
    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    return apiError(error);
  }
}
