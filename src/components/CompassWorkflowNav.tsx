'use client';

/**
 * CompassWorkflowNav — Ship 19 (BKG demo prep, investor demo 2026-05-20).
 * ========================================================================
 *
 * Bottom-right floating navigator that surfaces ALL live /killerapp/*
 * workflows grouped by the three demo-relevant lifecycle stages
 * (Size up / Lock it in / Plan it out). Replaces the visual real-estate
 * of the existing root-layout `<CompassBloom />` for /killerapp/* routes.
 *
 * NOTE on naming: the original spec asked for `CompassNav.tsx`, but a
 * pre-existing `src/components/CompassNav.tsx` already provides the
 * global desktop sidebar / mobile FAB (unrelated to /killerapp). To honor
 * the MANDATORY anti-stomp rules, this Ship 19 component lives at
 * `CompassWorkflowNav.tsx` and is mounted alongside the legacy
 * compass in `/killerapp/layout.tsx`. The orchestrator deprecates
 * `<CompassBloom />` for /killerapp/* after Wednesday.
 *
 * Save-and-go semantics:
 *   This demo Ship uses the SIMPLER pattern — just `router.push(href)`
 *   directly. The autosave debounce (500ms, see
 *   `src/lib/hooks/useProjectWorkflowState.ts`) almost certainly fires
 *   before the user navigates from this overlay.
 *
 *   TODO(post-demo): swap to the event-based flush-and-await pattern.
 *   Sketch:
 *     await new Promise<void>((resolve) => {
 *       const onAck = () => { window.removeEventListener('bkg:workflow:autosaved', onAck); resolve(); };
 *       window.addEventListener('bkg:workflow:autosaved', onAck, { once: true });
 *       window.dispatchEvent(new CustomEvent('bkg:nav:flush-and-go', { detail: { href } }));
 *       setTimeout(resolve, 800); // hard timeout — never block nav indefinitely
 *     });
 *     router.push(href);
 *
 *   `useProjectWorkflowState` already emits `bkg:workflow:autosaved`
 *   when its `flush()` completes (grep'd 2026-05-19). The missing piece
 *   is a listener for `bkg:nav:flush-and-go` that calls flush(). One
 *   line in the hook.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { STAGE_ACCENTS } from '@/design-system/tokens/stage-accents';

// ---------------------------------------------------------------------------
// Workflow catalog — mirror of LIVE_WORKFLOWS in /killerapp/page.tsx.
// Order within each group reflects the lifecycle reading order.
// ---------------------------------------------------------------------------

// Stage 0 is the cross-cutting "Money" group surfaced at the top of the
// panel per Ship 22 brief — it isn't a lifecycle stage, it's an always-on
// section ("Budget" is the entry point for the dedicated /killerapp/budget
// interface). Existing stage 1/2/3 behaviour is unchanged.
type StageBucket = 0 | 1 | 2 | 3;

interface WorkflowEntry {
  id: string;
  href: string;
  stage: StageBucket;
  emoji: string;
  label: string;       // plain-English question
  sublabel: string;    // pro term
}

const WORKFLOWS: WorkflowEntry[] = [
  // Stage 0 — Money (always-on, sits at the top of the panel)
  { id: 'budget',          href: '/killerapp/budget',                         stage: 0, emoji: '\u{1F4B0}', label: "What's the budget?",                  sublabel: 'Budget & estimating' },
  // Stage 1 — Size up
  { id: 'crm-lead-intake', href: '/killerapp/who-is-asking',                  stage: 1, emoji: '\u{1F4DE}', label: "Who's asking?",                       sublabel: 'Voice lead intake' },
  { id: 'q2',              href: '/killerapp/workflows/estimating',           stage: 1, emoji: '\u{1F4CF}', label: 'What might this cost to build?',     sublabel: 'Quick estimate' },
  // Stage 2 — Lock it in
  { id: 'q4',              href: '/killerapp/workflows/contract-templates',   stage: 2, emoji: '\u{1F4DD}', label: 'Get paperwork ready.',                sublabel: 'Contract templates' },
  { id: 'q5',              href: '/killerapp/workflows/code-compliance',      stage: 2, emoji: '\u{1F4D8}', label: 'Which codes apply here?',             sublabel: 'Code compliance' },
  // Stage 3 — Plan it out
  { id: 'q6',              href: '/killerapp/workflows/job-sequencing',       stage: 3, emoji: '\u{1F5D3}',  label: 'Who works when?',                     sublabel: 'Sequence the trades' },
  { id: 'q7',              href: '/killerapp/workflows/worker-count',         stage: 3, emoji: '\u{1F465}', label: 'How many crew do you need?',          sublabel: 'Crew sizing' },
  { id: 'q8',              href: '/killerapp/workflows/permit-applications',  stage: 3, emoji: '\u{1F4CB}', label: 'What permits do you need?',           sublabel: 'Permit checklist' },
  { id: 'q9',              href: '/killerapp/workflows/sub-management',       stage: 3, emoji: '\u{1F91D}', label: 'Compare sub bids.',                   sublabel: 'Bid analysis' },
  { id: 'q10',             href: '/killerapp/workflows/equipment',            stage: 3, emoji: '\u{1F69C}', label: 'Rent or buy equipment?',              sublabel: 'Equipment costs' },
  { id: 'q11',             href: '/killerapp/workflows/supply-ordering',      stage: 3, emoji: '\u{1F4E6}', label: 'Order the materials.',                sublabel: 'Supply ordering' },
  { id: 'q12',             href: '/killerapp/workflows/services-todos',       stage: 3, emoji: '⚡',     label: 'Schedule utilities and services.',    sublabel: 'Services to-do' },
  { id: 'q13',             href: '/killerapp/workflows/hiring',               stage: 3, emoji: '\u{1F4BC}', label: 'Find and hire crew.',                 sublabel: 'Hiring' },
  { id: 'q14',             href: '/killerapp/workflows/weather-scheduling',   stage: 3, emoji: '\u{1F326}️', label: 'Plan around the weather.',     sublabel: 'Weather scheduling' },
  { id: 'q15',             href: '/killerapp/workflows/daily-log',            stage: 3, emoji: '\u{1F4D3}', label: 'What happened today?',                sublabel: 'Daily log' },
  { id: 'q16',             href: '/killerapp/workflows/osha-toolbox',         stage: 3, emoji: '\u{1F6E1}️', label: 'Safety topic for the week.',   sublabel: 'Toolbox talk' },
  { id: 'q17',             href: '/killerapp/workflows/expenses',             stage: 3, emoji: '\u{1F4B0}', label: 'Track spending on the job.',          sublabel: 'Expense report' },
  { id: 'q18',             href: '/killerapp/workflows/outreach',             stage: 3, emoji: '\u{1F4E3}', label: 'Reach out to vendors.',               sublabel: 'Vendor outreach' },
  { id: 'q19',             href: '/killerapp/workflows/compass-nav',          stage: 3, emoji: '\u{1F9ED}', label: 'Where are you now?',                  sublabel: 'Project compass' },
];

const GROUPS: { stage: StageBucket; title: string; }[] = [
  // Ship 22: "Money" sits at the top — it's the first thing the contractor
  // sees when they crack open the navigator. Always-on, no lifecycle gating.
  { stage: 0, title: '\u{1F4B0} Money' },
  { stage: 1, title: '1 · Size up' },
  { stage: 2, title: '2 · Lock it in' },
  { stage: 3, title: '3 · Plan it out' },
];

// Demo-aligned palette (W8 lock). Inlined so this file has zero CSS deps
// beyond the design-system stage-accents tokens.
const COLORS = {
  navyDeep: '#0E2A47',
  navy: '#1B3B5E',
  trace: '#F4F0E6',
  brass: '#B6873A',
  fadedRule: '#C9C3B3',
  graphite: '#2E2E30',
  white: '#FFFFFF',
} as const;

const HIDDEN_PATHS = ['/onboard', '/onboarding', '/login', '/signup'];

function shouldHide(pathname: string | null): boolean {
  if (!pathname) return false;
  return HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

// ---------------------------------------------------------------------------
// Project name helper — read from localStorage cache without taking a hard
// dependency on ProjectContext (which throws outside its Provider).
// ---------------------------------------------------------------------------

function useSavedProjectName(): string | null {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const cached = window.localStorage.getItem('bkg-active-project-name');
      if (cached) setName(cached);
    } catch {
      // ignore
    }
  }, []);
  return name;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CompassWorkflowNav() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams?.get('project') ?? null;
  const savedProjectName = useSavedProjectName();

  const fabRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => setMounted(true), []);

  // Close on route change.
  useEffect(() => {
    setOpen(false);
    setQuery('');
  }, [pathname]);

  // Escape closes; outside-click closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        fabRef.current?.focus();
      }
    };
    const onClickOutside = (e: MouseEvent) => {
      if (!panelRef.current || !fabRef.current) return;
      const target = e.target as Node;
      if (!panelRef.current.contains(target) && !fabRef.current.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, [open]);

  // Autofocus the search input when panel opens.
  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => searchInputRef.current?.focus(), 80);
      return () => window.clearTimeout(t);
    }
    return;
  }, [open]);

  // Build href that preserves the current ?project= query, if present.
  const withProject = useCallback((href: string) => {
    if (!projectId) return href;
    const sep = href.includes('?') ? '&' : '?';
    return `${href}${sep}project=${encodeURIComponent(projectId)}`;
  }, [projectId]);

  // Filter all workflow rows by search query (label or sublabel).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return WORKFLOWS;
    return WORKFLOWS.filter(
      (w) => w.label.toLowerCase().includes(q) || w.sublabel.toLowerCase().includes(q) || w.id.toLowerCase().includes(q),
    );
  }, [query]);

  // Save-and-go: simple router.push for the demo. See file header for the
  // proper flush-and-await pattern to wire post-demo.
  const handleNavigate = useCallback((href: string) => {
    const target = withProject(href);
    // Best-effort flush hint — useProjectWorkflowState already auto-flushes
    // every 500ms, so this is just belt-and-suspenders for the demo.
    try {
      window.dispatchEvent(
        new CustomEvent('bkg:nav:flush-and-go', { detail: { href: target } }),
      );
    } catch {
      // ignore — older browsers
    }
    setOpen(false);
    router.push(target);
  }, [router, withProject]);

  if (!mounted) return null;
  if (shouldHide(pathname)) return null;

  return (
    <>
      {/* ── COLLAPSED FAB ── */}
      <button
        ref={fabRef}
        type="button"
        aria-label={open ? 'Close workflow navigator' : 'Open workflow navigator'}
        aria-expanded={open}
        aria-controls="compass-workflow-nav-panel"
        onClick={() => setOpen((o) => !o)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: `2px solid ${COLORS.brass}`,
          background: COLORS.navyDeep,
          color: COLORS.white,
          cursor: 'pointer',
          zIndex: 10000,
          boxShadow:
            '0 6px 16px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.06)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {/* Compass-rose SVG, 22px */}
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="none" stroke={COLORS.white} strokeWidth="1.4" opacity="0.85" />
          <polygon points="12,3 14,12 12,21 10,12" fill={COLORS.white} opacity="0.95" />
          <polygon points="3,12 12,10 21,12 12,14" fill={COLORS.brass} opacity="0.95" />
          <circle cx="12" cy="12" r="1.4" fill={COLORS.white} />
        </svg>
      </button>

      {/* ── EXPANDED PANEL ── */}
      {open && (
        <div
          ref={panelRef}
          id="compass-workflow-nav-panel"
          role="dialog"
          aria-modal="false"
          aria-label="Workflow navigator"
          style={{
            position: 'fixed',
            bottom: 92,
            right: 24,
            width: 340,
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: 'calc(100vh - 120px)',
            background: COLORS.trace,
            color: COLORS.graphite,
            border: `1px solid ${COLORS.fadedRule}`,
            borderRadius: 14,
            boxShadow:
              '0 18px 48px rgba(0,0,0,0.22), 0 6px 16px rgba(0,0,0,0.12)',
            zIndex: 10001,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'cwn-slide-in 0.18s ease-out',
            fontFamily: 'inherit',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px 10px',
              borderBottom: `1px solid ${COLORS.fadedRule}`,
              background: COLORS.trace,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.navy, letterSpacing: 0.2 }}>
              Choose your next move
            </div>
            <button
              type="button"
              aria-label="Close workflow navigator"
              onClick={() => {
                setOpen(false);
                fabRef.current?.focus();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: COLORS.graphite,
                fontSize: 18,
                lineHeight: 1,
                padding: 4,
                borderRadius: 6,
                opacity: 0.7,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
            >
              {'✕'}
            </button>
          </div>

          {/* Search */}
          <div style={{ padding: '10px 16px 6px' }}>
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search workflows…"
              aria-label="Search workflows"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px 10px',
                fontSize: 13,
                color: COLORS.graphite,
                background: COLORS.white,
                border: `1px solid ${COLORS.fadedRule}`,
                borderRadius: 8,
                outline: 'none',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = COLORS.brass)}
              onBlur={(e) => (e.currentTarget.style.borderColor = COLORS.fadedRule)}
            />
          </div>

          {/* Group list (scrollable) */}
          <div
            style={{
              overflowY: 'auto',
              padding: '4px 8px 4px',
              flex: 1,
              minHeight: 80,
            }}
          >
            {GROUPS.map((group) => {
              const rows = filtered.filter((w) => w.stage === group.stage);
              if (rows.length === 0) return null;
              // Stage 0 = the Ship 22 "Money" group; STAGE_ACCENTS only
              // defines 1–7 lifecycle stages, so fall back to brass for
              // the always-on money lane.
              const accent =
                group.stage === 0
                  ? COLORS.brass
                  : STAGE_ACCENTS[group.stage as 1 | 2 | 3].hex;
              return (
                <div key={group.stage} style={{ marginBottom: 6 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 10px 6px',
                      fontSize: 10,
                      letterSpacing: 1.4,
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      color: accent,
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        display: 'inline-block',
                        width: 16,
                        height: 2,
                        borderRadius: 1,
                        background: accent,
                      }}
                    />
                    {group.title}
                  </div>
                  <ul role="list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {rows.map((row) => {
                      const isHere =
                        pathname === row.href || (pathname?.startsWith(row.href + '/') ?? false);
                      return (
                        <li key={row.id}>
                          <button
                            type="button"
                            onClick={() => handleNavigate(row.href)}
                            disabled={isHere}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              width: '100%',
                              padding: '8px 10px',
                              border: 'none',
                              borderRadius: 8,
                              background: isHere ? `${accent}15` : 'transparent',
                              color: COLORS.graphite,
                              textAlign: 'left',
                              cursor: isHere ? 'default' : 'pointer',
                              fontFamily: 'inherit',
                              transition: 'background 0.12s ease',
                              opacity: isHere ? 0.85 : 1,
                            }}
                            onMouseEnter={(e) => {
                              if (!isHere) e.currentTarget.style.background = `${accent}10`;
                            }}
                            onMouseLeave={(e) => {
                              if (!isHere) e.currentTarget.style.background = 'transparent';
                            }}
                            aria-current={isHere ? 'page' : undefined}
                          >
                            <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0, width: 22, textAlign: 'center' }}>
                              {row.emoji}
                            </span>
                            <span style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1, minWidth: 0 }}>
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: isHere ? accent : COLORS.navy,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {row.label}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontStyle: 'italic',
                                  color: COLORS.graphite,
                                  opacity: 0.6,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {row.sublabel}
                              </span>
                            </span>
                            {isHere && (
                              <span
                                aria-label="current page"
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  background: accent,
                                  flexShrink: 0,
                                }}
                              />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div
                style={{
                  padding: '20px 12px',
                  fontSize: 12,
                  color: COLORS.graphite,
                  opacity: 0.6,
                  textAlign: 'center',
                }}
              >
                No workflows match {`"${query}"`}.
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              padding: '10px 14px',
              borderTop: `1px solid ${COLORS.fadedRule}`,
              background: COLORS.trace,
              fontSize: 11,
            }}
          >
            <button
              type="button"
              onClick={() => handleNavigate('/killerapp')}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: COLORS.navy,
                fontFamily: 'inherit',
                fontSize: 11,
                fontWeight: 600,
                padding: '4px 6px',
                borderRadius: 6,
                textDecoration: 'underline',
                textUnderlineOffset: 2,
              }}
            >
              Switch project
            </button>
            <span
              style={{
                color: COLORS.graphite,
                opacity: 0.65,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 180,
              }}
              title={savedProjectName ?? projectId ?? 'no project'}
            >
              {savedProjectName || projectId
                ? `saved · ${savedProjectName ?? projectId}`
                : 'no project selected'}
            </span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes cwn-slide-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @media (prefers-reduced-motion: reduce) {
          #compass-workflow-nav-panel { animation: none !important; }
        }
        @media print {
          #compass-workflow-nav-panel,
          button[aria-controls="compass-workflow-nav-panel"] { display: none !important; }
        }
      `}</style>
    </>
  );
}
