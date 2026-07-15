-- 2026-06-11 — RLS Group B lockdown: close the 14-table public RLS exposure on
-- the SHARED knowledge-gardens-prod instance (project vlezoyalutexenbnzzui).
--
-- ⚠️  FOUNDER-GATED — DO NOT AUTO-APPLY. Touches ANOTHER garden's tables
--     (Toxicology/EWG) + a second app's `knex` migrator on a SHARED instance.
--     Apply MANUALLY via the Supabase SQL editor against vlezoyalutexenbnzzui
--     ONLY after the owning garden signs off and after running the companion
--     pre-flight (docs/rkg/20260611_rls_group_b_preflight.sql). Do NOT rely on
--     `supabase db push` — this repo's migration history diverges from prod.
--
-- CONTEXT
--   The 2026-06-11 Supabase security advisor re-flagged the 14 tables that the
--   2026-05-31 Group A lockdown deliberately LEFT UNTOUCHED ("GROUP B … pending
--   the owning garden's sign-off"). All 14 have `rls_disabled_in_public`: with
--   RLS off, anyone holding the public anon key can read AND write every row.
--
--   This migration is the Group B sign-off path. It is POLICY-FIRST: it never
--   enables RLS without simultaneously restoring read access, so the consumers
--   that read these tables via the anon client keep working:
--     • the Toxicology/EWG website          (anon SELECT)
--     • the Orchids website                  (anon SELECT)
--     • the RKG `tkg` MCP garden             (anon SELECT — src/lib/mcp/gardens/tkg.ts)
--   while anon/authenticated INSERT/UPDATE/DELETE is blocked everywhere.
--
-- THE TWO TABLE CLASSES
--   (A) 12 DATA tables — public reference toxicology data, no owner column.
--       → ENABLE RLS + permissive `SELECT … USING (true)` for anon+authenticated
--         (reads preserved) + `service_role ALL` (ingestion preserved). Writes by
--         anon/authenticated are denied (no write policy => deny by default).
--   (B) 2 knex framework tables (knex_migrations, knex_migrations_lock) — a
--       different app's migrator bookkeeping. No reason for ANY public access.
--       → ENABLE RLS with NO anon/authenticated policy AND REVOKE the table
--         grants from anon/authenticated => fully locked to the public API.
--
-- WHY THIS DOES NOT BREAK INGESTION
--   The Toxicology/Orchids data is loaded out-of-band: either by the `knex`
--   migrator over a DIRECT Postgres connection as the table OWNER (RLS is not
--   enforced for the owning role — we do NOT use FORCE ROW LEVEL SECURITY), or
--   by a server using the service_role key (Supabase service_role bypasses RLS,
--   and the `service_role ALL` policy is a belt-and-suspenders backstop). Anon
--   writes — the actual vulnerability — are the only thing removed.
--
-- WHY THIS DOES NOT BREAK READS (incl. PostgREST resource embedding)
--   tkg.ts embeds child tables, e.g. substance_classifications → classifications,
--   substance_health_effects → health_effects, substance_sources →
--   source_documents. Embedding runs a SELECT on the embedded table subject to
--   its OWN RLS policy, so BOTH parent and child get `USING (true)`. The table
--   GRANTs that expose these relations to PostgREST are untouched.
--
-- IDEMPOTENT: ENABLE RLS is a no-op if already on; every policy is dropped before
--   create; REVOKE is a no-op if already revoked. Safe to re-run.
--
-- ROLLBACK (returns to the prior INSECURE state — not recommended):
--   ALTER TABLE public.<t> DISABLE ROW LEVEL SECURITY;          -- per data table
--   DROP POLICY IF EXISTS "tox_b_public_select" ON public.<t>;
--   DROP POLICY IF EXISTS "tox_b_service_role_all" ON public.<t>;
--   -- knex tables, to restore public access (do NOT):
--   GRANT SELECT, INSERT, UPDATE, DELETE ON public.knex_migrations,
--     public.knex_migrations_lock TO anon, authenticated;
--   ALTER TABLE public.knex_migrations DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.knex_migrations_lock DISABLE ROW LEVEL SECURITY;
--
-- NOTE — OUT OF SCOPE BUT ADJACENT: tkg.ts also reads `ewg_contaminants`, which
--   the advisor did NOT flag in this batch (presumably already RLS-enabled with a
--   read policy, otherwise its reads would already fail). It is intentionally NOT
--   touched here. If a later lockdown enables RLS on ewg_contaminants, give it the
--   SAME anon SELECT policy as below or TKG's is_substance_restricted will break.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- (A) DATA TABLES — public read, no public write. Re-applied per table so the
--     set is auditable line-by-line. Policy names are uniform on purpose.
-- ─────────────────────────────────────────────────────────────────────────────

-- substances — root entity. Read by tkg.ts resolveSubstance() (name/CAS/iupac_name).
ALTER TABLE public.substances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tox_b_service_role_all" ON public.substances;
CREATE POLICY "tox_b_service_role_all" ON public.substances
  FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "tox_b_public_select" ON public.substances;
CREATE POLICY "tox_b_public_select" ON public.substances
  FOR SELECT TO anon, authenticated USING (true);

-- substance_aliases — alias → substance_id resolution (tkg.ts).
ALTER TABLE public.substance_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tox_b_service_role_all" ON public.substance_aliases;
CREATE POLICY "tox_b_service_role_all" ON public.substance_aliases
  FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "tox_b_public_select" ON public.substance_aliases;
CREATE POLICY "tox_b_public_select" ON public.substance_aliases
  FOR SELECT TO anon, authenticated USING (true);

-- classifications — embedded by substance_classifications joins (tkg.ts).
ALTER TABLE public.classifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tox_b_service_role_all" ON public.classifications;
CREATE POLICY "tox_b_service_role_all" ON public.classifications
  FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "tox_b_public_select" ON public.classifications;
CREATE POLICY "tox_b_public_select" ON public.classifications
  FOR SELECT TO anon, authenticated USING (true);

-- substance_classifications — M:N substance↔classification (tkg.ts, both directions).
ALTER TABLE public.substance_classifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tox_b_service_role_all" ON public.substance_classifications;
CREATE POLICY "tox_b_service_role_all" ON public.substance_classifications
  FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "tox_b_public_select" ON public.substance_classifications;
CREATE POLICY "tox_b_public_select" ON public.substance_classifications
  FOR SELECT TO anon, authenticated USING (true);

-- health_effects — embedded by substance_health_effects joins (tkg.ts).
ALTER TABLE public.health_effects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tox_b_service_role_all" ON public.health_effects;
CREATE POLICY "tox_b_service_role_all" ON public.health_effects
  FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "tox_b_public_select" ON public.health_effects;
CREATE POLICY "tox_b_public_select" ON public.health_effects
  FOR SELECT TO anon, authenticated USING (true);

-- substance_health_effects — M:N substance↔effect w/ evidence_level (tkg.ts).
ALTER TABLE public.substance_health_effects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tox_b_service_role_all" ON public.substance_health_effects;
CREATE POLICY "tox_b_service_role_all" ON public.substance_health_effects
  FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "tox_b_public_select" ON public.substance_health_effects;
CREATE POLICY "tox_b_public_select" ON public.substance_health_effects
  FOR SELECT TO anon, authenticated USING (true);

-- regulatory_limits — agency limits keyed by substance_id (tkg.ts).
ALTER TABLE public.regulatory_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tox_b_service_role_all" ON public.regulatory_limits;
CREATE POLICY "tox_b_service_role_all" ON public.regulatory_limits
  FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "tox_b_public_select" ON public.regulatory_limits;
CREATE POLICY "tox_b_public_select" ON public.regulatory_limits
  FOR SELECT TO anon, authenticated USING (true);

-- exposure_routes — reference table (Toxicology/Orchids sites; not read by tkg.ts).
ALTER TABLE public.exposure_routes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tox_b_service_role_all" ON public.exposure_routes;
CREATE POLICY "tox_b_service_role_all" ON public.exposure_routes
  FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "tox_b_public_select" ON public.exposure_routes;
CREATE POLICY "tox_b_public_select" ON public.exposure_routes
  FOR SELECT TO anon, authenticated USING (true);

-- substance_exposures — M:N substance↔route (Toxicology/Orchids sites).
ALTER TABLE public.substance_exposures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tox_b_service_role_all" ON public.substance_exposures;
CREATE POLICY "tox_b_service_role_all" ON public.substance_exposures
  FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "tox_b_public_select" ON public.substance_exposures;
CREATE POLICY "tox_b_public_select" ON public.substance_exposures
  FOR SELECT TO anon, authenticated USING (true);

-- water_data — EWG water measurements (Toxicology/Orchids sites).
ALTER TABLE public.water_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tox_b_service_role_all" ON public.water_data;
CREATE POLICY "tox_b_service_role_all" ON public.water_data
  FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "tox_b_public_select" ON public.water_data;
CREATE POLICY "tox_b_public_select" ON public.water_data
  FOR SELECT TO anon, authenticated USING (true);

-- source_documents — citations. Read by tkg.ts BOTH embedded (via
-- substance_sources) AND directly (content_text ilike free-text search).
ALTER TABLE public.source_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tox_b_service_role_all" ON public.source_documents;
CREATE POLICY "tox_b_service_role_all" ON public.source_documents
  FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "tox_b_public_select" ON public.source_documents;
CREATE POLICY "tox_b_public_select" ON public.source_documents
  FOR SELECT TO anon, authenticated USING (true);

-- substance_sources — M:N substance↔source_document (tkg.ts embed).
ALTER TABLE public.substance_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tox_b_service_role_all" ON public.substance_sources;
CREATE POLICY "tox_b_service_role_all" ON public.substance_sources
  FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "tox_b_public_select" ON public.substance_sources;
CREATE POLICY "tox_b_public_select" ON public.substance_sources
  FOR SELECT TO anon, authenticated USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- (B) KNEX FRAMEWORK TABLES — no public access at all.
--     RLS on (deny-by-default for anon/authenticated) AND grants revoked so the
--     tables disappear from the public PostgREST surface entirely. The knex
--     migrator connects as the table OWNER over a direct Postgres connection and
--     is unaffected by either RLS or these REVOKEs.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.knex_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knex_migrations_lock ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policy => deny by default.
REVOKE ALL ON public.knex_migrations      FROM anon, authenticated;
REVOKE ALL ON public.knex_migrations_lock FROM anon, authenticated;

COMMIT;

-- POST-APPLY EXPECTATION (verify via the pre-flight companion, anon role):
--   • SELECT on every (A) table  → succeeds (rows returned).
--   • INSERT/UPDATE/DELETE on any (A) table as anon → 0 rows / RLS error.
--   • SELECT/INSERT on knex_migrations* as anon → permission denied.
--   • Toxicology site, Orchids site, RKG tkg tools → unchanged (read-only).
