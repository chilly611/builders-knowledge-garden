-- Tier 1 workflow-state columns (Project Spine v1, Wave 2)
-- Date: 2026-05-06
--
-- Wires q8 permit-applications, q15 daily-log, q11 supply-ordering
-- into the Project Spine. Each workflow now gets its own JSONB column
-- on command_center_projects, mirroring the v1 pattern (estimating_state,
-- code_compliance_state, contracts_state).
--
-- Idempotent. Safe to re-run.

ALTER TABLE command_center_projects
  ADD COLUMN IF NOT EXISTS permits_state jsonb DEFAULT '{}'::jsonb;

ALTER TABLE command_center_projects
  ADD COLUMN IF NOT EXISTS daily_log_state jsonb DEFAULT '{}'::jsonb;

ALTER TABLE command_center_projects
  ADD COLUMN IF NOT EXISTS supply_ordering_state jsonb DEFAULT '{}'::jsonb;
