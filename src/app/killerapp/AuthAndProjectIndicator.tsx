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
 * 2026-05-19 (Ship 18, investor demo prep):
 *   - Bumped desktop font sizes (11 -> 12/13) and padding (8/12 -> 10/16)
 *     so the identity/project pills are readable from across a room
 *     during the Wed May 20 investor demo.
 *   - Added a mobile drawer (< 640px viewport) — instead of two stacked
 *     pills that truncate mid-word on iPhone SE, render a single 38x38
 *     hamburger that slides a panel in from the right.
 *   - Added an always-visible "Saved Xs ago" indicator under the project
 *     name, listening for the `bkg:workflow:autosaved` event dispatched
 *     by useProjectWorkflowState.flush(). Direct response to Chilly's
 *     feedback: "I am not seeing evidence of things saving on each
 *     page." Re-computes the relative-time string every 5s.
 *
 * Suspense:
 *   Uses useSearchParams. Parent must wrap in <Suspense>.
 */

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

// 2026-05-19 (Ship 18): mobile breakpoint — < 640px collapses the two
// pills into a single hamburger + slide-out drawer to stop the project
// name from getting clipped mid-word on iPhone SE / mini viewports.
const MOBILE_BREAKPOINT_PX = 640;

/**
 * Render a relative-time string from a "saved at" epoch ms.
 *   < 5s   -> "just now"
 *   < 60s  -> "Xs ago"
 *   < 60m  -> "Xm ago"
 *   < 24h  -> "Xh ago"
 *   else   -> "Xd ago"
 * Returns null when `savedAt` is null (no save observed this session).
 */
function formatSavedAgo(savedAt: number | null, now: number): string | null {
  if (savedAt === null) return null;
  const deltaMs = Math.max(0, now - savedAt);
  const deltaS = Math.floor(deltaMs / 1000);
  if (deltaS < 5) return 'just now';
  if (deltaS < 60) return `${deltaS}s ago`;
  const deltaM = Math.floor(deltaS / 60);
  if (deltaM < 60) return `${deltaM}m ago`;
  const deltaH = Math.floor(deltaM / 60);
  if (deltaH < 24) return `${deltaH}h ago`;
  const deltaD = Math.floor(deltaH / 24);
  return `${deltaD}d ago`;
}

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

interface AuthAndProjectIndicatorProps {
  /** When true, renders as an inline flex child (no fixed positioning).
   *  Use this when embedding inside KillerAppNav. Default: false (fixed). */
  inline?: boolean;
}

export default function AuthAndProjectIndicator({ inline = false }: AuthAndProjectIndicatorProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const projectId = searchParams.get('project');
  // 2026-05-18 (Ship 11): anon CTAs now preserve the current pathname as
  // `next=`, so users return to where they were after auth instead of being
  // dumped on /killerapp. Falls back to /killerapp if usePathname returns
  // null (shouldn't happen in client components, but defensive).
  const nextParam = encodeURIComponent(pathname || '/killerapp');

  const [email, setEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamingText, setRenamingText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  // 2026-05-19 (Ship 18): mobile-drawer state. Starts closed. We track
  // viewport width via a resize listener so we can render the drawer
  // affordance on < 640px and auto-close it when the user resizes back
  // to desktop (e.g. rotating an iPad).
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // 2026-05-19 (Ship 18): "Saved Xs ago" subtitle. `lastSavedAt` is the
  // epoch ms of the most recent `bkg:workflow:autosaved` event for the
  // ACTIVE project. `nowTick` is a counter we bump every 5s so the
  // relative-time string re-renders without us having to read Date.now()
  // inside render and trigger a stale-closure bug.
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

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

  // 2026-05-19 (Ship 18): track viewport width to switch between the
  // desktop two-pill layout and the mobile drawer. Single resize
  // listener with a passive option; we also seed the initial value
  // from window.innerWidth on mount (SSR-safe — window check first).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT_PX;
      setIsMobile(mobile);
      // If the user resizes back to desktop while the drawer is open,
      // close it — the desktop layout shows everything inline so a
      // lingering drawer would just be confusing.
      if (!mobile) setDrawerOpen((prev) => (prev ? false : prev));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // 2026-05-19 (Ship 18): listen for autosave events from
  // useProjectWorkflowState.flush(). Only update when the event's
  // projectId matches the currently active ?project=<id> — otherwise a
  // background save on a stale tab could mis-stamp the indicator.
  useEffect(() => {
    if (typeof window === 'undefined' || !projectId) return;
    const onAutosave = (e: Event) => {
      const ce = e as CustomEvent<{ projectId?: string; column?: string }>;
      if (ce.detail?.projectId === projectId) {
        setLastSavedAt(Date.now());
      }
    };
    window.addEventListener('bkg:workflow:autosaved', onAutosave as EventListener);
    return () => {
      window.removeEventListener('bkg:workflow:autosaved', onAutosave as EventListener);
    };
  }, [projectId]);

  // 2026-05-19 (Ship 18): re-render the "Saved Xs ago" string every 5s
  // by bumping a tick counter. Cheaper than recomputing on every parent
  // render. Cleanup on unmount.
  useEffect(() => {
    if (lastSavedAt === null) return;
    const id = setInterval(() => setNowTick(Date.now()), 5000);
    return () => clearInterval(id);
  }, [lastSavedAt]);

  // 2026-05-19 (Ship 18): close the mobile drawer on outside-click and
  // on Escape. Only attaches handlers when the drawer is open to avoid
  // unnecessary document-level listeners during normal browsing.
  useEffect(() => {
    if (!drawerOpen) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (drawerRef.current && target && !drawerRef.current.contains(target)) {
        setDrawerOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

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

  // 2026-05-19 (Ship 18): the "Saved Xs ago" subtitle. `nowTick` is in
  // the dep array so the memo re-runs every 5s when the interval fires.
  // Returns null when nothing has saved yet (caller falls back to a
  // "Loaded · …" subtitle so there's still something under the name).
  const savedAgoLabel = useMemo(
    () => formatSavedAgo(lastSavedAt, nowTick),
    [lastSavedAt, nowTick]
  );

  // 2026-05-18 (Wave 2): Was `if (!authChecked) return null;` — that hid the
  // indicator on workflow pages during the auth-resolution flash, leaving
  // demo visitors with no visible "sign in" CTA. Now we render a placeholder
  // "Checking…" pill while auth is loading (preserves layout) and an
  // explicit "Not signed in · Sign in / Sign up" anon-CTA once resolved.
  // 2026-05-18 (Ship 11): /signup now exists, and both CTAs preserve the
  // current pathname as `next=` so users return to where they were.

  // 2026-05-19 (Ship 18): factor the auth-pill body so it can be reused
  // both inline on desktop and inside the mobile drawer without copy-
  // pasting the whole conditional. Font sizes bumped 11 -> 13 for the
  // investor demo (Chilly's request: "currently easy to miss").
  const authPillBody = !authChecked ? (
    <span style={{ opacity: 0.5 }}>Checking…</span>
  ) : email ? (
    <span>
      <span style={{ opacity: 0.5 }}>signed in · </span>
      {email}
    </span>
  ) : (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-500, #6F6F73)' }}>
      <span style={{ opacity: 0.7 }}>Not signed in ·</span>
      <Link
        href={`/login?next=${nextParam}`}
        style={{ color: 'var(--ink-500, #6F6F73)', textDecoration: 'underline', fontSize: 13 }}
      >
        Sign in
      </Link>
      <span style={{ opacity: 0.4 }}>/</span>
      <Link
        href={`/signup?next=${nextParam}`}
        style={{ color: 'var(--ink-500, #6F6F73)', textDecoration: 'underline', fontSize: 13 }}
      >
        Sign up
      </Link>
    </span>
  );

  // 2026-05-19 (Ship 18): the "Saved Xs ago" subtitle, always rendered
  // under the project name when a project is active. Falls back to
  // "Loaded · {name}" before the first save event of the session so
  // there's still something there (otherwise users on a freshly-opened
  // project page see the pill jump in height the first time they type).
  const savedSubtitle = project ? (
    <span
      style={{
        fontSize: 11,
        opacity: 0.7,
        fontStyle: 'italic',
        color: 'var(--graphite, #2E2E30)',
        whiteSpace: 'nowrap',
      }}
      data-testid="saved-ago-indicator"
    >
      {savedAgoLabel ? `Saved ${savedAgoLabel}` : 'Loaded'}
    </span>
  ) : null;

  // 2026-05-19 (Ship 18): project pill body, reused inline (desktop) and
  // inside the drawer (mobile). Padding bumped 8/12 -> 10/16 and font
  // 11 -> 13 for demo prominence.
  const projectPillBody = project ? (
    <>
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: 'var(--robins-egg, #7FCFCB)',
          flexShrink: 0,
        }}
      />
      <span style={{ opacity: 0.5 }}>Project Name: </span>

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
            fontSize: 13,
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
              fontSize: 12,
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
            fontSize: 10,
            opacity: 0.7,
            fontStyle: 'italic',
          }}
        >
          Saved
        </span>
      )}
    </>
  ) : null;

  // 2026-05-19 (Ship 18): mobile drawer branch. When viewport < 640px,
  // collapse the two stacked pills into a single hamburger button +
  // slide-out panel. This stops the project name from getting clipped
  // mid-word on iPhone SE / mini (375px viewport).
  // 2026-05-19 (Ship 21 hotfix): z-index bumped 50 -> 100. The Ship-18
  // refactor left this pill at z=50, but the global app-shell top bar
  // (which contains CompassWorkflowNav) is a position:fixed band at z=99
  // with a translucent cream background. It paints OVER the pill, making
  // the "Sign in / Sign up" CTA invisible on /killerapp — a P0 demo
  // blocker for the May 20 investor demo. 100 beats the 99 nav while
  // staying well below the FAB stack (9997+) so we don't fight the AI
  // FAB or its drawer scrim. Same fix for the mobile branch below.
  if (isMobile) {
    return (
      <div
        style={inline ? {
          // Inline mode: rendered as a flex child inside KillerAppNav.
          // The drawer + scrim are still position:fixed (own coords), so they work correctly.
          pointerEvents: 'none',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
        } : {
          position: 'fixed',
          top: 12,
          right: 16,
          zIndex: 100,
          pointerEvents: 'none',
        }}
        data-testid="auth-and-project-indicator-mobile"
      >
        {/* Hamburger / chevron button — always visible on mobile */}
        <button
          type="button"
          aria-label={drawerOpen ? 'Close account menu' : 'Open account menu'}
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen((o) => !o)}
          style={{
            pointerEvents: 'auto',
            width: 38,
            height: 38,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--trace, #F4F0E6)',
            border: '1px solid var(--brass, #B6873A)',
            borderRadius: 999,
            color: 'var(--graphite, #2E2E30)',
            cursor: 'pointer',
            fontFamily: 'var(--font-archivo), sans-serif',
            fontSize: 16,
            lineHeight: 1,
            padding: 0,
          }}
          data-testid="auth-and-project-indicator-mobile-toggle"
        >
          {/* Plain unicode hamburger — keeps bundle tiny; close becomes ✕ */}
          <span aria-hidden>{drawerOpen ? '✕' : '☰'}</span>
        </button>

        <AnimatePresence>
          {drawerOpen && (
            <>
              {/* Scrim — subtle dimming so the drawer pops off the page */}
              <motion.div
                key="scrim"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(46, 46, 48, 0.22)',
                  zIndex: 49,
                  pointerEvents: 'auto',
                }}
                onClick={closeDrawer}
                data-testid="auth-indicator-drawer-scrim"
              />
              <motion.div
                key="drawer"
                ref={drawerRef}
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.24, ease: 'easeOut' }}
                style={{
                  position: 'fixed',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: 'min(320px, 86vw)',
                  background: 'var(--trace, #F4F0E6)',
                  borderLeft: '1px solid var(--brass, #B6873A)',
                  boxShadow: '-8px 0 24px rgba(0,0,0,0.08)',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  zIndex: 50,
                  pointerEvents: 'auto',
                  fontFamily: 'var(--font-archivo), sans-serif',
                  color: 'var(--graphite, #2E2E30)',
                }}
                data-testid="auth-indicator-drawer"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.7 }}>Account</span>
                  <button
                    type="button"
                    onClick={closeDrawer}
                    aria-label="Close account menu"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 18,
                      color: 'var(--graphite, #2E2E30)',
                      padding: '4px 8px',
                      lineHeight: 1,
                    }}
                  >
                    {'✕'}
                  </button>
                </div>

                {/* Auth pill — same body, full-width inside drawer */}
                <div
                  style={{
                    padding: '12px 14px',
                    background: '#fff',
                    border: '0.5px solid var(--faded-rule, #C9C3B3)',
                    borderRadius: 12,
                    fontSize: 13,
                    color: 'var(--graphite, #2E2E30)',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                  }}
                >
                  {authPillBody}
                </div>

                {/* Project block — pill body + saved subtitle + switch link */}
                {project && (
                  <div
                    style={{
                      padding: '12px 14px',
                      background: 'rgba(127, 207, 203, 0.18)',
                      border: '0.5px solid var(--robins-egg, #7FCFCB)',
                      borderRadius: 12,
                      fontSize: 13,
                      color: 'var(--graphite, #2E2E30)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        flexWrap: 'wrap',
                      }}
                    >
                      {projectPillBody}
                    </div>
                    {savedSubtitle}
                  </div>
                )}

                <Link
                  href="/killerapp"
                  onClick={closeDrawer}
                  style={{
                    fontSize: 13,
                    color: 'var(--brass, #B6873A)',
                    textDecoration: 'underline',
                    alignSelf: 'flex-start',
                  }}
                >
                  Switch project
                </Link>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Desktop layout.
  // inline=false (default): two stacked pills, fixed top-right.
  // inline=true: compact horizontal pills, no fixed positioning — sits in
  //   the KillerAppNav flex row as the rightmost element. Pill height is
  //   reduced (32px) to fit the 48px nav band, and the project pill shows
  //   beside the auth pill rather than stacked below.
  if (inline) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0,
          pointerEvents: 'none',
        }}
        data-testid="auth-and-project-indicator"
      >
        {/* Separator before auth pill */}
        <span
          style={{
            width: 1,
            height: 20,
            background: 'var(--faded-rule, #C9C3B3)',
            flexShrink: 0,
          }}
        />

        {/* Auth pill — compact for nav bar */}
        <div
          style={{
            pointerEvents: 'auto',
            padding: '5px 10px',
            height: 28,
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
          {authPillBody}
        </div>

        {/* Project pill — compact, beside auth pill */}
        {project && (
          <div
            style={{
              pointerEvents: 'auto',
              padding: '5px 10px',
              height: 28,
              background: 'rgba(127, 207, 203, 0.18)',
              border: '0.5px solid var(--robins-egg, #7FCFCB)',
              borderRadius: 999,
              fontSize: 11,
              color: 'var(--graphite, #2E2E30)',
              fontFamily: 'var(--font-archivo), sans-serif',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              maxWidth: 'min(220px, 20vw)',
            }}
          >
            {projectPillBody}
          </div>
        )}
      </div>
    );
  }

  // Fixed desktop layout (non-inline) — two stacked pills, top-right.
  // 2026-05-19 (Ship 21 hotfix): z-index bumped 50 -> 100. See matching
  // comment on the mobile branch above: the app-shell top bar / Compass
  // workflow nav is a position:fixed band at z=99 with a translucent
  // cream background that was painting OVER this pill, hiding the Sign
  // in / Sign up CTA on /killerapp. 100 beats the nav while staying
  // safely below the FAB stack (9997+).
  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        right: 16,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 6,
        pointerEvents: 'none',
      }}
      data-testid="auth-and-project-indicator"
    >
      {/* Auth pill — always visible. 2026-05-19 (Ship 18): font 11 -> 13,
          padding 8/12 -> 10/16 for investor-demo prominence. */}
      <div
        style={{
          pointerEvents: 'auto',
          padding: '10px 16px',
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
          background: 'var(--trace, #F4F0E6)',
          border: '0.5px solid var(--faded-rule, #C9C3B3)',
          borderRadius: 999,
          fontSize: 13,
          color: 'var(--graphite, #2E2E30)',
          fontFamily: 'var(--font-archivo), sans-serif',
          whiteSpace: 'nowrap',
        }}
      >
        {authPillBody}
      </div>

      {/* Project pill — only when a project is active. 2026-05-19 (Ship 18):
          font 11 -> 13, padding 8/12 -> 10/16. Subtitle "Saved Xs ago" sits
          directly under the pill, aligned to the right edge. */}
      {project && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 2,
            pointerEvents: 'auto',
          }}
        >
          <div
            style={{
              padding: '10px 16px',
              minHeight: 44,
              background: 'rgba(127, 207, 203, 0.18)', // Robin's egg tint
              border: '0.5px solid var(--robins-egg, #7FCFCB)',
              borderRadius: 999,
              fontSize: 13,
              color: 'var(--graphite, #2E2E30)',
              fontFamily: 'var(--font-archivo), sans-serif',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              // 2026-05-07: maxWidth was 360, which clipped on iPhone SE/12
              // mini (375px viewport). Cap at the smaller of 360 and the
              // viewport width minus the right-offset (16px) and a small
              // breathing margin.
              // 2026-05-19 (Ship 18): the mobile <640px case is now handled
              // by the drawer branch above — this maxWidth still guards the
              // small-tablet (640-768) range.
              maxWidth: 'min(420px, calc(100vw - 48px))',
            }}
          >
            {projectPillBody}
          </div>
          {savedSubtitle && (
            <div style={{ paddingRight: 14 }}>{savedSubtitle}</div>
          )}
        </div>
      )}
    </div>
  );
}
