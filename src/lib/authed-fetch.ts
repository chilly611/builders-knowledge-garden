// Shared authenticated fetch for client components.
//
// Reads the access token from the ONE shared cookie-backed auth client
// (src/lib/supabase.ts) and attaches it as a Bearer header — the shape every
// /api/v1 route's getAuthUser() expects. Before this existed (P0 close,
// 2026-06-11) ~10 components carried private copies of this function and at
// least one caller (ProjectContextBanner → /api/v1/projects/summarize) sent
// no Authorization header at all, guaranteeing a 401 the .catch() then
// swallowed. New code should import from here instead of re-pasting.
//
// Hardening (2026-06-23): the in-memory session can be STALE after a
// back/forward (bfcache) restore — the frozen tab holds an expired token while
// its autoRefresh timer was suspended. So: if the session is at/near expiry,
// refresh before sending, and always send same-origin cookies so the route's
// cookie-auth fallback (getAuthUser) can authenticate even if the Bearer is
// missing. Either path now carries a valid identity across navigation.

import { supabase } from '@/lib/supabase';

// Refresh when the access token is within this window of expiring.
const EXPIRY_SKEW_MS = 60_000;

async function freshAccessToken(): Promise<string | undefined> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return undefined;
    const expMs = session.expires_at ? session.expires_at * 1000 : 0;
    if (expMs && expMs <= Date.now() + EXPIRY_SKEW_MS) {
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data.session) return data.session.access_token;
    }
    return session.access_token;
  } catch {
    return undefined; // fall back to cookie auth server-side
  }
}

export async function authedFetch(
  input: RequestInfo,
  init: RequestInit = {}
): Promise<Response> {
  const token = await freshAccessToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  // same-origin (the default) sends the @supabase/ssr session cookie — the
  // route's cookie-auth fallback relies on it when the Bearer is stale/absent.
  return fetch(input, { credentials: 'same-origin', ...init, headers });
}
