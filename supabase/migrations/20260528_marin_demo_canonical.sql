-- Marin Farmhouse demo project — canonical row in command_center_projects.
-- ============================================================================
-- The Killer App 7-stage journey is anchored to the Marin demo project (UUID
-- 55730cd3-5225-493d-8b5c-49086d942565, allowlisted in
-- src/app/api/v1/projects/route.ts:DEMO_PROJECT_IDS). The front-end fixture
-- (src/lib/demo/marin-4000.ts) is the canonical source of truth for the
-- numbers; this DB row keeps the API's GET /api/v1/projects/{id} hydration
-- aligned with the fixture so the chrome doesn't show one number while the
-- stages show another.
--
-- Notes on the column mapping:
--   * The schema has no `total_budget`/`spent_to_date`/`committed`/`remaining`
--     columns — only `budget_amount` (numeric). The breakdown is computed by
--     `src/components/killerapp-chrome/marin-adapter.ts` from the fixture's
--     BudgetLine[] (`paid` → spent, `locked-in` + `estimated` → committed,
--     `pending` → remaining). Those numbers are already canonical in the
--     fixture: $312,400 / $186,200 / $1,151,400.
--   * The schema has no `substantial_completion` column. The chrome adapter
--     hardcodes the substantial-completion date. We store the milestone here
--     for any future per-project consumer.
--   * `sqft` is text on this schema; we store the integer-as-text "4000".
--
-- Idempotent UPSERT — re-runnable safely.

INSERT INTO public.command_center_projects (
  id,
  name,
  phase,
  progress,
  budget_amount,
  budget_status,
  risk_level,
  next_milestone,
  milestone_date,
  project_type,
  location,
  client_name,
  jurisdiction,
  start_date,
  sqft,
  created_at,
  updated_at
) VALUES (
  '55730cd3-5225-493d-8b5c-49086d942565',
  'Marin Farmhouse',
  'BUILD',                 -- check constraint: DREAM/DESIGN/PLAN/BUILD/DELIVER/GROW
  42,
  1650000,
  'on-track',              -- check constraint: on-track/over/ahead
  'low',                   -- check constraint: low/medium/high
  'Substantial completion',
  DATE '2026-12-03',
  'Custom farmhouse — 2 story, 4,000 sqft',
  'Marin County, CA',
  'The Harwell Family',
  'Marin County, CA',
  '2026-03-17',
  '4000',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phase = EXCLUDED.phase,
  progress = EXCLUDED.progress,
  budget_amount = EXCLUDED.budget_amount,
  budget_status = EXCLUDED.budget_status,
  risk_level = EXCLUDED.risk_level,
  next_milestone = EXCLUDED.next_milestone,
  milestone_date = EXCLUDED.milestone_date,
  project_type = EXCLUDED.project_type,
  location = EXCLUDED.location,
  client_name = EXCLUDED.client_name,
  jurisdiction = EXCLUDED.jurisdiction,
  start_date = EXCLUDED.start_date,
  sqft = EXCLUDED.sqft,
  updated_at = now();
