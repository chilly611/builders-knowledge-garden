'use client';

/**
 * CompletionRing — circular SVG progress indicator.
 *
 * Used inside StageNode (one per lifecycle stage) and anywhere else the
 * chrome needs a compact "% done" disc. Renders a background ring and a
 * foreground arc whose length is `percent / 100 * circumference`.
 *
 * Pattern adapted from src/components/pm/ProjectConfidence.tsx (which
 * uses the same strokeDasharray technique). Kept deliberately stateless
 * so it can be composed anywhere without context.
 */

import { KAC_COLORS, KAC_FONTS } from './types';

export interface CompletionRingProps {
  /** 0..100. Values outside the range are clamped. */
  percent: number;
  /** Outer diameter in px. Default 44. */
  size?: number;
  /** Ring thickness in px. Default 4. */
  strokeWidth?: number;
  /** Override foreground stroke color. Default = red chrome. */
  color?: string;
  /** If true (default), draw the % label centered inside the ring. */
  showLabel?: boolean;
  /** Optional aria label (e.g. "Size Up 100% complete"). */
  label?: string;
}

export default function CompletionRing({
  percent,
  size = 44,
  strokeWidth = 4,
  color = KAC_COLORS.redChrome,
  showLabel = true,
  label,
}: CompletionRingProps) {
  const pct = Math.max(0, Math.min(100, percent));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const dashOn = (pct / 100) * c;
  const dashOff = c - dashOn;

  return (
    <div
      role={label ? 'img' : undefined}
      aria-label={label}
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={KAC_COLORS.divider}
          strokeWidth={strokeWidth}
        />
        {/* Foreground arc — start at 12 o'clock */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dashOn} ${dashOff}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 280ms ease-out' }}
        />
      </svg>
      {showLabel && (
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: KAC_FONTS.mono,
            fontSize: Math.max(10, Math.round(size * 0.26)),
            color: KAC_COLORS.textInk,
            letterSpacing: '0.02em',
            lineHeight: 1,
            pointerEvents: 'none',
          }}
        >
          {Math.round(pct)}
        </span>
      )}
    </div>
  );
}
