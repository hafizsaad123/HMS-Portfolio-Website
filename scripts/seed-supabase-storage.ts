/**
 * scripts/seed-supabase-storage.ts
 *
 * One-time migration helper — uploads the legacy media files from db/uploads/
 * into the Supabase storage bucket "media" under their original filenames, so
 * the old /api/media/<file> URLs keep working (the app redirects those to the
 * storage object of the same name).
 *
 * PREREQUISITE: run supabase/migration.sql in the Supabase SQL Editor first —
 * it creates the "media" bucket, its RLS policies and the admin auth user.
 *
 * Auth strategy (no new dependencies — plain @supabase/supabase-js):
 *   • SUPABASE_SERVICE_ROLE_KEY set → used directly as the key (service
 *     client, RLS bypassed, no sign-in needed).
 *   • otherwise → supabase.auth.signInWithPassword(ADMIN_EMAIL / ADMIN_PASSWORD)
 *     and the uploads happen with the SAME client, so the session makes the
 *     storage writes pass the "authenticated" RLS policy.
 *
 * Env (auto-loaded by Bun from .env / .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   optional: SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD
 *
 * Run: bun scripts/seed-supabase-storage.ts
 */
import { createClient } from '@supabase/supabase-js'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const UPLOADS_DIR = join(import.meta.dir, '..', 'db', 'uploads')
const BUCKET = 'media'
const EXPECTED_FILES = 13
const SAFE_NAME = /^[A-Za-z0-9._-]+$/

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg',
  '.mov': 'video/quicktime',
}

const mimeFromExtension = (filename: string): string => {
  const dot = filename.lastIndexOf('.')
  const ext = dot === -1 ? '' : filename.slice(dot).toLowerCase()
  return MIME_BY_EXT[ext] ?? 'application/octet-stream'
}

const fail = (message: string): never => {
  console.error(message)
  process.exit(1)
}

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) fail('NEXT_PUBLIC_SUPABASE_URL is not set (check .env.local).')
  const key = serviceKey ?? publishableKey
  if (!key)
    fail('No Supabase key found — set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or SUPABASE_SERVICE_ROLE_KEY.')

  const supabase = createClient(url, key, { auth: { persistSession: false } })

  console.log(`Supabase project : ${url}`)
  if (serviceKey) {
    console.log('Auth             : service role key (RLS bypassed, no sign-in)')
  } else {
    const email = process.env.ADMIN_EMAIL ?? 'admin@saad.design'
    const password = process.env.ADMIN_PASSWORD ?? 'saad2026'
    console.log(`Auth             : signing in as ${email} …`)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error)
      fail(
        `Sign-in failed: ${error.message}\n` +
          '  (Did you run supabase/migration.sql? It creates the admin auth user.)',
      )
    console.log('Auth             : signed in — storage writes pass the authenticated RLS policy')
  }

  // Collect safe filenames only (skip dotfiles and anything with unexpected characters).
  const files = readdirSync(UPLOADS_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && !e.name.startsWith('.') && SAFE_NAME.test(e.name))
    .map((e) => e.name)
    .sort()

  console.log(`\nUploading ${files.length} file(s) from db/uploads/ → storage bucket "${BUCKET}"\n`)

  const results: Array<{ name: string; ok: boolean; note: string }> = []

  for (const name of files) {
    const buf = await Bun.file(join(UPLOADS_DIR, name)).arrayBuffer()
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(name, buf, { contentType: mimeFromExtension(name), upsert: true })
    if (error) {
      const hint = /bucket/i.test(error.message) ? ' — run supabase/migration.sql first' : ''
      results.push({ name, ok: false, note: `${error.message}${hint}` })
    } else {
      results.push({ name, ok: true, note: mimeFromExtension(name) })
    }
  }

  // Per-file PASS/FAIL table
  const width = Math.max(...results.map((r) => r.name.length), 20)
  for (const r of results)
    console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(width)}  ${r.ok ? r.note : '✗ ' + r.note}`)

  const passed = results.filter((r) => r.ok).length
  const failed = results.length - passed
  console.log(`\nSummary: ${passed}/${results.length} uploaded, ${failed} failed (${EXPECTED_FILES} files expected)`)

  if (results.length !== EXPECTED_FILES)
    console.log(`Note: expected ${EXPECTED_FILES} files in db/uploads/, found ${results.length}.`)
  if (failed > 0) {
    console.log('\nFailed uploads:')
    for (const r of results.filter((x) => !x.ok)) console.log(`  • ${r.name}: ${r.note}`)
    process.exit(1)
  }
  console.log('\nDone — legacy /api/media/<file> URLs now resolve from Supabase storage.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
