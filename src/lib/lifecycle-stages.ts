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
 */
export const STAGE_WORKFLOWS: Record<number, string[]> = {
  1: ['q1', 'q2', 'q3'],
  2: ['q4', 'q5'],
  3: ['q6', 'q7', 'q8', 'q9', 'q10', 'q11', 'q12', 'q13'],
  4: ['q14', 'q15', 'q16', 'q17', 'q18', 'q19'],
  5: ['q20'],
  6: ['q21', 'q22', 'q23', 'q24'],
  7: ['q25', 'q26', 'q27'],
};

/**
 * Live workflow routes currently wired in the killer app picker. Used by
 * the global JourneyMapHeader to map the current pathname → stageId so
 * the active stage highlights as the user walks into a workflow.
 *
 * Keep in sync with `LIVE_WORKFLOWS` in src/app/killerapp/page.tsx.
 */
export const ROUTE_TO_WORKFLOW_ID: Record<string, string> = {
  '/killerapp/workflows/estimating': 'q2',
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
