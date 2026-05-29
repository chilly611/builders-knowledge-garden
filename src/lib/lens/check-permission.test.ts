/**
 * Unit tests for check-permission.ts (Lens enforcement middleware).
 *
 * All tests inject a fake Supabase client — no real DB or network required.
 *
 * Fake client design:
 *   - makeFakeClient(memberships, matrixMap) builds a minimal chainable
 *     query-builder object whose method chain satisfies the exact shape the
 *     middleware uses.
 *   - membership query:  .from('project_lane_memberships')
 *                          .select(...).eq(...).eq(...).is('revoked_at',null)
 *       → awaited directly (the chain is thenable).
 *   - matrix query:     .from('lens_permission_matrix')
 *                          .select(...).eq(...).eq(...).eq(...).maybeSingle()
 *       → returns a Promise<{ data, error }>.
 *   - matrixMap key: `${lane_id}|${data_category}|${action}`
 *     value: boolean (true = matrix row permitted=true; false = row permitted=false).
 *     A missing key means no row exists (absence-is-deny).
 */

import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { checkLensPermission, isLensPermitted } from './check-permission';
import type { DataCategory, LensAction } from './types';

// ---------------------------------------------------------------------------
// Fake query builder
// ---------------------------------------------------------------------------

type MembershipRow = {
  lane_id: string;
  custom_lens_overrides?: Record<string, Record<string, boolean>> | null;
};

/** matrixMap key: `${lane_id}|${data_category}|${action}` → boolean permitted */
type MatrixMap = Record<string, boolean>;

/**
 * Build a minimal fake Supabase client.
 *
 * The returned object satisfies the two distinct query chains the middleware
 * uses, keyed on which table `.from()` is called with.
 *
 * We track whether the matrix was queried per lane, so tests can assert
 * overrides-first behaviour (matrix NOT called when override exists).
 */
function makeFakeClient(
  memberships: MembershipRow[],
  matrixMap: MatrixMap = {},
  membershipError: { message: string } | null = null,
): { client: SupabaseClient; matrixCallKeys: string[] } {
  const matrixCallKeys: string[] = [];

  function makeMembershipChain(): {
    select: (...args: unknown[]) => typeof chain;
    eq: (...args: unknown[]) => typeof chain;
    is: (...args: unknown[]) => typeof chain;
    then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => void;
  } {
    const chain = {
      select(..._args: unknown[]) { return chain; },
      eq(..._args: unknown[]) { return chain; },
      is(..._args: unknown[]) { return chain; },
      then(
        resolve: (v: unknown) => void,
        _reject?: (e: unknown) => void,
      ) {
        if (membershipError) {
          resolve({ data: null, error: membershipError });
        } else {
          resolve({ data: memberships, error: null });
        }
      },
    };
    return chain;
  }

  function makeMatrixChain(
    laneId: string,
    dataCategory: string,
    action: string,
  ): {
    select: (...args: unknown[]) => typeof chain;
    eq: (...args: unknown[]) => typeof chain;
    maybeSingle: () => Promise<{ data: { permitted: boolean } | null; error: null }>;
  } {
    // Each .eq() call accumulates the key segments in order:
    // lane_id, data_category, action.
    const segments: string[] = [laneId, dataCategory, action];
    let eqCallCount = 0;

    const chain = {
      select(..._args: unknown[]) { return chain; },
      eq(_col: unknown, _val: unknown) {
        eqCallCount++;
        return chain;
      },
      maybeSingle() {
        const key = segments.join('|');
        matrixCallKeys.push(key);
        const permitted = matrixMap[key];
        if (permitted === true) {
          return Promise.resolve({ data: { permitted: true }, error: null });
        }
        if (permitted === false) {
          return Promise.resolve({ data: { permitted: false }, error: null });
        }
        // No row in map → absence (maybeSingle returns data: null).
        return Promise.resolve({ data: null, error: null });
      },
    };
    return chain;
  }

  // We need to track eq() calls on the matrix chain to reconstruct the key.
  // The middleware calls .eq('lane_id', laneId).eq('data_category', dc).eq('action', a)
  // in that order. We capture args via a stateful approach per from() call.
  function makeMatrixChainStateful(): {
    select: (...args: unknown[]) => typeof chain;
    eq: (col: unknown, val: unknown) => typeof chain;
    maybeSingle: () => Promise<{ data: { permitted: boolean } | null; error: null }>;
  } {
    const captured: string[] = [];
    const chain = {
      select(..._args: unknown[]) { return chain; },
      eq(_col: unknown, val: unknown) {
        captured.push(String(val));
        return chain;
      },
      maybeSingle() {
        const key = captured.join('|');
        matrixCallKeys.push(key);
        const permitted = matrixMap[key];
        if (permitted === true) {
          return Promise.resolve({ data: { permitted: true }, error: null });
        }
        if (permitted === false) {
          return Promise.resolve({ data: { permitted: false }, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },
    };
    return chain;
  }

  const fakeClient = {
    from(table: string) {
      if (table === 'project_lane_memberships') {
        return makeMembershipChain();
      }
      if (table === 'lens_permission_matrix') {
        return makeMatrixChainStateful();
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient;

  return { client: fakeClient, matrixCallKeys };
}

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const BASE_ARGS = {
  userId: 'user-abc',
  projectId: 'proj-xyz',
  dataCategory: 'schedule' as DataCategory,
  action: 'view' as LensAction,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('checkLensPermission', () => {

  it('1. no active membership → not-permitted', async () => {
    const { client } = makeFakeClient([]);
    const result = await checkLensPermission(BASE_ARGS, client);
    expect(result).toBe('not-permitted');
  });

  it('2. membership query error → not-permitted (fail closed)', async () => {
    const { client } = makeFakeClient(
      [],
      {},
      { message: 'connection refused' },
    );
    const result = await checkLensPermission(BASE_ARGS, client);
    expect(result).toBe('not-permitted');
  });

  it('3. matrix permits: gc lane, schedule/view, matrix true → permitted', async () => {
    const laneId = 'gc-id';
    const matrixMap: MatrixMap = { [`${laneId}|schedule|view`]: true };
    const { client } = makeFakeClient([{ lane_id: laneId }], matrixMap);
    const result = await checkLensPermission(BASE_ARGS, client);
    expect(result).toBe('permitted');
  });

  it('4. matrix denies: worker lane, sub_margin/edit, matrix false → not-permitted', async () => {
    const laneId = 'worker-id';
    const matrixMap: MatrixMap = { [`${laneId}|sub_margin|edit`]: false };
    const { client } = makeFakeClient([{ lane_id: laneId }], matrixMap);
    const result = await checkLensPermission(
      { ...BASE_ARGS, dataCategory: 'sub_margin', action: 'edit' },
      client,
    );
    expect(result).toBe('not-permitted');
  });

  it('5. absent matrix row → not-permitted (absence-is-deny)', async () => {
    // matrixMap has no entry for this lane/category/action.
    const { client } = makeFakeClient([{ lane_id: 'some-lane' }], {});
    const result = await checkLensPermission(BASE_ARGS, client);
    expect(result).toBe('not-permitted');
  });

  it('6. override grants (true) where matrix would deny → permitted; matrix NOT queried', async () => {
    const laneId = 'some-lane';
    // Matrix would deny (false), but override is true — matrix must not be consulted.
    const matrixMap: MatrixMap = { [`${laneId}|sub_margin|view`]: false };
    const { client, matrixCallKeys } = makeFakeClient(
      [{
        lane_id: laneId,
        custom_lens_overrides: { sub_margin: { view: true } },
      }],
      matrixMap,
    );
    const result = await checkLensPermission(
      { ...BASE_ARGS, dataCategory: 'sub_margin', action: 'view' },
      client,
    );
    expect(result).toBe('permitted');
    // The matrix must not have been queried for this (lane, category, action).
    expect(matrixCallKeys.some(k => k.includes(laneId))).toBe(false);
  });

  it('7. override denies (false) where matrix would permit → not-permitted', async () => {
    const laneId = 'gc-id';
    const matrixMap: MatrixMap = { [`${laneId}|schedule|view`]: true };
    const { client } = makeFakeClient(
      [{
        lane_id: laneId,
        custom_lens_overrides: { schedule: { view: false } },
      }],
      matrixMap,
    );
    const result = await checkLensPermission(BASE_ARGS, client);
    expect(result).toBe('not-permitted');
  });

  it('8. revoked membership excluded → not-permitted (fake returns [] for revoked filter)', async () => {
    // The middleware filters .is('revoked_at', null). We simulate this by
    // configuring the fake to return an empty membership list, as the DB would
    // after applying the revoked_at IS NULL filter on a revoked membership.
    const { client } = makeFakeClient([]);
    const result = await checkLensPermission(BASE_ARGS, client);
    expect(result).toBe('not-permitted');
  });

  it('9. multi-membership UNION: lane A denies, lane B permits → permitted', async () => {
    const laneA = 'lane-a';
    const laneB = 'lane-b';
    // Lane A has a false matrix row; lane B has a true matrix row.
    const matrixMap: MatrixMap = {
      [`${laneA}|schedule|view`]: false,
      [`${laneB}|schedule|view`]: true,
    };
    const { client } = makeFakeClient(
      [{ lane_id: laneA }, { lane_id: laneB }],
      matrixMap,
    );
    const result = await checkLensPermission(BASE_ARGS, client);
    expect(result).toBe('permitted');
  });

});

describe('isLensPermitted', () => {

  it('10a. returns true when checkLensPermission returns permitted', async () => {
    const laneId = 'gc-id';
    const matrixMap: MatrixMap = { [`${laneId}|schedule|view`]: true };
    const { client } = makeFakeClient([{ lane_id: laneId }], matrixMap);
    const result = await isLensPermitted(BASE_ARGS, client);
    expect(result).toBe(true);
  });

  it('10b. returns false when checkLensPermission returns not-permitted', async () => {
    const { client } = makeFakeClient([]);
    const result = await isLensPermitted(BASE_ARGS, client);
    expect(result).toBe(false);
  });

});
