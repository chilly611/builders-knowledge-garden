/**
 * TrustStrip (Pattern Language #08, Platform Primitive).
 *
 * Category: Platform Primitive.
 * Axes touched: trust_posture (primary), tempo (active — strip compresses in
 *               emergency tempo), lane (active — pro mode shows fuller chrome).
 *
 * Every primary claim renders with source count + last-updated stamp +
 * contested-claim indicator. Non-optional anywhere a fact appears in the UI.
 *
 * This is the visible face of the RSI Heartbeat. The platform improves itself
 * in public; the TrustStrip is how the user sees that improvement at the point
 * of decision. A contractor about to pull a permit needs to know: was this
 * code section re-verified yesterday, or last quarter? Three sources or one?
 *
 * Server-safe — pure presentational, no client hooks. Caller may pass a
 * Stance Card override when running in a server component context.
 */

import * as React from 'react';
import { BRAND_COLORS, BRAND_FONTS } from '@/lib/brand-tokens';
import {
  verdictLabel,
  verifyThreeSource,
  type SourceCitation,
} from './ThreeSourceRule';
import type { StanceCard } from './StanceCard.types';

export interface TrustStripProps {
  /** Number of distinct authoritative sources backing the claim. */
  sourceCount: number;
  /** Full source list — drives the inner tooltip and audit log. */
  sources: SourceCitation[];
  /** When the platform last re-verified the underlying data. */
  lastVerified: Date | string;
  /** True if any source disagrees with the others. */
  contested?: boolean;
  /** When contested, explain why in plain language. */
  contestedReason?: string;
  /** Render variant — inline (in prose), badge (corner chip), full (own row). */
  variant?: 'inline' | 'badge' | 'full';
  /** Optional pinned stance — when rendering server-side. */
  stance?: StanceCard;
  /** Optional jurisdiction label, e.g. "California". */
  jurisdiction?: string;
}

function formatRelative(when: Date | string): string {
  const date = typeof when === 'string' ? new Date(when) : when;
  const ms = Date.now() - date.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function TrustStrip({
  sourceCount,
  sources,
  lastVerified,
  contested = false,
  contestedReason,
  variant = 'inline',
  stance,
  jurisdiction,
}: TrustStripProps) {
  const verdict = verifyThreeSource(sources, stance);
  const lane = stance?.lane ?? 'public';
  const label = verdictLabel(verdict, lane);
  const tier = verdict.tier;

  const tierColor =
    tier === 'authoritative'
      ? BRAND_COLORS.greenPrimary
      : tier === 'corroborated'
        ? BRAND_COLORS.copper
        : tier === 'single'
          ? BRAND_COLORS.goldWarm
          : BRAND_COLORS.steel;

  const stamp = formatRelative(lastVerified);

  if (variant === 'badge') {
    return (
      <span
        role="img"
        aria-label={`${label}, last checked ${stamp}`}
        title={`${label} · ${stamp}${contested ? ` · contested: ${contestedReason ?? 'unknown reason'}` : ''}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
          padding: '0.15rem 0.5rem',
          borderRadius: '999px',
          border: `1px solid ${tierColor}`,
          background: BRAND_COLORS.parchmentWarm,
          color: tierColor,
          fontFamily: BRAND_FONTS.mono,
          fontSize: '0.72rem',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        <span aria-hidden="true">{contested ? '⚠' : '✓'}</span>
        <span>{sourceCount} src · {stamp}</span>
      </span>
    );
  }

  if (variant === 'inline') {
    return (
      <span
        role="note"
        aria-label={label}
        style={{
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: '0.35rem',
          fontFamily: BRAND_FONTS.mono,
          fontSize: '0.72rem',
          color: tierColor,
          letterSpacing: '0.04em',
        }}
      >
        <span aria-hidden="true">{contested ? '⚠' : '✓'}</span>
        <span>{label} · last checked {stamp}</span>
        {jurisdiction ? <span style={{ color: BRAND_COLORS.steel }}>· {jurisdiction}</span> : null}
      </span>
    );
  }

  // variant === 'full'
  return (
    <div
      role="region"
      aria-label="Source trust strip"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem',
        padding: '0.75rem 1rem',
        border: `1px solid ${BRAND_COLORS.copperLine}`,
        background: BRAND_COLORS.parchmentWarm,
        borderRadius: '4px',
        fontFamily: BRAND_FONTS.display,
        color: BRAND_COLORS.forestInk,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <span
          style={{
            fontFamily: BRAND_FONTS.mono,
            fontSize: '0.72rem',
            color: tierColor,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          {contested ? '⚠ contested' : '✓ verified'} · {label}
        </span>
        <span
          style={{
            fontFamily: BRAND_FONTS.mono,
            fontSize: '0.7rem',
            color: BRAND_COLORS.steel,
          }}
        >
          last checked {stamp}
        </span>
      </div>
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
        }}
      >
        {sources.slice(0, 5).map((source, idx) => (
          <li
            key={`${source.name}-${idx}`}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '0.5rem',
              fontSize: '0.85rem',
            }}
          >
            <span aria-hidden="true" style={{ color: BRAND_COLORS.copper }}>
              ·
            </span>
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: BRAND_COLORS.forestDeep }}
              >
                {source.name}
              </a>
            ) : (
              <span>{source.name}</span>
            )}
            {source.jurisdiction ? (
              <span
                style={{
                  fontFamily: BRAND_FONTS.mono,
                  fontSize: '0.7rem',
                  color: BRAND_COLORS.steel,
                }}
              >
                ({source.jurisdiction})
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      {contested && contestedReason ? (
        <p
          style={{
            margin: 0,
            fontSize: '0.85rem',
            color: BRAND_COLORS.redPrimary,
            fontStyle: 'italic',
          }}
        >
          Why this is contested: {contestedReason}
        </p>
      ) : null}
    </div>
  );
}

export default TrustStrip;
