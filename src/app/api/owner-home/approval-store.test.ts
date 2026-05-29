import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  FRAMING_APPROVAL_MARKER,
  FRAMING_APPROVAL_AMOUNT,
  readFramingApprovalStatus,
  setFramingApprovalStatus,
} from './approval-store';

const PROJECT = '55730cd3-5225-493d-8b5c-49086d942565';

/**
 * Minimal in-memory stand-in for project_change_orders supporting exactly the
 * query shapes approval-store uses: select().eq().eq().maybeSingle(),
 * update().eq(), insert([...]). Lets us prove the approve → read-back loop
 * persists without a live database.
 */
interface Row { id: string; project_id: string; description: string; status: string; [k: string]: unknown }

function makeDb(seed: Row[] = [], opts: { failReads?: boolean } = {}) {
  const rows: Row[] = seed.map((r) => ({ ...r }));
  let nextId = seed.length + 1;

  function builder() {
    const filters: Array<[string, unknown]> = [];
    const api: Record<string, unknown> = {
      select: () => api,
      eq: (col: string, val: unknown) => { filters.push([col, val]); return api; },
      maybeSingle: async () => {
        if (opts.failReads) return { data: null, error: { message: 'boom' } };
        const m = rows.filter((r) => filters.every(([c, v]) => r[c] === v));
        return { data: m[0] ?? null, error: null };
      },
      update: (patch: Record<string, unknown>) => ({
        eq: async (col: string, val: unknown) => {
          rows.filter((r) => r[col] === val).forEach((r) => Object.assign(r, patch));
          return { error: null };
        },
      }),
      insert: async (newRows: Row[]) => {
        newRows.forEach((r) => rows.push({ ...r, id: String(nextId++) }));
        return { error: null };
      },
    };
    return api;
  }

  const db = { from: () => builder() } as unknown as SupabaseClient;
  return { db, rows };
}

describe('owner-home approval-store (project_change_orders round-trip)', () => {
  it('reads pending when no approval row exists (fail-closed)', async () => {
    const { db } = makeDb();
    expect(await readFramingApprovalStatus(db, PROJECT)).toBe('pending');
  });

  it('approve → persists an approved marker row → read-back returns approved', async () => {
    const { db, rows } = makeDb();
    const res = await setFramingApprovalStatus(db, PROJECT, true);
    expect(res).toEqual({ ok: true, status: 'approved' });

    // A single marker row was written, with the canonical amount + marker.
    expect(rows).toHaveLength(1);
    expect(rows[0].description).toBe(FRAMING_APPROVAL_MARKER);
    expect(rows[0].status).toBe('approved');
    expect(rows[0].cost_impact).toBe(FRAMING_APPROVAL_AMOUNT);

    // THE GATE: a fresh read (simulating leave → return) still sees approved.
    expect(await readFramingApprovalStatus(db, PROJECT)).toBe('approved');
  });

  it('approve is idempotent — repeated approve never duplicates the row', async () => {
    const { db, rows } = makeDb();
    await setFramingApprovalStatus(db, PROJECT, true);
    await setFramingApprovalStatus(db, PROJECT, true);
    expect(rows).toHaveLength(1);
    expect(await readFramingApprovalStatus(db, PROJECT)).toBe('approved');
  });

  it('unapprove (Undo) reverts to pending and round-trips', async () => {
    const { db } = makeDb();
    await setFramingApprovalStatus(db, PROJECT, true);
    expect(await readFramingApprovalStatus(db, PROJECT)).toBe('approved');
    await setFramingApprovalStatus(db, PROJECT, false);
    expect(await readFramingApprovalStatus(db, PROJECT)).toBe('pending');
  });

  it('isolates by project_id — another project is unaffected', async () => {
    const { db } = makeDb();
    await setFramingApprovalStatus(db, PROJECT, true);
    expect(await readFramingApprovalStatus(db, 'some-other-project')).toBe('pending');
  });

  it('fail-closed: a read error resolves to pending, never approved', async () => {
    const { db } = makeDb([], { failReads: true });
    expect(await readFramingApprovalStatus(db, PROJECT)).toBe('pending');
  });
});
