-- 2026-05-28 — Lanes × Lenses data layer
--
-- Introduces three tables that together model WHO (lane) can do WHAT (action)
-- on WHICH data category inside a project:
--
--   public.lanes                  — the 9 canonical project-role archetypes
--   public.project_lane_memberships — maps (project_id, user_id) → lane
--   public.lens_permission_matrix — the full 9×11×6 permission grid
--
-- ABSENCE-IS-DENY CONVENTION:
--   A row in lens_permission_matrix with permitted=FALSE (or the absence of a
--   row entirely) means access is DENIED. Callers must check that a row with
--   permitted=TRUE exists for the (lane, data_category, action) triple; any
--   other result is a hard deny. The seed below is self-healing: it inserts
--   all 594 cells of the grid, setting permitted=true only for the combos
--   listed in the spec — so even if a row is accidentally deleted it will be
--   restored on the next re-run.
--
-- IDEMPOTENCY: every DDL statement uses IF NOT EXISTS; every DML uses
--   ON CONFLICT … DO UPDATE or DO NOTHING, so the migration is safe to re-run.
--
-- NOTE ON project_id: there is NO `projects` table in this database.
--   Projects are referenced by a TEXT identifier (matching project_members).
--   project_id is therefore text NOT NULL with NO foreign key constraint.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. lanes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lanes (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text        NOT NULL,
  slug                 text        NOT NULL UNIQUE,
  default_lens_config  jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- Seed 9 canonical lanes — idempotent via ON CONFLICT (slug)
INSERT INTO public.lanes (name, slug, default_lens_config) VALUES
  ('Owner',              'owner',              '{"description":"Project owner / client"}'::jsonb),
  ('GC',                 'gc',                 '{"description":"General contractor — runs the project"}'::jsonb),
  ('DIY Builder',        'diy-builder',        '{"description":"Owner acting as their own general contractor"}'::jsonb),
  ('Sub',                'sub',                '{"description":"Specialty / sub contractor — own scope"}'::jsonb),
  ('Worker',             'worker',             '{"description":"Crew / day-hire labor"}'::jsonb),
  ('Supplier',           'supplier',           '{"description":"Materials supplier — quotes & delivery"}'::jsonb),
  ('Equipment-Provider', 'equipment-provider', '{"description":"Equipment rental provider"}'::jsonb),
  ('Service-Provider',   'service-provider',   '{"description":"Professional services","subtypes":["architect","structural-engineer","inspector","lender","lawyer","future-buyer"]}'::jsonb),
  ('Robot/AI',           'robot-ai',           '{"description":"AI agent acting on behalf of a user — assistive, non-destructive, no approvals"}'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
  name                = EXCLUDED.name,
  default_lens_config = EXCLUDED.default_lens_config;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. project_lane_memberships
-- ─────────────────────────────────────────────────────────────────────────────

-- NOTE: `subtype` is a small additive extension beyond the originally-specified
-- column list, added so the Service-Provider lane can record the professional
-- sub-classification (Architect/Structural-Engineer/Inspector/Lender/Lawyer/
-- Future-Buyer) at the membership level, keeping it co-located with the lane
-- assignment rather than requiring a separate look-up table.

CREATE TABLE IF NOT EXISTS public.project_lane_memberships (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            text        NOT NULL,
  user_id               uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lane_id               uuid        NOT NULL REFERENCES public.lanes(id) ON DELETE RESTRICT,
  -- subtype is only meaningful for the service-provider lane; carries the
  -- professional subtype so callers can distinguish architect vs. engineer etc.
  subtype               text        NULL
                          CHECK (subtype IS NULL OR subtype IN ('architect','structural-engineer','inspector','lender','lawyer','future-buyer')),
  -- per-membership overrides shape: {"<data_category>":{"<action>":boolean}}
  custom_lens_overrides jsonb       NULL,
  invited_by            uuid        REFERENCES auth.users(id),
  invited_at            timestamptz NOT NULL DEFAULT now(),
  revoked_at            timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_project_lane_memberships_project_user
  ON public.project_lane_memberships (project_id, user_id);

CREATE INDEX IF NOT EXISTS idx_project_lane_memberships_lane
  ON public.project_lane_memberships (lane_id);

-- Only ONE active (non-revoked) lane assignment per (project, user, lane).
-- A user may be re-invited to the same lane after a prior revoke, so the
-- uniqueness constraint is partial (WHERE revoked_at IS NULL only).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_lane_membership
  ON public.project_lane_memberships (project_id, user_id, lane_id)
  WHERE revoked_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. lens_permission_matrix
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lens_permission_matrix (
  lane_id       uuid    NOT NULL REFERENCES public.lanes(id) ON DELETE CASCADE,
  data_category text    NOT NULL
                  CHECK (data_category IN (
                    'project_overview','budget_total','sub_margin','schedule',
                    'documents_contracts','rfis_submittals','change_orders',
                    'bids_estimates','photos_field_logs',
                    'compliance_credentials','team_directory'
                  )),
  action        text    NOT NULL
                  CHECK (action IN ('view','create','edit','delete','approve','export')),
  permitted     boolean NOT NULL DEFAULT false,
  PRIMARY KEY (lane_id, data_category, action)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Seed the full 9 × 11 × 6 = 594-row permission matrix
--
-- ABSENCE-IS-DENY: permitted=true ONLY for the explicit combos in the
-- permitted CTE below; all other cells are inserted as permitted=false.
-- The ON CONFLICT clause makes this self-healing on re-runs.
-- ─────────────────────────────────────────────────────────────────────────────

WITH permitted (slug, cat, act) AS (
  VALUES
    -- ── owner ──────────────────────────────────────────────────────────────
    ('owner','project_overview','view'),
    ('owner','project_overview','export'),
    -- budget_total only — sub_margin is GC-private (Owner x Sub-Margin -> deny)
    ('owner','budget_total','view'),
    ('owner','budget_total','approve'),
    ('owner','budget_total','export'),
    ('owner','schedule','view'),
    ('owner','schedule','export'),
    ('owner','documents_contracts','view'),
    ('owner','documents_contracts','create'),
    ('owner','documents_contracts','edit'),
    ('owner','documents_contracts','approve'),
    ('owner','documents_contracts','export'),
    ('owner','rfis_submittals','view'),
    ('owner','rfis_submittals','approve'),
    ('owner','rfis_submittals','export'),
    ('owner','change_orders','view'),
    ('owner','change_orders','approve'),
    ('owner','change_orders','export'),
    ('owner','bids_estimates','view'),
    ('owner','bids_estimates','approve'),
    ('owner','bids_estimates','export'),
    ('owner','photos_field_logs','view'),
    ('owner','photos_field_logs','export'),
    ('owner','compliance_credentials','view'),
    ('owner','compliance_credentials','export'),
    ('owner','team_directory','view'),
    ('owner','team_directory','create'),
    ('owner','team_directory','edit'),
    ('owner','team_directory','export'),

    -- ── gc ─────────────────────────────────────────────────────────────────
    ('gc','project_overview','view'),
    ('gc','project_overview','create'),
    ('gc','project_overview','edit'),
    ('gc','project_overview','export'),
    ('gc','budget_total','view'),
    ('gc','budget_total','create'),
    ('gc','budget_total','edit'),
    ('gc','budget_total','export'),
    -- sub_margin is GC-private: owner cannot see subcontractor markup
    ('gc','sub_margin','view'),
    ('gc','sub_margin','create'),
    ('gc','sub_margin','edit'),
    ('gc','sub_margin','export'),
    ('gc','schedule','view'),
    ('gc','schedule','create'),
    ('gc','schedule','edit'),
    ('gc','schedule','delete'),
    ('gc','schedule','export'),
    ('gc','documents_contracts','view'),
    ('gc','documents_contracts','create'),
    ('gc','documents_contracts','edit'),
    ('gc','documents_contracts','delete'),
    ('gc','documents_contracts','export'),
    ('gc','rfis_submittals','view'),
    ('gc','rfis_submittals','create'),
    ('gc','rfis_submittals','edit'),
    ('gc','rfis_submittals','approve'),
    ('gc','rfis_submittals','export'),
    ('gc','change_orders','view'),
    ('gc','change_orders','create'),
    ('gc','change_orders','edit'),
    ('gc','change_orders','approve'),
    ('gc','change_orders','export'),
    ('gc','bids_estimates','view'),
    ('gc','bids_estimates','create'),
    ('gc','bids_estimates','edit'),
    ('gc','bids_estimates','approve'),
    ('gc','bids_estimates','export'),
    ('gc','photos_field_logs','view'),
    ('gc','photos_field_logs','create'),
    ('gc','photos_field_logs','edit'),
    ('gc','photos_field_logs','delete'),
    ('gc','photos_field_logs','export'),
    ('gc','compliance_credentials','view'),
    ('gc','compliance_credentials','create'),
    ('gc','compliance_credentials','edit'),
    ('gc','compliance_credentials','export'),
    ('gc','team_directory','view'),
    ('gc','team_directory','create'),
    ('gc','team_directory','edit'),
    ('gc','team_directory','delete'),
    ('gc','team_directory','export'),

    -- ── diy-builder (owner acting as own GC: owner+gc blend, sees all budget) ─
    ('diy-builder','project_overview','view'),
    ('diy-builder','project_overview','create'),
    ('diy-builder','project_overview','edit'),
    ('diy-builder','project_overview','export'),
    ('diy-builder','budget_total','view'),
    ('diy-builder','budget_total','create'),
    ('diy-builder','budget_total','edit'),
    ('diy-builder','budget_total','approve'),
    ('diy-builder','budget_total','export'),
    ('diy-builder','sub_margin','view'),
    ('diy-builder','sub_margin','create'),
    ('diy-builder','sub_margin','edit'),
    ('diy-builder','sub_margin','export'),
    ('diy-builder','schedule','view'),
    ('diy-builder','schedule','create'),
    ('diy-builder','schedule','edit'),
    ('diy-builder','schedule','delete'),
    ('diy-builder','schedule','export'),
    ('diy-builder','documents_contracts','view'),
    ('diy-builder','documents_contracts','create'),
    ('diy-builder','documents_contracts','edit'),
    ('diy-builder','documents_contracts','delete'),
    ('diy-builder','documents_contracts','approve'),
    ('diy-builder','documents_contracts','export'),
    ('diy-builder','rfis_submittals','view'),
    ('diy-builder','rfis_submittals','create'),
    ('diy-builder','rfis_submittals','edit'),
    ('diy-builder','rfis_submittals','approve'),
    ('diy-builder','rfis_submittals','export'),
    ('diy-builder','change_orders','view'),
    ('diy-builder','change_orders','create'),
    ('diy-builder','change_orders','edit'),
    ('diy-builder','change_orders','approve'),
    ('diy-builder','change_orders','export'),
    ('diy-builder','bids_estimates','view'),
    ('diy-builder','bids_estimates','create'),
    ('diy-builder','bids_estimates','edit'),
    ('diy-builder','bids_estimates','approve'),
    ('diy-builder','bids_estimates','export'),
    ('diy-builder','photos_field_logs','view'),
    ('diy-builder','photos_field_logs','create'),
    ('diy-builder','photos_field_logs','edit'),
    ('diy-builder','photos_field_logs','delete'),
    ('diy-builder','photos_field_logs','export'),
    ('diy-builder','compliance_credentials','view'),
    ('diy-builder','compliance_credentials','create'),
    ('diy-builder','compliance_credentials','edit'),
    ('diy-builder','compliance_credentials','export'),
    ('diy-builder','team_directory','view'),
    ('diy-builder','team_directory','create'),
    ('diy-builder','team_directory','edit'),
    ('diy-builder','team_directory','delete'),
    ('diy-builder','team_directory','export'),

    -- ── sub ────────────────────────────────────────────────────────────────
    ('sub','project_overview','view'),
    ('sub','schedule','view'),
    ('sub','documents_contracts','view'),
    ('sub','rfis_submittals','view'),
    ('sub','rfis_submittals','create'),
    ('sub','rfis_submittals','edit'),
    ('sub','change_orders','view'),
    ('sub','change_orders','create'),
    ('sub','bids_estimates','view'),
    ('sub','bids_estimates','create'),
    ('sub','bids_estimates','edit'),
    ('sub','photos_field_logs','view'),
    ('sub','photos_field_logs','create'),
    ('sub','photos_field_logs','edit'),
    ('sub','compliance_credentials','view'),
    ('sub','compliance_credentials','create'),
    ('sub','team_directory','view'),

    -- ── worker ─────────────────────────────────────────────────────────────
    ('worker','project_overview','view'),
    ('worker','schedule','view'),
    ('worker','documents_contracts','view'),
    ('worker','photos_field_logs','view'),
    ('worker','photos_field_logs','create'),
    ('worker','compliance_credentials','view'),
    ('worker','compliance_credentials','create'),

    -- ── supplier ───────────────────────────────────────────────────────────
    ('supplier','project_overview','view'),
    ('supplier','schedule','view'),
    ('supplier','documents_contracts','view'),
    ('supplier','rfis_submittals','view'),
    ('supplier','rfis_submittals','create'),
    ('supplier','bids_estimates','view'),
    ('supplier','bids_estimates','create'),
    ('supplier','bids_estimates','edit'),
    ('supplier','compliance_credentials','view'),
    ('supplier','compliance_credentials','create'),

    -- ── equipment-provider ─────────────────────────────────────────────────
    ('equipment-provider','project_overview','view'),
    ('equipment-provider','schedule','view'),
    ('equipment-provider','documents_contracts','view'),
    ('equipment-provider','rfis_submittals','view'),
    ('equipment-provider','bids_estimates','view'),
    ('equipment-provider','bids_estimates','create'),
    ('equipment-provider','bids_estimates','edit'),
    ('equipment-provider','compliance_credentials','view'),
    ('equipment-provider','compliance_credentials','create'),

    -- ── service-provider ───────────────────────────────────────────────────
    ('service-provider','project_overview','view'),
    ('service-provider','schedule','view'),
    ('service-provider','documents_contracts','view'),
    ('service-provider','documents_contracts','create'),
    ('service-provider','documents_contracts','edit'),
    ('service-provider','rfis_submittals','view'),
    ('service-provider','rfis_submittals','create'),
    ('service-provider','rfis_submittals','edit'),
    ('service-provider','change_orders','view'),
    ('service-provider','compliance_credentials','view'),

    -- ── robot-ai ───────────────────────────────────────────────────────────
    ('robot-ai','project_overview','view'),
    ('robot-ai','project_overview','export'),
    -- budget_total only — Robot/AI never sees GC-private sub_margin
    ('robot-ai','budget_total','view'),
    ('robot-ai','budget_total','export'),
    ('robot-ai','schedule','view'),
    ('robot-ai','schedule','create'),
    ('robot-ai','schedule','edit'),
    ('robot-ai','schedule','export'),
    ('robot-ai','documents_contracts','view'),
    ('robot-ai','documents_contracts','create'),
    ('robot-ai','documents_contracts','export'),
    ('robot-ai','rfis_submittals','view'),
    ('robot-ai','rfis_submittals','create'),
    ('robot-ai','rfis_submittals','export'),
    ('robot-ai','change_orders','view'),
    ('robot-ai','change_orders','export'),
    ('robot-ai','bids_estimates','view'),
    ('robot-ai','bids_estimates','create'),
    ('robot-ai','bids_estimates','export'),
    ('robot-ai','photos_field_logs','view'),
    ('robot-ai','photos_field_logs','create'),
    ('robot-ai','photos_field_logs','export'),
    ('robot-ai','compliance_credentials','view'),
    ('robot-ai','compliance_credentials','export'),
    ('robot-ai','team_directory','view'),
    ('robot-ai','team_directory','export')
),
cats (cat) AS (
  VALUES
    ('project_overview'),
    ('budget_total'),
    ('sub_margin'),
    ('schedule'),
    ('documents_contracts'),
    ('rfis_submittals'),
    ('change_orders'),
    ('bids_estimates'),
    ('photos_field_logs'),
    ('compliance_credentials'),
    ('team_directory')
),
acts (act) AS (
  VALUES
    ('view'),
    ('create'),
    ('edit'),
    ('delete'),
    ('approve'),
    ('export')
)
INSERT INTO public.lens_permission_matrix (lane_id, data_category, action, permitted)
SELECT
  l.id,
  c.cat,
  a.act,
  EXISTS (
    SELECT 1 FROM permitted p
    WHERE p.slug = l.slug
      AND p.cat  = c.cat
      AND p.act  = a.act
  )
FROM public.lanes l
CROSS JOIN cats c
CROSS JOIN acts a
ON CONFLICT (lane_id, data_category, action)
  DO UPDATE SET permitted = EXCLUDED.permitted;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Row-Level Security
-- ─────────────────────────────────────────────────────────────────────────────

-- lanes (reference data — authenticated users may SELECT; service_role has ALL)
ALTER TABLE public.lanes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on lanes" ON public.lanes;
CREATE POLICY "Service role full access on lanes"
  ON public.lanes FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users read lanes" ON public.lanes;
CREATE POLICY "Authenticated users read lanes"
  ON public.lanes FOR SELECT
  USING (auth.role() = 'authenticated');

-- project_lane_memberships
-- (users may read only their own rows; all writes go through service_role)
ALTER TABLE public.project_lane_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on project_lane_memberships" ON public.project_lane_memberships;
CREATE POLICY "Service role full access on project_lane_memberships"
  ON public.project_lane_memberships FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Members read own memberships" ON public.project_lane_memberships;
CREATE POLICY "Members read own memberships"
  ON public.project_lane_memberships FOR SELECT
  USING (user_id = auth.uid());

-- lens_permission_matrix (reference data — authenticated users may SELECT)
ALTER TABLE public.lens_permission_matrix ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on lens_permission_matrix" ON public.lens_permission_matrix;
CREATE POLICY "Service role full access on lens_permission_matrix"
  ON public.lens_permission_matrix FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users read lens_permission_matrix" ON public.lens_permission_matrix;
CREATE POLICY "Authenticated users read lens_permission_matrix"
  ON public.lens_permission_matrix FOR SELECT
  USING (auth.role() = 'authenticated');

COMMIT;

-- ===== ROLLBACK =====
-- To undo this migration, run the following block manually (uncomment and execute):
--
-- BEGIN;
-- DROP TABLE IF EXISTS public.lens_permission_matrix;
-- DROP TABLE IF EXISTS public.project_lane_memberships;
-- DROP TABLE IF EXISTS public.lanes;
-- COMMIT;
