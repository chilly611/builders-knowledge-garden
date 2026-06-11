/**
 * Builders garden — role model adapter
 * ====================================
 *
 * Satisfies the L2 `RoleModel` contract from BKG's existing construction roles.
 * Wraps `isWorkflowAllowedForLane` (the picker-hygiene gate) so the engine can
 * gate workflow visibility without importing `workflow-roles.ts` directly.
 *
 * `ProjectRole` is a string-literal union; the engine contract is `string`, so
 * the wrapper narrows at the boundary (unknown roles → visible-to-all, matching
 * the default-open contract in workflow-roles.ts).
 */

import { isWorkflowAllowedForLane } from '@/lib/workflow-roles';
import type { ProjectRole } from '@/lib/use-user-lane';
import type { RoleModel } from '@/garden/contracts/roles';

const BUILDERS_ROLES: ProjectRole[] = [
  'owner',
  'gc',
  'contractor',
  'teammate',
  'day_hire',
  'specialist',
  'diy',
];

/** Privilege ranking — mirrors ROLE_PRIORITY in use-user-lane.ts. */
const BUILDERS_ROLE_PRIORITY: Record<string, number> = {
  owner: 100,
  gc: 90,
  contractor: 70,
  specialist: 60,
  teammate: 50,
  diy: 40,
  day_hire: 30,
};

function isProjectRole(role: string): role is ProjectRole {
  return (BUILDERS_ROLES as string[]).includes(role);
}

export const buildersRoles: RoleModel = {
  roles: [...BUILDERS_ROLES],
  defaultRole: 'gc',
  priority: BUILDERS_ROLE_PRIORITY,
  isWorkflowAllowed(workflowId: string, role: string): boolean {
    // Unknown roles fall through to the default-open contract.
    if (!isProjectRole(role)) return true;
    return isWorkflowAllowedForLane(workflowId, role);
  },
};
