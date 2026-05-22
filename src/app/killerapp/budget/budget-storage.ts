/**
 * budget-storage — pure helpers for the BudgetClient localStorage spine.
 *
 * Extracted into its own module (2026-05-22 DATA+DEMO fix) so the unit test
 * can import without pulling the entire BudgetClient module graph
 * (supabase, Next/Link, design-system tokens, etc.) into the test runner.
 *
 * Two callers write here:
 *   - BudgetClient itself (`bkg-budget-{projectId}`, bare array shape)
 *   - EstimatingClient AI push (`bkg-budget-{projectId}`, `{ lines: [...] }`
 *     envelope) — see EstimatingClient.tsx around the "Ship 33 — stable IDs"
 *     comment.
 *
 * Before this fix `readLines` did `Array.isArray(parsed) ? parsed : []`,
 * which silently dropped every AI-pushed line because EstimatingClient
 * always writes the envelope shape. This module accepts both shapes.
 */

export type BudgetState = 'pending' | 'estimated' | 'locked-in' | 'paid';

export interface BudgetLine {
  id: string;
  category: string;
  description: string;
  amount: number;
  state: BudgetState;
  vendor?: string;
  dueDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const STATE_ORDER: BudgetState[] = [
  'pending',
  'estimated',
  'locked-in',
  'paid',
];

/**
 * Coerce an arbitrary parsed-from-localStorage value into a clean
 * `BudgetLine[]`. Accepts BOTH shapes (bare array + `{ lines: [...] }`)
 * and drops any malformed entries defensively.
 */
export function normalizeStoredLines(parsed: unknown): BudgetLine[] {
  const arr = Array.isArray(parsed)
    ? parsed
    : parsed &&
        typeof parsed === 'object' &&
        Array.isArray((parsed as { lines?: unknown }).lines)
      ? ((parsed as { lines: unknown[] }).lines)
      : [];
  return arr.filter(
    (l): l is BudgetLine =>
      !!l &&
      typeof l === 'object' &&
      typeof (l as BudgetLine).id === 'string' &&
      typeof (l as BudgetLine).category === 'string' &&
      typeof (l as BudgetLine).amount === 'number' &&
      Number.isFinite((l as BudgetLine).amount) &&
      STATE_ORDER.includes((l as BudgetLine).state),
  );
}

export function storageKeyFor(projectId: string | null): string {
  return `bkg-budget-${projectId ?? 'anonymous'}`;
}
