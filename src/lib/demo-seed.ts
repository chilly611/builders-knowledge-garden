/**
 * Demo Project Seeder
 * ===================
 *
 * One-time seed of a plausible sample project into localStorage for investor demo.
 *
 * Preloads "San Diego ADU — 2,500 sq ft modernist 2-bedroom" with:
 *   - Budget breakdown per stage
 *   - Journey progress (workflow events)
 *   - Time Machine snapshots
 *   - Recent events
 *
 * Wired into layout.tsx useEffect — triggers ONLY on first visit
 * (if `bkg:demo-seeded` not present AND active project is "default").
 */

import { JourneyEvent, emitJourneyEvent } from './journey-progress';
import { STAGE_WORKFLOWS } from './lifecycle-stages';

// ─── Types ────────────────────────────────────────────────────────────────

export interface TimeMachineSnapshot {
  label: string;
  date: string; // ISO string
  description: string;
}

export interface BudgetLineItem {
  id: string;
  description: string;
  amount: number;
  isEstimate: boolean;
  lifecycleStageId: number;
  date: string; // ISO string
}

// ─── Constants ─────────────────────────────────────────────────────────────

const DEMO_PROJECT_ID = 'demo-san-diego-adu';
const SEEDED_FLAG_KEY = 'bkg:demo-seeded';
const ACTIVE_PROJECT_KEY = 'bkg-active-project';
const DEMO_SEEDED_VERSION = 'v1';

// ─── Sample Project Data ────────────────────────────────────────────────────

/**
 * Budget allocation for San Diego ADU project.
 * Total committed: $385,000, spent: $47,200
 * Split by lifecycle stage (1-7):
 *   1. Size up: $2,500 committed / $2,500 spent
 *   2. Lock it in: $4,500 committed / $4,500 spent
 *   3. Plan it out: $68,000 committed / $0 spent
 *   4. Build: $270,000 committed / $40,200 spent
 *   5. Adapt: $15,000 committed / $0 spent
 *   6. Collect: $0 / $0
 *   7. Reflect: $0 / $0
 */
const DEMO_BUDGET_ITEMS: BudgetLineItem[] = [
  // Stage 1: Size up (pre-bid due diligence)
  {
    id: 'budget-1-site-survey',
    description: 'Site survey and soil analysis',
    amount: 2500,
    isEstimate: false,
    lifecycleStageId: 1,
    date: '2026-03-08',
  },

  // Stage 2: Lock it in (permits + contract fees)
  {
    id: 'budget-2-permits',
    description: 'Permit application and review fees',
    amount: 2500,
    isEstimate: false,
    lifecycleStageId: 2,
    date: '2026-03-15',
  },
  {
    id: 'budget-2-contract',
    description: 'Contract review and legal fees',
    amount: 2000,
    isEstimate: false,
    lifecycleStageId: 2,
    date: '2026-03-16',
  },

  // Stage 3: Plan it out (architect + structural engineer) — estimated only
  {
    id: 'budget-3-architect',
    description: 'Architectural design and drawings',
    amount: 35000,
    isEstimate: true,
    lifecycleStageId: 3,
    date: '2026-03-22',
  },
  {
    id: 'budget-3-structural',
    description: 'Structural engineering calculations',
    amount: 22000,
    isEstimate: true,
    lifecycleStageId: 3,
    date: '2026-03-22',
  },
  {
    id: 'budget-3-mep',
    description: 'MEP engineering coordination',
    amount: 11000,
    isEstimate: true,
    lifecycleStageId: 3,
    date: '2026-03-22',
  },

  // Stage 4: Build (framing deposit, foundation poured)
  {
    id: 'budget-4-foundation',
    description: 'Foundation excavation and pouring',
    amount: 28000,
    isEstimate: false,
    lifecycleStageId: 4,
    date: '2026-04-05',
  },
  {
    id: 'budget-4-framing-deposit',
    description: 'Framing crew deposit',
    amount: 12200,
    isEstimate: false,
    lifecycleStageId: 4,
    date: '2026-04-10',
  },
  {
    id: 'budget-4-rough-mechanical',
    description: 'Rough-in electrical, plumbing, HVAC (estimated)',
    amount: 65000,
    isEstimate: true,
    lifecycleStageId: 4,
    date: '2026-04-15',
  },
  {
    id: 'budget-4-roofing',
    description: 'Roofing and weatherproofing (estimated)',
    amount: 68000,
    isEstimate: true,
    lifecycleStageId: 4,
    date: '2026-04-15',
  },
  {
    id: 'budget-4-finishes',
    description: 'Interior finishes and fixtures (estimated)',
    amount: 121800,
    isEstimate: true,
    lifecycleStageId: 4,
    date: '2026-04-15',
  },

  // Stage 5: Adapt (contingency)
  {
    id: 'budget-5-contingency',
    description: 'Project contingency reserve (3.9% of budget)',
    amount: 15000,
    isEstimate: true,
    lifecycleStageId: 5,
    date: '2026-03-22',
  },
];

const DEMO_TIME_MACHINE_SNAPSHOTS: TimeMachineSnapshot[] = [
  {
    label: 'Signed contract',
    date: '2026-03-15',
    description: 'General contractor agreement signed with completion timeline reviewed.',
  },
  {
    label: 'Permits filed',
    date: '2026-03-22',
    description: 'All required building, electrical, plumbing, and mechanical permits filed with county.',
  },
  {
    label: 'Foundation poured',
    date: '2026-04-05',
    description: 'Foundation excavation completed and concrete poured. Ready for framing.',
  },
];

const DEMO_JOURNEY_EVENTS: JourneyEvent[] = [
  // Stage 2: Lock it in — q4 (contract templates) completed
  {
    type: 'completed',
    workflowId: 'q4',
    projectId: DEMO_PROJECT_ID,
  },
  // Stage 3: Plan it out — q5 (code compliance) in progress
  {
    type: 'started',
    workflowId: 'q5',
    projectId: DEMO_PROJECT_ID,
  },
  {
    type: 'step_completed',
    workflowId: 'q5',
    projectId: DEMO_PROJECT_ID,
    stepId: 'code-run-ibc-903-2-1',
    stepIndex: 0,
    totalSteps: 5,
  },
  // Stage 4: Build — q11 (supply ordering) started
  {
    type: 'started',
    workflowId: 'q11',
    projectId: DEMO_PROJECT_ID,
  },
  {
    type: 'step_completed',
    workflowId: 'q11',
    projectId: DEMO_PROJECT_ID,
    stepId: 'supply-select-white-cap-rebar',
    stepIndex: 2,
    totalSteps: 8,
  },
];

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Check if we're in a browser environment.
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Get the current active project ID from localStorage.
 */
function getActiveProjectId(): string {
  if (!isBrowser()) return 'default';
  try {
    return window.localStorage.getItem(ACTIVE_PROJECT_KEY) ?? 'default';
  } catch {
    return 'default';
  }
}

/**
 * Seed the demo project into localStorage.
 * Populates:
 *   - bkg-active-project = demo-san-diego-adu
 *   - bkg:journey:* for the demo project
 *   - bkg:budget:demo-san-diego-adu with line items
 *   - bkg:time-machine:demo-san-diego-adu with snapshots
 *   - bkg:demo-seeded = v1 (so it never runs again)
 */
export function seedDemoProject(): void {
  if (!isBrowser()) {
    console.warn('[demo-seed] Not in browser environment, skipping seed');
    return;
  }

  try {
    // 1. Set active project
    window.localStorage.setItem(ACTIVE_PROJECT_KEY, DEMO_PROJECT_ID);

    // 2. Emit journey events to populate per-workflow progress
    for (const event of DEMO_JOURNEY_EVENTS) {
      emitJourneyEvent(event);
    }

    // 3. Store budget line items
    const budgetKey = `bkg:budget:${DEMO_PROJECT_ID}`;
    window.localStorage.setItem(budgetKey, JSON.stringify(DEMO_BUDGET_ITEMS));

    // 4. Store time machine snapshots
    const timeMachineKey = `bkg:time-machine:${DEMO_PROJECT_ID}`;
    window.localStorage.setItem(
      timeMachineKey,
      JSON.stringify(DEMO_TIME_MACHINE_SNAPSHOTS)
    );

    // 5. Set the seeded flag so we never run this again
    window.localStorage.setItem(
      SEEDED_FLAG_KEY,
      `${DEMO_SEEDED_VERSION}:${DEMO_PROJECT_ID}`
    );

    console.log(
      `[demo-seed] Successfully seeded demo project: ${DEMO_PROJECT_ID}`
    );
  } catch (error) {
    console.error('[demo-seed] Failed to seed demo project:', error);
    // Silently fail — don't break the app
  }
}

/**
 * Clear the demo project from localStorage and reset the seeded flag.
 * Useful for testing or resetting the demo.
 */
export function clearDemoProject(): void {
  if (!isBrowser()) return;

  try {
    const budgetKey = `bkg:budget:${DEMO_PROJECT_ID}`;
    const timeMachineKey = `bkg:time-machine:${DEMO_PROJECT_ID}`;
    const journeyKey = `bkg:journey:anon:${DEMO_PROJECT_ID}`;

    window.localStorage.removeItem(budgetKey);
    window.localStorage.removeItem(timeMachineKey);
    window.localStorage.removeItem(journeyKey);
    window.localStorage.removeItem(SEEDED_FLAG_KEY);

    // Reset active project to default if it was the demo
    if (getActiveProjectId() === DEMO_PROJECT_ID) {
      window.localStorage.setItem(ACTIVE_PROJECT_KEY, 'default');
    }

    console.log('[demo-seed] Cleared demo project');
  } catch (error) {
    console.error('[demo-seed] Failed to clear demo project:', error);
  }
}

/**
 * Check if the demo project is currently active.
 */
export function isDemoProjectActive(): boolean {
  if (!isBrowser()) return false;
  return getActiveProjectId() === DEMO_PROJECT_ID;
}

/**
 * Check if the demo has already been seeded in this browser.
 */
function isDemoAlreadySeeded(): boolean {
  if (!isBrowser()) return false;
  try {
    const flag = window.localStorage.getItem(SEEDED_FLAG_KEY);
    return flag === `${DEMO_SEEDED_VERSION}:${DEMO_PROJECT_ID}`;
  } catch {
    return false;
  }
}

/**
 * Conditionally seed the demo project on first visit.
 *
 * Should be called from layout.tsx useEffect with dependency [].
 * Triggers ONLY if:
 *   - Not already seeded (bkg:demo-seeded absent or stale)
 *   - Active project is "default" (no real project loaded yet)
 */
export function autoSeedDemoOnFirstVisit(): void {
  if (!isBrowser()) return;

  try {
    const alreadySeeded = isDemoAlreadySeeded();
    const activeProjectId = getActiveProjectId();
    const isDefaultProject = activeProjectId === 'default';

    if (!alreadySeeded && isDefaultProject) {
      seedDemoProject();
    }
  } catch (error) {
    // Silently swallow any errors during auto-seed
    console.error('[demo-seed] Unexpected error during auto-seed:', error);
  }
}
