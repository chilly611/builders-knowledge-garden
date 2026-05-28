-- 2026-05-28 (auth-repair agent)
-- Reassign the canonical Marin demo project (id 55730cd3-...) from the original
-- seed account (charlie@xrworkers.com, b17df256) to chillyd@gmail.com
-- (5be41a72) so the founder dogfooder owns his own demo project.
--
-- Why: /killerapp/workflows/estimating?project=55730cd3 was rendering an
-- "Unauthorized: you do not own this project" pill at the bottom of the page,
-- thrown by /api/v1/projects/[id]/attachments and /conversations whose
-- assertProjectOwnership helper enforces strict user_id match. Even though
-- read access is granted via the DEMO_PROJECT_IDS allowlist in projects/route.ts
-- and via RLS policy ccp_demo_select, the per-project sub-routes didn't honor
-- either grant.
--
-- The two demo sibling projects (ADU in Sausalito, Commercial TI in SoMa)
-- remain owned by charlie so the trial-account demo flow stays unchanged.
-- Trial accounts that carried Marin in user_metadata.demo_project_id still
-- get write access via the ccp_demo_metadata_update RLS policy + the
-- callerDemoProjectId path in projects/route.ts.
--
-- Applied via Supabase MCP `apply_migration` on 2026-05-28; this file is the
-- repo-side record. Idempotent: re-running is a no-op once user_id matches.
UPDATE command_center_projects
SET user_id = '5be41a72-d417-4aa3-ad23-24f17615044c'
WHERE id = '55730cd3-5225-493d-8b5c-49086d942565'
  AND user_id <> '5be41a72-d417-4aa3-ad23-24f17615044c';
