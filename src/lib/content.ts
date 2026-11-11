/**
 * Content layer — Supabase Postgres is the single source of truth.
 *
 * Guarantees (unchanged from the SQLite era):
 *  - The database is authoritative; the original hardcoded content lives on
 *    as DEFAULTS and is used verbatim when a table is empty or Supabase is
 *    unreachable, so the public site can never render blank.
 *  - Every admin mutation takes an automatic Revision snapshot (restorable),
 *    so content can always be rolled back — no data loss, ever.
 *
 * Reads for the public site run through the cookie-less anon client
 * (RLS: public SELECT). Writes + snapshots run through the request-bound
 * server client (RLS: authenticated = the signed-in admin).
 */

import { createPublicClient } from "@/utils/supabase/public";
import { cache } from "react";
import { createClient as createServerClient } from "@/utils/supabase/server";
import {
  TABLES,
  dbToApi,
  apiToDb,
  jsonToArray,
  jsonToString,
  explainDbError,
} from "@/lib/supabase-tables";
import { projects as defaultProjects, type Project, type TileRatio } from "@/data/projects";
import { experience as defaultExperience } from "@/data/experience";
import { site as defaultSite } from "@/data/site";
import { parseBlocksJson } from "@/lib/blocks";
import { parseDocJson } from "@/lib/rich";
import type {
  SiteConfigData,
  ExperienceData,
  SocialData,
  ToolData,
  ServiceNodeData,
  ContentPayload,
} from "@/data/types";

export type { SiteConfigData, ExperienceData, SocialData, ToolData, ServiceNodeData, ContentPayload };

// ————————————————————————————————————————————————
// Defaults (baked from the original approved designs — never deleted)
// ————————————————————————————————————————————————

export const DEFAULT_SITE: SiteConfigData = {
  name: defaultSite.name,
  role: defaultSite.role,
  bioLead: defaultSite.bioLead,
  bio: defaultSite.bio,
  email: defaultSite.email,
  location: defaultSite.location,
  resumeUrl: defaultSite.resumeUrl,
  openToWork: true,
  avatarPath: "/images/profile.png",
  portraitPath: "/images/portrait.png",
  signaturePath: "/images/signature.png",
  artworkPath: "/images/mazar.png",
};

/** Page text defaults — exactly as in the approved designs. */
export const DEFAULT_TEXTS: Record<string, string> = {
  "home.tools": "Tools",
  "home.skills": "Skills",
  "home.experience": "Experience",
  "home.connect": "Connect With Me",
  "home.resumeCard": "My Resume",
  "home.projectsCard": "My Projects",
  "work.heading": "My Work",
  "work.subheading": "See my top insane high quality versatile projects",
  "work.metaDescription":
    "Selected projects and design engagements — brand identity, web experiences, UI/UX and visual design work by Hafiz Muhammad Saad.",
  "footer.copyright": "2026 Hafiz Muhammad Saad | All Rights Reserved",
};

const DEFAULT_TOOLS: ToolData[] = [
  { label: "Figma", markId: "figma" },
  { label: "Adobe Photoshop", markId: "photoshop" },
  { label: "Adobe Illustrator", markId: "illustrator" },
  { label: "Adobe Premier Pro", markId: "premier-pro" },
  { label: "ChatGPT", markId: "chatgpt" },
  { label: "Claude", markId: "claude" },
  { label: "Gemini", markId: "gemini" },
];

const DEFAULT_SKILLS: string[] = defaultSite.skills;

// ————————————————————————————————————————————————————————
// Design-baseline adoption guard
//
// The live database still carries the PRE-redesign seed rows (shipped
// before the approved November 2026 portfolio designs). As long as a
// collection still shows its exact legacy signature below, the canonical
// design content above is served instead — so the public site always
// matches the approved designs. The guard is per-collection and flips
// off automatically the moment the owner adopts the new content (via
// the admin panel or supabase/design-update.sql): after that the
// database is the source of truth again, admin edits included.
// ————————————————————————————————————————————————————————

/** Retired “Adobe Creative Suite” master chip — the definitive legacy
 *  tools signature (the approved design replaced it with per-product
 *  Photoshop / Illustrator / Premier Pro chips + Gemini). */
const LEGACY_TOOL_MARK = "adobe";
/** Legacy-only skill label dropped in the approved design. */
const LEGACY_SKILL_LABEL = "Social Media Marketer";
/** Legacy bio lead (the design uses “Brand and UI/UX Designer”). */
const LEGACY_BIO_LEAD = "Multi-disciplinary";

function isLegacyTools(rows: ToolData[]): boolean {
  return rows.some((t) => t.markId === LEGACY_TOOL_MARK);
}

function isLegacySkills(rows: string[]): boolean {
  return rows.includes(LEGACY_SKILL_LABEL);
}

function isLegacyExperience(rows: ExperienceData[]): boolean {
  // legacy order led with AI Matterz and labelled the company “NovelOPS
  // PVT LTD” — the approved design chip order starts at NovelOPS.
  return rows[0]?.markId === "ai-matterz" || rows.some((r) => r.company === "NovelOPS PVT LTD");
}

/** Services diagram — 12 nodes in reading order; "" = solid (unlabeled). */
const DEFAULT_SERVICES: ServiceNodeData[] = [
  { label: "UI/UX Design" },
  { label: "Brand Identity Design" },
  { label: "" },
  { label: "" },
  { label: "Conversion Focused Landing Pages" },
  { label: "Social Media Posts" },
  { label: "" },
  { label: "Web Design" },
  { label: "AI Assisted Frontend Dev" },
  { label: "Brand Strategy" },
  { label: "Branding Expert" },
  { label: "Ad Creatives" },
];

// ————————————————————————————————————————————————
// Row mapping (snake_case DB rows → public API shapes)
// ————————————————————————————————————————————————

interface ProjectRow {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  role: string;
  category: string;
  cover: string;
  period: string;
  start: string;
  end_month: string | null;
  services_json: unknown;
  url: string | null;
  featured: boolean;
  sort_order: number;
  home_tile: string;
  show_on_home: boolean;
  content_json: unknown;
  content_doc: string;
}

function rowToProject(row: ProjectRow): Project {
  return {
    slug: row.slug,
    title: row.title,
    shortDescription: row.short_description,
    role: row.role,
    category: row.category,
    cover: row.cover,
    period: row.period,
    start: row.start,
    end: row.end_month,
    services: jsonToArray<string>(row.services_json),
    url: row.url,
    featured: row.featured,
    order: row.sort_order,
    homeTile: (row.home_tile === "landscape" ? "landscape" : "square") as TileRatio,
    showOnHome: row.show_on_home,
    content: parseBlocksJson(jsonToString(row.content_json, "[]")),
    doc: parseDocJson(row.content_doc ?? ""),
  };
}

function fallbackProjects(): Project[] {
  return [...defaultProjects].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

// ————————————————————————————————————————————————
// Public getters (fallback-safe — used by pages + /api/content)
// ————————————————————————————————————————————————

/**
 * Site identity — DB row 1 merged over defaults (fallback-safe).
 * `cache`d so multiple calls during one request dedupe to a single query.
 */
export const getSiteConfig = cache(async (): Promise<SiteConfigData> => {
  try {
    const { data, error } = await createPublicClient()
      .from(TABLES.site)
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw explainDbError(error);
    if (!data) return DEFAULT_SITE;
    const site = dbToApi<SiteConfigData & { updatedAt: string }>(data);
    // legacy bio guard — the pre-redesign lead phrase means the owner
    // hasn’t adopted the approved bio yet; serve the designed one.
    const legacyBio = site.bioLead === LEGACY_BIO_LEAD;
    return {
      ...DEFAULT_SITE,
      ...site,
      bioLead: legacyBio ? DEFAULT_SITE.bioLead : site.bioLead,
      bio: legacyBio ? DEFAULT_SITE.bio : site.bio,
      updatedAt: site.updatedAt ?? undefined,
    };
  } catch {
    return DEFAULT_SITE;
  }
});

/** All page texts — DB values merged over defaults (missing keys fall back). */
export async function getTexts(): Promise<Record<string, string>> {
  try {
    const { data, error } = await createPublicClient()
      .from(TABLES.texts)
      .select("key, value");
    if (error) throw explainDbError(error);
    const merged = { ...DEFAULT_TEXTS };
    for (const row of data ?? []) merged[row.key] = row.value;
    return merged;
  } catch {
    return { ...DEFAULT_TEXTS };
  }
}

export async function getProjects(): Promise<Project[]> {
  try {
    const { data, error } = await createPublicClient()
      .from(TABLES.projects)
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw explainDbError(error);
    if (!data || data.length === 0) return fallbackProjects();
    return (data as unknown as ProjectRow[]).map(rowToProject);
  } catch {
    return fallbackProjects();
  }
}

/** One project by slug (for the /work/<slug> case study page). */
export async function getProjectBySlug(slug: string): Promise<Project | null> {
  try {
    const { data, error } = await createPublicClient()
      .from(TABLES.projects)
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw explainDbError(error);
    return data ? rowToProject(data as unknown as ProjectRow) : null;
  } catch {
    return defaultProjects.find((p) => p.slug === slug) ?? null;
  }
}

export async function getExperience(): Promise<ExperienceData[]> {
  try {
    const { data, error } = await createPublicClient()
      .from(TABLES.experience)
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw explainDbError(error);
    if (!data || data.length === 0) {
      return defaultExperience.map(({ company, role, period, markId, url }) => ({
        company, role, period, markId, url: url ?? null,
      }));
    }
    const rows = (data as unknown as Array<Record<string, unknown>>).map((r) => {
      const row = dbToApi<ExperienceData>(r);
      return { company: row.company, role: row.role, period: row.period, markId: row.markId, url: row.url };
    });
    // design-baseline guard — pre-redesign order/labels lose to the
    // approved chip order until the owner adopts it.
    if (isLegacyExperience(rows)) {
      return defaultExperience.map(({ company, role, period, markId, url }) => ({
        company, role, period, markId, url: url ?? null,
      }));
    }
    return rows;
  } catch {
    return defaultExperience.map(({ company, role, period, markId, url }) => ({
      company, role, period, markId, url: url ?? null,
    }));
  }
}

export async function getSocials(): Promise<SocialData[]> {
  try {
    const { data, error } = await createPublicClient()
      .from(TABLES.socials)
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw explainDbError(error);
    if (!data || data.length === 0) return defaultSite.social.map((s) => ({ label: s.label, url: s.url }));
    return (data as unknown as Array<Record<string, unknown>>).map((r) => {
      const row = dbToApi<SocialData>(r);
      return { label: row.label, url: row.url };
    });
  } catch {
    return defaultSite.social.map((s) => ({ label: s.label, url: s.url }));
  }
}

export async function getTools(): Promise<ToolData[]> {
  try {
    const { data, error } = await createPublicClient()
      .from(TABLES.tools)
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw explainDbError(error);
    if (!data || data.length === 0) return DEFAULT_TOOLS;
    const rows = (data as unknown as Array<Record<string, unknown>>).map((r) => {
      const row = dbToApi<ToolData>(r);
      return { label: row.label, markId: row.markId };
    });
    // design-baseline guard — the retired “Adobe Creative Suite” chip
    // marks the pre-redesign seed; serve the approved 7-tool set until
    // the owner adopts it (admin edit or design-update.sql).
    if (isLegacyTools(rows)) return DEFAULT_TOOLS;
    return rows;
  } catch {
    return DEFAULT_TOOLS;
  }
}

export async function getSkills(): Promise<string[]> {
  try {
    const { data, error } = await createPublicClient()
      .from(TABLES.skills)
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw explainDbError(error);
    if (!data || data.length === 0) return DEFAULT_SKILLS;
    const rows = (data as unknown as Array<{ label: string }>).map((r) => r.label);
    // design-baseline guard — pre-redesign skill list loses to the
    // approved 8-skill set until the owner adopts it.
    if (isLegacySkills(rows)) return DEFAULT_SKILLS;
    return rows;
  } catch {
    return DEFAULT_SKILLS;
  }
}

export async function getServiceNodes(): Promise<ServiceNodeData[]> {
  try {
    const { data, error } = await createPublicClient()
      .from(TABLES.services)
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw explainDbError(error);
    if (!data || data.length === 0) return DEFAULT_SERVICES;
    return (data as unknown as Array<{ label: string }>).map((r) => ({ label: r.label }));
  } catch {
    return DEFAULT_SERVICES;
  }
}

/**
 * The complete public content payload — what GET /api/content serves and
 * what the client views receive as initialData (server-rendered for SEO,
 * then refreshed live from the API so admin edits appear instantly).
 */
export async function getContentPayload(): Promise<ContentPayload> {
  const [site, texts, projects, experience, socials, tools, skills, services] = await Promise.all([
    getSiteConfig(),
    getTexts(),
    getProjects(),
    getExperience(),
    getSocials(),
    getTools(),
    getSkills(),
    getServiceNodes(),
  ]);
  return { site, texts, projects, experience, socials, tools, skills, services };
}

// ————————————————————————————————————————————————
// Revisions / snapshots (the "no data loss" engine)
// ————————————————————————————————————————————————

export const MAX_REVISIONS = 50;

export interface ContentSnapshot {
  version: 1;
  exportedAt: string;
  site: Omit<SiteConfigData, "updatedAt">;
  texts: Record<string, string>;
  projects: Array<Record<string, unknown>>;
  experience: Array<Record<string, unknown>>;
  socials: Array<Record<string, unknown>>;
  tools: Array<Record<string, unknown>>;
  skills: Array<Record<string, unknown>>;
  services: Array<Record<string, unknown>>;
  media: Array<Record<string, unknown>>;
}

/** DB row → the canonical (camelCase, JSON-as-strings) snapshot record. */
function projectRowToSnapshot(row: Record<string, unknown>): Record<string, unknown> {
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
    end: row.end_month,
    servicesJson: jsonToString(row.services_json, "[]"),
    url: row.url,
    featured: row.featured,
    order: row.sort_order,
    homeTile: row.home_tile,
    showOnHome: row.show_on_home,
    contentJson: jsonToString(row.content_json, "[]"),
    contentDoc: row.content_doc ?? "",
  };
}

/**
 * Capture the complete content state as JSON. (Server client — must be
 * called from a request context: admin routes / export route.)
 */
export async function buildSnapshot(): Promise<ContentSnapshot> {
  const client = await createServerClient();
  const [site, texts, projects, experience, socials, tools, skills, services, media] =
    await Promise.all([
      client.from(TABLES.site).select("*").eq("id", 1).maybeSingle(),
      client.from(TABLES.texts).select("key, value"),
      client.from(TABLES.projects).select("*").order("sort_order", { ascending: true }),
      client.from(TABLES.experience).select("*").order("sort_order", { ascending: true }),
      client.from(TABLES.socials).select("*").order("sort_order", { ascending: true }),
      client.from(TABLES.tools).select("*").order("sort_order", { ascending: true }),
      client.from(TABLES.skills).select("*").order("sort_order", { ascending: true }),
      client.from(TABLES.services).select("*").order("sort_order", { ascending: true }),
      client.from(TABLES.media).select("*").order("created_at", { ascending: false }),
    ]);

  for (const r of [site, texts, projects, experience, socials, tools, skills, services, media]) {
    if (r.error) throw explainDbError(r.error);
  }

  const textMap: Record<string, string> = {};
  for (const t of texts.data ?? []) textMap[t.key] = t.value;

  const siteRow = site.data as Record<string, unknown> | null;

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    site: siteRow
      ? {
          name: String(siteRow.name),
          role: String(siteRow.role),
          bioLead: String(siteRow.bio_lead ?? ""),
          bio: String(siteRow.bio ?? ""),
          email: String(siteRow.email ?? ""),
          location: String(siteRow.location ?? ""),
          resumeUrl: siteRow.resume_url == null ? null : String(siteRow.resume_url),
          openToWork: siteRow.open_to_work !== false,
          avatarPath: String(siteRow.avatar_path ?? DEFAULT_SITE.avatarPath),
          portraitPath: String(siteRow.portrait_path ?? DEFAULT_SITE.portraitPath),
          signaturePath: String(siteRow.signature_path ?? DEFAULT_SITE.signaturePath),
          artworkPath: String(siteRow.artwork_path ?? DEFAULT_SITE.artworkPath),
        }
      : DEFAULT_SITE,
    texts: textMap,
    projects: (projects.data as unknown as Array<Record<string, unknown>> ?? []).map(projectRowToSnapshot),
    experience: (experience.data as unknown as Array<Record<string, unknown>> ?? []).map((r) => dbToApi(r)),
    socials: (socials.data as unknown as Array<Record<string, unknown>> ?? []).map((r) => dbToApi(r)),
    tools: (tools.data as unknown as Array<Record<string, unknown>> ?? []).map((r) => dbToApi(r)),
    skills: (skills.data as unknown as Array<Record<string, unknown>> ?? []).map((r) => dbToApi(r)),
    services: (services.data as unknown as Array<Record<string, unknown>> ?? []).map((r) => dbToApi(r)),
    media: (media.data as unknown as Array<Record<string, unknown>> ?? []).map((r) => dbToApi(r)),
  };
}

/** Persist a snapshot as a Revision (then prune to the newest 50). */
export async function createRevision(label: string): Promise<number> {
  const client = await createServerClient();
  const snapshot = await buildSnapshot();

  const { data, error } = await client
    .from(TABLES.revisions)
    .insert({ label, data: snapshot })
    .select("id")
    .single();
  if (error) throw explainDbError(error);
  const revisionId = data.id as number;

  // prune: keep the newest MAX_REVISIONS
  const { data: all, error: listError } = await client
    .from(TABLES.revisions)
    .select("id")
    .order("id", { ascending: false });
  if (!listError && all && all.length > MAX_REVISIONS) {
    const excess = all.slice(MAX_REVISIONS).map((r) => r.id);
    if (excess.length > 0) {
      await client.from(TABLES.revisions).delete().in("id", excess);
    }
  }
  return revisionId;
}

function isRecordArray(value: unknown): value is Array<Record<string, unknown>> {
  return Array.isArray(value) && value.every((v) => typeof v === "object" && v !== null);
}

/** Snapshot project record (camelCase) → DB row (snake_case, jsonb as arrays). */
function snapshotProjectToRow(p: Record<string, unknown>): Record<string, unknown> {
  const row = apiToDb({
    slug: String(p.slug ?? `restored-${Math.random().toString(36).slice(2, 8)}`),
    title: String(p.title ?? "Untitled"),
    shortDescription: String(p.shortDescription ?? ""),
    role: String(p.role ?? ""),
    category: String(p.category ?? ""),
    cover: String(p.cover ?? ""),
    period: String(p.period ?? ""),
    start: String(p.start ?? "2025-01"),
    end: p.end == null ? null : String(p.end),
    servicesJson: jsonToArray(p.servicesJson),
    url: p.url == null ? null : String(p.url),
    featured: Boolean(p.featured),
    order: Number(p.order ?? 0) || 0,
    homeTile: p.homeTile === "landscape" ? "landscape" : "square",
    showOnHome: p.showOnHome === undefined ? true : Boolean(p.showOnHome),
    contentJson: parseBlocksJson(jsonToString(p.contentJson, "[]")),
    contentDoc: String(p.contentDoc ?? ""),
  });
  if (typeof p.id === "string" && p.id) row.id = p.id;
  return row;
}

/**
 * Replace ALL content with a snapshot (used by revision restore and backup
 * import). Takes a safety snapshot of the current state first. Media rows
 * are restored as metadata (files live in Supabase Storage / legacy disk).
 */
export async function applySnapshot(data: unknown, label: string): Promise<void> {
  if (typeof data !== "object" || data === null) throw new Error("Invalid backup file.");
  const snap = data as Partial<ContentSnapshot>;
  if (!snap.site || typeof snap.site !== "object" || !isRecordArray(snap.projects)) {
    throw new Error("Invalid backup file — missing content.");
  }

  await createRevision(`Auto-backup before ${label}`);

  const client = await createServerClient();

  // wipe the collections
  for (const table of [TABLES.projects, TABLES.experience, TABLES.socials, TABLES.tools, TABLES.skills, TABLES.services]) {
    const { error } = await client.from(table).delete();
    if (error) throw explainDbError(error);
  }

  // site config singleton
  const s = snap.site;
  const siteRow = apiToDb({
    id: 1,
    name: s.name,
    role: s.role,
    bioLead: s.bioLead ?? "",
    bio: s.bio ?? "",
    email: s.email ?? "",
    location: s.location ?? "",
    resumeUrl: s.resumeUrl ?? null,
    openToWork: s.openToWork ?? true,
    avatarPath: s.avatarPath,
    portraitPath: s.portraitPath,
    signaturePath: s.signaturePath,
    artworkPath: s.artworkPath,
  });
  const { error: siteError } = await client.from(TABLES.site).upsert(siteRow, { onConflict: "id" });
  if (siteError) throw explainDbError(siteError);

  // texts: replace wholesale
  const { error: textsDeleteError } = await client.from(TABLES.texts).delete();
  if (textsDeleteError) throw explainDbError(textsDeleteError);
  const texts = snap.texts && typeof snap.texts === "object" ? snap.texts : {};
  const textRows = Object.entries(texts)
    .filter(([, v]) => typeof v === "string")
    .map(([key, value]) => ({ key, value: String(value) }));
  if (textRows.length > 0) {
    const { error: textsError } = await client.from(TABLES.texts).insert(textRows);
    if (textsError) throw explainDbError(textsError);
  }

  // projects
  if (snap.projects.length > 0) {
    const { error: projectsError } = await client
      .from(TABLES.projects)
      .insert(snap.projects.map(snapshotProjectToRow));
    if (projectsError) throw explainDbError(projectsError);
  }

  // simple lists
  const lists: Array<[string, Array<Record<string, unknown>>]> = [
    [TABLES.experience, isRecordArray(snap.experience) ? snap.experience : []],
    [TABLES.socials, isRecordArray(snap.socials) ? snap.socials : []],
    [TABLES.tools, isRecordArray(snap.tools) ? snap.tools : []],
    [TABLES.skills, isRecordArray(snap.skills) ? snap.skills : []],
    [TABLES.services, isRecordArray(snap.services) ? snap.services : []],
  ];
  for (const [table, rows] of lists) {
    if (rows.length === 0) continue;
    const mapped = rows.map((r) => {
      const row = apiToDb({
        label: r.label == null ? undefined : String(r.label),
        company: r.company == null ? undefined : String(r.company),
        role: r.role == null ? undefined : String(r.role),
        period: r.period == null ? undefined : String(r.period),
        markId: r.markId == null ? undefined : String(r.markId),
        url: r.url == null ? null : String(r.url),
        order: Number(r.order ?? 0) || 0,
      });
      // drop undefined keys (apiToDb keeps them as undefined values)
      for (const k of Object.keys(row)) {
        if (row[k] === undefined) delete row[k];
      }
      if (typeof r.id === "string" && r.id) row.id = r.id;
      return row;
    });
    const { error } = await client.from(table).insert(mapped);
    if (error) throw explainDbError(error);
  }

  // media metadata: upsert rows by filename
  if (isRecordArray(snap.media)) {
    for (const m of snap.media) {
      const filename = typeof m.filename === "string" ? m.filename : null;
      if (!filename) continue;
      const row = {
        filename,
        url: typeof m.url === "string" && m.url ? m.url : `/api/media/${filename}`,
        originalName: String(m.originalName ?? filename),
        mime: String(m.mime ?? "image/png"),
        size: Number(m.size ?? 0) || 0,
        width: m.width == null ? null : Number(m.width),
        height: m.height == null ? null : Number(m.height),
        alt: m.alt == null ? null : String(m.alt),
      };
      const { error } = await client.from(TABLES.media).upsert(row, { onConflict: "filename" });
      if (error) throw explainDbError(error);
    }
  }
}

/** Restore a stored revision. */
export async function restoreRevision(id: number): Promise<void> {
  const client = await createServerClient();
  const { data, error } = await client
    .from(TABLES.revisions)
    .select("id, label, data")
    .eq("id", id)
    .maybeSingle();
  if (error) throw explainDbError(error);
  if (!data) throw new Error("Revision not found.");
  await applySnapshot(data.data, `restore of “${data.label}”`);
}

// ————————————————————————————————————————————————
// Utilities
// ————————————————————————————————————————————————

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || `project-${Date.now().toString(36)}`
  );
}

/** Ensure a slug is unique (excluding one project id when updating). */
export async function uniqueSlug(slug: string, excludeId?: string): Promise<string> {
  let candidate = slug;
  let suffix = 2;
  for (;;) {
    const { data, error } = await createPublicClient()
      .from(TABLES.projects)
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (error) throw explainDbError(error);
    if (!data || data.id === excludeId) return candidate;
    candidate = `${slug}-${suffix++}`;
  }
}
