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

const state: { token: string | null } = { token: null };

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: {
          session: state.token ? { access_token: state.token } : null,
        },
      }),
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
});
