'use client';

/**
 * AuthAndProjectIndicator (Project Spine v1, 2026-05-06)
 *
 * Renders top-right of /killerapp showing:
 *   - "Signed in as <email>" or "Not signed in" link
 *   - When ?project=<id> is active: "Saved · <project name>" with the
 *     auto-derived first-80-chars name
 *
 * User feedback 2026-05-06: "Can't seem to save the project anywhere
 * and it doesn't indicate anywhere that I'm logged in or that the
 * project is saved." This component answers both questions in a
 * persistent corner pill so the user has a constant trust signal.
 *
 * Suspense:
 *   Uses useSearchParams. Parent must wrap in <Suspense>.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface ProjectSummary {
  id: string;
  name: string | null;
  raw_input: string | null;
}

async function authedFetch(input: RequestInfo, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

export default function AuthAndProjectIndicator() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');

  const [email, setEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [project, setProject] = useState<ProjectSummary | null>(null);

  // Subscribe to auth state. Updates when user signs in / out without
  // requiring a page reload.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setEmail(data.session?.user?.email ?? null);
      setAuthChecked(true);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      setAuthChecked(true);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Pull the active project's name when ?project=<id> is present.
  useEffect(() => {
    if (!projectId) {
      setProject(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await authedFetch(
          `/api/v1/projects?id=${encodeURIComponent(projectId)}`
        );
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as ProjectSummary;
        if (!cancelled) setProject(json);
      } catch {
        // Silent — the indicator is a nice-to-have, not critical.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (!authChecked) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        right: 16,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 4,
        pointerEvents: 'none',
      }}
      data-testid="auth-and-project-indicator"
    >
      {/* Auth pill — always visible */}
      <div
        style={{
          pointerEvents: 'auto',
          padding: '4px 10px',
          background: 'var(--trace, #F4F0E6)',
          border: '0.5px solid var(--faded-rule, #C9C3B3)',
          borderRadius: 999,
          fontSize: 11,
          color: 'var(--graphite, #2E2E30)',
          fontFamily: 'var(--font-archivo), sans-serif',
          whiteSpace: 'nowrap',
        }}
      >
        {email ? (
          <span>
            <span style={{ opacity: 0.5 }}>signed in · </span>
            {email}
          </span>
        ) : (
          <Link
            href="/login?next=/killerapp"
            style={{
              color: 'inherit',
              textDecoration: 'underline',
            }}
          >
            sign in to save your project
          </Link>
        )}
      </div>

      {/* Project pill — only when a project is active */}
      {project && (
        <div
          style={{
            pointerEvents: 'auto',
            padding: '4px 10px',
            background: 'rgba(127, 207, 203, 0.18)', // Robin's egg tint
            border: '0.5px solid var(--robins-egg, #7FCFCB)',
            borderRadius: 999,
            fontSize: 11,
            color: 'var(--graphite, #2E2E30)',
            fontFamily: 'var(--font-archivo), sans-serif',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            maxWidth: 360,
          }}
        >
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: 'var(--robins-egg, #7FCFCB)',
            }}
          />
          <span style={{ opacity: 0.5 }}>saved · </span>
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 280,
              fontWeight: 500,
            }}
            title={project.name ?? project.raw_input ?? 'Untitled project'}
          >
            {project.name ??
              project.raw_input?.slice(0, 60) ??
              'Untitled project'}
          </span>
        </div>
      )}
    </div>
  );
}
