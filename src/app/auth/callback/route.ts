// OAuth callback — SERVER route handler.
//
// Google → Supabase → here with `?code=`. We do the PKCE exchange SERVER-SIDE so
// the verifier cookie is read from the REQUEST (sent on the top-level Lax
// navigation) — the path that survives Safari's cross-site OAuth bounce. The
// prior client-side exchange (page.tsx) read the verifier via document.cookie /
// localStorage, which Safari disrupts (see #22/#23). createServerClient writes the
// session as `Set-Cookie` on the redirect response (browsers honor Set-Cookie on
// 3xx). On error/missing code we preserve the prior contract: redirect to /login.
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { safeNext } from '@/lib/safe-url';
import { LEGACY_LANE_TO_PROJECT_ROLE } from '@/lib/use-user-lane';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

const LANE_COOKIE = 'bkg-lane';
const LANE_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // `redirectTo` round-trips through the IdP, so re-validate to relative-only.
  const redirectTo = safeNext(searchParams.get('redirectTo'), '/killerapp');
  const errParam = searchParams.get('error_description') || searchParams.get('error');

  if (errParam) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errParam)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  // Session cookies land on whichever redirect we ultimately issue. LOOP-1
  // (2026-06-12): the destination now depends on the onboarding result, so
  // buffer the cookies the exchange emits and apply them to the final
  // response below (no behavior change — they were only ever flushed on
  // return).
  const pendingCookies: Array<{ name: string; value: string; options?: CookieOptions }> = [];
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          pendingCookies.push({ name, value, options }),
        );
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  // LOOP-1 (2026-06-12): onboard on every OAuth landing. The route is
  // idempotent — first-timers get an org + seeded first project and land in
  // the first-run cockpit; returning users no-op (already_onboarded) and go
  // to their prior destination. Invited collaborators
  // (redirectTo=/accept-invite/<token>) skip the call: they're joining an
  // existing project and the accept page claims the invite with this fresh
  // session — onboarding must not race it. Failures fall through to the
  // prior destination; onboarding never blocks a sign-in.
  let destination = redirectTo;
  if (!redirectTo.startsWith('/accept-invite')) {
    try {
      const token = data.session?.access_token;
      if (token) {
        const onboardRes = await fetch(`${origin}/api/v1/onboard-new-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({}),
        });
        const onboardJson = (await onboardRes.json().catch(() => ({}))) as {
          ok?: boolean;
          already_onboarded?: boolean;
          project_id?: string;
        };
        if (
          onboardRes.ok &&
          onboardJson.ok &&
          !onboardJson.already_onboarded &&
          onboardJson.project_id &&
          // Explicit destinations (e.g. /pricing mid-checkout) are honored
          // even for first-timers — '/killerapp' is safeNext's fallback
          // default, i.e. "no stated destination".
          redirectTo === '/killerapp'
        ) {
          destination = `/killerapp?project=${encodeURIComponent(onboardJson.project_id)}&first_run=1`;
        }
      }
    } catch (e) {
      console.warn('[auth/callback] onboard-new-user failed (continuing to prior destination):', e);
    }
  }

  const response = NextResponse.redirect(`${origin}${destination}`);
  pendingCookies.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options),
  );

  // DIY-COLD: stamp the bkg-lane cookie so the redirect target carries it and SSR
  // can set body[data-diy-cockpit] on the first byte. UI hint only — server still
  // authorises via project_members + RLS.
  try {
    const raw = (data.user?.user_metadata?.lane as string | undefined) ?? null;
    const projectRole =
      raw === 'builder' || raw === 'specialist' || raw === 'dreamer'
        ? LEGACY_LANE_TO_PROJECT_ROLE[raw]
        : 'gc';
    response.cookies.set(LANE_COOKIE, projectRole, {
      path: '/',
      maxAge: LANE_COOKIE_MAX_AGE_SEC,
      sameSite: 'lax',
    });
  } catch {
    // Non-fatal — ProjectContext/DiyCockpitOverlay self-heal on the client.
  }

  // Best-effort sign-in event log (mirrors the password path) so OAuth users also
  // land in crm_signins. Never blocks the redirect.
  try {
    const token = data.session?.access_token;
    if (token) {
      await fetch(`${origin}/api/auth/track-signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ event_type: 'signin', provider: 'google' }),
      }).catch(() => {});
    }
  } catch {
    // best-effort
  }

  return response;
}
