-- 2026-05-29 (MLP-Owner build)
-- Seed the Marin canonical demo owner's Lane membership so the Owner Lane home
-- at /killerapp/projects/55730cd3-... resolves a real Lane (and the
-- /api/owner-home Lens checks return `permitted` instead of fail-closed-empty).
--
-- COMMITTED, NOT APPLIED via MCP. Stream D owns the canonical demo seed
-- (20260528_marin_demo_canonical.sql), which today seeds ONLY
-- command_center_projects — it does NOT seed project_members or
-- project_lane_memberships. This file fills that gap for the Owner. Fold it
-- into Stream D's canonical seed (or apply standalone) once reviewed.
--
-- Identities (both already exist in the live DB):
--   project_id  55730cd3-5225-493d-8b5c-49086d942565  (Modern Farmhouse in Marin)
--   owner user  5be41a72-d417-4aa3-ad23-24f17615044c  (chillyd@gmail.com — the
--               founder dogfooder; see 20260528_marin_owner_chilly_auth_fix.sql)
--
-- Idempotent: both inserts no-op on re-run.

-- 1. project_members — drives WHICH home renders (LaneRouter / useUserLane reads
--    project_members.project_role; 'owner' → OwnerHomeClient).
INSERT INTO public.project_members (project_id, user_id, project_role)
VALUES (
  '55730cd3-5225-493d-8b5c-49086d942565',
  '5be41a72-d417-4aa3-ad23-24f17615044c',
  'owner'
)
ON CONFLICT (project_id, user_id, project_role) DO NOTHING;

-- 2. project_lane_memberships — drives WHICH data cells are visible
--    (checkLensPermission resolves the owner lane → the shipped 9×11×6 matrix).
INSERT INTO public.project_lane_memberships (project_id, user_id, lane_id)
SELECT
  '55730cd3-5225-493d-8b5c-49086d942565',
  '5be41a72-d417-4aa3-ad23-24f17615044c',
  l.id
FROM public.lanes l
WHERE l.slug = 'owner'
  AND NOT EXISTS (
    SELECT 1 FROM public.project_lane_memberships m
    WHERE m.project_id = '55730cd3-5225-493d-8b5c-49086d942565'
      AND m.user_id    = '5be41a72-d417-4aa3-ad23-24f17615044c'
      AND m.lane_id    = l.id
      AND m.revoked_at IS NULL
  );

-- ── DECISION REQUIRED (do not enable without product/legal sign-off) ─────────
-- The Owner "Add to your file" composer (FieldLog) writes via
-- /api/owner-home/contribute, gated on photos_field_logs/create. The shipped
-- Lens matrix (20260528_lanes_lens_permission_matrix.sql) grants the owner lane
-- photos_field_logs VIEW + EXPORT only — NOT create. So for a real owner the
-- composer is correctly DISABLED (canContribute=false, fail-closed), even though
-- the SA3 design shows it. To let THIS owner contribute without changing the
-- global matrix, uncomment the per-membership override below (overrides win in
-- check-permission). Otherwise, the matrix itself must grant owner create.
--
-- UPDATE public.project_lane_memberships
-- SET custom_lens_overrides = '{"photos_field_logs":{"create":true}}'::jsonb
-- WHERE project_id = '55730cd3-5225-493d-8b5c-49086d942565'
--   AND user_id    = '5be41a72-d417-4aa3-ad23-24f17615044c'
--   AND revoked_at IS NULL;
