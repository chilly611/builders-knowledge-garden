/**
 * LIVE_WORKFLOW_PATHS — single canonical map of workflow q-id → live route.
 *
 * Mirrors the LIVE_WORKFLOWS const in `src/app/killerapp/page.tsx` (server-only,
 * cannot import from a client primitive without pulling in `fs`).
 *
 * Today this map is duplicated in:
 *   - `src/app/killerapp/page.tsx` (server, `LIVE_WORKFLOWS`)
 *   - `src/design-system/components/NextWorkflowCard.tsx` (client, `LIVE_WORKFLOW_PATHS`)
 *
 * Both should eventually `import` from here. For now this module is consumed
 * by `StageWelcomeMount` so the mount + NextWorkflowCard cannot diverge on
 * which q-id maps to which live route — they were drifting in subtle ways
 * already (different ordering, different definitions of "live"). When the
 * page/NextWorkflowCard get touched next, point them at this map and delete
 * their local copies.
 */

export const LIVE_WORKFLOW_PATHS: Record<string, string> = {
  // Size up
  q2: '/killerapp/workflows/estimating',
  // Lock it in
  q4: '/killerapp/workflows/contract-templates',
  q5: '/killerapp/workflows/code-compliance',
  // 2026-05-22 — architect-of-record concierge form
  'q-aor': '/killerapp/workflows/architect-of-record',
  // 2026-05-22 — DIY-LANE: GC matching concierge form (stage 2 / Lock).
  'q-find-gc': '/killerapp/workflows/find-a-gc',
  // 2026-05-22 — DIY-LANE: plain-English budget walkthrough (stage 1 / Size Up).
  'q-cost-explainer': '/killerapp/workflows/cost-explainer',
  // Plan it out
  q6: '/killerapp/workflows/job-sequencing',
  q7: '/killerapp/workflows/worker-count',
  q8: '/killerapp/workflows/permit-applications',
  q9: '/killerapp/workflows/sub-management',
  q10: '/killerapp/workflows/equipment',
  q11: '/killerapp/workflows/supply-ordering',
  q12: '/killerapp/workflows/services-todos',
  q13: '/killerapp/workflows/hiring',
  // 2026-05-22 — MEP scheduling generators (deterministic, no LLM).
  // q-panel-schedule = NEC 220 service load + 40-circuit panel directory.
  // q-equipment-schedule = HVAC tonnage + UPC 422.1 plumbing fixtures.
  // q-load-calc = the underlying calculator endpoint, surfaced via panel-schedule UI.
  'q-panel-schedule': '/killerapp/workflows/panel-schedule',
  'q-equipment-schedule': '/killerapp/workflows/equipment-schedule',
  'q-load-calc': '/killerapp/workflows/panel-schedule',
  // 2026-05-22 — SUBBID-FLOW: lane-gated bid surfaces. q-sub-bid-submit
  // is for the sub pushing a bid; q-sub-bid-inbox is for the GC reviewing.
  'q-sub-bid-submit': '/killerapp/workflows/sub-bid-submit',
  'q-sub-bid-inbox': '/killerapp/workflows/sub-bid-inbox',
  // Build
  q14: '/killerapp/workflows/weather-scheduling',
  q15: '/killerapp/workflows/daily-log',
  q16: '/killerapp/workflows/osha-toolbox',
  q17: '/killerapp/workflows/expenses',
  q18: '/killerapp/workflows/outreach',
  q19: '/killerapp/workflows/compass-nav',
  // 2026-05-22 — running punch list. Build-stage; distinct surface from
  // q24 (final walk-through / substantial completion).
  'q-punch': '/killerapp/workflows/punch-list',
  // 2026-05-22 — RFIs (request for information). Build-stage; consumes
  // /api/v1/rfis (auth-gated, demo_project_id-aware).
  'q-rfi': '/killerapp/workflows/rfis',
  // Adapt (OWNER-LANE, 2026-05-22): the owner's approvals inbox.
  'q-approvals': '/killerapp/workflows/approvals',
  // 2026-05-22 — BOOKKEEPER-UI bookkeeper-must-haves. Vendor master =
  // Plan / procure subs. AR/AP ledger = Collect. QB export + audit trail =
  // Reflect (month-end close).
  'q-vendors':     '/killerapp/workflows/vendor-master',
  'q-ledger':      '/killerapp/workflows/ar-ap-ledger',
  'q-qbexport':    '/killerapp/workflows/quickbooks-export',
  'q-audit-trail': '/killerapp/workflows/audit-trail',
  // Adapt / Collect / Reflect — intentionally absent until shipped.
};

/**
 * Resolve the live route for a workflow id, preserving ?project=<id> when
 * provided. Returns null when the workflow has no live route yet — callers
 * decide whether to surface a "coming soon" affordance or fall back to the
 * picker.
 */
export function liveWorkflowHref(
  workflowId: string,
  projectId?: string | null
): string | null {
  const base = LIVE_WORKFLOW_PATHS[workflowId];
  if (!base) return null;
  return projectId
    ? `${base}?project=${encodeURIComponent(projectId)}`
    : base;
}

/**
 * ROUTE_TO_WORKFLOW_ID — live workflow routes currently wired in the killer
 * app picker, keyed route → workflow q-id. Used (via `workflowIdForPath`) by
 * the global journey header to map the current pathname → workflow → stage so
 * the active stage highlights as the user walks into a workflow.
 *
 * Moved here from `src/lib/lifecycle-stages.ts` (garden-engine CODE-2): this
 * is ROUTING data, not lifecycle data — it pairs with `LIVE_WORKFLOW_PATHS`
 * above. Keep in sync with `LIVE_WORKFLOWS` in src/app/killerapp/page.tsx.
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

/** Resolve the workflow id for a pathname (or null if not a known live route). */
export function workflowIdForPath(pathname: string): string | null {
  // Match exact or prefix (e.g. /killerapp/workflows/estimating/subpage).
  for (const [route, wid] of Object.entries(ROUTE_TO_WORKFLOW_ID)) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      return wid;
    }
  }
  return null;
}
