'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

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

  // Read `next` query param on mount. Default to /killerapp (matches the
  // login page redirect behavior).
  useEffect(() => {
    const n = searchParams.get('next');
    if (n) setNext(n);
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
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: email.split('@')[0],
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message || 'Signup failed. Please try again.');
        return;
      }

      // Supabase returns a user with an empty `identities` array (or no
      // session) when email confirmation is required. In that case, show the
      // "Check your inbox" view instead of redirecting.
      const needsConfirmation =
        !data?.session &&
        (!!data?.user && (data.user.identities?.length === 0 || !data.user.confirmed_at));

      if (needsConfirmation || (!data?.session && !!data?.user)) {
        setConfirmationSent(true);
        return;
      }

      // Otherwise we have a session — go to `next`.
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed.');
    } finally {
      setIsLoading(false);
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
