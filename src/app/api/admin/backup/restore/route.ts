import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { applySnapshot } from "@/lib/content";
import { apiError } from "@/lib/admin/crud";
import { BackupFileError, restoreFullBackupZip } from "@/lib/backup";

export const dynamic = "force-dynamic";

/**
 * Restore a backup (admin only, multipart form with a "file" field):
 *  - .zip → FULL restore: every uploaded file is written back to disk AND all
 *           content is replaced from the snapshot
 *  - .json → content-only restore (the older export format)
 * A safety revision of the current state is always taken first.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Send the backup as a multipart form file." },
        { status: 400 }
      );
    }

    const form = await req.formData();
    const candidate = form.get("file");
    if (!(candidate instanceof File)) {
      return NextResponse.json({ error: "No backup file received." }, { status: 400 });
    }

    const name = candidate.name.toLowerCase();
    if (name.endsWith(".zip")) {
      const result = await restoreFullBackupZip(Buffer.from(await candidate.arrayBuffer()));
      return NextResponse.json(result);
    }
    if (name.endsWith(".json")) {
      let payload: unknown;
      try {
        payload = JSON.parse(await candidate.text());
      } catch {
        return NextResponse.json({ error: "That file isn't valid JSON." }, { status: 400 });
      }
      await applySnapshot(payload, "backup import");
      return NextResponse.json({ ok: true, files: 0, projects: -1 });
    }
    return NextResponse.json(
      { error: "Choose a .zip full backup or a .json content backup." },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof BackupFileError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "That file isn't valid JSON." }, { status: 400 });
    }
    if (error instanceof Error && error.message.startsWith("Invalid backup")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiError(error);
  }
}
