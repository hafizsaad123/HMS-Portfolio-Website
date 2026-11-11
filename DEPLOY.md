# Deploy Guide — GitHub → Vercel → Live

This repo is production-ready. Three steps and you're live.

---

## ⚠️ Read this first — there is NO index.html / build folder (by design)

This is a **full-stack Next.js app**, not a static website. There is nothing
to build locally and no `index.html` + `assets` folder to create. The admin
portal, login, database content, and media uploads all **require a server**,
which is exactly what Vercel provides.

```
push source to GitHub  →  import to Vercel  →  Vercel builds it automatically
                                              (generates the HTML, assets,
                                               and serverless functions)
```

- **Do NOT** push `node_modules/` (gitignored — Vercel installs packages
  itself from `package.json` + `bun.lock` during the build).
- **Do NOT** upload the ZIP file itself to GitHub — extract it first.
- Everything needed to build and run is already in this repo.

---

## Step 1 — Push to GitHub

### Option A · GitHub Desktop (easiest)

1. Extract this ZIP anywhere.
2. Open [GitHub Desktop](https://desktop.github.com) → **File → Add Local Repository**
   → select the extracted folder → **create a new repository**
   → name it `saad-portfolio` → **Publish repository** (keep it ☑ private).

### Option B · Terminal

Create an empty repo on github.com first (**New repository** → name `saad-portfolio`
→ **do NOT** add a README → Create). Then:

```bash
cd saad-portfolio
git init
git add .
git commit -m "Saad portfolio — Next.js + Supabase"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/saad-portfolio.git
git push -u origin main
```

> ⚠️ The GitHub **web** uploader caps at 100 files per drag and this project has
> 210+ files — use Option A or B instead.

---

## Step 2 — Import to Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → import `saad-portfolio`.
   Framework is auto-detected (Next.js) — no build settings needed.
2. Open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://fztseosuiapjwfulwdik.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_KQasbVngJ7qWva192oj57A_cvUjXbyM` |

3. **Deploy** (~2 min). Every future `git push` auto-deploys.

---

## Step 3 — Create the admin login (Supabase, one time)

> **Required.** SQL-created auth users do NOT work on current Supabase —
> the user must be created through the dashboard.

1. Supabase dashboard → **Authentication → Users**
   - Delete `admin@saad.design` if it exists (a broken SQL-forged row may remain)
   - Delete `probe-test-user@saad.design` if it exists
2. **Add user → Create new user**:
   - Email: `admin@saad.design`
   - Password: `saad2026`
   - ☑ **Auto Confirm User** ← must be checked
3. Sign in at `https://YOUR-DEPLOYMENT.vercel.app/admin/login`
   and change the password in **Settings**.

---

## Step 4 — Google Search Console (already wired in)

The Google verification file ships in this repo at
`public/google4d712eaef69a4461.html`, so it is served at the site root
the moment this project is deployed — nothing to download or copy.

1. Deploy (Step 2) — then confirm the file is live:
   `https://hafiz-m-saad.vercel.app/google4d712eaef69a4461.html`
2. Back in Search Console, click **VERIFY** — it turns green instantly.
3. Search Console → **Sitemaps** → enter `sitemap.xml` → **Submit**.
   (The sitemap lists every page + case study automatically.)
4. To stay verified, don't remove the file — it lives in `public/` in this
   repo, so every future deploy keeps verification alive automatically.

---

## Verify everything

| Check | Expected |
|---|---|
| `https://…vercel.app/` | Portfolio renders with live Supabase content |
| `/work` | 7 projects (Uplynk, AI Matterz, Surplus, NovelOPS, Count3, SimulationsX, Freelance) |
| `/admin` without login | Redirects to `/admin/login` |
| `/admin/login` with credentials | Enters the admin portal |
| Admin → change something | Instantly live on the site |

---

## Local development

```bash
bun install          # or npm install
cp .env.example .env.local
bun run dev          # http://localhost:3000
```

Database/seed status (already done — nothing to redo):

- ✅ All 10 tables + RLS + `media` bucket created (`supabase/migration.sql`)
- ✅ Full content migrated (7 projects, texts, experience, socials, tools, skills, services)
- ⬜ Optional: `bun scripts/seed-supabase-storage.ts` copies the 13 legacy
  `db/uploads` files into Supabase Storage (not required — Vercel serves them
  from the bundle via `/api/media/...`).

## Troubleshooting

| Symptom | Fix |
|---|---|
| Login error: **"Database error querying schema"** (500) | The admin user was created with SQL — GoTrue can't read it. In Supabase → **Authentication → Users**: delete the broken `admin@saad.design` row, then **Add user** to re-create it (tick **Auto Confirm User**). |
| Deploy fails with "Invalid NEXT_PUBLIC_SUPABASE_URL" | Env vars missing in Vercel → add both → **Redeploy** |
| Login says invalid credentials | Step 3 not done, or "Auto Confirm" wasn't checked — recreate the user |
| Images broken on Vercel | Redeploy once (env vars added after first deploy need a rebuild) |
| Media upload fails in admin | Check browser console for the exact Storage error; bucket `media` must exist (created by the migration) |
