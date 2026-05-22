-- JSONB-CLEANUP (2026-05-23): soft-retire command_center_projects.project_budgets.
--
-- Context: BUDGET-WRITE round-3 (2026-05-22, migration 20260522c) consolidated
-- all writes onto project_budget_lines and left the JSONB column as read-only
-- legacy with 34 prod rows still carrying pre-fix user edits. Inventory taken
-- on 2026-05-23 showed:
--   * 34 rows had project_budgets != '{}'::jsonb
--   * 33 of them held project_budgets = '{"lines": []}' (empty arrays — no
--     data to backfill, just rump JSONB from old write attempts)
--   * 1 row (project 7cb274af-1a80-462b-bdfb-ad96e0ae06f6) carried a single
--     stub line `{state:'pending', amount:0, category:'materials', ...}` —
--     no csi_division, no real numbers. Backfilled into project_budget_lines
--     with csi_division = '99-orphan-materials-<line.id>' so the unique
--     (project_id, csi_division) partial index treats it as a one-off.
--   * project_budget_lines went from 49 → 50 rows. Idempotent INSERT used
--     ON CONFLICT (project_id, csi_division) DO NOTHING; re-runs are no-ops.
--
-- This migration:
--   1. Updates the deprecation comment with the drop date.
--   2. Installs a trigger that rejects any UPDATE attempting to write a
--      non-empty `lines` array into project_budgets — prevents regression.
--   3. Does NOT drop the column. Schedule the drop in a follow-up migration
--      no earlier than 2026-06-30 (5-week safety window for rollback).

-- 1. Refresh deprecation comment with the planned drop date.
COMMENT ON COLUMN public.command_center_projects.project_budgets IS
  'DEPRECATED 2026-05-23. Backfilled into project_budget_lines on 2026-05-23 '
  '(see migration 20260523_retire_legacy_project_budgets_jsonb.sql). Read-only '
  'legacy column; writes blocked by block_legacy_project_budgets_write_trg. '
  'Scheduled for DROP no earlier than 2026-06-30. Canonical store: '
  'project_budget_lines. Write path: PATCH /api/v1/budget. See docs/SCHEMA.md.';

-- 2. Trigger function: reject UPDATEs that move a non-empty lines[] into the
-- JSONB column. We intentionally allow:
--   * NEW.project_budgets = OLD.project_budgets (no change — read paths still work)
--   * NEW.project_budgets IS NULL (clearing the column is fine)
--   * NEW.project_budgets = '{}' (clearing is fine)
--   * NEW.project_budgets->'lines' missing or empty array (rump shape we already
--     have on 33 rows; allowing keeps existing UPDATE statements that touch
--     other columns from blowing up just because the JSONB tags along)
-- We DO NOT block INSERTs because every new row's project_budgets starts as
-- NULL/'{}' and the column has no default that would put data there.
CREATE OR REPLACE FUNCTION public.block_legacy_project_budgets_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- No-change updates: cheap path, allow.
  IF NEW.project_budgets IS NOT DISTINCT FROM OLD.project_budgets THEN
    RETURN NEW;
  END IF;

  -- Clearing or empty shapes: allow (lets future migrations zero out the
  -- column without tripping the trigger).
  IF NEW.project_budgets IS NULL
     OR NEW.project_budgets = '{}'::jsonb
     OR NEW.project_budgets = '{"lines": []}'::jsonb THEN
    RETURN NEW;
  END IF;

  -- Anything else with a non-empty lines[] array is a regression.
  IF jsonb_typeof(NEW.project_budgets->'lines') = 'array'
     AND jsonb_array_length(NEW.project_budgets->'lines') > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'command_center_projects.project_budgets is deprecated (2026-05-23).',
      DETAIL  = 'Writes with non-empty lines[] are blocked. Use project_budget_lines.',
      HINT    = 'See docs/SCHEMA.md "Budget — canonical store is project_budget_lines".';
  END IF;

  -- Unknown JSONB shape (no lines key, or lines isn't an array): still block,
  -- since the only legitimate use of this column is the legacy {lines: [...]}
  -- shape and we just established that's frozen.
  RAISE EXCEPTION USING
    ERRCODE = 'P0001',
    MESSAGE = 'command_center_projects.project_budgets is deprecated (2026-05-23).',
    DETAIL  = 'Column is read-only; only NULL or {} writes accepted.',
    HINT    = 'See docs/SCHEMA.md "Budget — canonical store is project_budget_lines".';
END;
$$;

COMMENT ON FUNCTION public.block_legacy_project_budgets_write() IS
  'JSONB-CLEANUP 2026-05-23: rejects UPDATEs that put non-empty data into '
  'the deprecated project_budgets JSONB. Drop alongside the column.';

DROP TRIGGER IF EXISTS block_legacy_project_budgets_write_trg
  ON public.command_center_projects;

CREATE TRIGGER block_legacy_project_budgets_write_trg
  BEFORE UPDATE OF project_budgets ON public.command_center_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.block_legacy_project_budgets_write();

-- 3. Smoke-test the trigger inside the migration so a regression in trigger
-- logic itself fails fast. Uses an existing row + savepoint + rollback so no
-- data is mutated.
DO $$
DECLARE
  test_id uuid;
  caught_block boolean := false;
BEGIN
  SELECT id INTO test_id FROM public.command_center_projects LIMIT 1;
  IF test_id IS NULL THEN
    RAISE NOTICE 'block_legacy_project_budgets_write_trg: no rows to test against, skipping smoke';
    RETURN;
  END IF;

  BEGIN
    UPDATE public.command_center_projects
    SET project_budgets = '{"lines":[{"amount":1,"description":"regression-canary"}]}'::jsonb
    WHERE id = test_id;
    -- If we got here the trigger did not fire — that's a bug.
    RAISE EXCEPTION 'block_legacy_project_budgets_write_trg failed to block a write';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      caught_block := true;
  END;

  IF NOT caught_block THEN
    RAISE EXCEPTION 'block_legacy_project_budgets_write_trg smoke test did not capture a P0001';
  END IF;

  RAISE NOTICE 'block_legacy_project_budgets_write_trg: smoke test passed';
END
$$;
