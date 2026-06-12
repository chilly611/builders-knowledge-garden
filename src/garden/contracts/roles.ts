/**
 * L2 contract — Role model
 * ========================
 *
 * RBAC values are per-garden. BKG ships construction roles
 * (owner/gc/contractor/teammate/day_hire/specialist/diy) + an 11-category
 * lens permission matrix. A new garden supplies its own roles. The engine's
 * `<LaneGate>` and picker hygiene read from this contract instead of importing
 * `src/lib/use-user-lane.ts` / `workflow-roles.ts` directly.
 *
 * See `docs/garden-engine/02-REPO-LAYOUT.md §2`.
 */

export interface PermissionRule {
  /** Role this rule applies to. */
  role: string;
  /** Data category (e.g. 'budget_total', 'sub_margin'). Garden-defined. */
  dataCategory: string;
  /** Action (e.g. 'view' | 'edit' | 'export'). Garden-defined. */
  action: string;
  permitted: boolean;
}

export interface RoleModel {
  /** All role identifiers in this garden. */
  roles: string[];
  /** Fallback role when none resolved (BKG: 'gc'). */
  defaultRole: string;
  /** Privilege ranking; highest wins when a user holds multiple roles. */
  priority: Record<string, number>;
  /**
   * Workflow visibility gate. Returns true when `role` may see `workflowId`.
   * Garden supplies the implementation (BKG wraps `isWorkflowAllowedForLane`).
   */
  isWorkflowAllowed(workflowId: string, role: string): boolean;
  /** Optional fine-grained data-category permission matrix. */
  permissionMatrix?: PermissionRule[];
}
