import { NextResponse } from "next/server";
import { getContentPayload } from "@/lib/content";

/** Content is live (admin edits appear instantly). */
export const dynamic = "force-dynamic";

/**
 * GET /api/content — the complete public content payload.
 * Served by Next.js in development; on the live host the identical
 * response comes from the PHP API (api/index.php → route "content").
 */
export async function GET() {
  const payload = await getContentPayload();
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
