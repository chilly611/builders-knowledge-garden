/**
 * /api/v1/knowledge-entities/[id]/attest tests (ATTEST-WIRE, 2026-05-24)
 * =====================================================================
 *
 * Coverage:
 *   1. POST as owner email → 200, UPDATE applied with the trio.
 *   2. POST as owner via app_metadata.role==='admin' → 200.
 *   3. POST without bearer → 403.
 *   4. POST as non-owner email (no admin role) → 403, no UPDATE.
 *   5. POST with default source defaults to 'upcodes-essentials'.
 *   6. POST with explicit source uses that source string.
 *   7. DELETE as owner → 200, trio nulled.
 *
 * We mock @supabase/supabase-js (a) so getUser() returns a fixed shape,
 * and (b) so we capture the UPDATE payload to assert against.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const OWNER_EMAIL = 'chillyd@gmail.com';
const NON_OWNER_EMAIL = 'someone@example.com';
const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const ENTITY_ID = '22222222-2222-4222-8222-222222222222';

interface MockState {
  user: null | {
    id: string;
    email: string;
    app_metadata?: Record<string, unknown>;
  };
  lastUpdate: null | {
    table: string;
    values: Record<string, unknown>;
    filterId: string;
  };
  updateResultData: Record<string, unknown> | null;
  updateError: { code?: string; message: string } | null;
}

const state: MockState = {
  user: null,
  lastUpdate: null,
  updateResultData: null,
  updateError: null,
};

function resetState() {
  state.user = null;
  state.lastUpdate = null;
  state.updateResultData = {
    id: ENTITY_ID,
    slug: 'nec-210-52-c-5',
    title: { en: 'NEC 210.52(C)(5)' },
    manually_verified_at: '2026-05-24T18:12:34.567Z',
    manually_verified_by: OWNER_ID,
    manually_verified_source: 'upcodes-essentials',
  };
  state.updateError = null;
}

vi.mock('@supabase/supabase-js', () => {
  function createClient(_url: string, _key: string) {
    return {
      auth: {
        getUser: async (_token: string) => {
          if (!state.user) {
            return { data: { user: null }, error: { message: 'no user' } };
          }
          return { data: { user: state.user }, error: null };
        },
      },
      from(table: string) {
        const chain: Record<string, unknown> = {};
        let updateValues: Record<string, unknown> = {};
        let filterId = '';
        chain.update = (values: Record<string, unknown>) => {
          updateValues = values;
          return chain;
        };
        chain.eq = (col: string, val: string) => {
          if (col === 'id') filterId = val;
          return chain;
        };
        chain.select = (_cols?: string) => chain;
        chain.single = async () => {
          state.lastUpdate = { table, values: updateValues, filterId };
          if (state.updateError) {
            return { data: null, error: state.updateError };
          }
          return { data: state.updateResultData, error: null };
        };
        return chain;
      },
    };
  }
  return { createClient };
});

// Import AFTER the mock is installed.
import { POST, DELETE } from '../route';

function makeRequest(
  opts: {
    auth?: string;
    body?: unknown;
    method?: string;
  } = {}
): NextRequest {
  const headers = new Headers();
  if (opts.auth !== null) {
    headers.set('authorization', opts.auth ?? 'Bearer fake-jwt');
  }
  headers.set('content-type', 'application/json');
  return new NextRequest(
    `http://localhost/api/v1/knowledge-entities/${ENTITY_ID}/attest`,
    {
      method: opts.method ?? 'POST',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    }
  );
}

function ctx(id = ENTITY_ID) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  resetState();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/v1/knowledge-entities/[id]/attest', () => {
  it('stamps the trio when caller is an owner email', async () => {
    state.user = { id: OWNER_ID, email: OWNER_EMAIL };
    const res = await POST(makeRequest({ body: {} }), ctx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.source).toBe('upcodes-essentials');
    expect(state.lastUpdate?.table).toBe('knowledge_entities');
    expect(state.lastUpdate?.filterId).toBe(ENTITY_ID);
    expect(state.lastUpdate?.values).toMatchObject({
      manually_verified_by: OWNER_ID,
      manually_verified_source: 'upcodes-essentials',
    });
    expect(state.lastUpdate?.values.manually_verified_at).toBeTruthy();
  });

  it('allows admin role via app_metadata even when email is not on allowlist', async () => {
    state.user = {
      id: OWNER_ID,
      email: 'ops@partner.example',
      app_metadata: { role: 'admin' },
    };
    const res = await POST(makeRequest({ body: {} }), ctx());
    expect(res.status).toBe(200);
  });

  it('rejects non-owner email with 403', async () => {
    state.user = { id: OWNER_ID, email: NON_OWNER_EMAIL };
    const res = await POST(makeRequest({ body: {} }), ctx());
    expect(res.status).toBe(403);
    expect(state.lastUpdate).toBeNull(); // no UPDATE attempted
  });

  it('rejects missing bearer with 403', async () => {
    state.user = null; // even if user were valid, no token
    const req = new NextRequest(
      `http://localhost/api/v1/knowledge-entities/${ENTITY_ID}/attest`,
      { method: 'POST' }
    );
    const res = await POST(req, ctx());
    expect(res.status).toBe(403);
  });

  it('uses a custom source string when provided', async () => {
    state.user = { id: OWNER_ID, email: OWNER_EMAIL };
    const res = await POST(
      makeRequest({ body: { source: 'icc-digital-codes-premium' } }),
      ctx()
    );
    expect(res.status).toBe(200);
    expect(state.lastUpdate?.values.manually_verified_source).toBe(
      'icc-digital-codes-premium'
    );
  });

  it('returns 404 when entity id is not found (PGRST116)', async () => {
    state.user = { id: OWNER_ID, email: OWNER_EMAIL };
    state.updateError = { code: 'PGRST116', message: 'no rows' };
    const res = await POST(makeRequest({ body: {} }), ctx());
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/v1/knowledge-entities/[id]/attest', () => {
  it('nulls the trio when caller is an owner', async () => {
    state.user = { id: OWNER_ID, email: OWNER_EMAIL };
    state.updateResultData = { id: ENTITY_ID, slug: 'nec-x', manually_verified_at: null };
    const res = await DELETE(
      makeRequest({ method: 'DELETE' }),
      ctx()
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(state.lastUpdate?.values).toMatchObject({
      manually_verified_at: null,
      manually_verified_by: null,
      manually_verified_source: null,
    });
  });

  it('rejects non-owner DELETE with 403', async () => {
    state.user = { id: OWNER_ID, email: NON_OWNER_EMAIL };
    const res = await DELETE(makeRequest({ method: 'DELETE' }), ctx());
    expect(res.status).toBe(403);
    expect(state.lastUpdate).toBeNull();
  });
});
