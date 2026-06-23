// Server-side auth helper — resolves the signed-in user in API routes.
//
// Two auth sources, tried in order, so a request authenticates if EITHER holds:
//   1. `Authorization: Bearer <token>` — explicit, used by authed-fetch.ts and API clients.
//   2. The @supabase/ssr cookie session — the source middleware keeps fresh on every
//      /killerapp navigation.
//
// Why the cookie fallback (2026-06-23, fix/auth-foundation-singleton): /api routes used to
// trust ONLY the client-sent Bearer token (see middleware.ts note). That token comes from the
// browser client's in-memory `getSession()`, which goes STALE across back/forward + bfcache
// restores — the tab's frozen JS holds an expired token while the cookie middleware just
// rotated is current. Result: intermittent 401s on POST /summarize right after navigation.
// Honoring the cookie (which rides along on the same-origin fetch and was refreshed by the
// navigation that triggered the call) closes that gap with no extra latency — getAuthUser
// already does one getUser() round-trip either way.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email || "",
    name: (user.user_metadata?.name as string) || user.email?.split("@")[0] || "Builder",
  };
}

/**
 * Extract the authenticated user from a request. Tries the Bearer token first,
 * then falls back to the @supabase/ssr cookie session. Returns null if neither
 * authenticates.
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  // 1) Bearer token (explicit).
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length);
    try {
      const sb = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: { user }, error } = await sb.auth.getUser(token);
      if (!error && user) return toAuthUser(user);
    } catch {
      /* fall through — a present-but-stale Bearer is exactly the bfcache case */
    }
  }

  // 2) Cookie session (@supabase/ssr) — robust across back/forward + bfcache.
  try {
    const sb = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll().map(({ name, value }) => ({ name, value }));
        },
        // Read-only in a route handler: we only need to authenticate THIS request.
        // Middleware owns cookie rotation on navigations.
        setAll() {},
      },
    });
    const { data: { user }, error } = await sb.auth.getUser();
    if (!error && user) return toAuthUser(user);
  } catch {
    /* ignore — unauthenticated */
  }

  return null;
}

/**
 * Get the service-role Supabase client for admin operations. Server-only —
 * never import this into a client component (it carries the service-role key,
 * which bypasses RLS).
 */
export function getServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Return a 401 JSON response for unauthenticated requests.
 */
export function unauthorizedResponse(message = "Authentication required") {
  return NextResponse.json({ error: message }, { status: 401 });
}
