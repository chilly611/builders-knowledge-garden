'use client';

/**
 * MobileCockpitDrawer (COCKPIT-FIXES Pain 2, 2026-05-22)
 * =======================================================
 * Foreman-feedback fix: on iPhone 14 (812 tall) the old `ProjectCockpit`
 * ate 180px = 22% of the viewport before the user saw any actual workflow
 * content. Tony's words: "I want to look at the task, not the dashboard."
 *
 * This component is the mobile shell ProjectCockpit renders below 640px.
 * Two states:
 *
 *   COLLAPSED (default, 56px):
 *     One row — project name • current stage chip • budget pill • chevron-up.
 *     Tap chevron OR swipe up on the band to expand. ~7% of viewport.
 *
 *   EXPANDED (280px):
 *     The full cockpit content — JourneyTimeline + BudgetSnapshot stacked
 *     vertically. Tap outside or swipe down to collapse.
 *
 * Persistence: collapsed/expanded preference is written to
 *   localStorage[`bkg-cockpit-mobile:<projectId>`]
 * so the foreman's choice survives reloads. Defaults to COLLAPSED for any
 * new project (the explicit foreman-feedback intent).
 *
 * A11y: drawer is a role="region" with aria-label, aria-expanded on the
 * toggle button, focus shifted onto the first interactive element on
 * expand, focus returned to the toggle on collapse. ESC closes when
 * expanded.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import JourneyTimeline from './JourneyTimeline';
import BudgetSnapshot from './BudgetSnapshot';
import {
  STAGE_REGISTRY,
  type StageId,
  type StageProgress,
  type BudgetTimelineData,
} from '@/components/navigator/types';

const COLLAPSED_HEIGHT = 56;
const EXPANDED_HEIGHT = 280;
const BRASS = '#B6873A';
const TRACE = '#F4F0E6';
const NAVY = '#1B3B5E';
const GRAPHITE = '#2E2E30';

function storageKey(projectId: string | null): string {
  return `bkg-cockpit-mobile:${projectId ?? 'anon'}`;
}

function readPersistedExpanded(projectId: string | null): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    return raw === '1';
  } catch {
    return false;
  }
}

function persistExpanded(projectId: string | null, expanded: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(projectId), expanded ? '1' : '0');
  } catch {
    /* localStorage blocked — keep working without persistence */
  }
}

function formatCents(cents: number): string {
  const dollars = Math.round(cents / 100);
  if (Math.abs(dollars) >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (Math.abs(dollars) >= 1_000) return `$${(dollars / 1_000).toFixed(0)}K`;
  return `$${dollars}`;
}

export interface MobileCockpitDrawerProps {
  projectId: string | null;
  projectName: string | null;
  stageProgress: StageProgress[];
  activeStageId: StageId | null;
  snapshots: any[];
  currentSnapshotId: string | null;
  budgetData: BudgetTimelineData;
  onStageClick: (stageId: StageId) => void;
  onScrub: (snapshotId: string | null) => void;
  onPreviewFuture?: (stageId: StageId | null) => void;
  onReturnToLive: () => void;
}

export default function MobileCockpitDrawer({
  projectId,
  projectName,
  stageProgress,
  activeStageId,
  snapshots,
  currentSnapshotId,
  budgetData,
  onStageClick,
  onScrub,
  onPreviewFuture,
  onReturnToLive,
}: MobileCockpitDrawerProps) {
  const [expanded, setExpanded] = useState<boolean>(() => readPersistedExpanded(projectId));
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const expandedRef = useRef<HTMLDivElement | null>(null);

  // Re-hydrate when the active project changes (each project has its own pref).
  useEffect(() => {
    setExpanded(readPersistedExpanded(projectId));
  }, [projectId]);

  // Persist on change.
  useEffect(() => {
    persistExpanded(projectId, expanded);
  }, [projectId, expanded]);

  // Focus management + ESC handler when expanded.
  useEffect(() => {
    if (!expanded) return;
    // Move focus into the expanded panel for screen-reader users.
    const t = window.setTimeout(() => {
      const firstFocusable = expandedRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), [role="slider"], a[href], [tabindex]:not([tabindex="-1"])',
      );
      firstFocusable?.focus();
    }, 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setExpanded(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [expanded]);

  // Swipe handlers — drag a tiny amount past threshold flips state.
  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const dy = info.offset.y;
      const v = info.velocity.y;
      // Up = negative dy/velocity. Threshold: 40px or 300px/s.
      if (!expanded && (dy < -40 || v < -300)) setExpanded(true);
      else if (expanded && (dy > 40 || v > 300)) setExpanded(false);
    },
    [expanded],
  );

  // Quick budget pill text: "$120K / $900K" (spent / committed).
  const committed = budgetData.totalCommittedCents;
  const spent = budgetData.totalSpentCents;
  const budgetPillText = committed > 0 ? `${formatCents(spent)} / ${formatCents(committed)}` : 'no budget';
  const isOver = budgetData.isOverbudget;

  // Active stage label for the chip.
  const activeStageMeta = activeStageId
    ? STAGE_REGISTRY.find((s) => s.id === activeStageId)
    : null;
  const stageChipLabel = activeStageMeta?.label ?? 'Pick a stage';

  return (
    <>
      {/* Backdrop only when expanded — tap to collapse */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setExpanded(false)}
            aria-hidden
            style={{
              position: 'fixed',
              inset: 0,
              top: 48 + COLLAPSED_HEIGHT, // sit under the header + collapsed bar
              background: 'rgba(11, 29, 51, 0.18)',
              zIndex: 9,
            }}
          />
        )}
      </AnimatePresence>

      <motion.section
        role="region"
        aria-label="Project cockpit"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.18}
        onDragEnd={handleDragEnd}
        animate={{ height: expanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        style={{
          position: 'sticky',
          top: 48,
          zIndex: 10,
          background: TRACE,
          backgroundImage: `linear-gradient(0deg, rgba(27,58,92,0.08) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(27,58,92,0.08) 1px, transparent 1px)`,
          backgroundSize: '4px 4px',
          borderTop: `1px solid ${BRASS}`,
          borderBottom: `1px solid ${BRASS}`,
          overflow: 'hidden',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          touchAction: 'pan-x', // allow horizontal scroll inside; we own vertical drag
        }}
      >
        {/* Collapsed bar — always visible, acts as the drag handle */}
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="mobile-cockpit-expanded"
          aria-label={expanded ? 'Collapse project cockpit' : 'Expand project cockpit'}
          style={{
            all: 'unset',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            height: COLLAPSED_HEIGHT,
            padding: '0 12px',
            boxSizing: 'border-box',
            cursor: 'pointer',
            gap: 8,
          }}
        >
          {/* Drag pill — visual affordance */}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: '50%',
              top: 4,
              transform: 'translateX(-50%)',
              width: 36,
              height: 3,
              borderRadius: 999,
              background: `${BRASS}55`,
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: NAVY,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '40%',
              }}
            >
              {projectName ?? 'Pick a project'}
            </span>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 8px',
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: BRASS,
                background: `${BRASS}1A`,
                border: `1px solid ${BRASS}55`,
                borderRadius: 999,
                whiteSpace: 'nowrap',
              }}
            >
              {stageChipLabel}
            </span>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 8px',
                fontSize: 11,
                fontFamily: "'IBM Plex Mono', monospace",
                color: isOver ? '#A02A1F' : GRAPHITE,
                background: isOver ? 'rgba(232, 68, 58, 0.10)' : 'rgba(46,46,48,0.06)',
                borderRadius: 999,
                whiteSpace: 'nowrap',
              }}
              title={isOver ? 'Over budget' : 'Spent / committed'}
            >
              {budgetPillText}
            </span>
          </div>

          {/* Chevron — rotates on expand */}
          <motion.span
            aria-hidden
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.18 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              color: BRASS,
              flexShrink: 0,
            }}
          >
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="4 10 8 6 12 10" />
            </svg>
          </motion.span>
        </button>

        {/* Expanded content — only mounted/visible when expanded */}
        <div
          ref={expandedRef}
          id="mobile-cockpit-expanded"
          aria-hidden={!expanded}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: '8px 12px 12px',
            borderTop: expanded ? `1px solid ${BRASS}33` : 'none',
            opacity: expanded ? 1 : 0,
            transition: 'opacity 160ms ease',
            pointerEvents: expanded ? 'auto' : 'none',
          }}
        >
          <div style={{ minHeight: 120 }}>
            <JourneyTimeline
              stages={stageProgress}
              activeStageId={activeStageId}
              snapshots={snapshots}
              currentSnapshotId={currentSnapshotId}
              onStageClick={onStageClick}
              onScrub={onScrub}
              onPreviewFuture={onPreviewFuture ?? (() => {})}
              onReturnToLive={onReturnToLive}
            />
          </div>
          <div>
            <BudgetSnapshot data={budgetData} activeStageId={activeStageId} />
          </div>
        </div>
      </motion.section>
    </>
  );
}
