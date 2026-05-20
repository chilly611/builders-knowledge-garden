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

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const redirectTo = params.get('redirectTo') || '/killerapp';
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
