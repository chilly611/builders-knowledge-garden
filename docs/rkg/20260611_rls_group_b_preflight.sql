-- PRE-FLIGHT + DRY-RUN for 20260611_rls_group_b_toxicology_lockdown.sql
-- Run against the SHARED prod instance vlezoyalutexenbnzzui (Supabase SQL editor).
-- Nothing here is persistent: STEP 3 wraps the real migration in a transaction
-- it ROLLS BACK, exercising the policies as the anon role before you commit the
-- actual migration. Run STEP 1 → 2 → 3 top to bottom.

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 1 — Current state. Expect rls_enabled = false on all 14 (that's the bug).
-- ════════════════════════════════════════════════════════════════════════════
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN (
  'substances','substance_aliases','classifications','substance_classifications',
  'health_effects','substance_health_effects','regulatory_limits','exposure_routes',
  'substance_exposures','water_data','source_documents','substance_sources',
  'knex_migrations','knex_migrations_lock')
ORDER BY c.relname;

-- Which privileges anon/authenticated hold today. This is the exposure: anon
-- almost certainly shows INSERT/UPDATE/DELETE here, which RLS-off makes live.
SELECT table_name, grantee, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privs
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon','authenticated')
  AND table_name IN (
    'substances','substance_aliases','classifications','substance_classifications',
    'health_effects','substance_health_effects','regulatory_limits','exposure_routes',
    'substance_exposures','water_data','source_documents','substance_sources',
    'knex_migrations','knex_migrations_lock')
GROUP BY table_name, grantee
ORDER BY table_name, grantee;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 2 — Baseline reads AS anon, BEFORE the change. Capture these row counts;
-- STEP 3's post-change counts must match (proves reads are preserved).
-- ════════════════════════════════════════════════════════════════════════════
BEGIN;
SET LOCAL ROLE anon;
SELECT 'substances'              AS t, count(*) FROM public.substances
UNION ALL SELECT 'regulatory_limits',          count(*) FROM public.regulatory_limits
UNION ALL SELECT 'substance_classifications',  count(*) FROM public.substance_classifications
UNION ALL SELECT 'classifications',            count(*) FROM public.classifications
UNION ALL SELECT 'substance_health_effects',   count(*) FROM public.substance_health_effects
UNION ALL SELECT 'health_effects',             count(*) FROM public.health_effects
UNION ALL SELECT 'substance_sources',          count(*) FROM public.substance_sources
UNION ALL SELECT 'source_documents',           count(*) FROM public.source_documents
UNION ALL SELECT 'substance_aliases',          count(*) FROM public.substance_aliases;
RESET ROLE;
ROLLBACK;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 3 — DRY RUN. Applies the migration body, exercises it AS anon (the exact
-- access patterns tkg.ts / the websites use), then ROLLS BACK so prod is
-- untouched. If every assertion below passes, the real migration is safe.
-- ════════════════════════════════════════════════════════════════════════════
BEGIN;

-- (A) data tables — RLS on + service_role ALL + public SELECT
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'substances','substance_aliases','classifications','substance_classifications',
    'health_effects','substance_health_effects','regulatory_limits','exposure_routes',
    'substance_exposures','water_data','source_documents','substance_sources']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "tox_b_service_role_all" ON public.%I', t);
    EXECUTE format('CREATE POLICY "tox_b_service_role_all" ON public.%I FOR ALL USING (auth.role() = ''service_role'')', t);
    EXECUTE format('DROP POLICY IF EXISTS "tox_b_public_select" ON public.%I', t);
    EXECUTE format('CREATE POLICY "tox_b_public_select" ON public.%I FOR SELECT TO anon, authenticated USING (true)', t);
  END LOOP;
END $$;

-- (B) knex tables — locked
ALTER TABLE public.knex_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knex_migrations_lock ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.knex_migrations      FROM anon, authenticated;
REVOKE ALL ON public.knex_migrations_lock FROM anon, authenticated;

-- ── ASSERT, as anon ──────────────────────────────────────────────────────────
SET LOCAL ROLE anon;

-- A1. Plain SELECTs still return rows (compare to STEP 2).
SELECT 'A1 substances'        AS check, count(*) FROM public.substances
UNION ALL SELECT 'A1 regulatory_limits', count(*) FROM public.regulatory_limits;

-- A2. PostgREST embedding equivalents — the joins tkg.ts relies on must read
--     through RLS on BOTH sides. Non-zero / no-error = embeds will resolve.
SELECT 'A2 substance_classifications⋈classifications' AS check, count(*)
FROM public.substance_classifications sc JOIN public.classifications c ON c.id = sc.classification_id;
SELECT 'A2 substance_health_effects⋈health_effects' AS check, count(*)
FROM public.substance_health_effects she JOIN public.health_effects he ON he.id = she.health_effect_id;
SELECT 'A2 substance_sources⋈source_documents' AS check, count(*)
FROM public.substance_sources ss JOIN public.source_documents sd ON sd.id = ss.source_document_id;

-- A3. tkg.ts source_documents free-text search shape (content_text ilike).
SELECT 'A3 source_documents ilike' AS check, count(*)
FROM public.source_documents WHERE content_text ILIKE '%water%';

-- A4. anon WRITE must now be REFUSED. Expect: ERROR (RLS / permission).
--     Uncomment ONE at a time to observe the failure, then re-comment.
-- INSERT INTO public.substances (name) VALUES ('__rls_probe__');         -- expect: row-level security violation
-- DELETE FROM public.regulatory_limits WHERE false;                      -- expect: row-level security violation

-- B1. knex tables must be INVISIBLE to anon. Expect: ERROR permission denied.
--     Uncomment to observe, then re-comment.
-- SELECT count(*) FROM public.knex_migrations;                           -- expect: permission denied

RESET ROLE;
ROLLBACK;   -- ← discards everything above. Prod is unchanged.

-- ════════════════════════════════════════════════════════════════════════════
-- INTERPRETATION
--   • STEP 3 A1/A2/A3 counts == STEP 2 counts  → Toxicology site, Orchids site,
--     and RKG tkg (is_substance_restricted / non_toxic_alternatives_for /
--     citation_for_claim) keep reading exactly as before.
--   • A4 + B1 raise errors                      → anon can no longer write data,
--     and knex bookkeeping is off the public API.
--   Only then apply supabase/migrations/20260611_rls_group_b_toxicology_lockdown.sql.
--
--   NOTE: the A2 join column names (classification_id, health_effect_id,
--   source_document_id) and the A3 content_text column reflect tkg.ts usage; if
--   STEP 3 errors on an UNKNOWN COLUMN (not a permission error), fix the column
--   name here only — it does not affect the migration, which touches no columns.
