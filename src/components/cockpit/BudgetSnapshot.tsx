'use client';

import { useState } from 'react';
import { colors } from '@/design-system/tokens/colors';
import { fontWeights, letterSpacing } from '@/design-system/tokens/typography';
import { STAGE_REGISTRY } from '@/components/navigator/types';

/**
 * BudgetSnapshot (W9.D.9 — Lane B3)
 * ==================================
 * Real 7-stage sparkline + committed/spent summary in cockpit band.
 * Occupies 35% of the cockpit band (~96px tall desktop, responsive mobile).
 *
 * Three rows:
 *   1. "BUDGET" label (9px Brass uppercase + letterspaced)
 *   2. 7-stage sparkline (log-scaled columns, spent brass, unspent faded-rule outline)
 *   3. Two-line summary (committed/spent + remaining/drawn)
 *
 * Empty state when no budget yet.
 */

interface StageBudget {
  stageId: number;
  committedCents: number;
  spentCents: number;
  remainingCents: number;
  status: 'not-started' | 'on-track' | 'overbudget';
}

interface BudgetTimelineData {
  byStage: Record<number, StageBudget>;
  totalCommittedCents: number;
  totalSpentCents: number;
  isOverbudget: boolean;
  overAmountCents: number;
}

interface BudgetSnapshotProps {
  data: BudgetTimelineData;
  activeStageId?: number | null;
  onZoomToStage?: (stageId: number) => void;
}

function formatCurrency(cents: number): string {
  const dollars = Math.round(cents / 100);
  if (Math.abs(dollars) >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (Math.abs(dollars) >= 1_000) return `$${(dollars / 1_000).toFixed(1)}K`;
  return `$${dollars}`;
}

function Sparkline({
  data,
  activeStageId,
  onZoomToStage,
}: {
  data: BudgetTimelineData;
  activeStageId?: number | null;
  onZoomToStage?: (stageId: number) => void;
}) {
  const [hoveredStageId, setHoveredStageId] = useState<number | null>(null);

  // Find max committed to scale the sparkline
  const maxCommitted = Math.max(
    1,
    ...STAGE_REGISTRY.map((stage) => {
      const stageBudget = data.byStage[stage.id];
      return stageBudget?.committedCents ?? 0;
    })
  );

  const SVG_HEIGHT = 32;
  const SVG_WIDTH = 160;
  const COLUMN_WIDTH = SVG_WIDTH / 7;
  const PADDING = 2;

  return (
    <svg
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      style={{
        width: '100%',
        height: '32px',
        cursor: 'pointer',
      }}
      aria-label="7-stage budget sparkline"
    >
      <title>Budget by stage sparkline</title>

      {STAGE_REGISTRY.map((stage, idx) => {
        const stageBudget = data.byStage[stage.id] || {
          committedCents: 0,
          spentCents: 0,
        };

        const committedDollars = stageBudget.committedCents / 100;
        const spentDollars = stageBudget.spentCents / 100;

        // Use log scale for better visibility when stages vary wildly
        const maxLogValue = Math.log1p(maxCommitted / 100);
        const committedLogValue = Math.log1p(committedDollars);
        const columnHeightPercent =
          maxCommitted > 0 ? committedLogValue / maxLogValue : 0;
        const columnHeight = SVG_HEIGHT - PADDING;
        const fillHeight = columnHeight * columnHeightPercent;

        const x = idx * COLUMN_WIDTH + PADDING;
        const y = SVG_HEIGHT - fillHeight;
        const width = COLUMN_WIDTH - 2 * PADDING;

        // Check if over budget
        const isOverBudget = spentDollars > committedDollars && committedDollars > 0;

        // Spent portion height
        const spentPercent =
          committedDollars > 0 ? Math.min(1, spentDollars / committedDollars) : 0;
        const spentFillHeight = fillHeight * spentPercent;

        const isHovered = hoveredStageId === stage.id;
        const isActive = activeStageId === stage.id;

        return (
          <g
            key={stage.id}
            onClick={() => onZoomToStage?.(stage.id)}
            onMouseEnter={() => setHoveredStageId(stage.id)}
            onMouseLeave={() => setHoveredStageId(null)}
            style={{
              cursor: 'pointer',
              opacity: isHovered || isActive ? 1 : 0.7,
              transition: 'opacity 200ms ease',
            }}
          >
            {/* Background outline for committed budget */}
            {committedDollars > 0 && (
              <rect
                x={x}
                y={y}
                width={width}
                height={fillHeight}
                fill="none"
                stroke={colors.fadedRule}
                strokeWidth="0.5"
              />
            )}

            {/* Spent portion (brass) */}
            {spentDollars > 0 && !isOverBudget && (
              <rect
                x={x}
                y={y + fillHeight - spentFillHeight}
                width={width}
                height={spentFillHeight}
                fill={colors.brass}
              />
            )}

            {/* Over-budget redline at top */}
            {isOverBudget && (
              <>
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={fillHeight}
                  fill={colors.redline}
                  opacity="0.6"
                />
              </>
            )}
          </g>
        );
      })}

      {/* Tooltip on hover */}
      {hoveredStageId !== null && (
        <foreignObject x="0" y="0" width={SVG_WIDTH} height={SVG_HEIGHT}>
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: '8px',
              padding: '6px 8px',
              backgroundColor: colors.graphite,
              color: colors.trace,
              fontSize: '10px',
              borderRadius: '3px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <div style={{ fontWeight: fontWeights.semibold }}>
              {STAGE_REGISTRY.find((s) => s.id === hoveredStageId)?.label}
            </div>
            <div style={{ fontSize: '9px', opacity: 0.85 }}>
              {formatCurrency(
                (data.byStage[hoveredStageId]?.committedCents || 0) * 100
              )}{' '}
              / $
              {Math.round(
                (data.byStage[hoveredStageId]?.spentCents || 0) / 100
              )}
            </div>
          </div>
        </foreignObject>
      )}
    </svg>
  );
}

export default function BudgetSnapshot({
  data,
  activeStageId,
  onZoomToStage,
}: BudgetSnapshotProps) {
  const hasData =
    data.totalCommittedCents > 0 || data.totalSpentCents > 0;

  const committedDollars = data.totalCommittedCents / 100;
  const spentDollars = data.totalSpentCents / 100;
  const remainingDollars = committedDollars - spentDollars;
  const percentDrawn =
    committedDollars > 0
      ? Math.round((spentDollars / committedDollars) * 100)
      : 0;

  return (
    <div
      data-zone="budget"
      style={{
        flex: '0 0 35%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '4px 12px',
        gap: '4px',
      }}
    >
      {!hasData ? (
        // Empty state
        <div
          style={{
            fontSize: '11px',
            color: colors.fadedRule,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>No budget yet</span>
          <span style={{ fontSize: '8px', color: colors.brass }}>→</span>
        </div>
      ) : (
        <>
          {/* Row 1: Label */}
          <div
            style={{
              fontSize: '9px',
              color: colors.brass,
              fontWeight: fontWeights.semibold,
              letterSpacing: letterSpacing.technical,
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>BUDGET</span>
            <div
              style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                backgroundColor: colors.brass,
              }}
            />
          </div>

          {/* Row 2: Sparkline */}
          <div style={{ height: '32px', width: '100%' }}>
            <Sparkline
              data={data}
              activeStageId={activeStageId}
              onZoomToStage={onZoomToStage}
            />
          </div>

          {/* Row 3: Summary lines */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {/* Line 1: Committed + Spent */}
            <div
              style={{
                fontSize: '13px',
                display: 'flex',
                alignItems: 'baseline',
                gap: '6px',
              }}
            >
              <span style={{ color: colors.graphite, fontWeight: fontWeights.regular }}>
                {formatCurrency(data.totalCommittedCents)}
              </span>
              <span style={{ color: colors.graphite, opacity: 0.6, fontSize: '10px' }}>
                ·
              </span>
              <span style={{ color: colors.brass, fontWeight: fontWeights.semibold }}>
                {formatCurrency(data.totalSpentCents)}
              </span>
            </div>

            {/* Line 2: Remaining + Percent drawn */}
            <div
              style={{
                fontSize: '11px',
                color: colors.ink[600],
                display: 'flex',
                alignItems: 'baseline',
                gap: '6px',
              }}
            >
              <span>
                {formatCurrency(Math.max(0, data.totalCommittedCents - data.totalSpentCents))}{' '}
                remaining
              </span>
              <span style={{ opacity: 0.6 }}>·</span>
              <span>{percentDrawn}% drawn</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
