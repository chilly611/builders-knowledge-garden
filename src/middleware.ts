/**
 * Next middleware — COCKPIT-PERSONALIZATION (2026-05-22).
 *
 * The only job today: surface the user's effective lane to the server
 * render path for /killerapp/* routes so the killerapp layout can set
 * `<body data-diy-cockpit="1">` on the very first byte. That kills the
 * "pro picker flashes before DIY overlay hydrates" jank Chilly flagged.
 *
 * Truth-source: a `bkg-lane` cookie written by the client when the
 * effective lane is resolved (see ProjectContext + DiyCockpitOverlay).
 * The cookie is non-HttpOnly so the same client code that wrote it can
 * read+update it as the user signs in/out or switches projects.
 *
 * Absent cookie -> treat as `gc` default. The layout's data attribute
 * defaults to '0' (== "not DIY"), so the pro picker renders as it does
 * today. No middleware-side projection of lane to anonymous users.
 *
 * We append an `x-bkg-lane` request header so server components can read
 * the lane via `headers()` without re-parsing cookies. The header is
 * trustworthy for UI gating only — the cookie is client-writable and
 * MUST NOT be used as an authorization decision anywhere. RLS on
 * `project_members` is still the source of truth for actual access.
 */

import { NextResponse, type NextRequest } from 'next/server';

const KILLERAPP_PATH_RE = /^\/killerapp(\/|$)/;
const VALID_LANES = new Set([
  'owner', 'gc', 'contractor', 'teammate', 'day_hire', 'specialist', 'diy',
]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!KILLERAPP_PATH_RE.test(pathname)) {
    return NextResponse.next();
  }

  const rawLane = req.cookies.get('bkg-lane')?.value ?? '';
  const lane = VALID_LANES.has(rawLane) ? rawLane : 'gc';

  // Forward the resolved lane to server components via a request header.
  // Mutate the existing request headers so downstream Server Components
  // can read it via `headers()` without us materialising a new request.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-bkg-lane', lane);

  const res = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Echo the resolved lane back on the response so client JS that needs
  // to bootstrap before the next render (e.g. analytics) has it without
  // a second round-trip. Same cookie, same value — no overwriting the
  // user's explicit choice when present.
  if (rawLane && rawLane !== lane) {
    // Cookie value was junk — clear it so the client re-writes a valid one.
    res.cookies.delete('bkg-lane');
  }

  return res;
}

export const config = {
  // Match every /killerapp route, including the landing page. Excluding
  // _next/static and image optimisation paths is implicit — those don't
  // match the path prefix.
  matcher: ['/killerapp/:path*'],
};
