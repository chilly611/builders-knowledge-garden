'use client';

import React from 'react';
import { colors, fonts, fontSizes, fontWeights, letterSpacing, spacing } from '../tokens';

/**
 * Blueprint Divider
 * =================
 * Section divider with optional centered label — like a section break on a drawing sheet.
 */

interface BlueprintDividerProps {
  label?: string;
  variant?: 'dashed' | 'solid' | 'dotted';
  spacing?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

const spacingMap = {
  sm: spacing[3],
  md: spacing[6],
  lg: spacing[10],
};

export default function Divider({
  label,
  variant = 'dashed',
  spacing: spacingProp = 'md',
  style,
}: BlueprintDividerProps) {
  const lineStyle = variant === 'dotted' ? 'dotted' : variant === 'solid' ? 'solid' : 'dashed';

  if (!label) {
    return (
      <hr
        style={{
          border: 'none',
          borderTop: `1px ${lineStyle} ${colors.ink[200]}`,
          margin: `${spacingMap[spacingProp]} 0`,
          opacity: 0.6,
          ...style,
        }}
      />
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing[3],
        margin: `${spacingMap[spacingProp]} 0`,
        ...style,
      }}
    >
      <div style={{
        flex: 1,
        borderTop: `1px ${lineStyle} ${colors.ink[200]}`,
        opacity: 0.6,
      }} />
      <span style={{
        fontFamily: fonts.mono,
        fontSize: fontSizes.xs,
        fontWeight: fontWeights.semibold,
        letterSpacing: letterSpacing.technical,
        textTransform: 'uppercase' as const,
        color: colors.ink[400],
        whiteSpace: 'nowrap' as const,
      }}>
        {label}
      </span>
      <div style={{
        flex: 1,
        borderTop: `1px ${lineStyle} ${colors.ink[200]}`,
        opacity: 0.6,
      }} />
    </div>
  );
}
