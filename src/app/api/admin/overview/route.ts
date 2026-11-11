import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { getSiteConfig } from "@/lib/content";
import { TABLES, explainDbError } from "@/lib/supabase-tables";
import { apiError } from "@/lib/admin/crud";

/** Dashboard stats + quick facts. */
export async function GET() {
  try {
    await requireAdmin();
    const client = await createClient();

    const [projects, experience, socials, tools, skills, media, revisions] = await Promise.all(
      [TABLES.projects, TABLES.experience, TABLES.socials, TABLES.tools, TABLES.skills, TABLES.media, TABLES.revisions].map(
        async (table) => {
          const { count, error } = await client.from(table).select("id", { count: "exact", head: true });
          if (error) throw explainDbError(error);
          return count ?? 0;
        },
      ),
    );

    const [{ data: lastRevision, error: revError }, { data: mediaRows, error: mediaError }, site] =
      await Promise.all([
        client
          .from(TABLES.revisions)
          .select("label, created_at")
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle(),
        client.from(TABLES.media).select("size"),
        getSiteConfig(),
      ]);
    if (revError) throw explainDbError(revError);
    if (mediaError) throw explainDbError(mediaError);

    const storageBytes = (mediaRows ?? []).reduce((sum: number, r: { size: number | null }) => sum + (r.size ?? 0), 0);

    return NextResponse.json({
      counts: { projects, experience, socials, tools, skills, media, revisions },
      lastRevision: lastRevision
        ? { label: lastRevision.label, createdAt: lastRevision.created_at }
        : null,
      siteUpdated: site.updatedAt ?? null,
      storageBytes,
    });
  } catch (error) {
    return apiError(error);
  }
}
