-- 20260616_architectural_style.sql
-- =========================================================================
-- Dream Machine "Choose your direction" — persist the project's chosen
-- architectural design direction.
--
-- The Dream Machine surface (component-fidelity spec §C) lets a project that
-- has not yet chosen a design direction pick one of the staged style cards
-- (mid-century modern / mediterranean / asian-fusion). The pick is the
-- project's `architectural_style` and persists via the EXISTING project-update
-- path (PATCH /api/v1/projects), which spreads `...updates` straight into the
-- row — so this column flows through with NO route code change, and GET's
-- `select('*')` returns it automatically.
--
-- Additive + nullable + idempotent by design (founder grant: "prefer an
-- existing metadata/jsonb field, only add a column if needed (additive +
-- nullable)" — command_center_projects has only workflow-specific *_state
-- jsonb columns, no general metadata bag, so a dedicated nullable column is
-- the clean home). Zero impact on existing rows or queries; NULL = "not yet
-- chosen" → the picker is shown.
--
-- Applied to prod (vlezoyalutexenbnzzui) 2026-06-16 via Supabase apply_migration.

ALTER TABLE public.command_center_projects
  ADD COLUMN IF NOT EXISTS architectural_style text;

COMMENT ON COLUMN public.command_center_projects.architectural_style IS
  'Chosen architectural design direction slug from the Dream Machine "Choose your direction" picker (e.g. midcentury-modern, mediterranean, asian-fusion). NULL = not yet chosen (the picker is shown). Set via PATCH /api/v1/projects.';
