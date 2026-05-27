'use client';

/**
 * HeadroomGauge — right third of BudgetRibbon.
 *
 * The single most-glanced-at number on the screen: how much room is
 * left between approved budget and what's already spent or committed.
 * Big number, soft red track, no chart-junk.
 */

import { KAC_COLORS, KAC_FONTS } from './types';
import type { KacBudget } from './types';

export interface HeadroomGaugeProps {
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

export default function HeadroomGauge({ budget, onClick }: HeadroomGaugeProps) {
  const { total, remaining, spent, committed } = budget;
  const used = spent + committed;
  const remainingPct = total > 0 ? (remaining / total) * 100 : 0;
  const usedPct = total > 0 ? (used / total) * 100 : 0;

  // Health color: > 25% headroom = green chrome, 10–25% = neutral red chrome,
  // < 10% = loud spend red (warning).
  const healthColor =
    remainingPct >= 25
      ? KAC_COLORS.incomeGreen
      : remainingPct >= 10
      ? KAC_COLORS.redChrome
      : KAC_COLORS.spendRed;

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
      aria-label={`Headroom ${fmtUsd(remaining)} remaining of ${fmtUsd(total)}`}
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
          Headroom
        </span>
        <span
          style={{
            fontFamily: KAC_FONTS.mono,
            fontSize: 11,
            color: KAC_COLORS.textWarmGray,
            whiteSpace: 'nowrap',
          }}
        >
          {Math.round(remainingPct)}% left
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
            color: healthColor,
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {fmtUsd(remaining)}
        </span>
        <span
          style={{
            fontFamily: KAC_FONTS.mono,
            fontSize: 11,
            color: KAC_COLORS.textWarmGray,
            whiteSpace: 'nowrap',
          }}
        >
          of {fmtUsd(total)}
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
            width: `${Math.min(100, usedPct)}%`,
            background: KAC_COLORS.spendRed,
            opacity: 0.18,
            transition: 'width 320ms ease-out',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${Math.min(100, usedPct)}%`,
            right: 0,
            background: healthColor,
            transition: 'all 320ms ease-out',
          }}
        />
      </div>
    </button>
  );
}
