/**
 * Stage from Pathname
 * ===================
 * Maps URL pathname to lifecycle stage ID (0–7).
 *
 * Usage: const stageId = stageFromPathname(pathname);
 */

export type StageId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

const PATHNAME_TO_STAGE: Record<string, StageId> = {
  '/killerapp': 0, // beginning/landing
  '/killerapp/workflows/estimating': 1,
  '/killerapp/workflows/contract-templates': 2,
  '/killerapp/workflows/code-compliance': 2,
  '/killerapp/workflows/job-sequencing': 3,
  '/killerapp/workflows/worker-count': 3,
  '/killerapp/workflows/permit-applications': 3,
  '/killerapp/workflows/sub-management': 3,
  '/killerapp/workflows/equipment': 3,
  '/killerapp/workflows/supply-ordering': 3,
  '/killerapp/workflows/services-todos': 5,
  '/killerapp/workflows/hiring': 3,
  '/killerapp/workflows/weather-scheduling': 4,
  '/killerapp/workflows/daily-log': 4,
  '/killerapp/workflows/osha-toolbox': 4,
  '/killerapp/workflows/expenses': 6,
  '/killerapp/workflows/outreach': 4,
  '/killerapp/workflows/compass-nav': 7,
};

// The 7 lifecycle stages as URL slugs (matches /killerapp/stages/<slug>).
const STAGE_SLUG_TO_ID: Record<string, StageId> = {
  'size-up': 1, lock: 2, plan: 3, build: 4, adapt: 5, collect: 6, reflect: 7,
};

/**
 * Get stage ID from pathname.
 * @param pathname - Current URL pathname
 * @returns Stage ID (0–7), defaults to 0 if no match
 *
 * Handles `/killerapp/stages/<slug>` (which were NOT in the static map and so
 * fell through to 0 — that's why the copilot called every stage screen
 * "Landing"). Project-scoped screens should pass the project's CURRENT stage.
 */
export function stageFromPathname(pathname: string): StageId {
  const exact = PATHNAME_TO_STAGE[pathname];
  if (exact !== undefined) return exact;
  const m = pathname.match(/^\/killerapp\/stages\/([a-z-]+)/);
  if (m && STAGE_SLUG_TO_ID[m[1]] !== undefined) return STAGE_SLUG_TO_ID[m[1]];
  return 0;
}
