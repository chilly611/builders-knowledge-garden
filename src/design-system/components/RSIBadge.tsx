'use client';

/**
 * RSIBadge
 * ========
 * Shows how many cycles a specialist's prompt has been refined by the RSI loop.
 *
 * Design:
 * - 11px Brass uppercase letterspaced (0.04em)
 * - Brass-circle bullet (●) + "improved · {cycles} cycles"
 * - Inline pill with padding + border-radius
 * - If cycles===0: hidden entirely
 * - If loopName provided: tooltip on hover (desktop only)
 * - Mobile: same size, no tooltip
 *
 * Styling:
 * - Background: transparent with very faint brass fill (8% opacity)
 * - Border: 0.5px solid brass
 * - Font: 11px, semibold, uppercase, 0.04em letter spacing
 * - Color: brass
 * - Padding: spacing[1] (4px) horizontal, 2px vertical for tight fit
 * - Border-radius: full (pill shape)
 */

import React, { useState, useRef, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { colors, fonts, fontWeights, spacing, borders, radii } from '../tokens';

interface RSIBadgeProps {
  cycles: number;
  loopName?: string;
}

export default function RSIBadge({ cycles, loopName }: RSIBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  // Hide if cycles is 0
  if (cycles === 0) {
    return null;
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Tooltip positioning (desktop only)
  useEffect(() => {
    if (isMobile || !showTooltip || !badgeRef.current || !tooltipRef.current) return;

    const badgeRect = badgeRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current;

    tooltip.style.position = 'fixed';
    tooltip.style.top = `${badgeRect.bottom + 8}px`;
    tooltip.style.left = `${badgeRect.left}px`;
  }, [showTooltip, isMobile]);

  const badgeStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: `2px ${spacing[1]}`,
    backgroundColor: `${colors.brass}14`, // 8% opacity
    border: `${borders.hairline} ${colors.brass}`,
    borderRadius: radii.full,
    fontSize: '11px',
    fontWeight: fontWeights.semibold,
    color: colors.brass,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    fontFamily: fonts.body,
    cursor: loopName && !isMobile ? 'help' : 'default',
    position: 'relative',
  };

  const tooltipStyle: CSSProperties = {
    position: 'absolute',
    backgroundColor: colors.ink[900],
    color: '#FFFFFF',
    padding: `${spacing[2]} ${spacing[3]}`,
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: fontWeights.regular,
    maxWidth: '250px',
    whiteSpace: 'normal',
    zIndex: 1000,
    pointerEvents: 'none',
    boxShadow: '0 4px 12px rgba(11, 29, 51, 0.2)',
    fontFamily: fonts.body,
  };

  return (
    <div
      ref={badgeRef}
      style={badgeStyle}
      onMouseEnter={() => !isMobile && loopName && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      title={isMobile && loopName ? `Loop: ${loopName} · This specialist's prompt has been refined ${cycles} times based on real contractor outcomes.` : undefined}
    >
      <span>●</span>
      <span>
        improved · {cycles} {cycles === 1 ? 'cycle' : 'cycles'}
      </span>

      {/* Tooltip (desktop only, on hover) */}
      {showTooltip && loopName && !isMobile && (
        <div ref={tooltipRef} style={tooltipStyle}>
          <div style={{ fontWeight: fontWeights.semibold, marginBottom: spacing[1] }}>
            Loop: {loopName}
          </div>
          <div>
            This specialist's prompt has been refined {cycles} times based on real contractor outcomes.
          </div>
        </div>
      )}
    </div>
  );
}
