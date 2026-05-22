-- 20260522f_ccp_metadata.sql
-- PLG-SIGNUP (2026-05-22): add a generic `metadata jsonb` column to
-- `command_center_projects` so the onboarding flow can stamp
-- `metadata.is_first_run = true` on the seeded first project.
--
-- The cockpit (killerapp shell) reads this on load to show the first-run
-- banner / tooltip without polluting any of the workflow-specific jsonb
-- state columns (estimating_state, compass_nav_state, etc.) — those are
-- owned by their respective features and we don't want a cross-cutting
-- "did we welcome them yet?" flag living inside any of them.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS so re-runs are safe.

ALTER TABLE public.command_center_projects
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Partial index for the cockpit first-run banner lookup. The banner only
-- needs to find the user's first_run-flagged project; the index keeps
-- that O(1) instead of scanning the whole table.
CREATE INDEX IF NOT EXISTS ccp_metadata_first_run_idx
  ON public.command_center_projects ((metadata->>'is_first_run'))
  WHERE metadata->>'is_first_run' = 'true';

COMMENT ON COLUMN public.command_center_projects.metadata IS
  'Generic per-project metadata bag. Currently used by PLG-SIGNUP to stamp is_first_run on the seeded first project; freely extensible (no schema lock).';
