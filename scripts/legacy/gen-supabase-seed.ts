/**
 * scripts/gen-supabase-seed.ts
 *
 * One-time migration helper: reads every content table from the legacy SQLite
 * database (db/custom.db, via Prisma) and appends a fully-escaped SQL seed
 * section to the frozen Supabase schema, producing:
 *
 *   • supabase/migration.sql — supabase/schema.sql (verbatim) + seed + a tiny
 *     verification query. Paste the WHOLE file into the Supabase SQL Editor →
 *     Run. Safe to re-run (every insert is idempotent).
 *   • supabase/seed.sql      — the seed section alone (banner included), for
 *     re-running on an already-migrated database.
 *
 * AdminUser is intentionally skipped — auth moved to Supabase Auth.
 *
 * Escaping: Postgres standard strings only ('' doubling, no backslashes),
 * booleans as true/false, nulls unquoted, timestamps as '…'::timestamptz and
 * jsonb columns as validated '…'::jsonb literals.
 *
 * Run: bun scripts/gen-supabase-seed.ts
 */
import { PrismaClient } from '@prisma/client'
import { statSync } from 'node:fs'
import { join } from 'node:path'

const db = new PrismaClient()

const ROOT = join(import.meta.dir, '..')
const SCHEMA_PATH = join(ROOT, 'supabase/schema.sql')
const MIGRATION_PATH = join(ROOT, 'supabase/migration.sql')
const SEED_PATH = join(ROOT, 'supabase/seed.sql')

const SIZE_LIMIT = 3 * 1024 * 1024 // 3 MB
const PROJECT_CHUNK = 10
const RULE = '-- ' + '═'.repeat(76)

// ─────────────────────────────────────────────────────────────────────────────
// SQL emission helpers (Postgres standard strings — only ' → '' escaping)
// ─────────────────────────────────────────────────────────────────────────────

/** Escape single quotes for a Postgres standard string literal. */
const esc = (v: string): string => v.replace(/'/g, "''")

/** text value → quoted literal (or unquoted null) */
const str = (v: string | null): string => (v === null ? 'null' : `'${esc(v)}'`)

/** boolean → true / false */
const bool = (v: boolean): string => (v ? 'true' : 'false')

/** number → plain (or unquoted null) */
const num = (v: number | null): string => (v === null ? 'null' : String(v))

/** Date → '…'::timestamptz */
const ts = (d: Date): string => `'${esc(d.toISOString())}'::timestamptz`

/**
 * Validated jsonb literal from a Prisma JSON *string* column
 * (servicesJson / contentJson / Revision.data). Returns null when the source
 * string does not parse — callers decide between a '[]'::jsonb fallback and
 * skipping the row.
 */
const jsonb = (raw: string | null): string | null => {
  if (raw === null) return null
  try {
    JSON.parse(raw)
    return `'${esc(raw)}'::jsonb`
  } catch {
    return null
  }
}

const chunksOf = <T,>(arr: T[], size: number): T[][] => {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Read the legacy SQLite data (AdminUser skipped — auth is Supabase Auth)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchData(revisionTake: number) {
  const [site, texts, projects, experience, socials, tools, skills, services, media, newest] =
    await Promise.all([
      db.siteConfig.findUnique({ where: { id: 1 } }),
      db.textBlock.findMany({ orderBy: { key: 'asc' } }),
      db.project.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] }),
      db.experience.findMany({ orderBy: { order: 'asc' } }),
      db.socialLink.findMany({ orderBy: { order: 'asc' } }),
      db.toolItem.findMany({ orderBy: { order: 'asc' } }),
      db.skillItem.findMany({ orderBy: { order: 'asc' } }),
      db.serviceNode.findMany({ orderBy: { order: 'asc' } }),
      db.mediaAsset.findMany({ orderBy: { createdAt: 'asc' } }),
      // newest N revisions first …
      db.revision.findMany({ orderBy: { id: 'desc' }, take: revisionTake }),
    ])
  return {
    site,
    texts,
    projects,
    experience,
    socials,
    tools,
    skills,
    services,
    media,
    revisions: newest.reverse(), // … flipped back to ascending id order
  }
}

type Data = Awaited<ReturnType<typeof fetchData>>

interface Stats {
  counts: Record<string, number>
  notes: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Build the seed section
// ─────────────────────────────────────────────────────────────────────────────

function buildSeed(d: Data, revisionTake: number): { sql: string; stats: Stats } {
  const out: string[] = []
  const stats: Stats = { counts: {}, notes: [] }
  const comment = (name: string, note: string) => out.push(`-- ——— ${name} — ${note} ———`)

  // ——— banner ———
  out.push(
    `-- SEED DATA — exported from the previous SQLite database on ${new Date()
      .toISOString()
      .slice(0, 10)} (idempotent: safe to re-run)`,
  )
  out.push(RULE)
  out.push('')

  // ——— site_config — single row, upsert-safe ———
  if (d.site) {
    comment('site_config', '1 row · on conflict (id) do nothing')
    out.push('insert into public.site_config')
    out.push('  (id, name, role, bio_lead, bio, email, location, resume_url, open_to_work,')
    out.push('   avatar_path, portrait_path, signature_path, artwork_path, updated_at)')
    out.push('values')
    out.push(
      `  (${num(d.site.id)}, ${str(d.site.name)}, ${str(d.site.role)}, ${str(d.site.bioLead)}, ${str(d.site.bio)},`,
    )
    out.push(
      `   ${str(d.site.email)}, ${str(d.site.location)}, ${str(d.site.resumeUrl)}, ${bool(d.site.openToWork)},`,
    )
    out.push(
      `   ${str(d.site.avatarPath)}, ${str(d.site.portraitPath)}, ${str(d.site.signaturePath)}, ${str(d.site.artworkPath)},`,
    )
    out.push(`   ${ts(d.site.updatedAt)})`)
    out.push('on conflict (id) do nothing;')
    stats.counts['site_config'] = 1
  } else {
    comment('site_config', 'no row in the source database — skipped')
    stats.counts['site_config'] = 0
  }
  out.push('')

  // ——— text_blocks — one multi-row insert ———
  comment('text_blocks', `${d.texts.length} rows · on conflict (key) do nothing`)
  if (d.texts.length > 0) {
    out.push('insert into public.text_blocks (key, value) values')
    out.push(d.texts.map((t) => `  (${str(t.key)}, ${str(t.value)})`).join(',\n'))
    out.push('on conflict (key) do nothing;')
  } else {
    out.push('-- (empty in source — nothing to insert)')
  }
  stats.counts['text_blocks'] = d.texts.length
  out.push('')

  // ——— projects — multi-row inserts, chunked for readability ———
  const chunks = chunksOf(d.projects, PROJECT_CHUNK)
  comment(
    'projects',
    `${d.projects.length} rows · ${chunks.length} insert(s) · on conflict (slug) do nothing`,
  )
  const PROJECT_COLS =
    'id, slug, title, short_description, role, category, cover, period, start,\n' +
    ' end_month, services_json, url, featured, sort_order, home_tile, show_on_home,\n' +
    ' content_json, content_doc, created_at, updated_at'
  const projectRow = (p: Data['projects'][number]) => {
    let services = jsonb(p.servicesJson)
    if (services === null) {
      services = `'[]'::jsonb`
      stats.notes.push(`projects.${p.slug}: services_json was not valid JSON — seeded '[]'::jsonb`)
    }
    let content = jsonb(p.contentJson)
    if (content === null) {
      content = `'[]'::jsonb`
      stats.notes.push(`projects.${p.slug}: content_json was not valid JSON — seeded '[]'::jsonb`)
    }
    return (
      `  (${str(p.id)}, ${str(p.slug)}, ${str(p.title)}, ${str(p.shortDescription)}, ` +
      `${str(p.role)}, ${str(p.category)}, ${str(p.cover)}, ${str(p.period)}, ${str(p.start)}, ` +
      `${str(p.end)}, ${services}, ${str(p.url)}, ${bool(p.featured)}, ${num(p.order)}, ` +
      `${str(p.homeTile)}, ${bool(p.showOnHome)}, ${content}, ${str(p.contentDoc)}, ` +
      `${ts(p.createdAt)}, ${ts(p.updatedAt)})`
    )
  }
  if (d.projects.length > 0) {
    for (const chunk of chunks) {
      out.push(`insert into public.projects (${PROJECT_COLS})`)
      out.push('values')
      out.push(chunk.map(projectRow).join(',\n'))
      out.push('on conflict (slug) do nothing;')
      out.push('')
    }
  } else {
    out.push('-- (empty in source — nothing to insert)')
    out.push('')
  }
  stats.counts['projects'] = d.projects.length

  // ——— guard: insert-only-when-empty blocks for the tables with no unique key ———
  // (experience, social_links, tools, skills, services keep their legacy cuid
  //  ids; the legacy SQLite tables stored no timestamps → created_at = now())
  const guard = (table: string, columns: string, rows: string[]) => {
    out.push('do $$')
    out.push('begin')
    out.push(`  if not exists (select 1 from public.${table}) then`)
    out.push(`    insert into public.${table} (${columns})`)
    out.push('    values')
    out.push(rows.join(',\n') + ';')
    out.push('  end if;')
    out.push('end $$;')
  }

  comment(
    'experience',
    `${d.experience.length} rows · inserted only when the table is empty (no unique key) · created_at = now()`,
  )
  if (d.experience.length > 0) {
    guard(
      'experience',
      'id, company, role, period, mark_id, url, sort_order, created_at',
      d.experience.map(
        (e) =>
          `      (${str(e.id)}, ${str(e.company)}, ${str(e.role)}, ${str(e.period)}, ${str(e.markId)}, ${str(e.url)}, ${num(e.order)}, now())`,
      ),
    )
  } else {
    out.push('-- (empty in source — nothing to insert)')
  }
  stats.counts['experience'] = d.experience.length
  out.push('')

  comment(
    'social_links',
    `${d.socials.length} rows · inserted only when the table is empty (no unique key) · created_at = now()`,
  )
  if (d.socials.length > 0) {
    guard(
      'social_links',
      'id, label, url, sort_order, created_at',
      d.socials.map(
        (s) => `      (${str(s.id)}, ${str(s.label)}, ${str(s.url)}, ${num(s.order)}, now())`,
      ),
    )
  } else {
    out.push('-- (empty in source — nothing to insert)')
  }
  stats.counts['social_links'] = d.socials.length
  out.push('')

  comment(
    'tools',
    `${d.tools.length} rows · inserted only when the table is empty (no unique key) · created_at = now()`,
  )
  if (d.tools.length > 0) {
    guard(
      'tools',
      'id, label, mark_id, sort_order, created_at',
      d.tools.map(
        (t) => `      (${str(t.id)}, ${str(t.label)}, ${str(t.markId)}, ${num(t.order)}, now())`,
      ),
    )
  } else {
    out.push('-- (empty in source — nothing to insert)')
  }
  stats.counts['tools'] = d.tools.length
  out.push('')

  comment(
    'skills',
    `${d.skills.length} rows · inserted only when the table is empty (no unique key) · created_at = now()`,
  )
  if (d.skills.length > 0) {
    guard(
      'skills',
      'id, label, sort_order, created_at',
      d.skills.map((s) => `      (${str(s.id)}, ${str(s.label)}, ${num(s.order)}, now())`),
    )
  } else {
    out.push('-- (empty in source — nothing to insert)')
  }
  stats.counts['skills'] = d.skills.length
  out.push('')

  comment(
    'services',
    `${d.services.length} rows · inserted only when the table is empty (no unique key) · created_at = now()`,
  )
  if (d.services.length > 0) {
    guard(
      'services',
      'id, label, sort_order, created_at',
      d.services.map((s) => `      (${str(s.id)}, ${str(s.label)}, ${num(s.order)}, now())`),
    )
  } else {
    out.push('-- (empty in source — nothing to insert)')
  }
  stats.counts['services'] = d.services.length
  out.push('')

  // ——— media_assets — multi-row insert, urls kept verbatim ———
  comment(
    'media_assets',
    `${d.media.length} rows · on conflict (filename) do nothing · urls kept verbatim (/api/media/… keeps working)`,
  )
  if (d.media.length > 0) {
    out.push(
      'insert into public.media_assets (id, filename, url, original_name, mime, size, width, height, alt, created_at)',
    )
    out.push('values')
    out.push(
      d.media
        .map(
          (m) =>
            `  (${str(m.id)}, ${str(m.filename)}, ${str(m.url)}, ${str(m.originalName)}, ${str(m.mime)}, ${num(m.size)}, ${num(m.width)}, ${num(m.height)}, ${str(m.alt)}, ${ts(m.createdAt)})`,
        )
        .join(',\n'),
    )
    out.push('on conflict (filename) do nothing;')
  } else {
    out.push('-- (empty in source — nothing to insert)')
  }
  stats.counts['media_assets'] = d.media.length
  out.push('')

  // ——— revisions — newest N only, explicit ids, data validated as jsonb ———
  const revRows: string[] = []
  for (const r of d.revisions) {
    const data = jsonb(r.data)
    if (data === null) {
      stats.notes.push(`revisions.${r.id}: data was not valid JSON — row skipped`)
      continue
    }
    revRows.push(`  (${num(r.id)}, ${str(r.label)}, ${data}, ${ts(r.createdAt)})`)
  }
  comment(
    'revisions',
    `${revRows.length} of the newest ${revisionTake} (ids kept) · on conflict (id) do nothing`,
  )
  if (revRows.length > 0) {
    out.push('insert into public.revisions (id, label, data, created_at) values')
    out.push(revRows.join(',\n'))
    out.push('on conflict (id) do nothing;')
  } else {
    out.push('-- (no valid revisions to insert)')
  }
  stats.counts['revisions'] = revRows.length

  return { sql: out.join('\n') + '\n', stats }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Assemble, write, report
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Reading legacy SQLite database (db/custom.db) via Prisma …')
  const schemaSql = await Bun.file(SCHEMA_PATH).text()
  const totalRevisions = await db.revision.count()

  const assemble = (seedSql: string): string =>
    schemaSql +
    (schemaSql.endsWith('\n') ? '\n' : '\n\n') +
    seedSql +
    '-- Migration complete. Verify:\n' +
    "select 'site ready' as status, (select count(*) from public.projects) as projects;\n"

  let revisionTake = 10
  let { sql: seed, stats } = buildSeed(await fetchData(revisionTake), revisionTake)
  let migration = assemble(seed)

  if (Buffer.byteLength(migration, 'utf8') > SIZE_LIMIT) {
    console.warn('⚠ migration.sql exceeded 3 MB — regenerating with only the newest 3 revisions …')
    revisionTake = 3
    ;({ sql: seed, stats } = buildSeed(await fetchData(revisionTake), revisionTake))
    migration = assemble(seed)
  }

  await Bun.write(MIGRATION_PATH, migration)
  await Bun.write(SEED_PATH, seed)

  const kb = (p: string) => `${(statSync(p).size / 1024).toFixed(1)} KB`

  console.log('\nRows exported (source → supabase/migration.sql):')
  for (const [table, n] of Object.entries(stats.counts))
    console.log(`  ${table.padEnd(14)} ${String(n).padStart(3)}`)
  console.log(`  (revisions: the source holds ${totalRevisions} rows — the newest ${revisionTake} were exported)`)

  if (stats.notes.length > 0) {
    console.log('\nNotes:')
    for (const n of stats.notes) console.log(`  • ${n}`)
  } else {
    console.log('\nNotes: none — every row exported cleanly (no invalid JSON, nothing skipped).')
  }

  console.log(`\n✓ supabase/migration.sql — schema + seed — ${kb(MIGRATION_PATH)}`)
  console.log(`✓ supabase/seed.sql      — seed only    — ${kb(SEED_PATH)}`)
  if (Buffer.byteLength(migration, 'utf8') > SIZE_LIMIT)
    console.warn('⚠ migration.sql is STILL larger than 3 MB even with 3 revisions!')
  else console.log('  (within the 3 MB limit)')

  await db.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await db.$disconnect()
  process.exit(1)
})
