-- ══════════════════════════════════════════════════════════════════════════
--  DESIGN UPDATE — matches the live content to the approved portfolio
--  designs (home + work exports, Nov 2026).
--
--  Run ONCE in: Supabase dashboard → SQL Editor → paste ALL of this → Run.
--  Idempotent: safe to run again (it just rewrites the same rows).
--
--  What it changes:
--    • site_config  — new bio (lead: "Brand and UI/UX Designer")
--    • tools        — 7 tools exactly as in the design chips
--    • skills       — 8 skills exactly as in the design chips
--    • experience   — design chip order + "NovelOPS" label
--
--  NOTE — until this runs, the site code already serves the same approved
--  design content automatically (a "design-baseline guard" in
--  src/lib/content.ts detects the pre-redesign seed rows and falls back
--  to the canonical defaults). Running this SQL ADOPTS the content into
--  the database — after that the admin panel is the single source of
--  truth again and every admin edit shows live.
-- ══════════════════════════════════════════════════════════════════════════

begin;

-- ——— 1 · site_config — bio (lead is bold + dotted-underlined on the site) ———
update public.site_config
set bio_lead = 'Brand and UI/UX Designer',
    bio      = 'who runs the entire design and marketing function of a multi-company group as a solo designer. Over the past year I have delivered brand identities, SaaS landing pages, product UI/UX, ad creatives, video, and social campaigns across **6+ company brands**, working strategy first with a documented brand discovery and positioning process. I design work that looks premium, explains clearly, and converts.',
    updated_at = now()
where id = 1;

-- ——— 2 · tools — 7 rows, exact design order (id is text: readable ids) ———
delete from public.tools;
insert into public.tools (id, label, mark_id, sort_order, created_at) values
  ('tool-figma',        'Figma',              'figma',        1, now()),
  ('tool-photoshop',    'Adobe Photoshop',    'photoshop',    2, now()),
  ('tool-illustrator',  'Adobe Illustrator',  'illustrator',  3, now()),
  ('tool-premier',      'Adobe Premier Pro',  'premier-pro',  4, now()),
  ('tool-chatgpt',      'ChatGPT',            'chatgpt',      5, now()),
  ('tool-claude',       'Claude',             'claude',       6, now()),
  ('tool-gemini',       'Gemini',             'gemini',       7, now());

-- ——— 3 · skills — 8 rows, exact design order ———
delete from public.skills;
insert into public.skills (id, label, sort_order, created_at) values
  ('skill-01', 'UI/UX Design',            1, now()),
  ('skill-02', 'Creative Graphic Design', 2, now()),
  ('skill-03', 'Brand Strategy',          3, now()),
  ('skill-04', 'AI Assisted Frontend Dev', 4, now()),
  ('skill-05', 'Video Editing',           5, now()),
  ('skill-06', 'Web Design',              6, now()),
  ('skill-07', 'Brand Identity',          7, now()),
  ('skill-08', 'Logo Design',             8, now());

-- ——— 4 · experience — design chip order + cleaner labels ———
update public.experience set company = 'NovelOPS',      sort_order = 1 where mark_id = 'novelops';
update public.experience set company = 'Uplynk.pk',     sort_order = 2 where mark_id = 'uplynk-pk';
update public.experience set company = 'Count3',        sort_order = 3 where mark_id = 'count3';
update public.experience set company = 'SimulationsX',  sort_order = 4 where mark_id = 'simulationsx';
update public.experience set company = 'Surplus Pakistan', sort_order = 5 where mark_id = 'surplus-pakistan';
update public.experience set company = 'AI Matterz',    sort_order = 6 where mark_id = 'ai-matterz';

commit;

-- Done. Hard-refresh the site (Ctrl+Shift+R) — the new content is live
-- instantly; no redeploy needed (the site reads Supabase on every request).
