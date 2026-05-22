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
  // Plan it out
  q6: '/killerapp/workflows/job-sequencing',
  q7: '/killerapp/workflows/worker-count',
  q8: '/killerapp/workflows/permit-applications',
  q9: '/killerapp/workflows/sub-management',
  q10: '/killerapp/workflows/equipment',
  q11: '/killerapp/workflows/supply-ordering',
  q12: '/killerapp/workflows/services-todos',
  q13: '/killerapp/workflows/hiring',
  // Build
  q14: '/killerapp/workflows/weather-scheduling',
  q15: '/killerapp/workflows/daily-log',
  q16: '/killerapp/workflows/osha-toolbox',
  q17: '/killerapp/workflows/expenses',
  q18: '/killerapp/workflows/outreach',
  q19: '/killerapp/workflows/compass-nav',
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
