-- 2026-05-31 — RLS Group A lockdown: close the 21-table public RLS exposure on
-- the SHARED knowledge-gardens-prod instance (project vlezoyalutexenbnzzui).
--
-- CONTEXT
--   The 2026-05-30 Supabase security advisor flagged 21 public tables with
--   `rls_disabled_in_public` on this instance. The instance is SHARED across the
--   Builder's (BKG), Toxicology/EWG and other gardens, plus a second app that
--   manages its own schema via `knex`. Enabling RLS with no policy LOCKS a
--   table, so this migration is POLICY-FIRST and scoped to BKG-owned tables ONLY.
--
--   Classification (signed off 2026-05-31):
--     GROUP A (this migration — 7 tables) — BKG-owned user / PII / telemetry.
--     GROUP B (NOT TOUCHED — 14 tables) — other-garden / foreign-framework:
--        substances, substance_aliases, substance_classifications,
--        substance_exposures, substance_health_effects, substance_sources,
--        exposure_routes, health_effects, regulatory_limits, classifications,
--        source_documents, water_data            (Toxicology/EWG dataset), plus
--        knex_migrations, knex_migrations_lock    (a different app's migrator).
--        Owned and written by other gardens' apps; enabling RLS here could break
--        their ingestion writes. Left as-is pending the owning garden's sign-off.
--     GROUP C (0 tables) — no BKG-owned public reference data among the 21, so
--        there is NO blanket "anon can SELECT" enable in this migration.
--
-- MODEL (consistent with 20260522_secauth_rls_lockdown + lens_permission_matrix)
--   - service_role bypasses RLS; all server /api/v1/* writes use the service key,
--     so a `service_role ALL` policy keeps every existing write path working.
--   - Row-owned tables: authenticated users may SELECT only their own rows.
--   - crm_contact_activities is project-scoped through its parent crm_contacts,
--     mirroring the established crm_contacts policy (owner + demo allowlist +
--     demo_project_id JWT claim).
--   - specialist_runs / improvement_ledger have no owner column and are accessed
--     only via the service key (verified: /api/v1/rsi/specialist-runs/route.ts
--     and lib/rsi/synth.ts both use SUPABASE_SERVICE_ROLE_KEY), so they are
--     service-role-only — invisible to anon/authenticated over direct REST.
--
-- IDEMPOTENT: ENABLE RLS is a no-op if already on; every policy is dropped
--   before create. Safe to re-run.

BEGIN;

-- ── user_achievements — user-owned (user_id uuid) ──
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ua_service_role_all" ON public.user_achievements;
CREATE POLICY "ua_service_role_all" ON public.user_achievements
  FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "ua_owner_select" ON public.user_achievements;
CREATE POLICY "ua_owner_select" ON public.user_achievements
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ── user_progress — user-owned (user_id uuid) ──
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "up_service_role_all" ON public.user_progress;
CREATE POLICY "up_service_role_all" ON public.user_progress
  FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "up_owner_select" ON public.user_progress;
CREATE POLICY "up_owner_select" ON public.user_progress
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ── daily_briefings — user-owned (user_id uuid) ──
ALTER TABLE public.daily_briefings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "db_service_role_all" ON public.daily_briefings;
CREATE POLICY "db_service_role_all" ON public.daily_briefings
  FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "db_owner_select" ON public.daily_briefings;
CREATE POLICY "db_owner_select" ON public.daily_briefings
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ── crm_voice_fingerprint — user-owned (user_id TEXT; sensitive voice data) ──
ALTER TABLE public.crm_voice_fingerprint ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cvf_service_role_all" ON public.crm_voice_fingerprint;
CREATE POLICY "cvf_service_role_all" ON public.crm_voice_fingerprint
  FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "cvf_owner_select" ON public.crm_voice_fingerprint;
CREATE POLICY "cvf_owner_select" ON public.crm_voice_fingerprint
  FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);

-- ── crm_contact_activities — project-scoped via parent crm_contacts (PII) ──
ALTER TABLE public.crm_contact_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cca_service_role_all" ON public.crm_contact_activities;
CREATE POLICY "cca_service_role_all" ON public.crm_contact_activities
  FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "cca_project_scoped_select" ON public.crm_contact_activities;
CREATE POLICY "cca_project_scoped_select" ON public.crm_contact_activities
  FOR SELECT TO authenticated
  USING (
    contact_id IN (
      SELECT c.id FROM public.crm_contacts c
      WHERE c.project_id IN (
              SELECT id::text FROM public.command_center_projects
              WHERE user_id = (auth.uid())::text
            )
         OR c.project_id IN (
              '55730cd3-5225-493d-8b5c-49086d942565',
              'aa11b22c-1111-4d78-aaaa-bbccdd112233',
              'bb22c33d-2222-4d78-bbbb-ccddee223344'
            )
         OR c.project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
    )
  );

-- ── specialist_runs — AI run telemetry, no owner column → service-role only ──
ALTER TABLE public.specialist_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sr_service_role_all" ON public.specialist_runs;
CREATE POLICY "sr_service_role_all" ON public.specialist_runs
  FOR ALL USING (auth.role() = 'service_role');

-- ── improvement_ledger — RSI ops metrics, no owner column → service-role only ──
ALTER TABLE public.improvement_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "il_service_role_all" ON public.improvement_ledger;
CREATE POLICY "il_service_role_all" ON public.improvement_ledger
  FOR ALL USING (auth.role() = 'service_role');

COMMIT;

-- ===== ROLLBACK (manual — uncomment and run to undo) =====
-- BEGIN;
-- DROP POLICY IF EXISTS "ua_owner_select"            ON public.user_achievements;
-- DROP POLICY IF EXISTS "ua_service_role_all"        ON public.user_achievements;
-- DROP POLICY IF EXISTS "up_owner_select"            ON public.user_progress;
-- DROP POLICY IF EXISTS "up_service_role_all"        ON public.user_progress;
-- DROP POLICY IF EXISTS "db_owner_select"            ON public.daily_briefings;
-- DROP POLICY IF EXISTS "db_service_role_all"        ON public.daily_briefings;
-- DROP POLICY IF EXISTS "cvf_owner_select"           ON public.crm_voice_fingerprint;
-- DROP POLICY IF EXISTS "cvf_service_role_all"       ON public.crm_voice_fingerprint;
-- DROP POLICY IF EXISTS "cca_project_scoped_select"  ON public.crm_contact_activities;
-- DROP POLICY IF EXISTS "cca_service_role_all"       ON public.crm_contact_activities;
-- DROP POLICY IF EXISTS "sr_service_role_all"        ON public.specialist_runs;
-- DROP POLICY IF EXISTS "il_service_role_all"        ON public.improvement_ledger;
-- ALTER TABLE public.user_achievements      DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.user_progress          DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.daily_briefings        DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.crm_voice_fingerprint  DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.crm_contact_activities DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.specialist_runs        DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.improvement_ledger     DISABLE ROW LEVEL SECURITY;
-- COMMIT;
