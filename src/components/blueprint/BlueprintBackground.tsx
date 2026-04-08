'use client';

import React from 'react';

interface BlueprintBackgroundProps {
  variant?: 'grid' | 'fine' | 'dark' | 'paper';
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function BlueprintBackground({
  variant = 'grid',
  children,
  className = '',
  style,
}: BlueprintBackgroundProps) {
  const bgClass = {
    grid: 'bp-grid',
    fine: 'bp-grid-fine',
    dark: 'bp-grid-dark',
    paper: '',
  }[variant];

  const paperStyle: React.CSSProperties = variant === 'paper'
    ? { background: 'var(--bp-paper-warm)', border: '1px solid var(--bp-paper-border)' }
    : {};

  return (
    <div
      className={`${bgClass} ${className}`}
      style={{ ...paperStyle, ...style }}
    >
      {/* Corner marks */}
      <div style={{
        position: 'absolute', top: 8, left: 8,
        width: 16, height: 16,
        borderTop: '2px solid var(--bp-ink-300)',
        borderLeft: '2px solid var(--bp-ink-300)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: 8, right: 8,
        width: 16, height: 16,
        borderTop: '2px solid var(--bp-ink-300)',
        borderRight: '2px solid var(--bp-ink-300)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: 8, left: 8,
        width: 16, height: 16,
        borderBottom: '2px solid var(--bp-ink-300)',
        borderLeft: '2px solid var(--bp-ink-300)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: 8, right: 8,
        width: 16, height: 16,
        borderBottom: '2px solid var(--bp-ink-300)',
        borderRight: '2px solid var(--bp-ink-300)',
        pointerEvents: 'none',
      }} />
      {children}
    </div>
  );
}
