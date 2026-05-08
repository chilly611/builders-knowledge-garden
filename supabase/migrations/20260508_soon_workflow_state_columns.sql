-- SOON workflow state columns (Wave 4)
-- Date: 2026-05-08
--
-- Wires the 10 SOON workflows (q1, q3, q20-q27) into Project Spine v1.
-- Each gets its own JSONB column on command_center_projects, mirroring
-- Wave 2 + Wave 3 pattern.
--
-- Already applied to prod via mcp apply_migration (Wave 4 burn). This
-- file is the canonical record so the migration history stays in repo.
--
-- After this lands, Project Spine context can travel to any of the 10
-- SOON workflows the moment they're wired client-side. q3 (Client
-- Lookup) is the first to ship in this commit; the rest follow.
--
-- Idempotent. Safe to re-run.

ALTER TABLE command_center_projects ADD COLUMN IF NOT EXISTS bid_risk_state jsonb DEFAULT '{}'::jsonb;
ALTER TABLE command_center_projects ADD COLUMN IF NOT EXISTS client_lookup_state jsonb DEFAULT '{}'::jsonb;
ALTER TABLE command_center_projects ADD COLUMN IF NOT EXISTS change_orders_state jsonb DEFAULT '{}'::jsonb;
ALTER TABLE command_center_projects ADD COLUMN IF NOT EXISTS draw_requests_state jsonb DEFAULT '{}'::jsonb;
ALTER TABLE command_center_projects ADD COLUMN IF NOT EXISTS lien_waivers_state jsonb DEFAULT '{}'::jsonb;
ALTER TABLE command_center_projects ADD COLUMN IF NOT EXISTS payroll_check_state jsonb DEFAULT '{}'::jsonb;
ALTER TABLE command_center_projects ADD COLUMN IF NOT EXISTS walk_through_state jsonb DEFAULT '{}'::jsonb;
ALTER TABLE command_center_projects ADD COLUMN IF NOT EXISTS retainage_state jsonb DEFAULT '{}'::jsonb;
ALTER TABLE command_center_projects ADD COLUMN IF NOT EXISTS warranty_state jsonb DEFAULT '{}'::jsonb;
ALTER TABLE command_center_projects ADD COLUMN IF NOT EXISTS project_review_state jsonb DEFAULT '{}'::jsonb;
