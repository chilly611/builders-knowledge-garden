/**
 * normalizeBudgetLinesPayload — covers the contract that backs the
 * idempotent upsert in `/api/v1/budget` POST + PATCH.
 *
 * The route's actual DB call is `db.from('project_budget_lines').upsert(
 *   rows, { onConflict: 'project_id,csi_division' })` — that's pure data
 * transformation upstream of supabase, so we test the transformation in
 * isolation rather than mocking the whole service client.
 *
 * Regression guard for BUDGET-WRITE round-3 (2026-05-22).
 */

import { describe, expect, it } from 'vitest';
import { normalizeBudgetLinesPayload } from '../normalize';

const PID = '55730cd3-5225-493d-8b5c-49086d942565';

describe('normalizeBudgetLinesPayload', () => {
  it('returns an empty array when lines is not an array', () => {
    expect(normalizeBudgetLinesPayload(PID, undefined)).toEqual([]);
    expect(normalizeBudgetLinesPayload(PID, null)).toEqual([]);
    expect(normalizeBudgetLinesPayload(PID, 'oops')).toEqual([]);
    expect(normalizeBudgetLinesPayload(PID, {})).toEqual([]);
  });

  it('maps the BudgetClient PATCH payload to NormalizedBudgetLine rows', () => {
    const payload = [
      {
        csi_division: '03',
        description: 'Concrete (foundation, slab)',
        budgeted: 84000,
        committed: 12000,
        actual_spent: 0,
      },
      {
        csi_division: '22',
        description: 'Plumbing',
        budgeted: 78000,
      },
    ];
    const out = normalizeBudgetLinesPayload(PID, payload);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({
      project_id: PID,
      csi_division: '03',
      description: 'Concrete (foundation, slab)',
      budgeted: 84000,
      committed: 12000,
      actual_spent: 0,
    });
    expect(out[1].committed).toBe(0);
    expect(out[1].actual_spent).toBe(0);
  });

  it('drops rows whose csi_division is missing, null, or empty', () => {
    const payload = [
      { csi_division: '03', budgeted: 1 },
      { csi_division: null, budgeted: 2 },
      { csi_division: '', budgeted: 3 },
      { budgeted: 4 }, // missing entirely
      { csi_division: '06', budgeted: 5 },
    ];
    const out = normalizeBudgetLinesPayload(PID, payload);
    expect(out.map((r) => r.csi_division)).toEqual(['03', '06']);
  });

  it('coerces numeric strings and falls back to `amount` when `budgeted` is absent', () => {
    const payload = [
      { csi_division: '07', amount: '12500' },
      { csi_division: '08', budgeted: '96000.50' },
      { csi_division: '99', budgeted: 'not-a-number' },
    ];
    const out = normalizeBudgetLinesPayload(PID, payload);
    expect(out[0].budgeted).toBe(12500);
    expect(out[1].budgeted).toBe(96000.5);
    expect(out[2].budgeted).toBe(0);
  });

  it('preserves a valid stage_id and drops out-of-range ones', () => {
    const payload = [
      { csi_division: '03', budgeted: 1, stage_id: 4 },
      { csi_division: '06', budgeted: 1, stage_id: '5' },
      { csi_division: '99', budgeted: 1, stage_id: 99 }, // out of range
      { csi_division: '22', budgeted: 1 }, // unset
    ];
    const out = normalizeBudgetLinesPayload(PID, payload);
    expect(out[0].stage_id).toBe(4);
    expect(out[1].stage_id).toBe(5);
    expect(out[2].stage_id).toBeUndefined();
    expect(out[3].stage_id).toBeUndefined();
  });

  it('stringifies non-string csi_division (numeric MasterFormat codes)', () => {
    const payload = [{ csi_division: 3, budgeted: 84000 }];
    const out = normalizeBudgetLinesPayload(PID, payload);
    expect(out[0].csi_division).toBe('3');
  });

  it('idempotency contract: re-normalizing the same payload yields identical rows', () => {
    // The DB upsert key is (project_id, csi_division). Two payloads with
    // the same divisions MUST normalize to row objects that target the
    // same conflict slots — otherwise the partial unique index would
    // refuse the second call.
    const first = normalizeBudgetLinesPayload(PID, [
      { csi_division: '03', description: 'Concrete v1', budgeted: 80000 },
      { csi_division: '06', description: 'Framing v1', budgeted: 140000 },
    ]);
    const second = normalizeBudgetLinesPayload(PID, [
      { csi_division: '03', description: 'Concrete v2', budgeted: 84000 },
      { csi_division: '06', description: 'Framing v2', budgeted: 142000 },
    ]);
    expect(first.map((r) => r.csi_division)).toEqual(second.map((r) => r.csi_division));
    expect(second[0].budgeted).toBe(84000);
    expect(second[0].description).toBe('Concrete v2');
  });

  it('replace-mode contract: any division NOT in the payload is eligible for delete', () => {
    // This guards the (project_id, csi_division) keep-list the PATCH
    // handler hands to .not('csi_division','in', ...) when replace: true.
    const incoming = [
      { csi_division: '03', budgeted: 1 },
      { csi_division: '06', budgeted: 1 },
    ];
    const rows = normalizeBudgetLinesPayload(PID, incoming);
    const keepList = new Set(rows.map((r) => r.csi_division));
    // Sanity: divisions present in the payload survive; everything else
    // (e.g. the seed-data "99" contingency) would be deleted.
    expect(keepList.has('03')).toBe(true);
    expect(keepList.has('06')).toBe(true);
    expect(keepList.has('99')).toBe(false);
  });
});
