'use client';

/**
 * SpendBlock — left third of BudgetRibbon.
 *
 * Shows what's already gone out and what's committed. The "spent" bar
 * is the loudest piece on the row because spend is the one number a
 * builder feels personally. Committed money sits as a softer fill to
 * its right.
 *
 * No drilldown UI on the ribbon itself — clicking opens the existing
 * BudgetModule (handled by the parent BudgetRibbon).
 */

import { KAC_COLORS, KAC_FONTS } from './types';
import type { KacBudget } from './types';

export interface SpendBlockProps {
  budget: KacBudget;
  onClick?: () => void;
}

function fmtUsd(n: number): string {
  // Compact for small chrome — $312K, $1.65M.
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `$${v.toFixed(v >= 10 ? 1 : 2)}M`;
  }
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

export default function SpendBlock({ budget, onClick }: SpendBlockProps) {
  const { total, spent, committed } = budget;
  const spentPct = total > 0 ? (spent / total) * 100 : 0;
  const committedPct = total > 0 ? (committed / total) * 100 : 0;
  // Clamp the visible bar so spent+committed never exceeds 100% of the track.
  const visibleSpentPct = Math.min(100, spentPct);
  const visibleCommittedPct = Math.min(100 - visibleSpentPct, committedPct);

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
      }}
      aria-label={`Spend ${fmtUsd(spent)} of ${fmtUsd(total)}, committed ${fmtUsd(committed)}`}
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
          Spend
        </span>
        <span
          style={{
            fontFamily: KAC_FONTS.mono,
            fontSize: 11,
            color: KAC_COLORS.textWarmGray,
            whiteSpace: 'nowrap',
          }}
        >
          {Math.round(spentPct)}% of {fmtUsd(total)}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontFamily: KAC_FONTS.display,
            fontSize: 22,
            color: KAC_COLORS.spendRed,
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {fmtUsd(spent)}
        </span>
        <span
          style={{
            fontFamily: KAC_FONTS.mono,
            fontSize: 11,
            color: KAC_COLORS.textWarmGray,
            whiteSpace: 'nowrap',
          }}
        >
          + {fmtUsd(committed)} committed
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
            width: `${visibleSpentPct}%`,
            background: KAC_COLORS.spendRed,
            transition: 'width 320ms ease-out',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${visibleSpentPct}%`,
            width: `${visibleCommittedPct}%`,
            background: KAC_COLORS.spendRed,
            opacity: 0.35,
            transition: 'all 320ms ease-out',
          }}
        />
      </div>
    </button>
  );
}
