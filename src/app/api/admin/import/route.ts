import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { applySnapshot } from "@/lib/content";
import { apiError } from "@/lib/admin/crud";

/**
 * Restore a JSON backup (from the export endpoint). An auto-backup of the
 * current state is taken before anything is replaced.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const contentType = req.headers.get("content-type") ?? "";

    let payload: unknown;
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "No backup file received." }, { status: 400 });
      }
      payload = JSON.parse(await file.text());
    } else {
      payload = await req.json();
    }

    await applySnapshot(payload, "backup import");
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "That file isn't valid JSON." }, { status: 400 });
    }
    return apiError(error);
  }
}
