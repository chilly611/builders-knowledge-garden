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
  '/killerapp/workflows/services-todos': 3,
  '/killerapp/workflows/hiring': 3,
  '/killerapp/workflows/weather-scheduling': 4,
  '/killerapp/workflows/daily-log': 4,
  '/killerapp/workflows/osha-toolbox': 4,
  '/killerapp/workflows/expenses': 4,
  '/killerapp/workflows/outreach': 4,
  '/killerapp/workflows/compass-nav': 4,
};

/**
 * Get stage ID from pathname.
 * @param pathname - Current URL pathname
 * @returns Stage ID (0–7), defaults to 0 if no match
 */
export function stageFromPathname(pathname: string): StageId {
  const stage = PATHNAME_TO_STAGE[pathname];
  return stage !== undefined ? stage : 0;
}
