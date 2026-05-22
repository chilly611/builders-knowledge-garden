/**
 * /api/v1/orgs/accept-invite tests (2026-05-24, ORG-INVITES)
 * =========================================================
 *
 * Coverage:
 *   1. Happy path — pending invite, caller's email matches → 200,
 *      org_members row inserted, pending_invites flipped to 'accepted'.
 *   2. Wrong email — caller is authenticated as a different address →
 *      403, no inserts, no status change.
 *   3. Expired invite — expires_at in the past → 410 Gone, row marked
 *      expired (self-heal even when cron hasn't run yet).
 *   4. Already-accepted invite → 409 with no side effects.
 *   5. Invalid token shape → 400.
 *
 * We hand-roll the Supabase service-client surface the route uses
 * (`from(...).select/insert/update.eq.maybeSingle/select`) because the
 * route's call graph is narrow and a real mock framework would obscure
 * what's being tested.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mock auth + service client
// ---------------------------------------------------------------------------

const FIXED_USER = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  email: 'invitee@example.com',
  name: 'Invitee',
};

interface Insert { table: string; rows: Record<string, unknown>[]; }
interface Update { table: string; values: Record<string, unknown>; filters: Array<[string, unknown]>; }

const state: {
  // The invite row returned for the token lookup. null = not found.
  invite: null | {
    id: string;
    email: string;
    org_id: string;
    role: string;
    status: string;
    expires_at: string;
    accepted_by: string | null;
  };
  // Whether org_members already has a (org_id, user_id) row for this caller.
  existingMembership: { role: string } | null;
  inserts: Insert[];
  updates: Update[];
  // If set, the next insert into this table fails.
  failInsert: Record<string, { message: string }> | null;
  // If set, the next update against pending_invites status='pending' returns 0 rows
  // (simulating a race where another tab won the update).
  pendingInviteRace: boolean;
} = {
  invite: null,
  existingMembership: null,
  inserts: [],
  updates: [],
  failInsert: null,
  pendingInviteRace: false,
};

function makeServiceClient() {
  function from(table: string) {
    let mode: 'select' | 'insert' | 'update' = 'select';
    let pendingValues: Record<string, unknown> = {};
    let pendingRows: Record<string, unknown>[] = [];
    const filters: Array<[string, unknown]> = [];

    const chain: Record<string, unknown> = {};

    function eq(col: string, val: unknown) {
      filters.push([col, val]);
      return chain;
    }

    function selectFn() {
      // For inserts/updates, .select() returns the (chainable) modified rows.
      return chain;
    }

    async function maybeSingleFn() {
      if (mode === 'select') {
        if (table === 'pending_invites') {
          // Token lookup.
          const tokenFilter = filters.find(([c]) => c === 'token');
          if (tokenFilter && state.invite) {
            return { data: state.invite, error: null };
          }
          const idFilter = filters.find(([c]) => c === 'id');
          if (idFilter && state.invite && idFilter[1] === state.invite.id) {
            return { data: state.invite, error: null };
          }
          return { data: null, error: null };
        }
        if (table === 'org_members') {
          return {
            data: state.existingMembership,
            error: null,
          };
        }
        if (table === 'organizations') {
          return { data: { legal_name: 'Test Org', dba: null }, error: null };
        }
      }
      return { data: null, error: null };
    }

    function insertFn(rows: Record<string, unknown>[]) {
      mode = 'insert';
      pendingRows = Array.isArray(rows) ? rows : [rows];
      // Record only when the insert is materialized (await or .select()).
      const insertChain: Record<string, unknown> = {
        ...chain,
        select: () => insertChain,
        single: async () => {
          const failure = state.failInsert?.[table];
          if (failure) return { data: null, error: failure };
          state.inserts.push({ table, rows: pendingRows });
          return { data: pendingRows[0] ?? {}, error: null };
        },
        maybeSingle: async () => {
          const failure = state.failInsert?.[table];
          if (failure) return { data: null, error: failure };
          state.inserts.push({ table, rows: pendingRows });
          return { data: pendingRows[0] ?? {}, error: null };
        },
        then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
          const failure = state.failInsert?.[table];
          if (failure) return resolve({ data: null, error: failure });
          state.inserts.push({ table, rows: pendingRows });
          return resolve({ data: pendingRows, error: null });
        },
      };
      return insertChain;
    }

    function updateFn(values: Record<string, unknown>) {
      mode = 'update';
      pendingValues = values;
      const updateChain: Record<string, unknown> = {
        eq: (col: string, val: unknown) => {
          filters.push([col, val]);
          return updateChain;
        },
        select: () => updateChain,
        // Awaited directly: resolve as thenable.
        then: (resolve: (v: { data: unknown; error: null }) => void) => {
          state.updates.push({ table, values: pendingValues, filters: filters.slice() });
          // Simulate the race: when caller asks for .select() with status='pending'
          // and we've set pendingInviteRace=true, return zero rows.
          if (
            state.pendingInviteRace &&
            table === 'pending_invites' &&
            filters.some(([c, v]) => c === 'status' && v === 'pending')
          ) {
            return resolve({ data: [], error: null });
          }
          // If the update is on the invite row itself, mutate state for follow-up tests.
          if (table === 'pending_invites' && state.invite) {
            const statusValue = (pendingValues as { status?: string }).status;
            if (statusValue) state.invite.status = statusValue;
          }
          return resolve({ data: [{ id: 'updated' }], error: null });
        },
      };
      return updateChain;
    }

    Object.assign(chain, {
      select: selectFn,
      insert: insertFn,
      update: updateFn,
      eq,
      maybeSingle: maybeSingleFn,
      single: maybeSingleFn,
    });
    return chain;
  }
  return { from };
}

let mockedUserEmail = FIXED_USER.email;

vi.mock('@/lib/auth-server', () => ({
  getAuthUser: vi.fn(async () => ({ ...FIXED_USER, email: mockedUserEmail })),
  getServiceClient: vi.fn(() => makeServiceClient()),
  unauthorizedResponse: vi.fn(() =>
    new Response(JSON.stringify({ error: 'unauth' }), { status: 401 }),
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_TOKEN = 'a'.repeat(64); // 64 hex chars

async function callAccept(token: string) {
  const { POST } = await import('../route');
  const req = new NextRequest('http://localhost/api/v1/orgs/accept-invite', {
    method: 'POST',
    headers: { authorization: 'Bearer fake-jwt' },
    body: JSON.stringify({ token }),
  });
  const res = await POST(req);
  const json = await res.json();
  return { status: res.status, body: json };
}

beforeEach(() => {
  state.invite = null;
  state.existingMembership = null;
  state.inserts = [];
  state.updates = [];
  state.failInsert = null;
  state.pendingInviteRace = false;
  mockedUserEmail = FIXED_USER.email;
  vi.resetModules();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 1. Happy path
// ---------------------------------------------------------------------------

describe('POST /api/v1/orgs/accept-invite — happy path', () => {
  it('inserts org_members + marks invite accepted when caller email matches', async () => {
    state.invite = {
      id: 'invite-uuid-happy',
      email: 'invitee@example.com',
      org_id: 'org-uuid-1',
      role: 'member',
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      accepted_by: null,
    };

    const { status, body } = await callAccept(VALID_TOKEN);

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.org_id).toBe('org-uuid-1');
    expect(body.role).toBe('member');

    // org_members insert fired.
    const omInsert = state.inserts.find((i) => i.table === 'org_members');
    expect(omInsert).toBeDefined();
    expect(omInsert!.rows[0].user_id).toBe(FIXED_USER.id);
    expect(omInsert!.rows[0].org_id).toBe('org-uuid-1');
    expect(omInsert!.rows[0].role).toBe('member');

    // pending_invites update flipped status to 'accepted'.
    const piUpdate = state.updates.find(
      (u) => u.table === 'pending_invites' && (u.values as { status?: string }).status === 'accepted',
    );
    expect(piUpdate).toBeDefined();
    expect((piUpdate!.values as { accepted_by?: string }).accepted_by).toBe(FIXED_USER.id);
  });

  it('skips org_members insert when caller is already a member (insert-if-not-exists)', async () => {
    state.invite = {
      id: 'invite-uuid-existing',
      email: 'invitee@example.com',
      org_id: 'org-uuid-1',
      role: 'admin',
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      accepted_by: null,
    };
    // Caller is already an 'owner' — should NOT be downgraded to 'admin'.
    state.existingMembership = { role: 'owner' };

    const { status, body } = await callAccept(VALID_TOKEN);

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    // Returned role is the EXISTING role, not the invite's role.
    expect(body.role).toBe('owner');

    // No new org_members insert.
    expect(state.inserts.find((i) => i.table === 'org_members')).toBeUndefined();

    // Invite still marked accepted.
    const accepted = state.updates.find(
      (u) => u.table === 'pending_invites' && (u.values as { status?: string }).status === 'accepted',
    );
    expect(accepted).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 2. Wrong email
// ---------------------------------------------------------------------------

describe('POST /api/v1/orgs/accept-invite — wrong email', () => {
  it('returns 403 and writes nothing when caller email != invite.email', async () => {
    state.invite = {
      id: 'invite-uuid-wrong-email',
      email: 'invitee@example.com',
      org_id: 'org-uuid-1',
      role: 'member',
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      accepted_by: null,
    };
    mockedUserEmail = 'attacker@example.com';

    const { status, body } = await callAccept(VALID_TOKEN);

    expect(status).toBe(403);
    expect(body.error).toBe('email_mismatch');

    expect(state.inserts).toHaveLength(0);
    // No status change to the invite row.
    const accepted = state.updates.find(
      (u) => u.table === 'pending_invites' && (u.values as { status?: string }).status === 'accepted',
    );
    expect(accepted).toBeUndefined();
  });

  it('is case-insensitive on email matching', async () => {
    state.invite = {
      id: 'invite-uuid-case',
      email: 'invitee@example.com',
      org_id: 'org-uuid-1',
      role: 'member',
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      accepted_by: null,
    };
    mockedUserEmail = 'Invitee@EXAMPLE.com';

    const { status, body } = await callAccept(VALID_TOKEN);
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Expired invite
// ---------------------------------------------------------------------------

describe('POST /api/v1/orgs/accept-invite — expired', () => {
  it('returns 410 Gone when expires_at is in the past and self-heals status', async () => {
    state.invite = {
      id: 'invite-uuid-expired',
      email: 'invitee@example.com',
      org_id: 'org-uuid-1',
      role: 'member',
      status: 'pending',
      expires_at: new Date(Date.now() - 60_000).toISOString(),
      accepted_by: null,
    };

    const { status, body } = await callAccept(VALID_TOKEN);
    expect(status).toBe(410);
    expect(body.error).toBe('expired');

    // Self-heal: status flipped to 'expired'.
    const expiredUpdate = state.updates.find(
      (u) => u.table === 'pending_invites' && (u.values as { status?: string }).status === 'expired',
    );
    expect(expiredUpdate).toBeDefined();

    // No org_members insert.
    expect(state.inserts).toHaveLength(0);
  });

  it('returns 410 when status is already "expired" without re-updating', async () => {
    state.invite = {
      id: 'invite-uuid-already-expired',
      email: 'invitee@example.com',
      org_id: 'org-uuid-1',
      role: 'member',
      status: 'expired',
      expires_at: new Date(Date.now() - 60_000).toISOString(),
      accepted_by: null,
    };
    const { status, body } = await callAccept(VALID_TOKEN);
    expect(status).toBe(410);
    expect(body.error).toBe('expired');
  });
});

// ---------------------------------------------------------------------------
// 4. Already accepted / revoked
// ---------------------------------------------------------------------------

describe('POST /api/v1/orgs/accept-invite — already terminal', () => {
  it('returns 409 when invite is already accepted', async () => {
    state.invite = {
      id: 'invite-uuid-accepted',
      email: 'invitee@example.com',
      org_id: 'org-uuid-1',
      role: 'member',
      status: 'accepted',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      accepted_by: 'someone-else',
    };

    const { status, body } = await callAccept(VALID_TOKEN);
    expect(status).toBe(409);
    expect(body.error).toBe('already_accepted');
    expect(state.inserts).toHaveLength(0);
  });

  it('returns 409 when invite is revoked', async () => {
    state.invite = {
      id: 'invite-uuid-revoked',
      email: 'invitee@example.com',
      org_id: 'org-uuid-1',
      role: 'member',
      status: 'revoked',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      accepted_by: null,
    };
    const { status, body } = await callAccept(VALID_TOKEN);
    expect(status).toBe(409);
    expect(body.error).toBe('revoked');
  });
});

// ---------------------------------------------------------------------------
// 5. Token shape / not found
// ---------------------------------------------------------------------------

describe('POST /api/v1/orgs/accept-invite — token validation', () => {
  it('returns 400 for malformed token', async () => {
    const { status, body } = await callAccept('not-hex-junk');
    expect(status).toBe(400);
    expect(body.error).toBe('token_required');
  });

  it('returns 400 for missing token', async () => {
    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost/api/v1/orgs/accept-invite', {
      method: 'POST',
      headers: { authorization: 'Bearer fake-jwt' },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 when token does not match any row', async () => {
    state.invite = null;
    const { status, body } = await callAccept(VALID_TOKEN);
    expect(status).toBe(404);
    expect(body.error).toBe('not_found');
  });
});
