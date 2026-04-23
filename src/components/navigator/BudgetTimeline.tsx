'use client';

/**
 * BudgetTimeline
 * ==============
 *
 * The bottom row of the W9 IntegratedNavigator. Shows committed / spent / remaining
 * money beneath each of the 7 lifecycle stages as a horizontal timeline grid,
 * with running totals at the far right.
 *
 * This is NOT a chart (no curves, no area fills). It's a text-based timeline:
 * one column per stage, each with three money numbers stacked vertically.
 * A thin horizontal line connects all columns to establish the "timeline" metaphor.
 *
 * Contract with parent:
 *   - data: BudgetTimelineData (all 7 stages, totals, overbudget flag)
 *   - activeStageId: highlights the active column with a top border in brass
 *   - onStageHover: fires on column hover/focus, parent shows tooltip or pins it
 *   - compact: boolean, single-line summary mode instead of per-stage breakdown
 *
 * Visual language (expanded):
 *   - 7-column CSS Grid, each cell shows:
 *     $ glyph (brass, tiny)
 *     committed (--ink, ~13px, tabular-nums)
 *     spent (--graphite, ~11px, "spent " prefix muted)
 *     remaining (--robin / --orange / --graphite, ~11px, status-colored)
 *   - Thin --faded-rule line across all columns (the timeline thread)
 *   - Running totals right: "Total committed: $X • Spent: $Y"
 *   - Orange ▲ glyph if overbudget
 *   - Active stage: brass 2px top border
 *
 * Visual language (compact):
 *   - Single line: "Committed $X · Spent $Y · Remaining $Z"
 *   - --ink, tabular-nums, no per-stage detail
 *
 * Demo data fallback:
 *   - If localStorage has 'bkg-budget-demo-data' key, uses that JSON.
 *   - Otherwise seeds safe defaults: 7 stages × $0/$0, marked "demo data".
 *   - Allows investor demos to show live updates without needing real auth.
 */

import { useEffect, useState } from 'react';
import type { BudgetTimelineData, StageId } from './types';
import { STAGE_REGISTRY, formatCents } from './types';

export interface BudgetTimelineProps {
  data: BudgetTimelineData;
  activeStageId: StageId | null;
  /** Fires when user hovers/focuses a stage column; parent can show a tooltip or pin it. */
  onStageHover?: (stageId: StageId | null) => void;
  /** Compact mode: render single-line "total spent / total committed" instead of per-stage breakdown. */
  compact?: boolean;
}

/**
 * Fallback demo data: 7 stages with helpful placeholder amounts.
 * Used when localStorage is empty or during investor demos.
 */
function createDemoBudgetData(): BudgetTimelineData {
  const byStage: Record<StageId, any> = {} as any;

  // Seed with realistic values: Size Up has commitment, rest are $0/$0
  const demoAmounts: Record<StageId, { committed: number; spent: number }> = {
    1: { committed: 25000, spent: 0 },      // Size Up: $250 committed
    2: { committed: 0, spent: 0 },          // Lock it in
    3: { committed: 0, spent: 0 },          // Plan it out
    4: { committed: 0, spent: 0 },          // Build
    5: { committed: 0, spent: 0 },          // Adapt
    6: { committed: 0, spent: 0 },          // Collect
    7: { committed: 0, spent: 0 },          // Reflect
  };

  let totalCommittedCents = 0;
  let totalSpentCents = 0;

  for (const stageId of [1, 2, 3, 4, 5, 6, 7] as const) {
    const { committed, spent } = demoAmounts[stageId];
    const remaining = committed - spent;
    const status =
      committed === 0 ? ('not-started' as const) : spent > committed ? ('overbudget' as const) : ('on-track' as const);

    byStage[stageId] = {
      stageId,
      committedCents: committed,
      spentCents: spent,
      remainingCents: remaining,
      status,
    };

    totalCommittedCents += committed;
    totalSpentCents += spent;
  }

  const isOverbudget = totalSpentCents > totalCommittedCents;
  const overAmountCents = isOverbudget ? totalSpentCents - totalCommittedCents : 0;

  return {
    byStage,
    totalCommittedCents,
    totalSpentCents,
    isOverbudget,
    overAmountCents,
  };
}

/**
 * Load or create demo budget data from localStorage.
 * Used only when parent passes zero/empty data (no real project budget available).
 */
function loadOrCreateDemoData(): BudgetTimelineData {
  if (typeof window === 'undefined') {
    return createDemoBudgetData();
  }

  try {
    const stored = window.localStorage.getItem('bkg-budget-demo-data');
    if (stored) {
      return JSON.parse(stored) as BudgetTimelineData;
    }
  } catch {
    // Fallback to fresh demo data on parse error
  }

  return createDemoBudgetData();
}

export default function BudgetTimeline(props: BudgetTimelineProps) {
  const { data, activeStageId, onStageHover, compact = false } = props;
  const [effectiveData, setEffectiveData] = useState<BudgetTimelineData>(data);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // ─── Live update on bkg:budget:changed event ────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBudgetChange = () => {
      // Parent will re-render with fresh data, but we listen directly
      // in case parent is slow or detached. This ensures the timeline
      // always reflects the latest commit.
      setEffectiveData(data);
      setIsDemoMode(false);
    };

    window.addEventListener('bkg:budget:changed', handleBudgetChange);
    return () => window.removeEventListener('bkg:budget:changed', handleBudgetChange);
  }, [data]);

  // ─── Initialize: if data is empty/stub, use demo fallback ──────────────
  useEffect(() => {
    const hasRealData =
      Object.keys(data.byStage).length > 0 || data.totalCommittedCents > 0 || data.totalSpentCents > 0;

    if (!hasRealData) {
      const demoData = loadOrCreateDemoData();
      setEffectiveData(demoData);
      setIsDemoMode(true);
    } else {
      setEffectiveData(data);
      setIsDemoMode(false);
    }
  }, [data]);

  if (compact) {
    return <CompactMode data={effectiveData} isDemoMode={isDemoMode} />;
  }

  return (
    <ExpandedMode
      data={effectiveData}
      activeStageId={activeStageId}
      onStageHover={onStageHover}
      isDemoMode={isDemoMode}
    />
  );
}

// ─── Compact mode ────────────────────────────────────────────────────────────

function CompactMode({ data, isDemoMode }: { data: BudgetTimelineData; isDemoMode: boolean }) {
  const remaining = data.totalCommittedCents - data.totalSpentCents;
  const label = `Committed ${formatCents(data.totalCommittedCents)} · Spent ${formatCents(data.totalSpentCents)} · Remaining ${formatCents(remaining)}`;

  return (
    <div
      style={{
        fontSize: '12px',
        fontFamily: 'var(--font-archivo)',
        color: 'var(--ink)',
        fontVariantNumeric: 'tabular-nums',
        padding: '8px 12px',
        position: 'relative',
      }}
    >
      {label}
      {isDemoMode && (
        <span style={{ fontSize: '9px', color: 'var(--graphite)', marginLeft: '8px', opacity: 0.6 }}>
          (demo data)
        </span>
      )}
    </div>
  );
}

// ─── Expanded mode ───────────────────────────────────────────────────────────

function ExpandedMode({
  data,
  activeStageId,
  onStageHover,
  isDemoMode,
}: {
  data: BudgetTimelineData;
  activeStageId: StageId | null;
  onStageHover?: (stageId: StageId | null) => void;
  isDemoMode: boolean;
}) {
  return (
    <div
      role="row"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0',
        padding: '12px 16px',
        borderTop: '1px solid var(--faded-rule)',
      }}
      onMouseLeave={() => onStageHover?.(null)}
    >
      {/* 7-column grid for stages */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '12px',
          flex: 1,
          minWidth: 0,
        }}
      >
        {STAGE_REGISTRY.map((stage) => {
          const budget = data.byStage[stage.id];
          const isActive = activeStageId === stage.id;

          // Happy path: budget exists; fallback to dashes if not
          const committed = budget?.committedCents ?? 0;
          const spent = budget?.spentCents ?? 0;
          const remaining = budget?.remainingCents ?? 0;
          const status = budget?.status ?? 'not-started';

          // Color by status for remaining value
          let remainingColor = 'var(--graphite)';
          if (status === 'on-track') {
            remainingColor = 'var(--robin)';
          } else if (status === 'overbudget') {
            remainingColor = 'var(--orange)';
          }

          const ariaLabel = `${stage.label}: committed ${formatCents(committed)}, spent ${formatCents(spent)}`;

          return (
            <div
              key={stage.id}
              role="cell"
              aria-label={ariaLabel}
              onMouseEnter={() => onStageHover?.(stage.id)}
              onFocus={() => onStageHover?.(stage.id)}
              onBlur={() => onStageHover?.(null)}
              tabIndex={0}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                paddingTop: isActive ? '12px' : '14px',
                paddingBottom: '8px',
                paddingLeft: '8px',
                paddingRight: '8px',
                borderTop: isActive ? '2px solid var(--brass)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 140ms ease',
              }}
            >
              {/* $ glyph — tiny, brass, centered-ish */}
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--brass)',
                  fontWeight: 700,
                  textAlign: 'center',
                }}
              >
                $
              </div>

              {/* Committed amount — primary, ink color */}
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--ink)',
                  fontVariantNumeric: 'tabular-nums',
                  textAlign: 'center',
                }}
              >
                {formatCents(committed)}
              </div>

              {/* Spent label + amount — secondary, graphite, smaller */}
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--graphite)',
                  fontVariantNumeric: 'tabular-nums',
                  textAlign: 'center',
                }}
              >
                <span style={{ opacity: 0.7 }}>spent </span>
                {formatCents(spent)}
              </div>

              {/* Remaining — status-colored */}
              <div
                style={{
                  fontSize: '11px',
                  color: remainingColor,
                  fontVariantNumeric: 'tabular-nums',
                  textAlign: 'center',
                  fontWeight: 600,
                }}
              >
                {status === 'not-started' && committed === 0 ? '—' : formatCents(remaining)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Running total strip at far right */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          paddingLeft: '16px',
          borderLeft: '1px solid var(--faded-rule)',
          minWidth: '160px',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            color: 'var(--ink)',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          Total committed:{' '}
          <span style={{ fontWeight: 700 }}>{formatCents(data.totalCommittedCents)}</span>
          {data.isOverbudget && <span style={{ color: 'var(--orange)' }}>▲</span>}
        </div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--graphite)',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          Spent: <span style={{ color: 'var(--ink)', fontWeight: 700 }}>{formatCents(data.totalSpentCents)}</span>
        </div>
        {isDemoMode && (
          <div
            style={{
              fontSize: '9px',
              color: 'var(--graphite)',
              fontVariantNumeric: 'tabular-nums',
              marginTop: '4px',
              opacity: 0.6,
            }}
          >
            demo data
          </div>
        )}
      </div>
    </div>
  );
}
