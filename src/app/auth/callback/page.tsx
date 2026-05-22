'use client';

// OAuth callback — runs after Google (or any OAuth provider) redirects
// back. Lives as a client page (not a server route) because the live auth
// surface is the browser Supabase SDK with localStorage-backed sessions.
// A server-side exchangeCodeForSession would succeed in memory but never
// write a cookie the browser will send back, leaving the user signed out.
//
// The browser client has detectSessionInUrl: true, so once we land here
// it will pick up the ?code= param and complete the PKCE exchange on
// mount. exchangeCodeForSession is called explicitly to surface any
// error to the user instead of silently bouncing them.

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { safeNext } from '@/lib/safe-url';
import { LEGACY_LANE_TO_PROJECT_ROLE } from '@/lib/use-user-lane';

// DIY-COLD (2026-05-22): cookie name + max-age must mirror what
// ProjectContext + DiyCockpitOverlay use. Defined inline (not imported)
// because those modules also live behind 'use client' and pulling the
// constant out would force a larger refactor.
const LANE_COOKIE = 'bkg-lane';
const LANE_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

/**
 * Synchronously write the bkg-lane cookie so the NEXT navigation
 * (router.replace below) requests /welcome or /killerapp with the
 * cookie already attached. SSR can then stamp body[data-diy-cockpit=1]
 * on the very first byte and the DIY overlay never flashes the pro
 * picker. Non-HttpOnly + SameSite=Lax mirrors the existing client-side
 * writers in ProjectContext + DiyCockpitOverlay.
 */
function writeLaneCookie(lane: string): void {
  if (typeof document === 'undefined') return;
  document.cookie =
    `${LANE_COOKIE}=${encodeURIComponent(lane)}; Path=/; ` +
    `Max-Age=${LANE_COOKIE_MAX_AGE_SEC}; SameSite=Lax`;
}

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 2026-05-22 (Sec+Auth Burn 6): the OAuth callback URL is round-tripped
    // through the IdP, so even if /login encoded a safe value an attacker
    // could craft `/auth/callback?redirectTo=https://evil` directly. Wrap
    // in safeNext() to enforce relative paths only.
    const redirectTo = safeNext(params.get('redirectTo'), '/killerapp');
    const code = params.get('code');
    const errParam = params.get('error_description') || params.get('error');

    if (errParam) {
      setError(errParam);
      return;
    }

    if (!code) {
      router.replace('/login?error=missing_code');
      return;
    }

    let cancelled = false;
    (async () => {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (cancelled) return;
      if (exchangeError) {
        setError(exchangeError.message);
        return;
      }

      // DIY-COLD (2026-05-22): set the bkg-lane cookie BEFORE redirecting
      // so the NEXT request (the redirect target) carries it and SSR can
      // stamp body[data-diy-cockpit] correctly on the first byte. This is
      // the universal fix point — it catches OAuth, magic-link, and any
      // future flow that lands here. Without this, brand-new DIY users
      // would hit /welcome → /killerapp with no cookie and see the pro
      // picker flash once before DiyCockpitOverlay hydrates and writes
      // the cookie itself.
      //
      // The cookie is a UI hint only — the server still authorises off
      // project_members + RLS. See middleware.ts header for the contract.
      let userMetaLane: string | null = null;
      try {
        const { data: userData } = await supabase.auth.getUser();
        const u = userData.user;
        const raw = (u?.user_metadata?.lane as string | undefined) ?? null;
        if (raw === 'builder' || raw === 'specialist' || raw === 'dreamer') {
          userMetaLane = raw;
        }
        const projectRole =
          userMetaLane
            ? LEGACY_LANE_TO_PROJECT_ROLE[userMetaLane as 'builder' | 'specialist' | 'dreamer']
            : 'gc';
        writeLaneCookie(projectRole);
      } catch {
        // Non-fatal — worst case is the legacy one-frame flash for this
        // user. ProjectContext + DiyCockpitOverlay will still self-heal
        // on the next client render.
      }

      // Best-effort: log the signin event. Mirrors what login/page.tsx
      // does for password sign-in so OAuth users also land in crm_signins.
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) {
          await fetch('/api/auth/track-signin', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ event_type: 'signin', provider: 'google' }),
          }).catch(() => {});
        }
      } catch {
        // best-effort
      }

      router.replace(redirectTo);
    })();

    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        fontFamily: 'var(--font-archivo)',
        padding: 20,
      }}
    >
      {error ? (
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
            Sign-in failed
          </h1>
          <p style={{ fontSize: 14, color: 'var(--fg-secondary)', marginBottom: 20 }}>
            {error}
          </p>
          <a
            href="/login"
            style={{
              display: 'inline-block',
              padding: '10px 16px',
              background: '#1D9E75',
              color: '#fff',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Back to sign in
          </a>
        </div>
      ) : (
        <p style={{ fontSize: 14, color: 'var(--fg-secondary)' }}>Signing you in…</p>
      )}
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">Loading…</div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
