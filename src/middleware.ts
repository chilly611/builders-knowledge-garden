/**
 * Next middleware — COCKPIT-PERSONALIZATION (2026-05-22) + AUTH SESSION REFRESH.
 *
 * Two jobs, both scoped to /killerapp/* (the authed app surface):
 *
 * 1. Lane hint: surface the user's effective lane to the server render path so
 *    the killerapp layout can set `<body data-diy-cockpit="1">` on the first byte
 *    (kills the "pro picker flash"). Truth-source: the client-writable `bkg-lane`
 *    cookie; forwarded as an `x-bkg-lane` request header. UI gating only — RLS on
 *    `project_members` is the real authorization source.
 *
 * 2. @supabase/ssr session refresh (2026-06-08, Safari OAuth migration): keep the
 *    cookie session fresh so server renders see a current session and the cookie
 *    doesn't expire mid-session. Matcher stays /killerapp/* — /api routes use the
 *    client-sent Bearer token (not the cookie), so we don't add getUser() latency
 *    there. Do NOT insert logic between createServerClient() and getUser().
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const KILLERAPP_PATH_RE = /^\/killerapp(\/|$)/;
const VALID_LANES = new Set([
  'owner', 'gc', 'contractor', 'teammate', 'day_hire', 'specialist', 'diy',
]);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!KILLERAPP_PATH_RE.test(pathname)) {
    return NextResponse.next();
  }

  const rawLane = req.cookies.get('bkg-lane')?.value ?? '';
  const lane = VALID_LANES.has(rawLane) ? rawLane : 'gc';

  // Forward the resolved lane to server components via a request header.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-bkg-lane', lane);

  let res = NextResponse.next({ request: { headers: requestHeaders } });

  // @supabase/ssr session refresh. Skipped when env isn't configured (build/dev
  // without Supabase) so the bundle/build never hits the network.
  if (!supabaseUrl.includes('placeholder')) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          );
        },
      },
    });
    // Refreshes the session + rotates the cookie when needed.
    await supabase.auth.getUser();
  }

  // Clear a junk lane cookie so the client re-writes a valid one.
  if (rawLane && rawLane !== lane) {
    res.cookies.delete('bkg-lane');
  }

  return res;
}

export const config = {
  matcher: ['/killerapp/:path*'],
};
