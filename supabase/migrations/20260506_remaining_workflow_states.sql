-- Remaining workflow-state columns (Project Spine v1, Wave 3)
-- Date: 2026-05-06 (afternoon)
--
-- Wires the remaining 11 LIVE workflows (q6, q7, q9, q10, q12, q13, q14,
-- q16, q17, q18, q19) into Project Spine v1. Each gets its own JSONB
-- column on command_center_projects, mirroring v1 + Wave 2 pattern.
--
-- After this lands, Project Spine context travels across all 17 LIVE
-- workflows — no more landmines on user clicks.
--
-- Idempotent. Safe to re-run.

ALTER TABLE command_center_projects ADD COLUMN IF NOT EXISTS job_sequencing_state jsonb DEFAULT '{}'::jsonb;
ALTER TABLE command_center_projects ADD COLUMN IF NOT EXISTS worker_count_state jsonb DEFAULT '{}'::jsonb;
ALTER TABLE command_center_projects ADD COLUMN IF NOT EXISTS sub_management_state jsonb DEFAULT '{}'::jsonb;
ALTER TABLE command_center_projects ADD COLUMN IF NOT EXISTS equipment_state jsonb DEFAULT '{}'::jsonb;
ALTER TABLE command_center_projects ADD COLUMN IF NOT EXISTS services_todos_state jsonb DEFAULT '{}'::jsonb;
ALTER TABLE command_center_projects ADD COLUMN IF NOT EXISTS hiring_state jsonb DEFAULT '{}'::jsonb;
ALTER TABLE command_center_projects ADD COLUMN IF NOT EXISTS weather_scheduling_state jsonb DEFAULT '{}'::jsonb;
ALTER TABLE command_center_projects ADD COLUMN IF NOT EXISTS osha_toolbox_state jsonb DEFAULT '{}'::jsonb;
ALTER TABLE command_center_projects ADD COLUMN IF NOT EXISTS expenses_state jsonb DEFAULT '{}'::jsonb;
ALTER TABLE command_center_projects ADD COLUMN IF NOT EXISTS outreach_state jsonb DEFAULT '{}'::jsonb;
ALTER TABLE command_center_projects ADD COLUMN IF NOT EXISTS compass_nav_state jsonb DEFAULT '{}'::jsonb;
