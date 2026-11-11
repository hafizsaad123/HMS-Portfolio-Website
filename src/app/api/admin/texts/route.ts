import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { createRevision, getTexts } from "@/lib/content";
import { TABLES, explainDbError } from "@/lib/supabase-tables";
import { apiError } from "@/lib/admin/crud";

const bodySchema = z.record(z.string().regex(/^[a-zA-Z0-9.\-]+$/, "Invalid text key"), z.string());

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ texts: await getTexts() });
  } catch (error) {
    return apiError(error);
  }
}

/** Partial upsert: only the sent keys are saved. */
export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const texts = bodySchema.parse(await req.json());
    const client = await createClient();
    for (const [key, value] of Object.entries(texts)) {
      const { error } = await client
        .from(TABLES.texts)
        .upsert({ key, value }, { onConflict: "key" });
      if (error) throw explainDbError(error);
    }
    await createRevision("Updated page text");
    return NextResponse.json({ texts: await getTexts() });
  } catch (error) {
    return apiError(error);
  }
}
