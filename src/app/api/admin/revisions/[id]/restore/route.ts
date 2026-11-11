import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { restoreRevision } from "@/lib/content";
import { apiError } from "@/lib/admin/crud";

/** Restore a revision — an auto-backup of the current state is taken first. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const revisionId = Number(id);
    if (!Number.isInteger(revisionId)) {
      return NextResponse.json({ error: "Invalid revision id." }, { status: 400 });
    }
    await restoreRevision(revisionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
