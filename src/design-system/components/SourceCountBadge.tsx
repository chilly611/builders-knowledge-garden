'use client';

/**
 * SourceCountBadge
 * ================
 * Visible trust signal for the multi-source code-verification architecture
 * that backs every compliance specialist call. Renders next to the
 * confidence band in AnalysisPane.
 *
 * `sources` is the count of distinct VERIFIED code sources — i.e. adapters
 * that actually retrieved the rule text (currently BKG seed + local
 * amendments). Citation-only adapters (ICC DigitalCodes, NFPA Link — both
 * paywalled, no fetch contract yet) ship `verified: false` and are NOT
 * counted here. See `countVerifiedSources` in src/lib/code-sources.
 *
 * Tier rules (CLAIMS fix D, 2026-05-22 — make the badge structurally
 * honest):
 *   3+ verified → green  "N sources verified"
 *   2 verified  → amber  "2 sources verified — confirm with code official"
 *   1 verified  → amber  "1 source — confirm with code official"
 *   0 verified  → red    "Preliminary — confirm with code official before relying"
 *
 * No hardcoded hex outside the design-system token reference.
 */

import React from 'react';
import { colors, fonts, fontSizes, fontWeights, spacing, radii } from '../tokens';

interface SourceCountBadgeProps {
  /**
   * Number of distinct VERIFIED code sources from `countVerifiedSources`.
   * Verified = adapter actually retrieved rule text (BKG seed, local
   * amendments). Citation-only sources (ICC/NFPA) are NOT counted.
   *
   * Undefined => non-compliance specialist (don't render).
   * 0 => no verified sources (preliminary; call code official).
   * 1 => one verified source (advisory).
   * 2 => two verified sources (advisory).
   * 3+ => fully cross-verified (high-trust).
   */
  sources: number | undefined;
}

export default function SourceCountBadge({ sources }: SourceCountBadgeProps) {
  // Non-compliance specialists don't have a source count — render nothing.
  if (sources === undefined) return null;

  let label: string;
  let backgroundColor: string;
  let color: string;
  let icon: string;
  let title: string;

  if (sources >= 3) {
    label = `${sources} sources verified`;
    icon = '✓';
    backgroundColor = `${colors.robin}20`; // Robin's Egg @ 12% — "verified" tier
    color = '#0F6B65'; // deep robin for legible text
    title = 'Answer is cross-verified across three or more code sources whose text was actually retrieved.';
  } else if (sources === 2) {
    label = '2 sources verified';
    icon = '✓';
    backgroundColor = `${colors.brass}1F`; // amber: not yet at our 3-source bar
    color = '#7A5C1A';
    title = 'Two verified code sources matched. Treat as advisory and confirm the controlling section with your code official.';
  } else if (sources === 1) {
    label = '1 source — confirm with code official';
    icon = '⚠';
    backgroundColor = `${colors.brass}1F`; // warm-ochre advisory
    color = '#7A5C1A';
    title = 'Only one verified code source matched. Treat as preliminary and confirm with your Authority Having Jurisdiction.';
  } else {
    label = 'Preliminary — confirm with code official before relying';
    icon = '⚠';
    backgroundColor = 'rgba(232, 68, 58, 0.10)'; // red-tint stop
    color = '#A02A1F';
    title = 'No verified code source has been retrieved for this query. Speak to your local building department before acting.';
  }

  return (
    <div
      title={title}
      aria-label={`Multi-source verification: ${label}`}
      data-testid="source-count-badge"
      data-source-count={sources}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing[2],
        alignSelf: 'flex-start',
        padding: `${spacing[1]} ${spacing[3]}`,
        backgroundColor,
        color,
        fontFamily: fonts.body,
        fontSize: fontSizes.xs,
        fontWeight: fontWeights.semibold,
        borderRadius: radii.full,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        lineHeight: 1.4,
      }}
    >
      <span aria-hidden style={{ fontSize: '0.9em' }}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}
