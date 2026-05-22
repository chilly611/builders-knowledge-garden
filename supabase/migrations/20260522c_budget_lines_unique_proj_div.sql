-- BUDGET-WRITE round-3 (2026-05-22): support idempotent upsert on
-- project_budget_lines by (project_id, csi_division). PATCH /api/v1/budget
-- relies on this index to UPDATE-on-conflict instead of INSERT-duplicates.
--
-- Partial WHERE clause keeps any legacy rows with NULL csi_division (none
-- in prod today, but the column is nullable in older snapshots) eligible
-- for insert without violating the constraint.
CREATE UNIQUE INDEX IF NOT EXISTS project_budget_lines_proj_div_idx
  ON public.project_budget_lines (project_id, csi_division)
  WHERE csi_division IS NOT NULL;

-- Soft-deprecate the JSONB write path. BUDGET-WRITE round-3 finished
-- consolidating writes onto project_budget_lines; project_budgets is
-- read-only legacy. Do NOT drop — 34 prod rows still carry pre-fix
-- user edits that need a backfill job before removal.
COMMENT ON COLUMN public.command_center_projects.project_budgets IS
  'DEPRECATED 2026-05-22 — canonical store is project_budget_lines. '
  'Read-only legacy column. 34 rows carry pre-consolidation edits '
  'pending a backfill job. Do not write here.';

-- Warn (via NOTICE in a DO block) when non-empty JSONB exists in prod so a
-- future migration knows there's data to backfill before dropping the
-- column. Idempotent: just inspects, never mutates.
DO $$
DECLARE
  legacy_rows int;
BEGIN
  SELECT count(*) INTO legacy_rows
  FROM public.command_center_projects
  WHERE project_budgets IS NOT NULL
    AND project_budgets::text NOT IN ('null','{}','[]');
  IF legacy_rows > 0 THEN
    RAISE NOTICE 'project_budgets JSONB still holds % non-empty rows — backfill into project_budget_lines before dropping.', legacy_rows;
  END IF;
END
$$;
