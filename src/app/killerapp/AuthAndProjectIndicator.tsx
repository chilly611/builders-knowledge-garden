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

import { useEffect, useRef, useState, useMemo } from 'react';
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
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamingText, setRenamingText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

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

  const startRenaming = () => {
    if (project) {
      setRenamingText(project.name ?? '');
      setIsRenaming(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const saveRename = async () => {
    const newName = renamingText.trim();
    if (!projectId || !newName || !project || newName === project.name) {
      setIsRenaming(false);
      return;
    }

    setIsSaving(true);
    try {
      const res = await authedFetch('/api/v1/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: projectId, name: newName }),
      });
      if (res.ok) {
        setProject({ ...project, name: newName });
        setIsRenaming(false);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch {
      // Silent failure — user can try again
    } finally {
      setIsSaving(false);
    }
  };

  const cancelRenaming = () => {
    setIsRenaming(false);
  };

  // INP fix (2026-05-06): Memoize project display name computation to avoid
  // recomputing string slicing on every render.
  //
  // CRITICAL (2026-05-06b): useMemo MUST come BEFORE `if (!authChecked) return null`.
  // Hooks-after-early-return is a Rules of Hooks violation; same pattern
  // bug took out KillerAppNav, GlobalAiFab, and KillerappProjectShell.
  const projectDisplayName = useMemo(
    () =>
      project?.name ??
      project?.raw_input?.slice(0, 60) ??
      'Untitled project',
    [project?.name, project?.raw_input]
  );

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
          padding: '8px 12px',
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
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
            padding: '8px 12px',
            minHeight: 44,
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

          {isRenaming ? (
            <input
              ref={inputRef}
              type="text"
              value={renamingText}
              onChange={(e) => setRenamingText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void saveRename();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  cancelRenaming();
                }
              }}
              onBlur={saveRename}
              disabled={isSaving}
              style={{
                flex: 1,
                minWidth: 60,
                maxWidth: 200,
                border: '1px solid var(--robins-egg, #7FCFCB)',
                borderRadius: 4,
                padding: '2px 4px',
                fontSize: 11,
                fontFamily: 'inherit',
                color: 'var(--graphite, #2E2E30)',
                background: '#fff',
              }}
              placeholder="Project name"
              autoComplete="off"
            />
          ) : (
            <>
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 220,
                  fontWeight: 500,
                }}
                title={projectDisplayName}
              >
                {projectDisplayName}
              </span>
              <button
                type="button"
                onClick={startRenaming}
                aria-label="Rename project"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '2px 4px',
                  cursor: 'pointer',
                  fontSize: 10,
                  opacity: 0.6,
                  transition: 'opacity 0.15s',
                  color: 'var(--graphite, #2E2E30)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.6';
                }}
              >
                ✎
              </button>
            </>
          )}

          {saveStatus === 'success' && (
            <span
              style={{
                fontSize: 9,
                opacity: 0.7,
                fontStyle: 'italic',
              }}
            >
              Saved
            </span>
          )}
        </div>
      )}
    </div>
  );
}
