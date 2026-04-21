'use client';

/**
 * HeroBand
 * ========
 * Top hero section with project name, address, and compact status stat.
 * Blueprint-grid background at 4% opacity.
 */

import type { CSSProperties } from 'react';

interface HeroBandProps {
  projectName: string;
  projectAddress: string;
  percentageThrough: number;
  currentStageId: number;
  currentStageName: string;
  remainingBudget: number;
}

export default function HeroBand({
  projectName,
  projectAddress,
  percentageThrough,
  currentStageId,
  currentStageName,
  remainingBudget,
}: HeroBandProps) {
  const containerStyle: CSSProperties = {
    padding: '32px 24px',
    background: 'var(--trace)',
    backgroundImage:
      'linear-gradient(rgba(27,58,92,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(27,58,92,0.04) 1px, transparent 1px)',
    backgroundSize: '24px 24px',
    borderBottom: '1px solid var(--faded-rule)',
    marginBottom: '32px',
  };

  const contentStyle: CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '32px',
  };

  const headingStyle: CSSProperties = {
    flex: 1,
    margin: 0,
  };

  const projectNameStyle: CSSProperties = {
    fontSize: 'clamp(48px, 5vw, 72px)',
    fontWeight: 700,
    color: 'var(--graphite)',
    fontFamily: 'var(--font-archivo)',
    lineHeight: 1.1,
    margin: '0 0 12px 0',
    letterSpacing: '-0.01em',
  };

  const addressStyle: CSSProperties = {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--brass)',
    fontFamily: 'var(--font-archivo)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    margin: 0,
  };

  const statStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '12px',
    minWidth: '160px',
  };

  const statLabelStyle: CSSProperties = {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--graphite)',
    fontFamily: 'var(--font-archivo)',
    letterSpacing: '0.05em',
    opacity: 0.7,
  };

  const statValueStyle: CSSProperties = {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--graphite)',
    fontFamily: 'var(--font-archivo)',
    lineHeight: 1,
    textAlign: 'right',
  };

  const formatMoney = (n: number): string => {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}k`;
    return `$${Math.round(n)}`;
  };

  return (
    <div style={containerStyle} className="bkg-fade-up bkg-hero-mark">
      <div style={contentStyle}>
        <div style={headingStyle}>
          <h1 style={projectNameStyle}>{projectName}</h1>
          <p style={addressStyle}>{projectAddress}</p>
        </div>
        <div style={statStyle}>
          <div style={statLabelStyle}>Status</div>
          <div style={statValueStyle}>
            {percentageThrough.toFixed(0)}%
          </div>
          <div style={statLabelStyle}>
            Stage {currentStageId} · {currentStageName}
          </div>
          <div style={{ ...statLabelStyle, opacity: 0.6 }}>
            {formatMoney(remainingBudget)} remaining
          </div>
        </div>
      </div>
    </div>
  );
}
