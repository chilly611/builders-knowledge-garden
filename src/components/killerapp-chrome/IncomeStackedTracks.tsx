'use client';

/**
 * IncomeStackedTracks — middle third of BudgetRibbon.
 *
 * Stacked horizontal track showing closed draws (actual income, solid
 * green) and projected upcoming draws (lighter green). Builders read
 * this strip as "money on its way."
 *
 * Two segments instead of a single bar because the actual / projected
 * distinction is load-bearing for cash-flow conversations.
 */

import { KAC_COLORS, KAC_FONTS } from './types';
import type { KacBudget } from './types';

export interface IncomeStackedTracksProps {
  budget: KacBudget;
  onClick?: () => void;
}

function fmtUsd(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `$${v.toFixed(v >= 10 ? 1 : 2)}M`;
  }
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

export default function IncomeStackedTracks({ budget, onClick }: IncomeStackedTracksProps) {
  const { total, draws } = budget;
  const closedPct = total > 0 ? (draws.closed / total) * 100 : 0;
  const projectedPct = total > 0 ? (draws.projected / total) * 100 : 0;
  const visibleClosedPct = Math.min(100, closedPct);
  const visibleProjectedPct = Math.min(100 - visibleClosedPct, projectedPct);

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: 0,
        background: 'transparent',
        border: 'none',
        padding: '8px 12px',
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
        color: 'inherit',
        font: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        borderLeft: `1px solid ${KAC_COLORS.divider}`,
        borderRight: `1px solid ${KAC_COLORS.divider}`,
      }}
      aria-label={`Income: ${fmtUsd(draws.closed)} closed, ${fmtUsd(draws.projected)} projected`}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: KAC_FONTS.body,
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: KAC_COLORS.textWarmGray,
          }}
        >
          Income
        </span>
        <span
          style={{
            fontFamily: KAC_FONTS.mono,
            fontSize: 11,
            color: KAC_COLORS.textWarmGray,
            whiteSpace: 'nowrap',
          }}
        >
          {draws.closedCount}/{draws.closedCount + draws.projectedCount} draws
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          minWidth: 0,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontFamily: KAC_FONTS.display,
            fontSize: 22,
            color: KAC_COLORS.incomeGreen,
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {fmtUsd(draws.closed)}
        </span>
        <span
          style={{
            fontFamily: KAC_FONTS.mono,
            fontSize: 11,
            color: KAC_COLORS.incomeGreenProjected,
            whiteSpace: 'nowrap',
          }}
        >
          + {fmtUsd(draws.projected)} projected
        </span>
      </div>

      <div
        style={{
          position: 'relative',
          height: 6,
          borderRadius: 3,
          background: KAC_COLORS.divider,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: `${visibleClosedPct}%`,
            background: KAC_COLORS.incomeGreen,
            transition: 'width 320ms ease-out',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${visibleClosedPct}%`,
            width: `${visibleProjectedPct}%`,
            background: `repeating-linear-gradient(
              45deg,
              ${KAC_COLORS.incomeGreenProjected},
              ${KAC_COLORS.incomeGreenProjected} 6px,
              rgba(255,255,255,0.55) 6px,
              rgba(255,255,255,0.55) 10px
            )`,
            transition: 'all 320ms ease-out',
          }}
        />
      </div>
    </button>
  );
}
