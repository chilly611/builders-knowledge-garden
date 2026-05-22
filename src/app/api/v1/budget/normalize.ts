/**
 * Pure normalizer for the `/api/v1/budget` POST/PATCH `lines` payload.
 *
 * Extracted into its own module (BUDGET-WRITE round-3, 2026-05-22) so the
 * unit test can import without pulling the entire route module graph
 * (Next/server, @supabase/supabase-js, @/lib/auth-server) into the test
 * runner — same pattern as src/app/killerapp/budget/budget-storage.ts.
 *
 * Contract:
 *   - Drops rows whose csi_division is missing/empty (the partial UNIQUE
 *     index on project_budget_lines(project_id, csi_division) WHERE
 *     csi_division IS NOT NULL would otherwise admit duplicates, and the
 *     read-path bucketing relies on a non-empty division value).
 *   - Coerces numeric strings; falls back to `amount` when `budgeted` is
 *     absent (BudgetClient sends `amount`, EstimatingClient sends
 *     `budgeted`).
 *   - Preserves `stage_id` only when it's a valid 1..7 integer so we
 *     don't overwrite a backfilled value with garbage.
 */

export interface NormalizedBudgetLine {
  project_id: string;
  csi_division: string;
  description: string | null;
  budgeted: number;
  committed: number;
  actual_spent: number;
  stage_id?: number;
}

function num(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeBudgetLinesPayload(
  projectId: string,
  lines: unknown,
): NormalizedBudgetLine[] {
  if (!Array.isArray(lines)) return [];
  const out: NormalizedBudgetLine[] = [];
  for (const raw of lines) {
    if (!raw || typeof raw !== 'object') continue;
    const l = raw as Record<string, unknown>;
    if (l.csi_division === undefined || l.csi_division === null) continue;
    const csi = String(l.csi_division);
    if (csi.length === 0) continue;
    const row: NormalizedBudgetLine = {
      project_id: projectId,
      csi_division: csi,
      description: (l.description as string | undefined) ?? null,
      budgeted: num(l.budgeted ?? l.amount ?? 0),
      committed: num(l.committed ?? 0),
      actual_spent: num(l.actual_spent ?? 0),
    };
    if (l.stage_id !== undefined && l.stage_id !== null) {
      const stageNum = typeof l.stage_id === 'number'
        ? l.stage_id
        : parseInt(String(l.stage_id), 10);
      if (Number.isFinite(stageNum) && stageNum >= 1 && stageNum <= 7) {
        row.stage_id = stageNum;
      }
    }
    out.push(row);
  }
  return out;
}
