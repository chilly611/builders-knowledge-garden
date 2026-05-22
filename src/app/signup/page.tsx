'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { safeNext } from '@/lib/safe-url';
import { LEGACY_LANE_TO_PROJECT_ROLE } from '@/lib/use-user-lane';

// DIY-COLD (2026-05-22): /signup → signInWithPassword → /welcome bypasses
// /auth/callback, so we need to write the bkg-lane cookie here too. Same
// constants as the writers in ProjectContext + DiyCockpitOverlay +
// /auth/callback. Cookie is non-HttpOnly + SameSite=Lax. UI hint only —
// server auth still goes through project_members + RLS.
const LANE_COOKIE = 'bkg-lane';
const LANE_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7;

function writeLaneCookie(lane: string): void {
  if (typeof document === 'undefined') return;
  document.cookie =
    `${LANE_COOKIE}=${encodeURIComponent(lane)}; Path=/; ` +
    `Max-Age=${LANE_COOKIE_MAX_AGE_SEC}; SameSite=Lax`;
}

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [next, setNext] = useState('/killerapp');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  // 2026-05-22 (Sec+Auth Burn 6): double-submit guard, same rationale as
  // /login. Prevents a rapid double-click from firing the signup endpoint
  // twice before isLoading state has rolled into React's render pass.
  const submittingRef = useRef(false);

  // Read `next` query param on mount. Default to /killerapp (matches the
  // login page redirect behavior).
  // 2026-05-22 (Sec+Auth Burn 6): wrap in safeNext() — same open-redirect
  // defense as /login.
  useEffect(() => {
    const n = safeNext(searchParams.get('next'), '/killerapp');
    setNext(n);
  }, [searchParams]);

  const validate = (): string | null => {
    // Lightweight email format check — Supabase will also validate, but a
    // friendlier message helps before round-tripping the network.
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) return 'Please enter a valid email address.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== passwordConfirm) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    submittingRef.current = true;
    setIsLoading(true);
    try {
      // 2026-05-20 — switched from `supabase.auth.signUp` to the
      // service-role /api/auth/signup-beta endpoint. Reason: stock Supabase
      // signUp requires email confirmation, and SMTP isn't configured on
      // this project, so beta testers were getting stuck on "Check your
      // inbox" with no way to receive the confirmation link. The new route
      // creates the user with email_confirm: true, then we sign in with
      // password to obtain a session.
      const signupRes = await fetch('/api/auth/signup-beta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: email.split('@')[0] }),
      });

      const signupJson = await signupRes.json().catch(() => ({}));
      if (!signupRes.ok) {
        setError(signupJson?.error || 'Signup failed. Please try again.');
        return;
      }

      // User exists with email pre-confirmed — sign them in to get a session.
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        // Edge case: account created but session couldn't be established.
        // Send them to the login page rather than a dead end.
        router.push(`/login?next=${encodeURIComponent(next)}&signup=ok`);
        return;
      }

      // Fire-and-forget activity log.
      void (async () => {
        try {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          if (token) {
            await fetch('/api/auth/track-signin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ event_type: 'signin' }),
            });
          }
        } catch {
          // Instrumentation only.
        }
      })();

      // DIY-COLD (2026-05-22): write the bkg-lane cookie BEFORE the push
      // into /welcome so the next render carries it. signup-beta does
      // not currently set user_metadata.lane (brand-new accounts default
      // to 'gc'), but if a future variant of the signup form ever lets
      // the user pre-select a lane this will pick it up automatically.
      try {
        const { data: ud } = await supabase.auth.getUser();
        const raw = (ud.user?.user_metadata?.lane as string | undefined) ?? null;
        const projectRole =
          raw === 'builder' || raw === 'specialist' || raw === 'dreamer'
            ? LEGACY_LANE_TO_PROJECT_ROLE[raw]
            : 'gc';
        writeLaneCookie(projectRole);
      } catch {
        // Non-fatal — /welcome will write the cookie as a fallback.
      }

      // PLG-SIGNUP (2026-05-22) — call /api/v1/onboard-new-user to bootstrap
      // an org + first project + budget seed + welcome email BEFORE we push
      // the user anywhere. If onboarding succeeds we skip /welcome and drop
      // them straight into their newly-seeded project with `first_run=1` so
      // the cockpit shows the orientation banner. If onboarding fails we
      // fall back to /welcome (the user can manually create stuff there).
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        if (token) {
          const onboardRes = await fetch('/api/v1/onboard-new-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({}),
          });
          const onboardJson = await onboardRes.json().catch(() => ({} as Record<string, unknown>));
          if (onboardRes.ok && onboardJson && typeof onboardJson === 'object' && (onboardJson as { ok?: boolean }).ok && (onboardJson as { project_id?: string }).project_id) {
            const projectId = (onboardJson as { project_id: string }).project_id;
            router.push(`/killerapp?project=${encodeURIComponent(projectId)}&first_run=1`);
            return;
          }
          // Onboarding non-OK — log and fall through to /welcome.
          console.warn('[signup] onboard-new-user did not return a project_id:', onboardJson);
        }
      } catch (err) {
        // Onboarding failed for whatever reason — never block the signup.
        // The user lands on /welcome where they can manually create stuff.
        console.warn('[signup] onboard-new-user threw:', err);
      }

      // 2026-05-20 — brand-new signups have never seen /welcome, so the flag
      // can't be set yet. Route through /welcome on first signup so the user
      // gets the handover orientation; the page stamps welcomed_at on
      // click-through so subsequent sign-ins go straight to the killerapp.
      router.push(`/welcome?next=${encodeURIComponent(next)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed.');
    } finally {
      setIsLoading(false);
      submittingRef.current = false;
    }
  };

  // "Check your inbox" success view — shown when Supabase requires email
  // confirmation before issuing a session.
  if (confirmationSent) {
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
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              fontSize: '24px',
              fontWeight: '700',
              color: 'var(--fg)',
              margin: '0 0 12px 0',
            }}
          >
            Check your inbox
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--fg-secondary)',
              margin: '0 0 20px 0',
              lineHeight: 1.5,
            }}
          >
            We sent a confirmation link to <strong>{email}</strong>. Click the
            link in the email to finish creating your account.
          </p>
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            style={{
              display: 'inline-block',
              padding: '10px 16px',
              background: 'var(--bg-secondary)',
              color: 'var(--fg)',
              border: `1px solid var(--border)`,
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              fontWeight: '600',
              textDecoration: 'none',
              fontFamily: 'inherit',
            }}
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

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
            Builder&apos;s Knowledge
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--fg-secondary)',
              margin: 0,
            }}
          >
            Create your account
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div
            role="alert"
            aria-live="polite"
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

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {/* Email */}
          <div>
            <label
              htmlFor="signup-email"
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
              id="signup-email"
              type="email"
              autoComplete="email"
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
              htmlFor="signup-password"
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
              id="signup-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
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

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="signup-password-confirm"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: 'var(--fg)',
                marginBottom: '6px',
              }}
            >
              Confirm password
            </label>
            <input
              id="signup-password-confirm"
              type="password"
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              minLength={6}
              placeholder="Re-enter your password"
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
            {isLoading ? 'Creating account…' : 'Sign Up'}
          </button>
        </form>

        {/* Already have an account? */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p style={{ fontSize: '13px', margin: '0 0 8px 0', color: 'var(--fg-secondary)' }}>
            Already have an account?
          </p>
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
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
            Sign in
          </Link>
        </div>

        {/* Footer */}
        <p
          style={{
            fontSize: '11px',
            color: 'var(--fg-tertiary)',
            textAlign: 'center',
            marginTop: '24px',
            margin: '24px 0 0 0',
          }}
        >
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">Loading...</div>
      }
    >
      <SignupPageContent />
    </Suspense>
  );
}
