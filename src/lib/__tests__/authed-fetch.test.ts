/**
 * authedFetch tests (P0 close, 2026-06-11)
 * ========================================
 *
 * The summarize 401 happened because a caller used bare fetch() with no
 * Authorization header. authedFetch is the shared replacement: it reads the
 * access token from the ONE shared Supabase client and attaches it the way
 * every /api/v1 route's getAuthUser() expects. These tests pin that contract.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state: {
  token: string | null;
  expiresAt?: number;
  refreshedToken?: string;
  refreshCalls: number;
} = { token: null, refreshCalls: 0 };

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: {
          session: state.token
            ? { access_token: state.token, expires_at: state.expiresAt }
            : null,
        },
      }),
      refreshSession: async () => {
        state.refreshCalls += 1;
        return {
          data: {
            session: state.refreshedToken ? { access_token: state.refreshedToken } : null,
          },
          error: null,
        };
      },
    },
  },
}));

import { authedFetch } from '../authed-fetch';

const fetchSpy = vi.fn(
  async (_input: RequestInfo | URL, _init?: RequestInit) =>
    new Response('{}', { status: 200 })
);

beforeEach(() => {
  state.token = null;
  state.expiresAt = undefined;
  state.refreshedToken = undefined;
  state.refreshCalls = 0;
  fetchSpy.mockClear();
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function sentHeaders(): Headers {
  const init = fetchSpy.mock.calls[0]?.[1];
  return new Headers(init?.headers);
}

describe('authedFetch', () => {
  it('attaches the Bearer token from the shared client session', async () => {
    state.token = 'live-access-token';
    await authedFetch('/api/v1/projects/summarize', {
      method: 'POST',
      body: JSON.stringify({ project_id: 'p1' }),
    });
    expect(sentHeaders().get('Authorization')).toBe('Bearer live-access-token');
  });

  it('defaults Content-Type to application/json when a body is present', async () => {
    state.token = 'live-access-token';
    await authedFetch('/api/v1/projects', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'p1' }),
    });
    expect(sentHeaders().get('Content-Type')).toBe('application/json');
  });

  it('does not invent an Authorization header without a session', async () => {
    await authedFetch('/api/v1/projects');
    expect(sentHeaders().get('Authorization')).toBeNull();
  });

  it('preserves caller-supplied headers', async () => {
    state.token = 'live-access-token';
    await authedFetch('/api/v1/uploads/photo', {
      method: 'POST',
      body: 'raw-bytes',
      headers: { 'Content-Type': 'image/jpeg' },
    });
    const headers = sentHeaders();
    expect(headers.get('Content-Type')).toBe('image/jpeg');
    expect(headers.get('Authorization')).toBe('Bearer live-access-token');
  });

  it('refreshes a near-expiry token before sending (bfcache staleness)', async () => {
    state.token = 'stale-token';
    state.expiresAt = Math.floor(Date.now() / 1000) - 10; // already expired
    state.refreshedToken = 'fresh-token';
    await authedFetch('/api/v1/projects/summarize', { method: 'POST', body: '{}' });
    expect(state.refreshCalls).toBe(1);
    expect(sentHeaders().get('Authorization')).toBe('Bearer fresh-token');
  });

  it('does not refresh a token with plenty of life left', async () => {
    state.token = 'live-token';
    state.expiresAt = Math.floor(Date.now() / 1000) + 3600; // an hour out
    await authedFetch('/api/v1/projects');
    expect(state.refreshCalls).toBe(0);
    expect(sentHeaders().get('Authorization')).toBe('Bearer live-token');
  });

  it('always sends same-origin credentials so the cookie-auth fallback works', async () => {
    state.token = 'live-token';
    await authedFetch('/api/v1/projects/summarize', { method: 'POST', body: '{}' });
    expect(fetchSpy.mock.calls[0]?.[1]?.credentials).toBe('same-origin');
  });
});
