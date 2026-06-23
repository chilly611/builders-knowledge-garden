/**
 * getAuthUser tests (fix/auth-foundation-singleton, 2026-06-23)
 * =============================================================
 *
 * Root cause of the intermittent /summarize 401: /api routes trusted ONLY the
 * client-sent Bearer token, which the browser client's in-memory getSession()
 * leaves STALE after a back/forward (bfcache) restore — while the cookie that
 * middleware just refreshed on the navigation is current. getAuthUser now falls
 * back to that cookie session, so a request authenticates if EITHER source holds.
 *
 * These tests pin the fallback precedence with both Supabase factories mocked.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = {
  bearerUser: null as null | { id: string; email: string; user_metadata?: Record<string, unknown> },
  bearerThrows: false,
  cookieUser: null as null | { id: string; email: string; user_metadata?: Record<string, unknown> },
  cookieGetAllCalls: 0,
};

// Bearer path: createClient(...).auth.getUser(token)
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: async (_token?: string) => {
        if (state.bearerThrows) throw new Error('network down');
        return state.bearerUser
          ? { data: { user: state.bearerUser }, error: null }
          : { data: { user: null }, error: { message: 'invalid/expired token' } };
      },
    },
  }),
}));

// Cookie path: createServerClient(...).auth.getUser()
vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, opts: { cookies: { getAll: () => unknown } }) => {
    state.cookieGetAllCalls += 1;
    // exercise the adapter so a regression in its shape is caught
    opts.cookies.getAll();
    return {
      auth: {
        getUser: async () =>
          state.cookieUser
            ? { data: { user: state.cookieUser }, error: null }
            : { data: { user: null }, error: { message: 'no cookie session' } },
      },
    };
  },
}));

import { getAuthUser } from '../auth-server';

function makeRequest({ bearer, withCookie }: { bearer?: string; withCookie?: boolean } = {}) {
  const headers: Record<string, string> = {};
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  if (withCookie) headers.cookie = 'sb-knowledge-gardens-auth-token=abc.def.ghi';
  return new NextRequest('http://localhost/api/v1/projects/summarize', { method: 'POST', headers });
}

beforeEach(() => {
  state.bearerUser = null;
  state.bearerThrows = false;
  state.cookieUser = null;
  state.cookieGetAllCalls = 0;
});

describe('getAuthUser — Bearer with cookie fallback', () => {
  it('authenticates via a valid Bearer token (no cookie needed)', async () => {
    state.bearerUser = { id: 'u-bearer', email: 'b@example.com' };
    const user = await getAuthUser(makeRequest({ bearer: 'good-token' }));
    expect(user?.id).toBe('u-bearer');
    expect(state.cookieGetAllCalls).toBe(0); // never consulted the cookie path
  });

  it('falls back to the cookie session when the Bearer is STALE/expired (the bfcache case)', async () => {
    state.bearerUser = null; // getUser(token) rejects the stale token
    state.cookieUser = { id: 'u-cookie', email: 'c@example.com' };
    const user = await getAuthUser(makeRequest({ bearer: 'stale-token', withCookie: true }));
    expect(user?.id).toBe('u-cookie'); // ← authenticated despite the dead Bearer
  });

  it('falls back to the cookie session when the Bearer call THROWS', async () => {
    state.bearerThrows = true;
    state.cookieUser = { id: 'u-cookie', email: 'c@example.com' };
    const user = await getAuthUser(makeRequest({ bearer: 'whatever', withCookie: true }));
    expect(user?.id).toBe('u-cookie');
  });

  it('authenticates via the cookie when NO Bearer is sent at all', async () => {
    state.cookieUser = { id: 'u-cookie', email: 'c@example.com' };
    const user = await getAuthUser(makeRequest({ withCookie: true }));
    expect(user?.id).toBe('u-cookie');
  });

  it('returns null when neither a Bearer nor a cookie session authenticates', async () => {
    const user = await getAuthUser(makeRequest({ bearer: 'bad' }));
    expect(user).toBeNull();
  });

  it('derives a display name from user_metadata, then email local-part', async () => {
    state.cookieUser = { id: 'u', email: 'jane@example.com', user_metadata: { name: 'Jane GC' } };
    expect((await getAuthUser(makeRequest({ withCookie: true })))?.name).toBe('Jane GC');
    state.cookieUser = { id: 'u', email: 'jane@example.com' };
    expect((await getAuthUser(makeRequest({ withCookie: true })))?.name).toBe('jane');
  });
});
