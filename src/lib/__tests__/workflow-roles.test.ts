/**
 * Tests for `WORKFLOW_ROLES` + `isWorkflowAllowedForLane` (WORKFLOW-ROLES-NAV,
 * 2026-05-22).
 *
 * The same map is consumed by:
 *   - CompassWorkflowNav (the floating picker)
 *   - NextWorkflowCard (the end-of-workflow "next" CTA)
 *   - DiyCockpitOverlay's logic for hiding the pro picker
 *   - killerapp/page.tsx (page-level discovery filtering, future)
 *
 * If a workflow ID's allowlist drifts out of sync with the LaneGate on
 * the workflow's client, users will see picker tiles that immediately
 * redirect on click. These tests lock the contract.
 */
import { describe, it, expect } from 'vitest';
import {
  WORKFLOW_ROLES,
  isWorkflowAllowedForLane,
} from '../workflow-roles';

describe('isWorkflowAllowedForLane', () => {
  it('owner sees q-approvals', () => {
    expect(isWorkflowAllowedForLane('q-approvals', 'owner')).toBe(true);
  });

  it('gc sees q-approvals', () => {
    expect(isWorkflowAllowedForLane('q-approvals', 'gc')).toBe(true);
  });

  it('specialist does not see q-approvals', () => {
    expect(isWorkflowAllowedForLane('q-approvals', 'specialist')).toBe(false);
  });

  it('specialist sees q-sub-bid-submit', () => {
    expect(isWorkflowAllowedForLane('q-sub-bid-submit', 'specialist')).toBe(true);
  });

  it('contractor sees q-sub-bid-submit', () => {
    expect(isWorkflowAllowedForLane('q-sub-bid-submit', 'contractor')).toBe(true);
  });

  it('owner does not see q-sub-bid-submit', () => {
    expect(isWorkflowAllowedForLane('q-sub-bid-submit', 'owner')).toBe(false);
  });

  it('owner sees q-sub-bid-inbox', () => {
    expect(isWorkflowAllowedForLane('q-sub-bid-inbox', 'owner')).toBe(true);
  });

  it('specialist does not see q-sub-bid-inbox', () => {
    expect(isWorkflowAllowedForLane('q-sub-bid-inbox', 'specialist')).toBe(false);
  });

  it('diy sees q-cost-explainer', () => {
    expect(isWorkflowAllowedForLane('q-cost-explainer', 'diy')).toBe(true);
  });

  it('owner sees q-cost-explainer', () => {
    expect(isWorkflowAllowedForLane('q-cost-explainer', 'owner')).toBe(true);
  });

  it('gc does not see q-cost-explainer', () => {
    expect(isWorkflowAllowedForLane('q-cost-explainer', 'gc')).toBe(false);
  });

  it('diy sees q-find-gc', () => {
    expect(isWorkflowAllowedForLane('q-find-gc', 'diy')).toBe(true);
  });

  it('specialist does not see q-find-gc', () => {
    expect(isWorkflowAllowedForLane('q-find-gc', 'specialist')).toBe(false);
  });

  it('gc sees bookkeeper module (q-vendors, q-ledger, q-qbexport, q-audit-trail)', () => {
    expect(isWorkflowAllowedForLane('q-vendors', 'gc')).toBe(true);
    expect(isWorkflowAllowedForLane('q-ledger', 'gc')).toBe(true);
    expect(isWorkflowAllowedForLane('q-qbexport', 'gc')).toBe(true);
    expect(isWorkflowAllowedForLane('q-audit-trail', 'gc')).toBe(true);
  });

  it('diy does not see bookkeeper module', () => {
    expect(isWorkflowAllowedForLane('q-vendors', 'diy')).toBe(false);
    expect(isWorkflowAllowedForLane('q-ledger', 'diy')).toBe(false);
    expect(isWorkflowAllowedForLane('q-qbexport', 'diy')).toBe(false);
    expect(isWorkflowAllowedForLane('q-audit-trail', 'diy')).toBe(false);
  });

  it('specialist does not see bookkeeper module', () => {
    expect(isWorkflowAllowedForLane('q-vendors', 'specialist')).toBe(false);
  });

  it('gc sees MEP calcs but diy does not', () => {
    expect(isWorkflowAllowedForLane('q-panel-schedule', 'gc')).toBe(true);
    expect(isWorkflowAllowedForLane('q-equipment-schedule', 'gc')).toBe(true);
    expect(isWorkflowAllowedForLane('q-load-calc', 'gc')).toBe(true);
    expect(isWorkflowAllowedForLane('q-panel-schedule', 'diy')).toBe(false);
    expect(isWorkflowAllowedForLane('q-equipment-schedule', 'diy')).toBe(false);
    expect(isWorkflowAllowedForLane('q-load-calc', 'diy')).toBe(false);
  });

  it('q-aor is visible to every role (including diy and day_hire)', () => {
    expect(isWorkflowAllowedForLane('q-aor', 'diy')).toBe(true);
    expect(isWorkflowAllowedForLane('q-aor', 'day_hire')).toBe(true);
    expect(isWorkflowAllowedForLane('q-aor', 'owner')).toBe(true);
    expect(isWorkflowAllowedForLane('q-aor', 'gc')).toBe(true);
    expect(isWorkflowAllowedForLane('q-aor', 'specialist')).toBe(true);
    expect(isWorkflowAllowedForLane('q-aor', 'contractor')).toBe(true);
    expect(isWorkflowAllowedForLane('q-aor', 'teammate')).toBe(true);
  });

  it('non-restricted workflow visible to all roles (default-open)', () => {
    // q2 (estimating), q5 (code-compliance) etc are NOT in WORKFLOW_ROLES.
    // The default is: visible to every lane.
    expect(isWorkflowAllowedForLane('q2', 'diy')).toBe(true);
    expect(isWorkflowAllowedForLane('q2', 'specialist')).toBe(true);
    expect(isWorkflowAllowedForLane('q2', 'gc')).toBe(true);
    expect(isWorkflowAllowedForLane('q5', 'day_hire')).toBe(true);
    expect(isWorkflowAllowedForLane('q-estimating', 'diy')).toBe(true);
    expect(isWorkflowAllowedForLane('q-estimating', 'specialist')).toBe(true);
  });

  it('unknown workflow id is treated as unrestricted', () => {
    expect(isWorkflowAllowedForLane('q-totally-fake', 'diy')).toBe(true);
    expect(isWorkflowAllowedForLane('', 'gc')).toBe(true);
  });
});

describe('WORKFLOW_ROLES sub-bid bidirectional contract', () => {
  // Sanity-check that submit and inbox are mirrors of each other —
  // a role should never be in BOTH allowlists (otherwise the user
  // would see two competing tiles for the same conceptual action).
  it('no role appears in both q-sub-bid-submit and q-sub-bid-inbox', () => {
    const submit = WORKFLOW_ROLES['q-sub-bid-submit'] ?? [];
    const inbox = WORKFLOW_ROLES['q-sub-bid-inbox'] ?? [];
    const intersection = submit.filter((r) => inbox.includes(r));
    expect(intersection).toEqual([]);
  });
});
