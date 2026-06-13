'use client';

import { useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { authedFetch } from '@/lib/authed-fetch';
import { safeNext, safeCallbackRedirect } from '@/lib/safe-url';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // 2026-05-19 (Ship 11): honor `next=` query param (used by
  // AuthAndProjectIndicator) so users return to whatever workflow page
  // they were on. `redirectTo` is kept as legacy fallback. Final fallback
  // is /killerapp (the demo entry).
  // 2026-05-22 (Sec+Auth Burn 6): wrap in safeNext() — previously this
  // page accepted arbitrary URLs in `next` / `redirectTo`, which let an
  // attacker hand a phishing URL via /login?next=https://evil.example.com
  // and we'd push the user off-site after a successful sign-in.
  const nextParam = safeNext(
    searchParams.get('next') || searchParams.get('redirectTo'),
    '/killerapp'
  );
  const redirectTo = nextParam;
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  // 2026-05-22 (Sec+Auth Burn 6): double-submit guard. Sarah-GC reported
  // that the first click of "Sign in" silently no-op'd and the second
  // click worked. Root cause: React batches isLoading state updates after
  // the event handler returns, so a rapid double-click could fire the
  // handler twice before the first run set isLoading=true. We use a ref,
  // which is synchronous and survives React batching, as the source of
  // truth for "is a submission in flight."
  const submittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        // 2026-05-20 — use the /api/auth/signup-beta endpoint instead of
        // supabase.auth.signUp so beta testers don't get stuck waiting for
        // a confirmation email that never arrives. See signup/page.tsx for
        // the full rationale.
        const signupRes = await fetch('/api/auth/signup-beta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name: email.split('@')[0] }),
        });
        const signupJson = await signupRes.json().catch(() => ({}));
        if (!signupRes.ok) {
          setError(signupJson?.error || 'Signup failed.');
        } else {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) {
            setError(signInError.message);
          } else {
            setSuccessMessage('Signed in successfully!');
            void trackSignin();
            const dest = await destinationAfterSignUp();
            setTimeout(() => router.push(dest), 500);
          }
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message);
        } else {
          setSuccessMessage('Signed in successfully!');
          void trackSignin();
          const dest = await destinationAfterSignIn(nextParam);
          setTimeout(() => {
            router.push(dest);
          }, 500);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
      submittingRef.current = false;
    }
  };

  const handleContinueAsExplorer = () => {
    router.push('/killerapp');
  };

  // 2026-05-20 — first-session detection: when the just-signed-in user
  // does NOT have `welcomed_at` on their auth metadata, route them through
  // /welcome (which stamps the flag on click-through). Trial-contractor
  // accounts seeded via app/scripts/seed-trial-accounts.mjs come in without
  // the flag set, so they get the handover landing on their first visit and
  // the killerapp directly afterward.
  // 2026-05-22 — `intended` has already been through safeNext() at the
  // top of this component, but defensively re-validate before composing
  // the welcome URL in case a future caller bypasses the param read.
  const destinationAfterSignIn = async (intended: string): Promise<string> => {
    try {
      const safeIntended = safeNext(intended, '/killerapp');
      const { data: { user } } = await supabase.auth.getUser();
      const meta = (user?.user_metadata || {}) as Record<string, unknown>;
      if (meta.welcomed_at) return safeIntended;
      return `/welcome?next=${encodeURIComponent(safeIntended)}`;
    } catch {
      return safeNext(intended, '/killerapp');
    }
  };

  // LOOP-1 (2026-06-12) — brand-new signups get onboarded (org + first
  // project + budget seed, POST /api/v1/onboard-new-user, idempotent)
  // BEFORE they land anywhere, so the first page after auth has real work
  // in it. This ports the contract of the retired /signup page (which
  // redirects here and has no live caller) into the branch users actually
  // reach. Two deliberate carve-outs:
  //   - Invited collaborators (next=/accept-invite/<token>) skip the
  //     onboard call entirely — they're joining an existing project; the
  //     accept page claims the invite with the fresh session. (The route
  //     would no-op on membership anyway, but only AFTER the invite is
  //     claimed — at signup time it isn't yet, so we guard client-side
  //     like the old /signup did.)
  //   - Any onboarding failure falls back to the pre-LOOP-1 routing
  //     (destinationAfterSignIn → /welcome for fresh accounts) — the
  //     onboard call must never block a signup.
  const destinationAfterSignUp = async (): Promise<string> => {
    if (nextParam.startsWith('/accept-invite')) {
      return destinationAfterSignIn(nextParam);
    }
    try {
      const res = await authedFetch('/api/v1/onboard-new-user', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        project_id?: string;
      };
      if (res.ok && json.ok && json.project_id) {
        // Explicit destinations (e.g. /pricing mid-checkout, a deep workflow
        // link) survive signup: the account is onboarded either way, and a
        // buyer should land back where they were heading. The first-run
        // cockpit is for signups with no stated destination ('/killerapp'
        // is safeNext's fallback default).
        if (nextParam !== '/killerapp') {
          return nextParam;
        }
        return `/killerapp?project=${encodeURIComponent(json.project_id)}&first_run=1`;
      }
      console.warn('[login] onboard-new-user returned no project_id:', json);
    } catch (err) {
      console.warn('[login] onboard-new-user threw (falling back):', err);
    }
    return destinationAfterSignIn(nextParam);
  };

  // 2026-05-20 — best-effort sign-in event log. Pulled into a helper so
  // both branches (login + the legacy isSignUp branch) can call it after a
  // successful signInWithPassword. Never throws and never blocks.
  const trackSignin = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      await fetch('/api/auth/track-signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ event_type: 'signin' }),
      });
    } catch {
      // Instrumentation only.
    }
  };


  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // 2026-05-22 (Sec+Auth Burn 6): safeCallbackRedirect re-runs
          // safeNext() on the embedded redirect target so an attacker can't
          // bypass the safeguard by smuggling an absolute URL through
          // ?next= and having the OAuth provider hand it back to us.
          redirectTo: safeCallbackRedirect(window.location.origin, redirectTo),
        },
      });
      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'var(--font-archivo)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          background: '#ffffff',
          border: `1px solid var(--border)`,
          borderRadius: 'var(--radius-lg)',
          padding: '40px 30px',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Logo / Title */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: '700',
              color: 'var(--fg)',
              margin: '0 0 8px 0',
            }}
          >
            Builder's Knowledge
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--fg-secondary)',
              margin: 0,
            }}
          >
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              background: '#ffe6e6',
              border: `1px solid #ffcccc`,
              color: '#cc0000',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              marginBottom: '16px',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div
            style={{
              background: '#e6f7f0',
              border: `1px solid #ccead5`,
              color: '#1D9E75',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              marginBottom: '16px',
              textAlign: 'center',
            }}
          >
            {successMessage}
          </div>
        )}

        {/* Form */}
        <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              type="button"
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'white',
                color: '#333',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 16,
              }}
            >
              Continue with Google
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0 16px" }}>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span style={{ fontSize: 12, color: "var(--fg-secondary, #999)" }}>or</span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Email */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: 'var(--fg)',
                marginBottom: '6px',
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid var(--border)`,
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                fontFamily: 'inherit',
                color: 'var(--fg)',
                background: '#ffffff',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* Password */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: 'var(--fg)',
                marginBottom: '6px',
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="â¢â¢â¢â¢â¢â¢â¢â¢"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid var(--border)`,
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                fontFamily: 'inherit',
                color: 'var(--fg)',
                background: '#ffffff',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px',
              background: isLoading ? '#999999' : '#1D9E75',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s, transform 0.1s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => !isLoading && (e.currentTarget.style.background = '#178a66')}
            onMouseLeave={(e) => !isLoading && (e.currentTarget.style.background = '#1D9E75')}
            onMouseDown={(e) => !isLoading && (e.currentTarget.style.transform = 'scale(0.98)')}
            onMouseUp={(e) => !isLoading && (e.currentTarget.style.transform = 'scale(1)')}
          >
            {isLoading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        {/* Toggle Mode */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p style={{ fontSize: '13px', margin: '0 0 8px 0', color: 'var(--fg-secondary)' }}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          </p>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setSuccessMessage('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#1D9E75',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textDecoration: 'underline',
            }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>

        {/* Divider */}
        <div
          style={{
            height: '1px',
            background: 'var(--border)',
            margin: '24px 0',
          }}
        />

        {/* Continue as Explorer */}
        <button
          type="button"
          onClick={handleContinueAsExplorer}
          style={{
            width: '100%',
            padding: '10px',
            background: 'var(--bg-secondary)',
            color: 'var(--fg)',
            border: `1px solid var(--border)`,
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background 0.2s',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
        >
          Continue as Explorer (Free)
        </button>

        {/* Footer */}
        <p
          style={{
            fontSize: '11px',
            color: 'var(--fg-tertiary)',
            textAlign: 'center',
            marginTop: '16px',
            margin: '16px 0 0 0',
          }}
        >
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
