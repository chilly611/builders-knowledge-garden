/**
 * InvitationCard (Pattern Language #01, Constitutional Primitive).
 *
 * Category: Constitutional Primitive (one of the original 7 in the design constitution).
 * Axes touched: lane (primary — every Floor 0 question is lane-shaped),
 *               skill_signal (active — pro subtitle visible vs. hidden),
 *               tempo (active — emergency tempo collapses to single button).
 *
 * One plain question, one primary action, optional pro subtitle, optional
 * whisper. Every workflow's Floor 0 is an InvitationCard — no exceptions.
 *
 * The RSI Heartbeat is the moat. The Invitation Card is how a first-time
 * visitor encounters that moat: a single warm question they can answer,
 * not a wall of pro chrome.
 */

import * as React from 'react';
import { BRAND_COLORS, BRAND_FONTS } from '@/lib/brand-tokens';
import type { StanceCard } from './StanceCard.types';

export interface InvitationCardProps {
  /** The plain-English Floor 0 question. */
  question: string;
  /** Optional pro-mode subtitle, hidden when skill_signal < 0.5 unless pro-toggled. */
  proSubtitle?: string;
  /** Primary call to action label. */
  primaryLabel: string;
  /** Primary action handler. */
  onPrimary?: () => void;
  /** Optional href when the action is a navigation. Prefer over onPrimary for SSR. */
  primaryHref?: string;
  /** Optional secondary helper text rendered below the action. */
  helper?: string;
  /** Optional whisper text — surfaced once per session via the Whisper primitive. */
  whisper?: string;
  /** Optional stance pin for server-component renders. */
  stance?: StanceCard;
  /** Visual emphasis. Default is parchment surface; "ceremonial" uses copper rim. */
  emphasis?: 'default' | 'ceremonial';
}

export function InvitationCard({
  question,
  proSubtitle,
  primaryLabel,
  onPrimary,
  primaryHref,
  helper,
  whisper,
  stance,
  emphasis = 'default',
}: InvitationCardProps) {
  const showPro =
    proSubtitle && stance && (stance.skill_signal >= 0.5 || stance.lane === 'professional' || stance.lane === 'administrator');
  const collapsedForEmergency = stance?.tempo === 'emergency';

  const button = primaryHref ? (
    <a
      href={primaryHref}
      style={{
        display: 'inline-block',
        padding: '0.75rem 1.5rem',
        background: BRAND_COLORS.copper,
        color: BRAND_COLORS.parchment,
        fontFamily: BRAND_FONTS.mono,
        fontSize: '0.85rem',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        textDecoration: 'none',
        borderRadius: '2px',
        border: 'none',
      }}
    >
      {primaryLabel}
    </a>
  ) : (
    <button
      type="button"
      onClick={onPrimary}
      style={{
        padding: '0.75rem 1.5rem',
        background: BRAND_COLORS.copper,
        color: BRAND_COLORS.parchment,
        fontFamily: BRAND_FONTS.mono,
        fontSize: '0.85rem',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        borderRadius: '2px',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      {primaryLabel}
    </button>
  );

  return (
    <section
      role="region"
      aria-label="Invitation"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: collapsedForEmergency ? '0.75rem' : '1.25rem',
        padding: collapsedForEmergency ? '1.25rem' : '2rem',
        background: BRAND_COLORS.parchmentWarm,
        border:
          emphasis === 'ceremonial'
            ? `1px solid ${BRAND_COLORS.copper}`
            : `1px solid ${BRAND_COLORS.copperLine}`,
        borderRadius: '4px',
        fontFamily: BRAND_FONTS.display,
        color: BRAND_COLORS.forestInk,
      }}
    >
      <h2
        style={{
          margin: 0,
          fontFamily: BRAND_FONTS.display,
          fontSize: collapsedForEmergency ? '1.4rem' : '1.8rem',
          fontWeight: 500,
          lineHeight: 1.25,
          color: BRAND_COLORS.forestInk,
        }}
      >
        {question}
      </h2>
      {showPro ? (
        <p
          style={{
            margin: 0,
            fontFamily: BRAND_FONTS.mono,
            fontSize: '0.78rem',
            color: BRAND_COLORS.steel,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          {proSubtitle}
        </p>
      ) : null}
      <div>{button}</div>
      {helper && !collapsedForEmergency ? (
        <p
          style={{
            margin: 0,
            fontSize: '0.9rem',
            color: BRAND_COLORS.steel,
            fontStyle: 'italic',
          }}
        >
          {helper}
        </p>
      ) : null}
      {whisper && !collapsedForEmergency ? (
        <p
          aria-label="Whisper"
          style={{
            margin: 0,
            fontSize: '0.8rem',
            color: BRAND_COLORS.steel,
            opacity: 0.75,
          }}
        >
          {whisper}
        </p>
      ) : null}
    </section>
  );
}

export default InvitationCard;
