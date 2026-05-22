-- validate-plg-signup.sql (2026-05-22, PLG-SIGNUP)
-- ================================================
-- Run AFTER a real /signup completes to verify the onboarding flow
-- wrote every row it was supposed to. Replace <USER_EMAIL> with the
-- address the tester signed up with.
--
-- Expected output for a successful onboarding:
--   * 1 row in organizations
--   * 1 row in org_members (role='owner')
--   * 1 row in command_center_projects (metadata.is_first_run = true)
--   * 1 row in project_members (project_role='gc')
--   * 10 rows in project_budget_lines totaling ~$304,000
--   * 1 row in audit_log (table_name='onboarding', action='insert',
--                          new_data->>'source' = 'plg_signup')

WITH u AS (
  SELECT id::text AS user_id_text, id::uuid AS user_id_uuid, email
  FROM auth.users
  WHERE email = '<USER_EMAIL>'
)
SELECT
  (SELECT count(*) FROM organizations o
    JOIN org_members m ON m.org_id = o.id
    WHERE m.user_id = (SELECT user_id_uuid FROM u)
  ) AS orgs_for_user,

  (SELECT count(*) FROM org_members
    WHERE user_id = (SELECT user_id_uuid FROM u) AND role = 'owner'
  ) AS owner_memberships,

  (SELECT count(*) FROM command_center_projects
    WHERE user_id = (SELECT user_id_text FROM u)
      AND metadata->>'is_first_run' = 'true'
  ) AS first_run_projects,

  (SELECT count(*) FROM project_members
    WHERE user_id = (SELECT user_id_uuid FROM u) AND project_role = 'gc'
  ) AS gc_project_memberships,

  (SELECT count(*) FROM project_budget_lines pbl
    JOIN command_center_projects p ON p.id::text = pbl.project_id
    WHERE p.user_id = (SELECT user_id_text FROM u)
      AND p.metadata->>'is_first_run' = 'true'
  ) AS seeded_budget_lines,

  (SELECT coalesce(sum(pbl.budgeted), 0) FROM project_budget_lines pbl
    JOIN command_center_projects p ON p.id::text = pbl.project_id
    WHERE p.user_id = (SELECT user_id_text FROM u)
      AND p.metadata->>'is_first_run' = 'true'
  ) AS seeded_budget_total,

  (SELECT count(*) FROM audit_log
    WHERE table_name = 'onboarding'
      AND action = 'insert'
      AND changed_by = (SELECT user_id_uuid FROM u)
      AND (new_data->>'source') = 'plg_signup'
  ) AS audit_rows;

-- Drill-down: see the seeded budget line items
SELECT pbl.csi_division, pbl.description, pbl.budgeted
FROM project_budget_lines pbl
JOIN command_center_projects p ON p.id::text = pbl.project_id
JOIN auth.users u ON u.id::text = p.user_id
WHERE u.email = '<USER_EMAIL>'
  AND p.metadata->>'is_first_run' = 'true'
ORDER BY pbl.csi_division;
