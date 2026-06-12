/**
 * Lifecycle stages — canonical source for the 7-stage journey.
 * ============================================================
 *
 * Mirrors `docs/workflows.json#lifecycleStages` but lives in TypeScript so
 * both server and client bundles can import it without going through
 * `fs.readFileSync` or an API route. The workflows.json file remains the
 * prototype source of truth; any change there must be mirrored here.
 *
 * Also maps every workflow id → stageId so the global JourneyMapHeader
 * can render per-stage progress rollups without each route passing them
 * down individually. And exports a path → stageId lookup so the global
 * header can highlight the current stage based on the current route.
 */
import type { LifecycleStage } from '@/components/JourneyMapHeader';

export const LIFECYCLE_STAGES: LifecycleStage[] = [
  { id: 1, name: 'Size up', emoji: '🧭' },
  { id: 2, name: 'Lock it in', emoji: '🔒' },
  { id: 3, name: 'Plan it out', emoji: '📐' },
  { id: 4, name: 'Build', emoji: '🔨' },
  { id: 5, name: 'Adapt', emoji: '🔄' },
  { id: 6, name: 'Collect', emoji: '💰' },
  { id: 7, name: 'Reflect', emoji: '📖' },
];

/**
 * Which workflow ids live in which stage. Extracted from
 * docs/workflows.json 2026-04-19 (27 workflows, q1-q27).
 *
 * Sequencing note (2026-05-22): Stage 6 (Collect) order follows the
 * industry-norm Close sequence — walk-through first (q24) gates final
 * release, then retainage tracking begins (q25), then draws (q21) and
 * waivers (q22) reconcile against it, with payroll close (q23) last.
 * q25 was moved from Stage 7 to Stage 6 because retainage is a Close
 * activity, not a Reflect activity. Stage 7 keeps warranty + lessons.
 */
export const STAGE_WORKFLOWS: Record<number, string[]> = {
  // q-cost-explainer (DIY-LANE, 2026-05-22) lives in Size Up — explains
  // the budget before commitments are made. Targets dreamer/owner lanes.
  1: ['q1', 'q2', 'q3', 'q-cost-explainer'],
  // q-aor (architect-of-record concierge) lives in Lock — pre-design,
  // pre-contract: you need a stamp before plans go anywhere.
  // q-find-gc (DIY-LANE GC matching concierge, 2026-05-22) also lives in
  // Lock — pre-hire, before any GC contract is signed.
  2: ['q4', 'q5', 'q-aor', 'q-find-gc'],
  // 2026-05-22 — MEP scheduling workflows (q-panel-schedule, q-equipment-schedule,
  // q-load-calc) added to Plan stage to balance the previously structural-heavy
  // knowledge base. All three are deterministic generators (no LLM).
  // q-sub-bid-submit + q-sub-bid-inbox (SUBBID-FLOW, 2026-05-22): Plan is
  // when bids actually move — sub pushes, GC receives. Sub-side q-sub-bid-submit
  // is gated to specialist/contractor; GC-side q-sub-bid-inbox is gated to
  // gc/owner/teammate. Both live in stage 3.
  3: ['q6', 'q7', 'q8', 'q9', 'q10', 'q11', 'q12', 'q13', 'q-panel-schedule', 'q-equipment-schedule', 'q-load-calc', 'q-sub-bid-submit', 'q-sub-bid-inbox', 'q-vendors'],
  // q-punch (running punch list) is a Build-stage workflow — open during
  // construction, not a Close activity. q24 (final walk-through, in
  // Stage 6) is the substantial-completion gate that uses the resolved
  // running punch list as input.
  4: ['q14', 'q15', 'q16', 'q17', 'q18', 'q19', 'q-punch', 'q-rfi'],
  // q-approvals (OWNER-LANE, 2026-05-22): the owner's inbox of pending
  // signatures. Lives in Adapt because change orders are the canonical
  // Adapt-stage event; draws + lien waivers also flow through this
  // inbox even though they originate in Collect.
  5: ['q20', 'q-approvals'],
  6: ['q24', 'q21', 'q25', 'q22', 'q23', 'q-ledger'],
  // q-qbexport (QuickBooks export) — Reflect = month-end close.
  // q-audit-trail is cross-cutting; assigned to Reflect as a primary home
  // but the picker exposes it everywhere via the "always available" bucket
  // (see live-workflows.ts / killerapp page).
  7: ['q26', 'q27', 'q-qbexport', 'q-audit-trail'],
};

/**
 * Cross-cutting workflows — always visible regardless of stage. Bookkeeper
 * tooling lives here because audit visibility shouldn't be hidden behind
 * a stage gate.
 */
export const ALWAYS_AVAILABLE_WORKFLOWS: string[] = ['q-audit-trail'];

// Garden-engine seam (CODE-2): `ROUTE_TO_WORKFLOW_ID` + the path→workflow
// lookup moved to `src/lib/live-workflows.ts` (`workflowIdForPath`) — that's
// routing data, and its sole consumer (GlobalJourneyMapHeader) now resolves
// workflow → stage through the lifecycle context (`stageForWorkflow`).
