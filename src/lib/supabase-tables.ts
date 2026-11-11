/**
 * Supabase table contract — the single source of truth for the mapping
 * between the app's camelCase API shapes and the snake_case Postgres schema
 * (see supabase/migration.sql).
 *
 * RLS model:
 *  - content tables: public SELECT, all writes `authenticated` (the admin)
 *  - revisions:      `authenticated` only
 *  - storage bucket `media`: public read, `authenticated` write
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const MEDIA_BUCKET = "media";

export const TABLES = {
  site: "site_config",
  texts: "text_blocks",
  projects: "projects",
  experience: "experience",
  socials: "social_links",
  tools: "tools",
  skills: "skills",
  services: "services",
  media: "media_assets",
  revisions: "revisions",
} as const;

export type TableKey = keyof typeof TABLES;

/** Public (permanent) URL of a file in the media bucket. */
export function publicMediaUrl(filename: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${filename}`;
}

/** True when a media URL points into our Supabase storage bucket. */
export function isStorageMediaUrl(url: string): boolean {
  return url.startsWith(`${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/`);
}

/** Extract the storage filename from a public media URL. */
export function storageFilenameFromUrl(url: string): string | null {
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/`;
  return isStorageMediaUrl(url) ? url.slice(prefix.length) : null;
}

// ————————————————————————————————————————————————
// Key mapping (camelCase API ⇄ snake_case columns)
// ————————————————————————————————————————————————

/** Columns whose API name isn't a plain camelCase of the column name. */
const API_ALIASES: Record<string, string> = {
  sort_order: "order",
  end_month: "end",
};
const DB_ALIASES: Record<string, string> = {
  order: "sort_order",
  end: "end_month",
};

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/** DB row → API object (keys camelCased, aliases applied, JSON untouched). */
export function dbToApi<T = Record<string, unknown>>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[API_ALIASES[key] ?? snakeToCamel(key)] = value;
  }
  return out as T;
}

/** API object → DB row (keys snake_cased, aliases applied, JSON untouched). */
export function apiToDb(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    out[camelToSnake(DB_ALIASES[key] ?? key)] = value;
  }
  return out;
}

/** Coerce a jsonb-ish value (string or already-parsed) into a string. */
export function jsonToString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (value == null) return fallback;
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

/** Coerce a jsonb-ish value into a parsed array (defensive, never throws). */
export function jsonToArray<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string" && value.trim() !== "") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

// ————————————————————————————————————————————————
// Shared query helpers
// ————————————————————————————————————————————————

/** Throw a readable error when the Supabase schema isn't installed yet. */
export function explainDbError(error: unknown): Error {
  const e = error as { code?: string; message?: string };
  if (e?.code === "PGRST205") {
    return new Error(
      "The Supabase database isn't set up yet — open your Supabase project → SQL Editor, run supabase/migration.sql, then reload."
    );
  }
  if (e?.code === "PGRST301" || /JWT|apikey/i.test(e?.message ?? "")) {
    return new Error("Supabase rejected the request — check NEXT_PUBLIC_SUPABASE_URL and the publishable key in .env.local.");
  }
  return error instanceof Error ? error : new Error(e?.message ?? "Unknown Supabase error");
}

/** Count rows in a table (RLS applies). */
export async function countRows(
  client: SupabaseClient,
  table: TableKey
): Promise<number> {
  const { count, error } = await client
    .from(TABLES[table])
    .select("id", { count: "exact", head: true });
  if (error) throw explainDbError(error);
  return count ?? 0;
}
