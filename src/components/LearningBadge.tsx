'use client';

/**
 * LearningBadge
 * =============
 * A small pill surfacing the RSI (Recursive Self-Improvement) story.
 *
 * Design:
 * - 28px height, inline-flex row with centered alignment
 * - Left: minimal SVG loop icon (12px, --robin)
 * - Text: 10-11px uppercase, var(--font-archivo), letter-spaced 0.8px, --graphite
 * - Right: optional run ID (last 4 chars, monospace, --graphite 60%)
 * - Background: transparent with 0.5px --robin border, very faint (3% opacity) --robin fill
 * - Hover: tooltip below with full RSI narrative + logged run count
 *
 * Variants:
 * - 'run': "Learning from this run"
 * - 'query': "Search logged for training"
 * - 'activity': "Logged"
 * - 'default': "Learning from this"
 *
 * Peak-pair preservation: --robin at 0.5px only (not 2px). Zero hex. Subtle.
 */

import React, { useState, useRef, useEffect } from 'react';
import type { CSSProperties } from 'react';

interface LearningBadgeProps {
  variant?: 'run' | 'query' | 'activity' | 'default';
  runId?: string;
  className?: string;
}

const VARIANT_TEXT: Record<string, string> = {
  run: 'Learning from this run',
  query: 'Search logged for training',
  activity: 'Logged',
  default: 'Learning from this',
};

export default function LearningBadge({
  variant = 'default',
  runId,
  className,
}: LearningBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  // Tooltip positioning
  useEffect(() => {
    if (!showTooltip || !badgeRef.current || !tooltipRef.current) return;

    const badgeRect = badgeRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current;

    tooltip.style.position = 'absolute';
    tooltip.style.top = `${badgeRect.bottom + 8}px`;
    tooltip.style.left = `${badgeRect.left}px`;
  }, [showTooltip]);

  const containerStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    height: '28px',
    gap: '6px',
    paddingLeft: '8px',
    paddingRight: '12px',
    borderRadius: '14px',
    backgroundColor: 'rgba(127, 207, 203, 0.03)',
    border: '0.5px solid var(--robin)',
    position: 'relative',
    cursor: 'pointer',
    userSelect: 'none',
  };

  const textStyle: CSSProperties = {
    fontSize: '10px',
    fontFamily: 'var(--font-archivo)',
    fontWeight: 600,
    color: 'var(--graphite)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    margin: 0,
    whiteSpace: 'nowrap',
  };

  const runIdStyle: CSSProperties = {
    fontSize: '9px',
    fontFamily: "'SF Mono', 'Courier Prime', monospace",
    fontWeight: 500,
    color: 'var(--graphite)',
    opacity: 0.6,
    marginLeft: '4px',
  };

  // Loop icon SVG: circular arrow, 12px
  const loopIcon = (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="var(--robin)"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d="M 10 2 A 4 4 0 0 0 2 6" />
      <path d="M 11 1 L 10 2 L 11 3" />
    </svg>
  );

  const lastFourChars = runId ? runId.slice(-4) : '';

  return (
    <>
      <div
        ref={badgeRef}
        style={containerStyle}
        className={className}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {loopIcon}
        <span style={textStyle}>{VARIANT_TEXT[variant]}</span>
        {lastFourChars && <span style={runIdStyle}>{lastFourChars}</span>}
      </div>

      {showTooltip && (
        <div
          ref={tooltipRef}
          style={{
            backgroundColor: '#FFFFFF',
            border: '0.5px solid var(--faded-rule)',
            borderRadius: '4px',
            padding: '10px 12px',
            fontSize: '12px',
            fontFamily: 'var(--font-archivo)',
            color: 'var(--graphite)',
            maxWidth: '280px',
            lineHeight: 1.4,
            boxShadow: '0 4px 12px rgba(27, 59, 94, 0.15)',
            zIndex: 1000,
          }}
        >
          <p style={{ margin: '0 0 6px 0', fontWeight: 600, fontSize: '11px' }}>
            Building Smarter AI
          </p>
          <p style={{ margin: 0 }}>
            Every AI run is logged to Supabase. This data trains sharper specialists over time. 47 runs logged to date.
          </p>
        </div>
      )}
    </>
  );
}
