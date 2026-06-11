/**
 * /api/v1/projects PATCH — invited-collaborator save tests (P0 close, 2026-06-11)
 * ===============================================================================
 *
 * The original P0: a NON-OWNER invited collaborator's project saves silently
 * vanished. Mechanism: the PATCH ownership check only granted owner + demo,
 * so collaborators got 403 — which every killerapp save path swallowed.
 * PATCH now routes through assertProjectWriteAccess, which also grants any
 * `project_members` row (src/lib/auth/projectOwnership.ts).
 *
 * These tests exercise the REAL route handler and the REAL projectOwnership
 * grant logic; only the auth-server module (token resolution + service
 * client) is mocked, per the repo's route-test convention (see
 * onboard-new-user/__tests__/onboard.test.ts).
 *
 * Coverage:
 *   1. Non-owner WITH a project_members row → 200, update persisted.
 *   2. Non-owner WITHOUT membership → 403 + error body (visible failure).
 *   3. Owner → 200 (regression guard).
 *   4. Unauthenticated → 401.
 *   5. user_id is stripped from collaborator updates (no ownership theft).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const COLLABORATOR_ID = '22222222-2222-4222-8222-222222222222';
const PROJECT_ID = '33333333-3333-4333-8333-333333333333';

interface MockState {
  user: null | { id: string; email: string; name: string };
  /** user ids holding a project_members row on PROJECT_ID */
  members: string[];
  lastUpdate: null | {
    table: string;
    values: Record<string, unknown>;
    filterId: string;
  };
}

const state: MockState = { user: null, members: [], lastUpdate: null };

// Service client mock: supports the three query shapes the PATCH path uses —
//   from('command_center_projects').select('user_id').eq('id', id).single()
//   from('project_members').select('id').eq(...).eq(...).limit(1)
//   from('command_center_projects').update(v).eq('id', id).select().single()
function makeServiceClient() {
  return {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      let updateValues: Record<string, unknown> | null = null;
      const chain = {
        select: () => chain,
        update: (values: Record<string, unknown>) => {
          updateValues = values;
          return chain;
        },
        eq: (col: string, val: unknown) => {
          filters[col] = val;
          return chain;
        },
        limit: async () => {
          if (table === 'project_members') {
            const rows = state.members
              .filter((uid) => uid === filters.user_id && filters.project_id === PROJECT_ID)
              .map((uid) => ({ id: `member-row-${uid}` }));
            return { data: rows, error: null };
          }
          return { data: [], error: null };
        },
        single: async () => {
          if (table === 'command_center_projects' && updateValues) {
            state.lastUpdate = {
              table,
              values: updateValues,
              filterId: String(filters.id),
            };
            return {
              data: { id: filters.id, user_id: OWNER_ID, ...updateValues },
              error: null,
            };
          }
          if (table === 'command_center_projects') {
            if (filters.id !== PROJECT_ID) {
              return { data: null, error: { message: 'not found' } };
            }
            return { data: { user_id: OWNER_ID }, error: null };
          }
          return { data: null, error: { message: `unexpected table ${table}` } };
        },
      };
      return chain;
    },
  };
}

// vitest has no `@/` alias resolution (repo convention: tests mock every
// `@/` specifier). We want the REAL grant logic under test, so redirect the
// alias to the actual module via a relative path.
vi.mock('@/lib/auth/projectOwnership', () =>
  vi.importActual('../../../../../lib/auth/projectOwnership')
);

vi.mock('@/lib/auth-server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    getAuthUser: async () => state.user,
    getServiceClient: () => makeServiceClient(),
    unauthorizedResponse: (message = 'Authentication required') =>
      NextResponse.json({ error: message }, { status: 401 }),
  };
});

import { PATCH } from '../route';

function patchRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/v1/projects', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  state.user = null;
  state.members = [];
  state.lastUpdate = null;
});

describe('PATCH /api/v1/projects — collaborator saves (P0)', () => {
  it('persists a save from a NON-OWNER invited collaborator (project_members row)', async () => {
    state.user = { id: COLLABORATOR_ID, email: 'collab@example.com', name: 'Collab' };
    state.members = [COLLABORATOR_ID];

    const res = await PATCH(
      patchRequest({ id: PROJECT_ID, notes: 'collaborator edit', progress: 40 })
    );
    expect(res.status).toBe(200);

    const body = (await res.json()) as { project: Record<string, unknown> };
    expect(body.project.notes).toBe('collaborator edit');

    // The save actually reached the DB update — persistence, not a swallowed 403.
    expect(state.lastUpdate).not.toBeNull();
    expect(state.lastUpdate!.filterId).toBe(PROJECT_ID);
    expect(state.lastUpdate!.values.notes).toBe('collaborator edit');
    expect(state.lastUpdate!.values.progress).toBe(40);
  });

  it('returns a visible 403 error for a non-owner with NO membership', async () => {
    state.user = { id: COLLABORATOR_ID, email: 'stranger@example.com', name: 'Stranger' };
    state.members = []; // not a member

    const res = await PATCH(patchRequest({ id: PROJECT_ID, notes: 'drive-by edit' }));
    expect(res.status).toBe(403);

    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/do not own/i);
    // Nothing persisted.
    expect(state.lastUpdate).toBeNull();
  });

  it('still persists owner saves (regression guard)', async () => {
    state.user = { id: OWNER_ID, email: 'owner@example.com', name: 'Owner' };

    const res = await PATCH(patchRequest({ id: PROJECT_ID, notes: 'owner edit' }));
    expect(res.status).toBe(200);
    expect(state.lastUpdate!.values.notes).toBe('owner edit');
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await PATCH(patchRequest({ id: PROJECT_ID, notes: 'anon edit' }));
    expect(res.status).toBe(401);
    expect(state.lastUpdate).toBeNull();
  });

  it('strips user_id from collaborator updates (no ownership transfer)', async () => {
    state.user = { id: COLLABORATOR_ID, email: 'collab@example.com', name: 'Collab' };
    state.members = [COLLABORATOR_ID];

    const res = await PATCH(
      patchRequest({ id: PROJECT_ID, notes: 'sneaky', user_id: COLLABORATOR_ID })
    );
    expect(res.status).toBe(200);
    expect(state.lastUpdate!.values.user_id).toBeUndefined();
  });
});
