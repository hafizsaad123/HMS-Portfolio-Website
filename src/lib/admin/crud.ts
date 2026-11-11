/**
 * Generic admin CRUD engine for the content collections.
 *
 * Every mutation:
 *  1. requires a signed-in admin (Supabase Auth — requireAdmin),
 *  2. validates input with zod,
 *  3. writes to Supabase Postgres (RLS: authenticated),
 *  4. records an automatic Revision snapshot (restorable → no data loss).
 *
 * Route files are thin re-exports of the handlers built here.
 */

import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin, UnauthorizedError } from "@/lib/auth";
import { createRevision, slugify, uniqueSlug } from "@/lib/content";
import { BLOCK_LIMITS, parseBlocksJson, serializeBlocks, sanitizeBlocks } from "@/lib/blocks";
import { DOC_LIMITS, parseDocJson } from "@/lib/rich";
import { TABLES, dbToApi, apiToDb, jsonToArray, jsonToString, explainDbError } from "@/lib/supabase-tables";

export type ResourceName = "projects" | "experience" | "socials" | "tools" | "skills" | "services";

type Row = Record<string, unknown>;

function tableFor(name: ResourceName): string {
  switch (name) {
    case "projects": return TABLES.projects;
    case "experience": return TABLES.experience;
    case "socials": return TABLES.socials;
    case "tools": return TABLES.tools;
    case "skills": return TABLES.skills;
    case "services": return TABLES.services;
  }
}

// ————————————————————————————————————————————————
// Validation schemas
// ————————————————————————————————————————————————

const month = z.string().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM format");

/** Rich editor document — "" or a JSON string that must parse as a valid doc. */
const richDocString = z
  .string()
  .max(DOC_LIMITS.maxLength, `The case study is too large (over ${DOC_LIMITS.maxLength} characters).`)
  .refine((s) => s === "" || parseDocJson(s) !== null, "Invalid editor document.");

const projectCreate = z.object({
  title: z.string().trim().min(1, "Title is required"),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only").optional(),
  shortDescription: z.string().trim().default(""),
  role: z.string().trim().default(""),
  category: z.string().trim().default(""),
  cover: z.string().trim().default(""),
  period: z.string().trim().default(""),
  start: month.default("2025-01"),
  end: month.nullable().default(null),
  services: z.array(z.string().trim()).default([]),
  url: z.string().trim().nullable().default(null),
  featured: z.boolean().default(false),
  homeTile: z.enum(["square", "landscape"]).default("square"),
  showOnHome: z.boolean().default(true),
  /// Case study page blocks (validated + sanitized through lib/blocks).
  content: z.array(z.unknown()).max(BLOCK_LIMITS.maxBlocks).default([]),
  /// Case study page — WYSIWYG editor document (validated through lib/rich).
  contentDoc: richDocString.default(""),
});

const experienceSchema = z.object({
  company: z.string().trim().min(1, "Company is required"),
  role: z.string().trim().min(1, "Role is required"),
  period: z.string().trim().min(1, "Period is required"),
  markId: z.enum(["ai-matterz", "uplynk-pk", "surplus-pakistan", "novelops", "count3", "simulationsx"]).default("novelops"),
  url: z.string().trim().nullable().default(null),
});

const socialSchema = z.object({
  label: z.string().trim().min(1, "Label is required"),
  url: z.string().trim().nullable().default(null),
});

const toolSchema = z.object({
  label: z.string().trim().min(1, "Label is required"),
  markId: z
    .enum(["figma", "photoshop", "illustrator", "premier-pro", "chatgpt", "claude", "gemini", "adobe"])
    .default("figma"),
});

const skillSchema = z.object({
  label: z.string().trim().min(1, "Label is required"),
});

const serviceSchema = z.object({
  label: z.string().trim().default(""), // empty = solid unlabeled node
});

const createSchemas: Record<ResourceName, z.ZodType> = {
  projects: projectCreate,
  experience: experienceSchema,
  socials: socialSchema,
  tools: toolSchema,
  skills: skillSchema,
  services: serviceSchema,
};

// ————————————————————————————————————————————————
// Serialization (DB rows → API shapes)
// ————————————————————————————————————————————————

function serialize(name: ResourceName, row: Row): Row {
  if (name === "projects") {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      shortDescription: row.short_description,
      role: row.role,
      category: row.category,
      cover: row.cover,
      period: row.period,
      start: row.start,
      end: row.end_month ?? null,
      services: jsonToArray<string>(row.services_json),
      url: row.url ?? null,
      featured: Boolean(row.featured),
      order: row.sort_order ?? 0,
      homeTile: row.home_tile === "landscape" ? "landscape" : "square",
      showOnHome: row.show_on_home !== false,
      content: parseBlocksJson(jsonToString(row.content_json, "[]")),
      contentDoc: row.content_doc ?? "",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
  return dbToApi(row);
}

function labelFor(name: ResourceName, row: Row): string {
  const title = String(row.title ?? row.company ?? row.label ?? "");
  return title ? `“${title}”` : "entry";
}

function resourceTitle(name: ResourceName): string {
  return { projects: "project", experience: "experience", socials: "social link", tools: "tool", skills: "skill", services: "services node" }[name];
}

// ————————————————————————————————————————————————
// Error mapping
// ————————————————————————————————————————————————

export function apiError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof ZodError) {
    const message = error.issues.map((i) => `${i.path.join(".") || "field"}: ${i.message}`).join("; ");
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const e = error as { code?: string; message?: string; status?: number };
  // validation-style errors (e.g. upload checks) carry their own HTTP status
  if (typeof e?.status === "number" && e.status >= 400 && e.status < 500) {
    return NextResponse.json({ error: e.message || "Invalid input." }, { status: e.status });
  }
  if (e?.code === "23505" || e?.code === "P2002") {
    return NextResponse.json({ error: "That value already exists — use a different slug or label." }, { status: 409 });
  }
  if (e?.code === "PGRST205") {
    return NextResponse.json({ error: explainDbError(error).message }, { status: 503 });
  }
  console.error("[admin-api]", error);
  return NextResponse.json({ error: e?.message || "Something went wrong. Please try again." }, { status: 500 });
}

// ————————————————————————————————————————————————
// Handlers
// ————————————————————————————————————————————————

async function nextOrder(table: string): Promise<number> {
  const client = await createClient();
  const { data, error } = await client
    .from(table)
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  if (error) throw explainDbError(error);
  return ((data?.[0]?.sort_order as number | undefined) ?? 0) + 1;
}

async function fetchRow(table: string, id: string): Promise<Row | null> {
  const client = await createClient();
  const { data, error } = await client.from(table).select("*").eq("id", id).maybeSingle();
  if (error) throw explainDbError(error);
  return (data as Row | null) ?? null;
}

export function makeCollectionHandlers(name: ResourceName) {
  return {
    GET: async () => {
      try {
        await requireAdmin();
        const client = await createClient();
        const table = tableFor(name);
        let query = client.from(table).select("*").order("sort_order", { ascending: true });
        if (name === "projects") {
          query = query.order("created_at", { ascending: true });
        }
        const { data, error } = await query;
        if (error) throw explainDbError(error);
        return NextResponse.json({ items: (data ?? []).map((row) => serialize(name, row as Row)) });
      } catch (error) {
        return apiError(error);
      }
    },

    POST: async (req: NextRequest) => {
      try {
        await requireAdmin();
        const client = await createClient();
        const table = tableFor(name);
        const parsed = createSchemas[name].parse(await req.json()) as Row;

        let data: Row;
        if (name === "projects") {
          const { services: _s, content: _c, ...rest } = parsed;
          data = apiToDb({
            ...rest,
            slug: await uniqueSlug(String(parsed.slug || slugify(String(parsed.title)))),
            servicesJson: parsed.services ?? [],
            contentJson: serializeBlocks(sanitizeBlocks(parsed.content ?? [])),
            contentDoc: parsed.contentDoc ?? "",
          });
        } else {
          data = apiToDb({ ...parsed });
        }
        data.sort_order = await nextOrder(table);

        const { data: row, error } = await client.from(table).insert(data).select("*").single();
        if (error) throw explainDbError(error);
        await createRevision(`Added ${resourceTitle(name)} ${labelFor(name, row as Row)}`);
        return NextResponse.json({ item: serialize(name, row as Row) }, { status: 201 });
      } catch (error) {
        return apiError(error);
      }
    },
  };
}

export function makeItemHandlers(name: ResourceName) {
  return {
    PUT: async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
      try {
        await requireAdmin();
        const client = await createClient();
        const table = tableFor(name);
        const { id } = await params;
        const updateSchema = (createSchemas[name] as z.ZodObject<z.ZodRawShape>).partial();
        const raw = (await req.json()) as Row | null;
        const parsed = updateSchema.parse(raw) as Row;

        // Zod v4 keeps .default() values for keys missing from the input —
        // intersect with the raw payload so partial updates stay partial
        // (a PUT { cover } must never blank the title, category, etc.).
        const provided: Row = {};
        for (const key of Object.keys(raw ?? {})) {
          if (key in parsed) provided[key] = parsed[key];
        }

        let data: Row = {};
        if (name === "projects") {
          const { services, content, contentDoc, ...rest } = provided;
          data = apiToDb(rest);
          if (services !== undefined) {
            data.services_json = services as string[];
          }
          if (content !== undefined) {
            data.content_json = serializeBlocks(sanitizeBlocks(content));
          }
          if (contentDoc !== undefined) {
            data.content_doc = String(contentDoc);
          }
          if (typeof provided.slug === "string" && provided.slug) {
            data.slug = await uniqueSlug(slugify(provided.slug), id);
          } else {
            delete data.slug; // never blank the slug
          }
        } else {
          data = apiToDb(provided);
        }
        for (const k of Object.keys(data)) {
          if (data[k] === undefined) delete data[k];
        }

        if (Object.keys(data).length === 0) {
          // nothing to change — return the row untouched
          const current = await fetchRow(table, id);
          if (!current) return NextResponse.json({ error: "Not found." }, { status: 404 });
          return NextResponse.json({ item: serialize(name, current) });
        }

        const { data: row, error } = await client
          .from(table)
          .update(data)
          .eq("id", id)
          .select("*")
          .maybeSingle();
        if (error) throw explainDbError(error);
        if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
        await createRevision(`Updated ${resourceTitle(name)} ${labelFor(name, row as Row)}`);
        return NextResponse.json({ item: serialize(name, row as Row) });
      } catch (error) {
        return apiError(error);
      }
    },

    DELETE: async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
      try {
        await requireAdmin();
        const client = await createClient();
        const table = tableFor(name);
        const { id } = await params;
        const row = await fetchRow(table, id);
        if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
        const { error } = await client.from(table).delete().eq("id", id);
        if (error) throw explainDbError(error);
        await createRevision(`Deleted ${resourceTitle(name)} ${labelFor(name, row)}`);
        return NextResponse.json({ ok: true });
      } catch (error) {
        return apiError(error);
      }
    },
  };
}

export function makeReorderHandler(name: ResourceName) {
  return {
    PUT: async (req: NextRequest) => {
      try {
        await requireAdmin();
        const client = await createClient();
        const table = tableFor(name);
        const { ids } = z.object({ ids: z.array(z.string().min(1)).min(1) }).parse(await req.json());
        for (const [index, id] of ids.entries()) {
          const { error } = await client.from(table).update({ sort_order: index + 1 }).eq("id", id);
          if (error) throw explainDbError(error);
        }
        await createRevision(`Reordered ${name}`);
        return NextResponse.json({ ok: true });
      } catch (error) {
        return apiError(error);
      }
    },
  };
}
