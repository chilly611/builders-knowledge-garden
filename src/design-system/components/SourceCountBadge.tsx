'use client';

/**
 * SourceCountBadge
 * ================
 * Visible trust signal for the 3-source-of-truth architecture that backs
 * every compliance specialist call. Renders next to the confidence band in
 * AnalysisPane.
 *
 * The platform already runs `queryAllSources` (src/lib/code-sources/) and
 * computes `hasMultipleSources` for every compliance answer; this badge
 * surfaces the result. Investors and builders both ask "how do you avoid
 * AI hallucinations?" — the answer is "we cross-check N sources before we
 * answer." This component makes that answer visible.
 *
 * Per W7.Q.1 (2026-04-22): we already cite BKG seed + ICC + NFPA + local
 * amendments via `queryAllSources`. Per W11.B (2026-05-18 PM): `sourceCount`
 * is now plumbed through `SpecialistResult.sourceCount`.
 *
 * No hardcoded hex outside the design-system token reference.
 */

import React from 'react';
import { colors, fonts, fontSizes, fontWeights, spacing, radii } from '../tokens';

interface SourceCountBadgeProps {
  /**
   * Number of distinct code sources cross-verified by `queryAllSources`.
   * Undefined => non-compliance specialist (don't render).
   * 0 => no sources matched (advisory state, prompts user to call AHJ).
   * 1 => single source (advisory: confirm with AHJ).
   * 2+ => multi-source verified (high-trust state).
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
    icon = '✓'; // ✓
    backgroundColor = `${colors.robin}20`; // Robin's Egg @ 12% — "verified" tier
    color = '#0F6B65'; // deep robin for legible text
    title = 'Answer is cross-verified across multiple code sources (BKG seed + ICC + NFPA + local amendments).';
  } else if (sources === 2) {
    label = '2 sources verified';
    icon = '✓';
    backgroundColor = `${colors.robin}20`;
    color = '#0F6B65';
    title = 'Answer is verified against two code sources.';
  } else if (sources === 1) {
    label = 'Single source — confirm with AHJ';
    icon = '⚠'; // ⚠
    backgroundColor = `${colors.brass}1F`; // warm-ochre advisory
    color = '#7A5C1A';
    title = 'Only one code source matched. Treat as preliminary and confirm with your Authority Having Jurisdiction.';
  } else {
    label = 'No verified code data — call AHJ';
    icon = '⚠';
    backgroundColor = 'rgba(232, 68, 58, 0.10)'; // red-tint stop
    color = '#A02A1F';
    title = 'No code source matched this query. Speak to your local building department before acting.';
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
