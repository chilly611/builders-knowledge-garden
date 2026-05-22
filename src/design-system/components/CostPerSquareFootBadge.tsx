'use client';

/**
 * CostPerSquareFootBadge
 * ======================
 * Derives `$X–$Y/sf` at render time from a cost range and square footage.
 *
 * Why this exists (COCKPIT-FIXES Pain 1, 2026-05-22):
 *   The Marin AI summary said "At 2,800 sf with mid-grade you're ~$420–$590/sf"
 *   because the prose was baked from an older 1,800 sf seed — but the live
 *   cost range $900k–$1.2M ÷ 2,800 sf is actually $321–$429/sf. So the
 *   prose contradicted the math on every project page. Strip $/sf claims
 *   from AI prose; derive them here from the canonical numeric inputs so
 *   they ALWAYS agree.
 *
 * Inputs are flexible — pass:
 *   - { costLow, costHigh, sqft } for a derived range, or
 *   - { cost: <single midpoint>, sqft } for a derived point.
 *
 * Renders nothing when any input is null/0 or sqft is malformed. Compact
 * by default; pass `verbose` for the longer "$X–$Y per sq ft" form.
 */

import React from 'react';
import { colors, fonts, fontSizes, fontWeights, radii, spacing } from '../tokens';

interface CostPerSquareFootBadgeProps {
  /** Low end of cost range (USD). Used with costHigh for a range. */
  costLow?: number | null;
  /** High end of cost range (USD). Used with costLow for a range. */
  costHigh?: number | null;
  /** Single cost value (USD) — used when costLow/costHigh aren't passed. */
  cost?: number | null;
  /**
   * Project square footage. Accepts a number or a numeric string (the
   * canonical column is text on command_center_projects).
   */
  sqft: number | string | null | undefined;
  /** "$320–$430/sf" (default) vs "$320–$430 per sq ft" (verbose). */
  verbose?: boolean;
  /** Inline overrides. */
  style?: React.CSSProperties;
}

function parseSqft(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
  // text column — pull the first integer-ish chunk
  const cleaned = String(value).replace(/[,_]/g, '').trim();
  if (!cleaned) return null;
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatPerSf(n: number): string {
  // Round to nearest dollar; insert thousands separator. $/sf usually
  // 2–4 digits so commas only matter for stratospheric projects.
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

export default function CostPerSquareFootBadge({
  costLow,
  costHigh,
  cost,
  sqft,
  verbose = false,
  style,
}: CostPerSquareFootBadgeProps) {
  const sqftNum = parseSqft(sqft);
  if (sqftNum === null) return null;

  const suffix = verbose ? ' per sq ft' : '/sf';

  let label: string | null = null;
  if (typeof costLow === 'number' && typeof costHigh === 'number' && costLow > 0 && costHigh > 0) {
    const lo = costLow / sqftNum;
    const hi = costHigh / sqftNum;
    // Avoid the pathological "$429-$321" if caller passed swapped bounds.
    const [a, b] = lo <= hi ? [lo, hi] : [hi, lo];
    label = `${formatPerSf(a)}–${formatPerSf(b)}${suffix}`;
  } else if (typeof cost === 'number' && cost > 0) {
    label = `${formatPerSf(cost / sqftNum)}${suffix}`;
  }

  if (!label) return null;

  return (
    <span
      data-testid="cost-per-sf-badge"
      title={`Derived from ${sqftNum.toLocaleString('en-US')} sq ft and the project cost range. Updates whenever cost or sqft changes.`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: `${spacing[1]} ${spacing[2]}`,
        backgroundColor: `${colors.brass}14`, // brass @ ~8% — quiet, advisory
        color: colors.ink?.[700] ?? '#2E2E30',
        fontFamily: fonts.mono ?? fonts.body,
        fontSize: fontSizes.xs,
        fontWeight: fontWeights.semibold,
        borderRadius: radii.full,
        letterSpacing: '0.02em',
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {label}
    </span>
  );
}
