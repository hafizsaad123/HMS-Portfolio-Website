-- ═══════════════════════════════════════════════════════════════════════════
--  SAAD PORTFOLIO — SUPABASE SCHEMA
--  Backend: Supabase (Postgres + Auth + Storage)
--  Frontend: Next.js on Vercel (src/) — talks to these tables via supabase-js
--
--  HOW TO INSTALL (one time):
--    1. Open https://supabase.com/dashboard → your project
--    2. SQL Editor → "New query"
--    3. Paste ALL of supabase/migration.sql (schema + seed data) → Run
--    4. Create the admin login in the DASHBOARD (not SQL — see the
--       "ADMIN AUTH USER" section at the bottom of this file):
--         Authentication → Users → Add user → admin@saad.design / saad2026
--         with ✅ Auto Confirm User
--
--  WHAT THIS CREATES:
--    • Tables (snake_case) mirroring the app's content model
--    • Row Level Security:
--        - content tables → public can SELECT, only signed-in admin can write
--        - revisions      → admin only
--    • Storage bucket "media" (public read, admin write, 70 MB/file)
--    • Seed data exported from the previous SQLite database (no content lost)
--    • (The admin Auth user is created via the dashboard — never via SQL)
--
--  The Supabase Table Editor then works as a ready-made "auto-admin UI"
--  on top of the same data the Next.js admin portal uses.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ════════════════════════════════════════════════════════════════
--  TABLES
-- ════════════════════════════════════════════════════════════════

-- Site-wide identity + contact details (single row, id = 1)
create table if not exists public.site_config (
  id             integer primary key default 1 check (id = 1),
  name           text    not null,
  role           text    not null,
  bio_lead       text    not null default '',
  bio            text    not null default '',
  email          text    not null default '',
  location       text    not null default '',
  resume_url     text,                             -- null → "not available" notice
  open_to_work   boolean not null default true,
  avatar_path    text    not null default '/images/profile.png',
  portrait_path  text    not null default '/images/portrait.png',
  signature_path text    not null default '/images/signature.png',
  artwork_path   text    not null default '/images/mazar.png',
  updated_at     timestamptz not null default now()
);
comment on table public.site_config is 'Site identity — single row (id=1). Public read, admin write.';

-- Page texts (key → value)
create table if not exists public.text_blocks (
  key   text primary key,
  value text not null default ''
);
comment on table public.text_blocks is 'Page text overrides — key like "about.p1". Missing keys fall back to app defaults.';

-- Projects (work page + case studies)
create table if not exists public.projects (
  id                text primary key default gen_random_uuid()::text,  -- keeps legacy cuid ids
  slug              text not null unique,
  title             text not null,
  short_description text not null default '',
  role              text not null default '',
  category          text not null default '',
  cover             text not null default '',     -- /images/... | /api/media/... | storage URL
  period            text not null default '',     -- display: "Dec 2025 - Present"
  start             text not null default '2025-01',  -- sort key YYYY-MM
  end_month         text,                              -- YYYY-MM, null = ongoing
  services_json     jsonb not null default '[]'::jsonb, -- string[] of services
  url               text,                              -- external link, null → in-page viewer
  featured          boolean not null default false,
  sort_order        integer not null default 0,
  home_tile         text not null default 'square',    -- square | landscape
  show_on_home      boolean not null default true,
  content_json      jsonb not null default '[]'::jsonb, -- legacy case-study blocks
  content_doc       text   not null default '',        -- TipTap JSON document (takes precedence)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
comment on table public.projects is 'Portfolio projects + case studies. Order = sort_order asc, created_at asc.';
create index if not exists projects_sort_order_idx on public.projects (sort_order, created_at);

-- Work experience timeline
create table if not exists public.experience (
  id         text primary key default gen_random_uuid()::text,
  company    text not null,
  role       text not null,
  period     text not null default '',
  mark_id    text not null default 'novelops',  -- geometric mark id (CompanyMark)
  url        text,                              -- company site, null → plain text
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Social links
create table if not exists public.social_links (
  id         text primary key default gen_random_uuid()::text,
  label      text not null,
  url        text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Tools row (About page)
create table if not exists public.tools (
  id         text primary key default gen_random_uuid()::text,
  label      text not null,
  mark_id    text not null default 'figma',  -- figma | claude | chatgpt | adobe
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Skills web (About page)
create table if not exists public.skills (
  id         text primary key default gen_random_uuid()::text,
  label      text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Services diagram nodes (12 in reading order; '' = solid/unlabeled)
create table if not exists public.services (
  id         text primary key default gen_random_uuid()::text,
  label      text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Media library metadata (files live in the "media" storage bucket)
create table if not exists public.media_assets (
  id            text primary key default gen_random_uuid()::text,
  filename      text not null unique,   -- storage object name (uuid.ext)
  url           text not null,          -- servable URL (storage public URL or /api/media/...)
  original_name text not null default '',
  mime          text not null default 'image/png',
  size          integer not null default 0,
  width         integer,
  height        integer,
  alt           text,
  created_at    timestamptz not null default now()
);
comment on table public.media_assets is 'Media library — one row per uploaded file in the "media" storage bucket.';

-- Revision history — automatic snapshot before/after every admin change
create table if not exists public.revisions (
  id         bigint primary key generated by default as identity,
  label      text not null,
  data       jsonb not null,
  created_at timestamptz not null default now()
);
comment on table public.revisions is 'Automatic content snapshots (newest 50 kept). Admin-only access.';

-- ════════════════════════════════════════════════════════════════
--  updated_at TRIGGERS
-- ════════════════════════════════════════════════════════════════

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists site_config_set_updated_at on public.site_config;
create trigger site_config_set_updated_at
  before update on public.site_config
  for each row execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ════════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
--  public (anon)  → read the content that renders the site
--  authenticated  → the signed-in admin: full write access
-- ════════════════════════════════════════════════════════════════

alter table public.site_config   enable row level security;
alter table public.text_blocks   enable row level security;
alter table public.projects      enable row level security;
alter table public.experience    enable row level security;
alter table public.social_links  enable row level security;
alter table public.tools         enable row level security;
alter table public.skills        enable row level security;
alter table public.services      enable row level security;
alter table public.media_assets  enable row level security;
alter table public.revisions     enable row level security;

-- ——— public-read + admin-write tables ———
do $$
declare
  t text;
begin
  foreach t in array array[
    'site_config', 'text_blocks', 'projects', 'experience',
    'social_links', 'tools', 'skills', 'services', 'media_assets'
  ]
  loop
    execute format('drop policy if exists "%s_public_read" on public.%I', t, t);
    execute format('create policy "%s_public_read" on public.%I for select using (true)', t, t);

    execute format('drop policy if exists "%s_admin_insert" on public.%I', t, t);
    execute format('create policy "%s_admin_insert" on public.%I for insert to authenticated with check (true)', t, t);

    execute format('drop policy if exists "%s_admin_update" on public.%I', t, t);
    execute format('create policy "%s_admin_update" on public.%I for update to authenticated using (true) with check (true)', t, t);

    execute format('drop policy if exists "%s_admin_delete" on public.%I', t, t);
    execute format('create policy "%s_admin_delete" on public.%I for delete to authenticated using (true)', t, t);
  end loop;
end;
$$;

-- ——— revisions: admin only ———
drop policy if exists "revisions_admin_read"   on public.revisions;
drop policy if exists "revisions_admin_insert" on public.revisions;
drop policy if exists "revisions_admin_delete" on public.revisions;
create policy "revisions_admin_read"   on public.revisions for select to authenticated using (true);
create policy "revisions_admin_insert" on public.revisions for insert to authenticated with check (true);
create policy "revisions_admin_delete" on public.revisions for delete to authenticated using (true);

-- ════════════════════════════════════════════════════════════════
--  STORAGE — public bucket "media" (admin uploads)
-- ════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', true, 73400320)  -- 70 MB (case-study videos)
on conflict (id) do update
  set public = true,
      file_size_limit = 73400320;

drop policy if exists "media_public_read"   on storage.objects;
drop policy if exists "media_admin_insert"  on storage.objects;
drop policy if exists "media_admin_update"  on storage.objects;
drop policy if exists "media_admin_delete"  on storage.objects;

create policy "media_public_read"  on storage.objects for select using (bucket_id = 'media');
create policy "media_admin_insert" on storage.objects for insert to authenticated with check (bucket_id = 'media');
create policy "media_admin_update" on storage.objects for update to authenticated using (bucket_id = 'media') with check (bucket_id = 'media');
create policy "media_admin_delete" on storage.objects for delete to authenticated using (bucket_id = 'media');

-- ════════════════════════════════════════════════════════════════
--  ADMIN AUTH USER — create in the DASHBOARD, never via SQL
--
--  Current Supabase rejects SQL-forged auth.users rows: the auth
--  service (GoTrue) can't read them, and sign-in fails with
--  "Database error querying schema". There is no supported way to
--  INSERT a working user with plain SQL anymore.
--
--  ONE TIME, in the dashboard:
--    1. Authentication → Users → Add user → "Create new user"
--    2. Email:    admin@saad.design
--       Password: saad2026
--    3. ✅ Auto Confirm User   ← must be checked
--    4. Create user
--
--  Sign in at /admin/login with those credentials. Change the
--  password any time in Admin → Settings (which uses the proper
--  Supabase Auth API under the hood).
-- ════════════════════════════════════════════════════════════════
