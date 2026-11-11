-- ═══════════════════════════════════════════════════════════════════════════
--  SAAD PORTFOLIO — SUPABASE SCHEMA
--  Backend: Supabase (Postgres + Auth + Storage)
--  Frontend: Next.js on Vercel (src/) — talks to these tables via supabase-js
--
--  HOW TO INSTALL (one time):
--    1. Open https://supabase.com/dashboard → your project
--    2. SQL Editor → "New query"
--    3. Paste ALL of this file → Run
--    4. Create the admin login in the DASHBOARD (not SQL — see the
--       "ADMIN AUTH USER" section below):
--         Authentication → Users → Add user → admin@saad.design / saad2026
--         with ✅ Auto Confirm User
--
--  OPTIONAL: the 10 historical revision snapshots from the SQLite era live
--  in supabase/revisions-history.sql — run that afterwards too if you want
--  the old restore points (the portal snapshots every change from now on).
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

-- SEED DATA — exported from the previous SQLite database on 2026-11-10 (idempotent: safe to re-run)
-- ════════════════════════════════════════════════════════════════════════════

-- ——— site_config — 1 row · on conflict (id) do nothing ———
insert into public.site_config
  (id, name, role, bio_lead, bio, email, location, resume_url, open_to_work,
   avatar_path, portrait_path, signature_path, artwork_path, updated_at)
values
  (1, 'Hafiz Muhammad Saad', 'UI/UX Designer & Brand Designer', 'Brand and UI/UX Designer', 'who runs the entire design and marketing function of a multi-company group as a solo designer. Over the past year I have delivered brand identities, SaaS landing pages, product UI/UX, ad creatives, video, and social campaigns across **6+ company brands**, working strategy first with a documented brand discovery and positioning process. I design work that looks premium, explains clearly, and converts.',
   'saad.designs4@gmail.com', 'Karachi, Pakistan', null, true,
   '/images/profile.png', '/images/portrait.png', '/images/signature.png', '/images/mazar.png',
   '2026-10-24T19:21:32.678Z'::timestamptz)
on conflict (id) do nothing;

-- ——— text_blocks — 12 rows · on conflict (key) do nothing ———
insert into public.text_blocks (key, value) values
  ('about.badge', 'Open to Work'),
  ('about.connectLine', 'I Love Connecting With People Around the World.'),
  ('about.experienceHeading', 'Work Experience'),
  ('about.hero.bold', 'Multidisciplinary'),
  ('about.hero.rest', 'designer crafting distinctive digital experiences and brand identities that challenge conventions and stand out.'),
  ('about.metaDescription', 'Multidisciplinary designer crafting distinctive digital experiences and brand identities — about Hafiz Muhammad Saad, UI/UX designer & brand designer based in Karachi, Pakistan.'),
  ('about.p1', 'I’m a multidisciplinary designer passionate about creating digital products and visual identities that bring ideas to life. My work spans UI/UX design, web experiences, and brand identity, combining thoughtful strategy with purposeful visuals.'),
  ('about.p2', 'I believe great design goes beyond aesthetics. It’s about making intentional decisions, challenging the expected, and creating meaningful experiences that people remember.'),
  ('footer.copyright', '2026 Hafiz Muhammad Saad | All Rights Reserved'),
  ('work.heading', 'My Work'),
  ('work.metaDescription', 'Selected projects and design engagements — brand identity, web experiences, UI/UX and visual design work by Hafiz Muhammad Saad.'),
  ('work.subheading', 'See my top insane high quality versatile projects')
on conflict (key) do nothing;

-- ——— projects — 7 rows · 1 insert(s) · on conflict (slug) do nothing ———
insert into public.projects (id, slug, title, short_description, role, category, cover, period, start,
 end_month, services_json, url, featured, sort_order, home_tile, show_on_home,
 content_json, content_doc, created_at, updated_at)
values
  ('cmvmr5ql0002cqugbqe95m3x7', 'uplynk-pk', 'Uplynk.pk', 'Founding designer — web experience & brand design', 'Founding Designer', 'Web & Brand Design', '/images/projects/uplynk-pk.png', 'Oct 2025 - May 2026', '2025-10', '2026-05', '["Web Design","Brand Identity Design"]'::jsonb, null, true, 1, 'landscape', true, '[]'::jsonb, '', '2026-10-24T18:48:55.765Z'::timestamptz, '2026-10-24T18:48:55.765Z'::timestamptz),
  ('cmvmr5ql2002dqugbvdxv3q29', 'ai-matterz', 'AI Matterz', 'Founding designer — brand identity & digital product design', 'Founding Designer', 'Brand & Product Design', '/images/projects/ai-matterz.png', 'Dec 2025 - Present', '2025-12', null, '["Brand Identity Design","UI/UX Design"]'::jsonb, null, true, 2, 'square', true, '[{"id":"b-mvkos7zz-zoycvo","type":"heading","text":"The Story","level":2},{"id":"b-mvkoscrd-26nsi9","type":"paragraph","text":"As **Founding Designer** at AI Matterz I own the brand and the product surface end-to-end — from the [visual identity](https://aimatterz.io) to the interface designers touch every day. The role blends *brand thinking* with hands-on `UI craft`, shipped in tight loops with the founding team."},{"id":"b-mvkot47p-73w9lv","type":"image","src":"/images/projects/ai-matterz.png","alt":"AI Matterz brand mark on the product cover","caption":"The cover artwork from the engagement","width":"wide"},{"id":"b-mvkotg44-inc61p","type":"video","src":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","caption":"A quick tour of the design system"},{"id":"b-mvkotr4c-h7t6vv","type":"button","label":"Visit AI Matterz","url":"https://aimatterz.io","variant":"solid"},{"id":"b-mvkotv9v-9kvcbs","type":"quote","text":"Design is how it works — the brand and the interface are one system.","attribution":"Hafiz Muhammad Saad"},{"id":"b-mvkou087-8q775s","type":"list","style":"bullet","items":["Brand identity system from zero to shipped","Product UI across the core flows","[Design tokens and components](https://aimatterz.io)","Weekly design reviews with the founders"]},{"id":"b-mvkp00pa-clmfyu","type":"divider"}]'::jsonb, '{"type":"doc","content":[{"type":"heading","attrs":{"textAlign":null,"level":2},"content":[{"type":"text","text":"The Story"}]},{"type":"paragraph","attrs":{"textAlign":null},"content":[{"type":"text","text":"As "},{"type":"text","marks":[{"type":"bold"}],"text":"Founding Designer"},{"type":"text","text":" at AI Matterz I own the brand and the product surface end-to-end — from the "},{"type":"text","marks":[{"type":"link","attrs":{"href":"https://aimatterz.io","target":null,"rel":null,"class":null,"title":null}}],"text":"visual identity"},{"type":"text","text":" to the interface designers touch every day. The role blends "},{"type":"text","marks":[{"type":"italic"}],"text":"brand thinking"},{"type":"text","text":" with hands-on "},{"type":"text","marks":[{"type":"code"}],"text":"UI craft"},{"type":"text","text":", shipped in tight loops with the founding team."}]},{"type":"caseImage","attrs":{"src":"/images/projects/ai-matterz.png","alt":"AI Matterz brand mark on the product cover","caption":"The cover artwork from the engagement","width":"wide"}},{"type":"caseVideo","attrs":{"src":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","caption":"A quick tour of the design system"}},{"type":"caseCta","attrs":{"label":"Visit AI Matterz","href":"https://aimatterz.io","variant":"outline"}},{"type":"blockquote","content":[{"type":"paragraph","attrs":{"textAlign":null},"content":[{"type":"text","text":"Design is how it works — the brand and the interface are one system."}]},{"type":"paragraph","attrs":{"textAlign":null},"content":[{"type":"text","marks":[{"type":"italic"}],"text":"— Hafiz Muhammad Saad"}]}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","attrs":{"textAlign":null},"content":[{"type":"text","text":"Brand identity system from zero to shipped"}]}]},{"type":"listItem","content":[{"type":"paragraph","attrs":{"textAlign":null},"content":[{"type":"text","text":"Product UI across the core flows"}]}]},{"type":"listItem","content":[{"type":"paragraph","attrs":{"textAlign":null},"content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"https://aimatterz.io","target":null,"rel":null,"class":null,"title":null}}],"text":"Design tokens and components"}]}]},{"type":"listItem","content":[{"type":"paragraph","attrs":{"textAlign":null},"content":[{"type":"text","text":"Weekly design reviews with the founders"}]}]}]},{"type":"horizontalRule"},{"type":"paragraph","attrs":{"textAlign":null}}]}', '2026-10-24T18:48:55.767Z'::timestamptz, '2026-10-24T18:48:55.767Z'::timestamptz),
  ('cmvmr5ql4002equgbom0ikh4c', 'surplus-pakistan', 'Surplus Pakistan', 'Visual graphic designer — social & brand graphics', 'Visual Graphic Designer', 'Visual & Brand Graphics', '/images/projects/surplus-pakistan.png', 'Oct 2025 - Present', '2025-10', null, '["Social Media Posts","Ad Creatives"]'::jsonb, null, true, 3, 'square', true, '[]'::jsonb, '', '2026-10-24T18:48:55.768Z'::timestamptz, '2026-10-24T18:48:55.768Z'::timestamptz),
  ('cmvmr5ql5002fqugbde959e5p', 'novelops', 'NovelOPS PVT LTD', 'UI/UX designer — product & interface design', 'UI/UX Designer', 'UI/UX Design', '/images/projects/novelops.png', 'Dec 2025 - Present', '2025-12', null, '["UI/UX Design","Web Design"]'::jsonb, null, true, 4, 'square', true, '[]'::jsonb, '', '2026-10-24T18:48:55.769Z'::timestamptz, '2026-10-24T18:48:55.769Z'::timestamptz),
  ('cmvmr5ql5002gqugbg7tovwrj', 'count3', 'Count3', 'Founding designer — product & brand design', 'Founding Designer', 'Product & App Design', '/images/projects/count3.png', 'Oct 2025 - May 2026', '2025-10', '2026-05', '["UI/UX Design","Brand Identity Design"]'::jsonb, null, false, 5, 'landscape', true, '[]'::jsonb, '', '2026-10-24T18:48:55.770Z'::timestamptz, '2026-10-24T18:48:55.770Z'::timestamptz),
  ('cmvmr5ql6002hqugb711nny1z', 'simulationsx', 'SimulationsX', 'Creative graphic designer — ad creatives & social visuals', 'Creative Graphic Designer', 'Creative & Motion Design', '/images/projects/simulationsx.png', 'Oct 2025 - May 2026', '2025-10', '2026-05', '["Ad Creatives","Social Media Posts"]'::jsonb, null, false, 7, 'square', true, '[]'::jsonb, '', '2026-10-24T18:48:55.771Z'::timestamptz, '2026-10-24T18:48:55.771Z'::timestamptz),
  ('cmvmr5ql7002iqugbzuppfg5m', 'freelance', 'Freelance', 'Senior brand designer — brand identity & strategy', 'Senior Brand Designer', 'Brand Identity', '/images/projects/freelance.png', 'Oct 2025 - May 2026', '2025-10', '2026-05', '["Brand Strategy","Brand Identity Design"]'::jsonb, null, false, 8, 'square', true, '[]'::jsonb, '', '2026-10-24T18:48:55.772Z'::timestamptz, '2026-10-24T18:48:55.772Z'::timestamptz)
on conflict (slug) do nothing;

-- ——— experience — 6 rows · inserted only when the table is empty (no unique key) · created_at = now() ———
do $$
begin
  if not exists (select 1 from public.experience) then
    insert into public.experience (id, company, role, period, mark_id, url, sort_order, created_at)
    values
      ('cmvmr5ql8002jqugb5kcdzb7v', 'NovelOPS', 'UI/UX Designer', 'Dec 2025 - Present', 'novelops', 'https://novelops.com.pk/', 1, now()),
      ('cmvmr5ql9002kqugbiwcc45bc', 'Uplynk.pk', 'Founding Designer', 'Oct 2025 - May 2026', 'uplynk-pk', 'https://uplynk.pk/', 2, now()),
      ('cmvmr5qla002lqugbd9z47sz6', 'Count3', 'Founding Designer', 'Oct 2025 - May 2026', 'count3', 'https://count3.pk/', 3, now()),
      ('cmvmr5qlb002mqugbxuhr9v85', 'SimulationsX', 'Creative Graphic Designer', 'Oct 2025 - May 2026', 'simulationsx', 'https://simulationsx.com/', 4, now()),
      ('cmvmr5qlc002nqugb9jwj5q1z', 'Surplus Pakistan', 'Visual Graphic Designer', 'Oct 2025 - Present', 'surplus-pakistan', 'https://surplus.com.pk/', 5, now()),
      ('cmvmr5qld002oqugbhryc9oyn', 'AI Matterz', 'Founding Designer', 'Dec 2025 - Present', 'ai-matterz', 'https://aimatterz.io/', 6, now());
  end if;
end $$;

-- ——— social_links — 3 rows · inserted only when the table is empty (no unique key) · created_at = now() ———
do $$
begin
  if not exists (select 1 from public.social_links) then
    insert into public.social_links (id, label, url, sort_order, created_at)
    values
      ('cmvmr5qle002pqugbevo6bvvy', 'LinkedIn', 'https://www.linkedin.com/in/hafizsaad-design', 1, now()),
      ('cmvmr5qlf002qqugbj8toqqca', 'Instagram', 'https://www.instagram.com/saad.brandarch/', 2, now()),
      ('cmvmr5qlg002rqugb9qjy33tw', 'Behance', 'https://www.behance.net/saadnagorigraphics', 3, now());
  end if;
end $$;

-- ——— tools — 7 rows · inserted only when the table is empty (no unique key) · created_at = now() ———
do $$
begin
  if not exists (select 1 from public.tools) then
    insert into public.tools (id, label, mark_id, sort_order, created_at)
    values
      ('tool-figma', 'Figma', 'figma', 1, now()),
      ('tool-photoshop', 'Adobe Photoshop', 'photoshop', 2, now()),
      ('tool-illustrator', 'Adobe Illustrator', 'illustrator', 3, now()),
      ('tool-premier', 'Adobe Premier Pro', 'premier-pro', 4, now()),
      ('tool-chatgpt', 'ChatGPT', 'chatgpt', 5, now()),
      ('tool-claude', 'Claude', 'claude', 6, now()),
      ('tool-gemini', 'Gemini', 'gemini', 7, now());
  end if;
end $$;

-- ——— skills — 8 rows · inserted only when the table is empty (no unique key) · created_at = now() ———
do $$
begin
  if not exists (select 1 from public.skills) then
    insert into public.skills (id, label, sort_order, created_at)
    values
      ('skill-01', 'UI/UX Design', 1, now()),
      ('skill-02', 'Creative Graphic Design', 2, now()),
      ('skill-03', 'Brand Strategy', 3, now()),
      ('skill-04', 'AI Assisted Frontend Dev', 4, now()),
      ('skill-05', 'Video Editing', 5, now()),
      ('skill-06', 'Web Design', 6, now()),
      ('skill-07', 'Brand Identity', 7, now()),
      ('skill-08', 'Logo Design', 8, now());
  end if;
end $$;

-- ——— services — 12 rows · inserted only when the table is empty (no unique key) · created_at = now() ———
do $$
begin
  if not exists (select 1 from public.services) then
    insert into public.services (id, label, sort_order, created_at)
    values
      ('cmvmr5qlr0032qugbodc9b9e7', 'UI/UX Design', 1, now()),
      ('cmvmr5qlr0033qugbqs6avd0n', 'Brand Identity Design', 2, now()),
      ('cmvmr5qls0034qugbemeuxcwu', '', 3, now()),
      ('cmvmr5qlt0035qugbl2jexpjo', '', 4, now()),
      ('cmvmr5qlu0036qugb0gepwn1x', 'Conversion Focused Landing Pages', 5, now()),
      ('cmvmr5qlu0037qugbhvbt7z4k', 'Social Media Posts', 6, now()),
      ('cmvmr5qlv0038qugbrpo7lpwy', '', 7, now()),
      ('cmvmr5qlw0039qugb6q6k9xq7', 'Web Design', 8, now()),
      ('cmvmr5qlw003aqugb86t3obtl', 'AI Assisted Frontend Dev', 9, now()),
      ('cmvmr5qlx003bqugb0okdqnwq', 'Brand Strategy', 10, now()),
      ('cmvmr5qly003cqugbtqam3kiy', 'Branding Expert', 11, now()),
      ('cmvmr5qlz003dqugbu3pakblk', 'Ad Creatives', 12, now());
  end if;
end $$;

-- ——— media_assets — 4 rows · on conflict (filename) do nothing · urls kept verbatim (/api/media/… keeps working) ———
insert into public.media_assets (id, filename, url, original_name, mime, size, width, height, alt, created_at)
values
  ('cmvkkr25e0000stg3edgfi3m5', '432b88ae-df05-4c8d-bab2-f68b40b16c78.png', '/api/media/432b88ae-df05-4c8d-bab2-f68b40b16c78.png', 'Frame 2147295266.png', 'image/png', 33088, 205, 231, null, '2026-10-23T06:14:00.866Z'::timestamptz),
  ('cmvmpmt9y0000qud2ge3qmzme', '3a04e1d4-60b5-4e56-ad85-1fb700d7d15c.png', '/api/media/3a04e1d4-60b5-4e56-ad85-1fb700d7d15c.png', '3a04e1d4-60b5-4e56-ad85-1fb700d7d15c.png', 'image/png', 19398, null, null, null, '2026-10-24T18:06:13.175Z'::timestamptz),
  ('cmvmpmta00001qud2wdb826u2', '88cde962-750b-4a56-9bfd-f452a87acae1.pdf', '/api/media/88cde962-750b-4a56-9bfd-f452a87acae1.pdf', '88cde962-750b-4a56-9bfd-f452a87acae1.pdf', 'application/pdf', 220, null, null, null, '2026-10-24T18:06:13.176Z'::timestamptz),
  ('cmvmpohiu0014qugby4ydw3bi', '65bc6bed-125d-4644-80fa-e4bcfa27f87d.mp4', '/api/media/65bc6bed-125d-4644-80fa-e4bcfa27f87d.mp4', 'test-video.mp4', 'video/mp4', 30367, null, null, null, '2026-10-24T18:07:31.255Z'::timestamptz)
on conflict (filename) do nothing;
