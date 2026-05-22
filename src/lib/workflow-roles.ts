/**
 * workflow-roles.ts — WORKFLOW-ROLES-NAV sprint (2026-05-22).
 * ==========================================================
 *
 * Single source of truth for "which roles see which workflow in the picker."
 * Mirrors the server-side LaneGate redirects so users never see a workflow
 * tile that would immediately bounce them.
 *
 * Contract:
 *   - Workflows NOT listed here are visible to every role (default-open).
 *   - Workflows listed here are restricted to the enumerated roles only.
 *   - An empty allowlist (`[]`) means "nobody" — effectively hidden.
 *
 * Why centralize: prior to this sprint, the map lived inline in
 * `src/app/killerapp/page.tsx` and was only honoured by the DIY cockpit
 * overlay. CompassWorkflowNav / NextWorkflowCard would happily surface
 * workflows that LaneGate-redirected the user the moment they clicked.
 *
 * Add new entries here as new lane-gated workflows ship. The IDs must
 * match the workflow id used by the picker (the `q-id` in
 * docs/workflows.json + LIVE_WORKFLOWS keys in killerapp/page.tsx).
 */

import type { ProjectRole } from './use-user-lane';

export const WORKFLOW_ROLES: Record<string, ReadonlyArray<ProjectRole>> = {
  // DIY / owner concierge flows. Pros don't need a "find a GC" tile because
  // they ARE a GC. Cost-explainer is the plain-English budget walkthrough.
  'q-find-gc': ['diy', 'owner'],
  'q-cost-explainer': ['diy', 'owner'],

  // GC + owner approval flows. Endpoint still enforces required_signers
  // membership; this is just picker hygiene.
  'q-approvals': ['owner', 'gc'],

  // Sub-bid bidirectional. The matched LaneGate inside each client is
  // listed next to each entry for verification.
  // SubBidSubmitClient: allow=['specialist','contractor']
  'q-sub-bid-submit': ['specialist', 'contractor'],
  // SubBidInboxClient:  allow=['gc','owner','teammate']
  'q-sub-bid-inbox': ['gc', 'owner', 'teammate'],

  // Bookkeeper module (GC team only — keeps subs and DIY out of the
  // GC's vendor master and ledger).
  'q-vendors': ['gc', 'owner', 'teammate'],
  'q-ledger': ['gc', 'owner', 'teammate'],
  'q-qbexport': ['gc', 'owner', 'teammate'],
  'q-audit-trail': ['gc', 'owner', 'teammate'],

  // MEP scheduling calcs — these are pro tools (NEC 220, ASHRAE, UPC
  // 422.1). Hide from `diy` so the DIY cockpit stays focused.
  'q-panel-schedule': ['gc', 'contractor', 'specialist', 'teammate', 'owner'],
  'q-equipment-schedule': ['gc', 'contractor', 'specialist', 'teammate', 'owner'],
  'q-load-calc': ['gc', 'contractor', 'specialist', 'teammate', 'owner'],

  // Architect-of-record concierge — every role can submit, including diy
  // and day_hire. Listed here for completeness (explicit > implicit).
  'q-aor': ['gc', 'contractor', 'specialist', 'teammate', 'owner', 'diy', 'day_hire'],
};

/**
 * Returns `true` when a workflow is visible to the given lane. Workflows
 * not present in WORKFLOW_ROLES are considered unrestricted.
 */
export function isWorkflowAllowedForLane(
  workflowId: string,
  lane: ProjectRole,
): boolean {
  const allowedRoles = WORKFLOW_ROLES[workflowId];
  if (!allowedRoles) return true; // No restriction = visible to all
  return allowedRoles.includes(lane);
}
