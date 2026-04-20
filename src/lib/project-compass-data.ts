/**
 * ProjectCompass data adapter
 * ===========================
 *
 * Turns the raw budget-spine summary (see `src/app/api/v1/budget/route.ts`)
 * into the shapes ProjectCompass needs:
 *   - `StagePayments`: per-stage pool (amount in, amount out, status)
 *   - `ProfitSignal`: close-out waterfall color + numeric delta
 *
 * When no active project is set (or the API round-trip fails), returns a
 * deterministic DEMO payload so the compass always has SOMETHING to draw
 * on the live deploy. Demo mode is explicitly flagged (`isDemo: true`) so
 * the component can render a "Set up a real project" CTA and avoid
 * pretending demo money is real.
 *
 * Stage ↔ phase mapping mirrors `budget-spine.ts#LIFECYCLE_TO_PHASE`:
 *   1 Size Up  → DREAM
 *   2 Lock     → DESIGN
 *   3 Plan     → PLAN
 *   4 Build    → BUILD
 *   5 Adapt    → BUILD (coalesced — split evenly when rendering)
 *   6 Collect  → DELIVER
 *   7 Reflect  → GROW
 *
 * Honest limitation: the API's byPhase rollup only tracks {spent,
 * estimated, count} — it does NOT split client-payment inflow from
 * expense outflow per phase. So per-stage inflow is only surfaced at the
 * "big moment" stages where real contractors take draws: stage 1 (Size
 * Up deposit) and stage 6 (Collect / final draw). The aggregate
 * `clientPaymentsReceived` is allocated to those two stages in a 25/75
 * split that matches how most BKG users structure their payment
 * schedules (small deposit at signing, remainder at close-out). When the
 * API exposes per-phase `client_payments` we can replace this heuristic
 * with real data. Flagged in tasks.todo.md#W4.4 follow-ups.
 */

export type PoolStatus = 'scheduled' | 'received' | 'overdue';

export interface PaymentPool {
  stageId: number;
  amountIn: number; // client draws / deposits
  amountOut: number; // contractor outflows / estimates
  status: PoolStatus;
  label?: string;
}

export type ProfitSignal = 'profit' | 'breakeven' | 'loss' | 'unknown';

export interface ProjectCompassData {
  isDemo: boolean;
  stagePayments: Record<number, PaymentPool>;
  profitSignal: ProfitSignal;
  totalSpent: number;
  totalReceived: number;
  totalBudget: number;
}

const STAGE_TO_PHASE: Record<number, string> = {
  1: 'DREAM',
  2: 'DESIGN',
  3: 'PLAN',
  4: 'BUILD',
  5: 'BUILD',
  6: 'DELIVER',
  7: 'GROW',
};

const PHASE_TO_STAGES: Record<string, number[]> = {
  DREAM: [1],
  DESIGN: [2],
  PLAN: [3],
  BUILD: [4, 5],
  DELIVER: [6],
  GROW: [7],
};

// ─── Demo payload (keeps live deploy alive before a project is set) ─────

export const DEMO_COMPASS_DATA: ProjectCompassData = {
  isDemo: true,
  stagePayments: {
    1: { stageId: 1, amountIn: 5_000, amountOut: 800, status: 'received' },
    2: { stageId: 2, amountIn: 0, amountOut: 2_400, status: 'scheduled' },
    3: { stageId: 3, amountIn: 0, amountOut: 18_500, status: 'scheduled' },
    4: { stageId: 4, amountIn: 0, amountOut: 52_000, status: 'scheduled' },
    6: { stageId: 6, amountIn: 95_000, amountOut: 0, status: 'scheduled' },
  },
  profitSignal: 'profit',
  totalSpent: 73_700,
  totalReceived: 5_000,
  totalBudget: 120_000,
};

// ─── API-derived payload ────────────────────────────────────────────────

/** Mirrors the `summary` object returned by GET /api/v1/budget. */
export interface BudgetApiSummary {
  totalBudget?: number;
  totalSpent?: number;
  totalEstimated?: number;
  actualExpenses?: number;
  clientPaymentsReceived?: number;
  plAfterPayments?: number;
  percentUsed?: number;
  byPhase?: Record<
    string,
    { spent?: number; estimated?: number; count?: number }
  >;
}

/**
 * Fold a budget API summary into per-stage payment pools.
 *
 * Outflow: each phase's combined `spent + estimated` (spent dominates when
 * non-zero; estimates surface upcoming outflow). Split evenly across the
 * stages a phase covers (BUILD → 4+5).
 *
 * Inflow: no per-phase split available from the API, so we allocate the
 * aggregate `clientPaymentsReceived` to stage 1 (25% — deposit) and stage 6
 * (75% — final draw / close-out). When zero, neither stage shows inflow.
 *
 * Status: `received` if any client payment has actually landed OR if this
 * pool has cash out the door (positive actualExpenses contribution);
 * `scheduled` otherwise.
 */
export function deriveCompassData(
  summary: BudgetApiSummary | null | undefined
): ProjectCompassData {
  if (!summary) {
    return { ...DEMO_COMPASS_DATA, isDemo: true };
  }

  const totalBudget = summary.totalBudget ?? 0;
  const totalSpent = summary.actualExpenses ?? summary.totalSpent ?? 0;
  const totalReceived = summary.clientPaymentsReceived ?? 0;
  const byPhase = summary.byPhase ?? {};

  const stagePayments: Record<number, PaymentPool> = {};

  for (const [phase, row] of Object.entries(byPhase)) {
    const stagesInPhase = PHASE_TO_STAGES[phase];
    if (!stagesInPhase?.length) continue;
    const divisor = stagesInPhase.length;

    // The API's `spent` is net: positive expenses minus negative client
    // payments. When only client payments have landed in a phase, `spent`
    // is negative — we don't want negative outflow, so clamp at zero.
    const phaseSpent = Math.max(row.spent ?? 0, 0) / divisor;
    const phaseEstimated = Math.max(row.estimated ?? 0, 0) / divisor;
    const amountOut = phaseSpent + phaseEstimated;
    if (amountOut === 0) continue;

    for (const stageId of stagesInPhase) {
      stagePayments[stageId] = {
        stageId,
        amountIn: 0,
        amountOut,
        status: phaseSpent > 0 ? 'received' : 'scheduled',
      };
    }
  }

  // Inflow heuristic: deposit + close-out. Only surface when money has
  // actually been received — anything else is speculation.
  if (totalReceived > 0) {
    const depositStage = 1;
    const closeStage = 6;
    const depositShare = totalReceived * 0.25;
    const closeShare = totalReceived * 0.75;

    const depositPool = stagePayments[depositStage];
    stagePayments[depositStage] = {
      stageId: depositStage,
      amountIn: depositShare,
      amountOut: depositPool?.amountOut ?? 0,
      status: 'received',
    };

    const closePool = stagePayments[closeStage];
    stagePayments[closeStage] = {
      stageId: closeStage,
      amountIn: closeShare,
      amountOut: closePool?.amountOut ?? 0,
      status: 'received',
    };
  }

  const delta = totalReceived - totalSpent;
  let profitSignal: ProfitSignal = 'unknown';
  if (totalReceived === 0 && totalSpent === 0) profitSignal = 'unknown';
  else if (totalBudget > 0 && Math.abs(delta) < totalBudget * 0.02)
    profitSignal = 'breakeven';
  else if (delta > 0) profitSignal = 'profit';
  else profitSignal = 'loss';

  return {
    isDemo: false,
    stagePayments,
    profitSignal,
    totalSpent,
    totalReceived,
    totalBudget,
  };
}

export { STAGE_TO_PHASE, PHASE_TO_STAGES };
