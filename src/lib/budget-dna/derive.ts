/**
 * Budget-DNA — derive the streamgraph series + overlays from raw inputs.
 * ======================================================================
 *
 * Pure (no React, no localStorage) so it unit-tests cleanly. Given the budget
 * lines, a phase list, the canonical totals, and the viewer's lane, it returns
 * everything the ribbon draws:
 *   - `series`     stacked per-week-per-category dollars (bottom → top order)
 *   - `currentWeek` the cumulative-spend front — the week at which planned
 *                   cumulative cost first reaches `spent`. This is the shared
 *                   playhead: past-of-it is solid (money already out), future
 *                   is projected. It self-reconciles with the canonical spent.
 *   - `ticks`      baseline paid / due / overdue payment marks
 *   - `profit`     LENS-GATED projected gross profit (null for the Owner lane)
 *   - `totals`     pass-through canonical total / spent / committed / remaining
 */

import {
  CATEGORIES,
  type CategoryId,
  lineToCategory,
  lensSeesProfit,
  GROSS_MARGIN_PCT,
  SUB_MARKUP_PCT,
  type BudgetLens,
} from './categories';
import {
  schedulePhases,
  totalScheduleWeeks,
  lineToTimeWindow,
  type PhaseInput,
} from './schedule';

export interface DnaLine {
  id: string;
  category?: string;
  description?: string;
  amount: number;
  /** Lifecycle state — drives the payment ticks. */
  state?: 'pending' | 'estimated' | 'locked-in' | 'paid';
  csiCode?: string;
}

export interface DnaTotals {
  total: number;
  spent: number;
  committed: number;
  remaining: number;
}

export interface CategorySeries {
  id: CategoryId;
  /** Dollars per week, length === totalWeeks. */
  weekly: number[];
  total: number;
}

export type TickKind = 'paid' | 'due' | 'overdue';
export interface PaymentTick {
  week: number;
  kind: TickKind;
  amount: number;
  label: string;
}

export interface BudgetDnaProfit {
  /** Projected gross profit in dollars (clearly labeled "proj." in the UI). */
  gross: number;
  /** Portion attributable to markup on sub + material cost. */
  subMarkup: number;
  /** Assumed margin percent (whole number). */
  marginPct: number;
}

export interface BudgetDna {
  totalWeeks: number;
  /** Bottom → top stacking order. */
  series: CategorySeries[];
  totals: DnaTotals;
  /** Cumulative-spend front (0..totalWeeks). */
  currentWeek: number;
  ticks: PaymentTick[];
  /** Null on the Owner lane (and any non-builder lane) — no margin shown. */
  profit: BudgetDnaProfit | null;
  /** True when there's nothing to draw (no lines). */
  empty: boolean;
}

/** Distribute `amount` uniformly across weeks [start, end) into `bucket`. */
function spread(bucket: number[], amount: number, start: number, end: number): void {
  const lo = Math.max(0, Math.floor(start));
  const hi = Math.min(bucket.length, Math.ceil(end));
  const span = hi - lo;
  if (span <= 0 || amount === 0) return;
  const per = amount / span;
  for (let w = lo; w < hi; w++) bucket[w] += per;
}

const SUBMARKUP_CATEGORIES = new Set<CategoryId>([
  'foundation', 'framing', 'envelope', 'systems', 'finishes', 'site', 'site-improv',
]);

export function deriveBudgetDna(input: {
  lines: DnaLine[];
  phases: PhaseInput[];
  totals: DnaTotals;
  lane: BudgetLens;
}): BudgetDna {
  const { lines, phases, totals, lane } = input;
  const scheduled = schedulePhases(phases);
  const totalWeeks = totalScheduleWeeks(scheduled);

  // One weekly bucket per category, in canonical order.
  const series: CategorySeries[] = CATEGORIES.map((c) => ({
    id: c.id,
    weekly: new Array(totalWeeks).fill(0),
    total: 0,
  }));
  const seriesById = new Map(series.map((s) => [s.id, s]));

  let subMarkupBase = 0;
  for (const line of lines) {
    const catId = lineToCategory(line);
    const s = seriesById.get(catId)!;
    const win = lineToTimeWindow(line, scheduled);
    spread(s.weekly, line.amount, win.start, win.end);
    s.total += line.amount;
    if (SUBMARKUP_CATEGORIES.has(catId)) subMarkupBase += line.amount;
  }

  // Shared playhead: first week where cumulative planned cost ≥ spent.
  const perWeekTotal = new Array(totalWeeks).fill(0);
  for (const s of series) for (let w = 0; w < totalWeeks; w++) perWeekTotal[w] += s.weekly[w];
  let currentWeek = 0;
  let running = 0;
  for (let w = 0; w < totalWeeks; w++) {
    running += perWeekTotal[w];
    if (running >= totals.spent) { currentWeek = w + 1; break; }
    currentWeek = w + 1;
  }
  currentWeek = Math.max(0, Math.min(totalWeeks, currentWeek));

  // Payment ticks — a mark per line at the week its work wraps (its window end).
  // paid lines → 'paid'; unpaid lines due in the past → 'overdue'; unpaid lines
  // due soon → 'due'. Far-future unpaid lines emit no tick (keeps it readable).
  const ticks: PaymentTick[] = [];
  for (const line of lines) {
    const win = lineToTimeWindow(line, scheduled);
    const dueWeek = Math.max(0, Math.min(totalWeeks, Math.round(win.end)));
    if (line.state === 'paid') {
      ticks.push({ week: dueWeek, kind: 'paid', amount: line.amount, label: line.description ?? 'Paid' });
    } else if (dueWeek < currentWeek) {
      ticks.push({ week: dueWeek, kind: 'overdue', amount: line.amount, label: line.description ?? 'Overdue' });
    } else if (dueWeek <= currentWeek + 4) {
      ticks.push({ week: dueWeek, kind: 'due', amount: line.amount, label: line.description ?? 'Due' });
    }
  }
  ticks.sort((a, b) => a.week - b.week);

  // Lens-gated projected gross profit (builder lanes only).
  let profit: BudgetDnaProfit | null = null;
  if (lensSeesProfit(lane)) {
    const gross = Math.round(totals.total * GROSS_MARGIN_PCT);
    const subMarkup = Math.round(subMarkupBase * SUB_MARKUP_PCT);
    profit = { gross, subMarkup, marginPct: Math.round(GROSS_MARGIN_PCT * 100) };
  }

  return {
    totalWeeks,
    series,
    totals,
    currentWeek,
    ticks,
    profit,
    empty: lines.length === 0,
  };
}
