// Shared authenticated fetch for client components.
//
// Reads the access token from the ONE shared cookie-backed auth client
// (src/lib/supabase.ts) and attaches it as a Bearer header — the shape every
// /api/v1 route's getAuthUser() expects. Before this existed (P0 close,
// 2026-06-11) ~10 components carried private copies of this function and at
// least one caller (ProjectContextBanner → /api/v1/projects/summarize) sent
// no Authorization header at all, guaranteeing a 401 the .catch() then
// swallowed. New code should import from here instead of re-pasting.

import { supabase } from '@/lib/supabase';

export async function authedFetch(
  input: RequestInfo,
  init: RequestInit = {}
): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(input, { ...init, headers });
}
