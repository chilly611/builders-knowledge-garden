-- JSONB-DROP-V2 (2026-05-24): drop the retired
-- `command_center_projects.project_budgets` JSONB column + the write-blocking
-- trigger installed during the 2026-05-23 retirement pass.
--
-- Why now: round-5 retirement comment scheduled the drop for 2026-06-30 as a
-- 5-week rollback window. The orchestrator confirmed (a) no live writers
-- (BudgetClient + EstimatingClient + budget-spine all moved to
-- `/api/v1/budget` PATCH on project_budget_lines), (b) the only non-empty row
-- was already backfilled in 20260523, (c) the 1 lagging consumer
-- (`/api/v1/budget/items/`) 500s in prod and is being deleted in the same
-- commit. The retirement window is no longer earning its cost — every read
-- of the column returns `{}` or `{"lines": []}`, and the trigger is the only
-- reason this column needs an explicit DROP rather than benign neglect.
--
-- Safe order: drop the trigger FIRST so the DROP COLUMN doesn't trip on a
-- trigger function whose body references the column.

BEGIN;

DROP TRIGGER IF EXISTS block_legacy_project_budgets_write_trg ON public.command_center_projects;
DROP FUNCTION IF EXISTS public.block_legacy_project_budgets_write();

ALTER TABLE public.command_center_projects DROP COLUMN IF EXISTS project_budgets;

DO $$
DECLARE col_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'command_center_projects'
      AND column_name  = 'project_budgets'
  ) INTO col_exists;
  IF col_exists THEN
    RAISE EXCEPTION 'drop failed — project_budgets still present on command_center_projects';
  END IF;
  RAISE NOTICE 'project_budgets column dropped';
END $$;

COMMIT;
