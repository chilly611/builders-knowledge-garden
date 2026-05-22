-- 2026-05-22 — Sec+Auth Burn 6: lock down the seven catastrophically open
-- RLS surfaces flagged in the 2026-05-21 audit.
--
-- Current state (verified via pg_policies + pg_class on 2026-05-22):
--   - project_budget_lines     : RLS=on,  policy "Allow all for now" (qual=true, with_check=true)
--   - project_rfis             : RLS=on,  policy "Allow all for now" (qual=true)
--   - project_change_orders    : RLS=on,  policy "Allow all for now" (qual=true)
--   - project_punch_items      : RLS=on,  policy "Allow all for now" (qual=true)
--   - project_submittals       : RLS=on,  policy "Allow all for now" (qual=true)
--   - command_center_projects  : RLS=on,  policy "allow_all_projects"  (qual=true)
--   - crm_contacts             : RLS=OFF (no policies)
--   - crm_messages             : RLS=OFF (no policies)
--
-- Schema notes (also verified 2026-05-22, inlined here so future readers
-- can audit without round-tripping):
--   command_center_projects.user_id   :: text   (NOT uuid)
--   command_center_projects.id        :: uuid
--   project_budget_lines.project_id   :: text
--   project_rfis.project_id           :: text
--   project_change_orders.project_id  :: text
--   project_punch_items.project_id    :: text
--   project_submittals.project_id     :: text
--   crm_contacts.project_id           :: text
--   crm_messages.project_id           :: text
--
-- Because `command_center_projects.user_id` is TEXT we must cast
-- auth.uid()::text. The seeded data also uses text user_ids that may
-- not be valid uuids (legacy migration), so casting the other direction
-- would lose rows. Tested with: SELECT user_id FROM
-- command_center_projects LIMIT 5; — all are valid uuid-shaped strings,
-- but typed as text.
--
-- Service-role bypass: the Postgres role `service_role` bypasses RLS by
-- default, so our /api/v1/* server routes (which use SUPABASE_SERVICE_
-- ROLE_KEY) continue to work unchanged. These policies are the second
-- line of defense for direct REST traffic using the anon key that's
-- shipped in the client bundle.
--
-- Demo allowlist: the three seeded demo projects are readable+writable
-- by any authed user (matches the 2026-05-20 demo allowlist in
-- /api/v1/projects/route.ts so trial accounts can drive the demo).
-- These ids are inlined as a SQL CTE-style constant to avoid a
-- second migration step. Long-term replacement is an
-- `is_demo_project boolean` flag column.
--
-- demo_project_id grant: trial-contractor accounts are stamped with
-- user_metadata.demo_project_id at seed time. We pull that through the
-- JWT (auth.jwt() -> 'user_metadata' ->> 'demo_project_id') and grant
-- read+write when it matches the project_id. The JWT is signed by
-- Supabase so the client can't forge it.

BEGIN;

-- ─── command_center_projects ───
-- Lift the blanket "allow all" policy and replace with owner + demo
-- allowlist + demo_project_id read paths.

DROP POLICY IF EXISTS "allow_all_projects" ON public.command_center_projects;

-- Authenticated owner: full CRUD on rows where user_id matches their auth uid.
CREATE POLICY "ccp_owner_all"
  ON public.command_center_projects
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (user_id = (auth.uid())::text)
  WITH CHECK (user_id = (auth.uid())::text);

-- Demo allowlist: any authed user may SELECT the three seeded demo projects.
-- Writes (INSERT/UPDATE/DELETE) on demo rows are gated below by the
-- demo_project_id JWT claim instead.
CREATE POLICY "ccp_demo_select"
  ON public.command_center_projects
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      '55730cd3-5225-493d-8b5c-49086d942565'::uuid,  -- Marin farmhouse
      'aa11b22c-1111-4d78-aaaa-bbccdd112233'::uuid,  -- ADU in Sausalito
      'bb22c33d-2222-4d78-bbbb-ccddee223344'::uuid   -- Commercial TI in SoMa
    )
  );

-- demo_project_id grant: trial users may SELECT + UPDATE the demo project
-- pinned to their metadata. Mirrors getCallerDemoProjectId() in
-- /api/v1/projects/route.ts.
CREATE POLICY "ccp_demo_metadata_select"
  ON public.command_center_projects
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    id::text = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
  );

CREATE POLICY "ccp_demo_metadata_update"
  ON public.command_center_projects
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (
    id::text = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
  )
  WITH CHECK (
    id::text = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
  );

-- ─── project_budget_lines / project_rfis / project_change_orders /
--     project_punch_items / project_submittals ───
-- All five share the same shape: project_id text references
-- command_center_projects.id. Single policy template per table.

-- Helper: a project_id is "accessible to the caller" iff
--   (a) command_center_projects.user_id matches their uid, OR
--   (b) project_id is in the demo allowlist, OR
--   (c) project_id matches their JWT user_metadata.demo_project_id.
-- Implemented inline per-table because we can't define a SQL function
-- without bumping permissions; the inlined predicate keeps RLS plans
-- short and lets Postgres push the user_id check into the index.

DROP POLICY IF EXISTS "Allow all for now" ON public.project_budget_lines;
CREATE POLICY "pbl_scoped_all"
  ON public.project_budget_lines
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id::text FROM public.command_center_projects
      WHERE user_id = (auth.uid())::text
    )
    OR project_id IN (
      '55730cd3-5225-493d-8b5c-49086d942565',
      'aa11b22c-1111-4d78-aaaa-bbccdd112233',
      'bb22c33d-2222-4d78-bbbb-ccddee223344'
    )
    OR project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
  )
  WITH CHECK (
    project_id IN (
      SELECT id::text FROM public.command_center_projects
      WHERE user_id = (auth.uid())::text
    )
    OR project_id IN (
      '55730cd3-5225-493d-8b5c-49086d942565',
      'aa11b22c-1111-4d78-aaaa-bbccdd112233',
      'bb22c33d-2222-4d78-bbbb-ccddee223344'
    )
    OR project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
  );

DROP POLICY IF EXISTS "Allow all for now" ON public.project_rfis;
CREATE POLICY "prf_scoped_all"
  ON public.project_rfis
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id::text FROM public.command_center_projects
      WHERE user_id = (auth.uid())::text
    )
    OR project_id IN (
      '55730cd3-5225-493d-8b5c-49086d942565',
      'aa11b22c-1111-4d78-aaaa-bbccdd112233',
      'bb22c33d-2222-4d78-bbbb-ccddee223344'
    )
    OR project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
  )
  WITH CHECK (
    project_id IN (
      SELECT id::text FROM public.command_center_projects
      WHERE user_id = (auth.uid())::text
    )
    OR project_id IN (
      '55730cd3-5225-493d-8b5c-49086d942565',
      'aa11b22c-1111-4d78-aaaa-bbccdd112233',
      'bb22c33d-2222-4d78-bbbb-ccddee223344'
    )
    OR project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
  );

DROP POLICY IF EXISTS "Allow all for now" ON public.project_change_orders;
CREATE POLICY "pco_scoped_all"
  ON public.project_change_orders
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id::text FROM public.command_center_projects
      WHERE user_id = (auth.uid())::text
    )
    OR project_id IN (
      '55730cd3-5225-493d-8b5c-49086d942565',
      'aa11b22c-1111-4d78-aaaa-bbccdd112233',
      'bb22c33d-2222-4d78-bbbb-ccddee223344'
    )
    OR project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
  )
  WITH CHECK (
    project_id IN (
      SELECT id::text FROM public.command_center_projects
      WHERE user_id = (auth.uid())::text
    )
    OR project_id IN (
      '55730cd3-5225-493d-8b5c-49086d942565',
      'aa11b22c-1111-4d78-aaaa-bbccdd112233',
      'bb22c33d-2222-4d78-bbbb-ccddee223344'
    )
    OR project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
  );

DROP POLICY IF EXISTS "Allow all for now" ON public.project_punch_items;
CREATE POLICY "ppi_scoped_all"
  ON public.project_punch_items
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id::text FROM public.command_center_projects
      WHERE user_id = (auth.uid())::text
    )
    OR project_id IN (
      '55730cd3-5225-493d-8b5c-49086d942565',
      'aa11b22c-1111-4d78-aaaa-bbccdd112233',
      'bb22c33d-2222-4d78-bbbb-ccddee223344'
    )
    OR project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
  )
  WITH CHECK (
    project_id IN (
      SELECT id::text FROM public.command_center_projects
      WHERE user_id = (auth.uid())::text
    )
    OR project_id IN (
      '55730cd3-5225-493d-8b5c-49086d942565',
      'aa11b22c-1111-4d78-aaaa-bbccdd112233',
      'bb22c33d-2222-4d78-bbbb-ccddee223344'
    )
    OR project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
  );

DROP POLICY IF EXISTS "Allow all for now" ON public.project_submittals;
CREATE POLICY "psb_scoped_all"
  ON public.project_submittals
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id::text FROM public.command_center_projects
      WHERE user_id = (auth.uid())::text
    )
    OR project_id IN (
      '55730cd3-5225-493d-8b5c-49086d942565',
      'aa11b22c-1111-4d78-aaaa-bbccdd112233',
      'bb22c33d-2222-4d78-bbbb-ccddee223344'
    )
    OR project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
  )
  WITH CHECK (
    project_id IN (
      SELECT id::text FROM public.command_center_projects
      WHERE user_id = (auth.uid())::text
    )
    OR project_id IN (
      '55730cd3-5225-493d-8b5c-49086d942565',
      'aa11b22c-1111-4d78-aaaa-bbccdd112233',
      'bb22c33d-2222-4d78-bbbb-ccddee223344'
    )
    OR project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
  );

-- ─── crm_contacts ───
-- 2026-05-22: RLS is currently DISABLED on this table — a P0 finding.
-- Enable RLS and apply the same project-scoped policy.

ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;

-- crm_contacts.project_id is nullable in the schema, so we accept rows
-- where it is NULL only when the org_id is also NULL (per-user-only
-- leads — currently used by the WhoIsAskingClient capture flow). The
-- safest interpretation: NULL project_id rows are NOT readable to
-- anyone via RLS; admin code must use the service-role client. This
-- mirrors how /api/v1/crm/capture/route.ts already operates.
CREATE POLICY "crm_contacts_scoped_all"
  ON public.crm_contacts
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    project_id IS NOT NULL
    AND (
      project_id IN (
        SELECT id::text FROM public.command_center_projects
        WHERE user_id = (auth.uid())::text
      )
      OR project_id IN (
        '55730cd3-5225-493d-8b5c-49086d942565',
        'aa11b22c-1111-4d78-aaaa-bbccdd112233',
        'bb22c33d-2222-4d78-bbbb-ccddee223344'
      )
      OR project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
    )
  )
  WITH CHECK (
    project_id IS NOT NULL
    AND (
      project_id IN (
        SELECT id::text FROM public.command_center_projects
        WHERE user_id = (auth.uid())::text
      )
      OR project_id IN (
        '55730cd3-5225-493d-8b5c-49086d942565',
        'aa11b22c-1111-4d78-aaaa-bbccdd112233',
        'bb22c33d-2222-4d78-bbbb-ccddee223344'
      )
      OR project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
    )
  );

-- ─── crm_messages ───
-- Same shape as crm_contacts. Also currently RLS=OFF.

ALTER TABLE public.crm_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_messages_scoped_all"
  ON public.crm_messages
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    project_id IS NOT NULL
    AND (
      project_id IN (
        SELECT id::text FROM public.command_center_projects
        WHERE user_id = (auth.uid())::text
      )
      OR project_id IN (
        '55730cd3-5225-493d-8b5c-49086d942565',
        'aa11b22c-1111-4d78-aaaa-bbccdd112233',
        'bb22c33d-2222-4d78-bbbb-ccddee223344'
      )
      OR project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
    )
  )
  WITH CHECK (
    project_id IS NOT NULL
    AND (
      project_id IN (
        SELECT id::text FROM public.command_center_projects
        WHERE user_id = (auth.uid())::text
      )
      OR project_id IN (
        '55730cd3-5225-493d-8b5c-49086d942565',
        'aa11b22c-1111-4d78-aaaa-bbccdd112233',
        'bb22c33d-2222-4d78-bbbb-ccddee223344'
      )
      OR project_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'demo_project_id', '')
    )
  );

COMMIT;
