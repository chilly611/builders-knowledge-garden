/**
 * /api/v1/projects/summarize tests (P0 close, 2026-06-11)
 * =======================================================
 *
 * P0 symptom (b): structured field saves succeeded but the AI re-summary
 * intermittently 401'd and went silently stale (the only live caller,
 * ProjectContextBanner, sent no Authorization header and swallowed
 * failures). Server side, the route was also strictly owner-only, so even
 * an authenticated invited collaborator could never refresh the AI take
 * after their own valid save.
 *
 * The route now uses assertProjectWriteAccess (owner + demo + invited
 * collaborator) and refuses to report success when the persist fails.
 * Real route handler + real projectOwnership logic; mocks: auth-server
 * (token resolution + service client) and the Anthropic SDK.
 *
 * Coverage:
 *   1. Owner → 200, ai_summary returned AND persisted (the AI take updates).
 *   2. NON-OWNER invited collaborator → 200 likewise.
 *   3. No bearer user → 401 (the old silent-staleness trigger is loud now).
 *   4. Authenticated non-member → 403, no AI call.
 *   5. Claude failure → 502.
 *   6. DB persist failure → 500 (no fake success over a stale row).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const COLLABORATOR_ID = '22222222-2222-4222-8222-222222222222';
const PROJECT_ID = '33333333-3333-4333-8333-333333333333';
const FRESH_SUMMARY =
  "Alright, here's how I'd read it: solid scope for Marin County.\nJurisdiction: San Rafael, CA";

interface MockState {
  user: null | { id: string; email: string; name: string };
  members: string[];
  aiShouldFail: boolean;
  persistShouldFail: boolean;
  lastUpdate: null | { values: Record<string, unknown>; filterId: string };
  aiCalls: number;
}

const state: MockState = {
  user: null,
  members: [],
  aiShouldFail: false,
  persistShouldFail: false,
  lastUpdate: null,
  aiCalls: 0,
};

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
          if (table === 'command_center_projects' && updateValues) {
            // update().eq() is awaited directly (no .single()) — return a
            // thenable result from the final eq() in the update chain.
            if (state.persistShouldFail) {
              return Promise.resolve({ error: { message: 'persist boom' } });
            }
            state.lastUpdate = { values: updateValues, filterId: String(val) };
            return Promise.resolve({ error: null });
          }
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
          if (table === 'command_center_projects') {
            if (filters.id !== PROJECT_ID) {
              return { data: null, error: { message: 'not found' } };
            }
            return {
              data: {
                user_id: OWNER_ID,
                raw_input: 'Build a 2,800 sf modern farmhouse in San Rafael',
                jurisdiction: 'San Rafael, CA',
              },
              error: null,
            };
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
  vi.importActual('../../../../../../lib/auth/projectOwnership')
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

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = {
      create: async () => {
        state.aiCalls += 1;
        if (state.aiShouldFail) throw new Error('claude boom');
        return { content: [{ type: 'text', text: FRESH_SUMMARY }] };
      },
    };
  },
}));

import { POST } from '../route';

function summarizeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/v1/projects/summarize', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  state.user = null;
  state.members = [];
  state.aiShouldFail = false;
  state.persistShouldFail = false;
  state.lastUpdate = null;
  state.aiCalls = 0;
  process.env.ANTHROPIC_API_KEY = 'test-key';
});

describe('POST /api/v1/projects/summarize (P0)', () => {
  it('returns 200 for the owner and PERSISTS the fresh AI take', async () => {
    state.user = { id: OWNER_ID, email: 'owner@example.com', name: 'Owner' };

    const res = await POST(summarizeRequest({ project_id: PROJECT_ID }));
    expect(res.status).toBe(200);

    const body = (await res.json()) as { ai_summary: string };
    expect(body.ai_summary).toBe(FRESH_SUMMARY);

    // The AI take actually updated in the DB — not just in the response.
    expect(state.lastUpdate).not.toBeNull();
    expect(state.lastUpdate!.filterId).toBe(PROJECT_ID);
    expect(state.lastUpdate!.values.ai_summary).toBe(FRESH_SUMMARY);
  });

  it('returns 200 for a NON-OWNER invited collaborator', async () => {
    state.user = { id: COLLABORATOR_ID, email: 'collab@example.com', name: 'Collab' };
    state.members = [COLLABORATOR_ID];

    const res = await POST(summarizeRequest({ project_id: PROJECT_ID }));
    expect(res.status).toBe(200);
    expect(state.lastUpdate!.values.ai_summary).toBe(FRESH_SUMMARY);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await POST(summarizeRequest({ project_id: PROJECT_ID }));
    expect(res.status).toBe(401);
    expect(state.aiCalls).toBe(0);
    expect(state.lastUpdate).toBeNull();
  });

  it('returns 403 for an authenticated non-member and never calls the AI', async () => {
    state.user = { id: COLLABORATOR_ID, email: 'stranger@example.com', name: 'Stranger' };
    state.members = [];

    const res = await POST(summarizeRequest({ project_id: PROJECT_ID }));
    expect(res.status).toBe(403);
    expect(state.aiCalls).toBe(0);
    expect(state.lastUpdate).toBeNull();
  });

  it('returns 502 when the AI call fails', async () => {
    state.user = { id: OWNER_ID, email: 'owner@example.com', name: 'Owner' };
    state.aiShouldFail = true;

    const res = await POST(summarizeRequest({ project_id: PROJECT_ID }));
    expect(res.status).toBe(502);
    expect(state.lastUpdate).toBeNull();
  });

  it('returns 500 (not fake success) when the persist fails', async () => {
    state.user = { id: OWNER_ID, email: 'owner@example.com', name: 'Owner' };
    state.persistShouldFail = true;

    const res = await POST(summarizeRequest({ project_id: PROJECT_ID }));
    expect(res.status).toBe(500);
  });
});
