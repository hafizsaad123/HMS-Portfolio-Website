# Hafiz Muhammad Saad — Personal Design Portfolio

A production-ready personal portfolio for a multidisciplinary UI/UX & brand
designer, implemented from three supplied Figma page exports
(`my_porfolio_home`, `my_porfolio_about`, `my_porfolio_work`) as the
authoritative design references.

## Stack (final)

- **Frontend & subdomain**: **Next.js 16** (App Router) + **TypeScript 5**,
  deployed on **Vercel**
- **Backend, database & admin**: **Supabase**
  - **Postgres** — every piece of site content (RLS: public read, admin write)
  - **Auth** — email + password sign-in for the `/admin` portal
    (`@supabase/ssr` cookie sessions, refreshed by `src/proxy.ts`)
  - **Storage** — the `media` bucket holds every uploaded image / PDF / video
  - **Table Editor** — a ready-made "auto-admin UI" on top of the same tables
- **Tailwind CSS 4** with design tokens sampled from the exports
  (brand purple `#8750F6`, lavender `#C3A7FF`, deep `#170146`, ink/body/soft grays)
- **Geist** + **Geist Mono** via `next/font/google`
- shadcn/ui primitives (Dialog, DropdownMenu, Tabs, Cards…) — only where genuinely needed

## Supabase setup (one time)

1. Open your Supabase project → **SQL Editor** → New query.
2. Paste **all of `supabase/migration.sql`** (schema + RLS + storage bucket +
   your migrated content) → **Run**. It is idempotent — safe to re-run.
   (Optionally also run `supabase/revisions-history.sql` afterwards to import
   the 10 legacy revision snapshots — not required.)
3. Upload the 13 legacy media files so old `/api/media/...` links keep working:
   ```bash
   bun scripts/seed-supabase-storage.ts
   ```
   (signs in as `admin@saad.design` / `saad2026`, or set `SUPABASE_SERVICE_ROLE_KEY`;
   already-uploaded files are skipped)
4. Sign in at `/admin` with **admin@saad.design / saad2026** — change the
   password in Settings on first use.

Environment (`.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=https://fztseosuiapjwfulwdik.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
# optional, only for scripts/seed-supabase-storage.ts:
# SUPABASE_SERVICE_ROLE_KEY=…
```

### Deploying to Vercel

1. Push this repo to GitHub.
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import the repo
   (framework auto-detects as Next.js; no build settings needed).
3. Add the environment variables (Project → Settings → Environment Variables):
   | Name | Value |
   | ---- | ----- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://fztseosuiapjwfulwdik.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` (your project's key) |
   | `NEXT_PUBLIC_SITE_URL` | your production domain, e.g. `https://yourdomain.com` |
4. **Deploy**. That's it — no database on the server, no file storage to
   configure (media uploads go straight from the browser to Supabase Storage).

Public pages are server-rendered on every request (`force-dynamic`), so every
edit made in `/admin` appears on the live site immediately — no redeploy
needed.

## Routes

| Route    | Page | Notes |
| -------- | ---- | ----- |
| `/`      | Home | 4 always-moving vertical work sliders (outer cols up, middle cols down, no hover), pinned sidebar |
| `/work`  | My Work | Heading, subheading, functional sort (Recent/Oldest), 2-column cards |
| `/about` | About Me | Badge, hero, intro, services diagram, experience grid, sign-off, footer |
| `/admin` | Admin Portal | Supabase Auth sign-in → manage **everything** (see below) |
| `*`      | 404 | On-brand not-found page |

## Layout rule #1 — the sidebar never scrolls

At `lg+` the page itself cannot scroll. Only the main (right) column
scrolls; the sidebar is a pinned floating card (sharp corners, radius 0,
thin border) carrying the corner-frame design from Saad's reference:
light-gray corner squares, thin inner frame lines, two purple pixel
cascades (top-right + bottom-left) and a dark→bright gradient bar closing
the bottom edge — always anchored to the card. On short viewports the
sidebar rhythm compresses, the landmark artwork shrinks fluidly, and the
content area only scrolls internally — with the scrollbar hidden — as an
invisible last resort. Below `lg` (mobile) the page scrolls naturally
with the sidebar card stacked on top.

## Content architecture — the /admin portal (no data loss, ever)

**Every piece of site content lives in Supabase Postgres and is editable
from `/admin`** (sign in with the Supabase Auth account created by
`supabase/migration.sql`).

What you can manage:

- **Dashboard** — counts, last change, quick actions, one-click restore
- **Projects** — create / edit / delete / reorder / feature; cover images;
  auto slugs; services; external links; home-tile ratio; case-study editors
- **Experience** — the About-page grid + sidebar pills, with company marks
- **Page Content** — every text on the site (identity, bio, contact, About
  hero/paragraphs/badge/footer lines, Work heading/subheading, meta
  descriptions, copyright line), the four images (profile / portrait /
  signature / sidebar artwork), tools, skills, social links, and the
  12-node services diagram
- **Media Library** — drag & drop uploads (PNG/JPG/WebP/GIF/AVIF/SVG/PDF,
  ≤ 8 MB; case-study videos ≤ 64 MB), previews, dimensions, copy-URL,
  in-use protection. Uploads go **straight from the browser to Supabase
  Storage** — the app server never proxies file bytes, so slow connections
  can't hit gateway timeouts.
- **Settings** — password change, full .zip backup download & restore
  (content + every media file), JSON export/import, full change history
  with restore

**No-data-loss guarantees**

1. Every mutation (save, upload, reorder, delete, restore) writes an
   automatic **Revision snapshot** — the newest 50 are kept and restorable.
2. Restoring anything takes a safety snapshot of the current state first,
   so even restores are undoable.
3. Media files are never hard-deleted from the storage bucket — they can
   always be brought back.
4. The original approved content is baked into the code as defaults
   (`src/lib/content.ts`) — if Supabase is ever unreachable, the public
   site falls back to those defaults and can never render blank.
5. Full .zip backups (content + all files from Storage) can be downloaded
   anytime from Settings.

`src/data/*.ts` remain as the defaults; the database is the live source of
truth read by the public pages.

## Legacy SQLite era

The app originally ran on Prisma + SQLite. That data was exported into
`supabase/migration.sql` (by `scripts/legacy/gen-supabase-seed.ts`). The old
upload files are kept in `db/uploads/` only so
`scripts/seed-supabase-storage.ts` can push them into the storage bucket —
the app no longer uses Prisma or SQLite at runtime (Supabase is the single
source of truth).

## Configuration still required (honest states, no fake links)

- `social[].url` — ✅ configured with Saad's real LinkedIn / Instagram /
  Behance profiles.
- `resumeUrl` — upload a PDF (Page Content → General → Resume) or paste a
  hosted URL. Until set, "View Resume" opens an honest notice with a
  working `mailto:` alternative.
- `NEXT_PUBLIC_SITE_URL` — the production domain (used by metadata,
  canonicals, sitemap). Falls back to `http://localhost:3000`.

## Assets

Saad's real supplied assets are in use:

- `public/images/profile.png` — real B&W profile photo (sidebar avatar,
  sharp corners — radius 0)
- `public/images/portrait.png` — real B&W studio portrait (About sign-off)
- `public/images/signature.png` — real handwritten "Saad" signature
- `public/images/artwork.png` — real lavender line-art landmark (sidebar)
- `public/images/projects/*.png` — 7 project covers

Tool logos (Figma, Claude, ChatGPT, Adobe) are the real official marks
(official geometry/colors, from brand assets / simple-icons CC0).

## Development

```bash
bun install
bun run dev        # http://localhost:3000 (site + /admin portal)
bun run lint       # ESLint
```

One-time migration scripts:

```bash
bun run seed:storage                         # upload db/uploads/* to the media bucket
bun scripts/legacy/gen-supabase-seed.ts      # (already done) regenerate supabase/migration.sql from the old SQLite db
```
