import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { buildSnapshot } from "@/lib/content";
import { apiError } from "@/lib/admin/crud";

/** Full content backup as a downloadable JSON file. */
export async function GET() {
  try {
    await requireAdmin();
    const snapshot = await buildSnapshot();
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(snapshot, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="saad-portfolio-backup-${date}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
