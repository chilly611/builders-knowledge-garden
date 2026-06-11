-- 2026-06-11 — P0 close: invited-collaborator grants on command_center_projects
--
-- ⚠️ NOT YET APPLIED TO PROD (knowledge-gardens-prod / vlezoyalutexenbnzzui).
--    Shared instance — apply deliberately (MCP apply_migration or SQL editor)
--    after founder/Chilly sign-off. Additive PERMISSIVE policies only; revert
--    is DROP POLICY of the two names below.
--
-- WHY: the 20260522_secauth_rls_lockdown left command_center_projects with
-- owner-only writes (ccp_owner_all) plus demo SELECT carve-outs. Invited
-- collaborators (project_members) had NO grant at this layer, so any direct
-- anon-key write by a collaborator silently matched 0 rows ("saves dropped
-- under RLS" — the original P0). The primary fix is API-level: the /api/v1
-- routes use the service role and assertProjectWriteAccess now honors
-- project_members (src/lib/auth/projectOwnership.ts, 2026-06-11). These
-- policies are the defense-in-depth backstop for direct PostgREST traffic —
-- e.g. the sub-bid clients (SubBidSubmitClient/SubBidInboxClient) write
-- command_center_projects straight from the browser.
--
-- SEMANTICS: membership = any project_members row for (project, user), any
-- role, no accepted_at filter — identical to the live UI (ProjectContext)
-- and to assertProjectReadAccess. Role-granular write rules belong to the
-- lens_permission_matrix layer, not RLS.
--
-- NOTE: the EXISTS subquery runs under the caller's role, so it is itself
-- subject to project_members RLS. That works because project_members lets
-- users read their OWN rows — exactly the rows these policies need.
--
-- IDEMPOTENT: safe to re-run.

BEGIN;

-- Members can read projects they belong to.
DROP POLICY IF EXISTS "ccp_member_select" ON public.command_center_projects;
CREATE POLICY "ccp_member_select"
  ON public.command_center_projects
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = command_center_projects.id::text
        AND pm.user_id = auth.uid()
    )
  );

-- Members can update projects they belong to. WITH CHECK repeats the same
-- predicate so an update cannot move a row out from under the membership
-- (user_id reassignment is already stripped at the API layer).
DROP POLICY IF EXISTS "ccp_member_update" ON public.command_center_projects;
CREATE POLICY "ccp_member_update"
  ON public.command_center_projects
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = command_center_projects.id::text
        AND pm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = command_center_projects.id::text
        AND pm.user_id = auth.uid()
    )
  );

COMMIT;
