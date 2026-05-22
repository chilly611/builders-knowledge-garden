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

/**
 * Live workflow routes currently wired in the killer app picker. Used by
 * the global JourneyMapHeader to map the current pathname → stageId so
 * the active stage highlights as the user walks into a workflow.
 *
 * Keep in sync with `LIVE_WORKFLOWS` in src/app/killerapp/page.tsx.
 */
export const ROUTE_TO_WORKFLOW_ID: Record<string, string> = {
  '/killerapp/workflows/bid-risk': 'q1',
  '/killerapp/workflows/estimating': 'q2',
  '/killerapp/workflows/client-lookup': 'q3',
  '/killerapp/workflows/contract-templates': 'q4',
  '/killerapp/workflows/code-compliance': 'q5',
  '/killerapp/workflows/job-sequencing': 'q6',
  '/killerapp/workflows/worker-count': 'q7',
  '/killerapp/workflows/permit-applications': 'q8',
  '/killerapp/workflows/sub-management': 'q9',
  '/killerapp/workflows/equipment': 'q10',
  '/killerapp/workflows/supply-ordering': 'q11',
  '/killerapp/workflows/services-todos': 'q12',
  '/killerapp/workflows/hiring': 'q13',
  '/killerapp/workflows/weather-scheduling': 'q14',
  '/killerapp/workflows/daily-log': 'q15',
  '/killerapp/workflows/osha-toolbox': 'q16',
  '/killerapp/workflows/expenses': 'q17',
  '/killerapp/workflows/outreach': 'q18',
  '/killerapp/workflows/compass-nav': 'q19',
  '/killerapp/workflows/change-orders': 'q20',
  '/killerapp/workflows/approvals': 'q-approvals',
  '/killerapp/workflows/draw-requests': 'q21',
  '/killerapp/workflows/lien-waivers': 'q22',
  '/killerapp/workflows/payroll-check': 'q23',
  '/killerapp/workflows/final-walk-through': 'q24',
  '/killerapp/workflows/retainage-tracker': 'q25',
  '/killerapp/workflows/warranty-handoff': 'q26',
  '/killerapp/workflows/project-review': 'q27',
  '/killerapp/workflows/architect-of-record': 'q-aor',
  '/killerapp/workflows/sub-bid-submit': 'q-sub-bid-submit',
  '/killerapp/workflows/sub-bid-inbox': 'q-sub-bid-inbox',
  '/killerapp/workflows/punch-list': 'q-punch',
  '/killerapp/workflows/rfis': 'q-rfi',
  // 2026-05-22 — MEP scheduling workflows.
  '/killerapp/workflows/panel-schedule': 'q-panel-schedule',
  '/killerapp/workflows/equipment-schedule': 'q-equipment-schedule',
  // 2026-05-22 — bookkeeper / financial admin surfaces.
  '/killerapp/workflows/vendor-master': 'q-vendors',
  '/killerapp/workflows/ar-ap-ledger': 'q-ledger',
  '/killerapp/workflows/quickbooks-export': 'q-qbexport',
  '/killerapp/workflows/audit-trail': 'q-audit-trail',
  // 2026-05-22 — DIY-LANE: GC matching concierge form + cost explainer.
  '/killerapp/workflows/find-a-gc': 'q-find-gc',
  '/killerapp/workflows/cost-explainer': 'q-cost-explainer',
};

/** Inverse of STAGE_WORKFLOWS — workflow id → stageId. */
export const WORKFLOW_TO_STAGE: Record<string, number> = Object.entries(
  STAGE_WORKFLOWS
).reduce<Record<string, number>>((acc, [stageId, ids]) => {
  for (const id of ids) acc[id] = Number(stageId);
  return acc;
}, {});

/** Resolve stageId for a pathname (or null if not a known live route). */
export function stageIdForPath(pathname: string): number | null {
  // Match exact or prefix (e.g. /killerapp/workflows/estimating/subpage).
  for (const [route, wid] of Object.entries(ROUTE_TO_WORKFLOW_ID)) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      return WORKFLOW_TO_STAGE[wid] ?? null;
    }
  }
  return null;
}
