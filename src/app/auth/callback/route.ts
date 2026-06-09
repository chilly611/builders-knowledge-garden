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
import { createServerClient } from '@supabase/ssr';
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

  // The redirect response is what we attach session cookies to.
  const response = NextResponse.redirect(`${origin}${redirectTo}`);
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

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
