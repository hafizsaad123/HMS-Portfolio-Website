import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { createRevision, getSiteConfig } from "@/lib/content";
import { TABLES, apiToDb, explainDbError } from "@/lib/supabase-tables";
import { apiError } from "@/lib/admin/crud";

const bodySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  role: z.string().trim().min(1, "Role is required"),
  bioLead: z.string().trim().default(""),
  bio: z.string().trim().default(""),
  email: z.string().trim().min(3, "Email is required"),
  location: z.string().trim().default(""),
  resumeUrl: z.string().trim().nullable().default(null),
  openToWork: z.boolean().default(true),
  avatarPath: z.string().trim().min(1, "A profile picture is required"),
  portraitPath: z.string().trim().min(1),
  signaturePath: z.string().trim().min(1),
  artworkPath: z.string().trim().min(1),
});

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ site: await getSiteConfig() });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const data = bodySchema.parse(await req.json());
    const client = await createClient();
    const row = apiToDb({ id: 1, ...data });
    const { error } = await client.from(TABLES.site).upsert(row, { onConflict: "id" });
    if (error) throw explainDbError(error);
    await createRevision("Saved personal details");
    return NextResponse.json({ site: await getSiteConfig() });
  } catch (error) {
    return apiError(error);
  }
}
