import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { apiError } from "@/lib/admin/crud";
import { createFullBackupZip } from "@/lib/backup";

export const dynamic = "force-dynamic";

/**
 * Full backup download (admin only):
 *   GET   → download a fresh complete backup (.zip — content + every media
 *           file from Supabase Storage and any local legacy copies)
 *
 * (Server-stored auto-snapshots were removed with the serverless move —
 * the revision history and Supabase's own backups cover that role.)
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const params = new URL(req.url).searchParams;

    if (params.has("list") || params.has("stored")) {
      return NextResponse.json(
        { error: "Server-stored snapshots were removed — download a fresh backup instead." },
        { status: 400 },
      );
    }

    const { buffer, filename } = await createFullBackupZip();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
