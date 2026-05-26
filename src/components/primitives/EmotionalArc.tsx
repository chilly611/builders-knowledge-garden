/**
 * EmotionalArc (Pattern Language #02, Constitutional Primitive).
 *
 * Category: Constitutional Primitive.
 * Axes touched: emotional_signal (primary), tempo (active — emergency
 *               compresses the arc), lane (active — different default
 *               sequences per lane, per design constitution Goal 2).
 *
 * A sequenced flow with color, motion, and pacing matched to the user's
 * emotional state. Renders a stage indicator that shifts hue across the arc
 * (worry → control → celebration by default). Children are the actual stage
 * content the caller composes.
 */

'use client';

import * as React from 'react';
import { BRAND_COLORS, BRAND_FONTS } from '@/lib/brand-tokens';
import { useStanceCard } from '@/lib/stance-card';
import type { StanceCard, StanceEmotionalSignal } from './StanceCard.types';

export interface ArcStage {
  /** Stable id for the stage — used for tracking, undo, and tests. */
  id: string;
  /** Human label for the stage chip. */
  label: string;
  /** The emotional anchor of this stage. */
  feel: StanceEmotionalSignal;
}

export interface EmotionalArcProps {
  /** Ordered list of stages from arc-start to arc-end. */
  stages: ArcStage[];
  /** Which stage is currently active (matches ArcStage.id). */
  currentStageId: string;
  /** Optional override for SSR contexts. */
  stance?: StanceCard;
  /** Render mode — 'header' for a single strip, 'spread' for full stage panels. */
  variant?: 'header' | 'spread';
  /** When 'spread', the per-stage content node. */
  renderStage?: (stage: ArcStage, isActive: boolean) => React.ReactNode;
}

const FEEL_COLOR: Record<StanceEmotionalSignal, string> = {
  anxious: BRAND_COLORS.redPrimary,
  overwhelmed: BRAND_COLORS.redDeep,
  curious: BRAND_COLORS.steel,
  confident: BRAND_COLORS.greenPrimary,
  celebratory: BRAND_COLORS.copper,
  mournful: BRAND_COLORS.steelSoft,
};

export function EmotionalArc({
  stages,
  currentStageId,
  stance,
  variant = 'header',
  renderStage,
}: EmotionalArcProps) {
  const clientStance = useStanceCard();
  const card = stance ?? clientStance;
  const compressed = card.tempo === 'urgent' || card.tempo === 'emergency';

  if (variant === 'header') {
    return (
      <ol
        aria-label="Emotional arc"
        style={{
          display: 'flex',
          listStyle: 'none',
          margin: 0,
          padding: 0,
          gap: compressed ? '0.25rem' : '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        {stages.map((stage) => {
          const active = stage.id === currentStageId;
          return (
            <li
              key={stage.id}
              aria-current={active ? 'step' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.25rem 0.6rem',
                borderRadius: '999px',
                background: active
                  ? BRAND_COLORS.parchmentWarm
                  : 'transparent',
                border: `1px solid ${active ? FEEL_COLOR[stage.feel] : BRAND_COLORS.copperLine}`,
                fontFamily: BRAND_FONTS.mono,
                fontSize: '0.72rem',
                color: active ? FEEL_COLOR[stage.feel] : BRAND_COLORS.steel,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: '0.5rem',
                  height: '0.5rem',
                  borderRadius: '50%',
                  background: FEEL_COLOR[stage.feel],
                  opacity: active ? 1 : 0.45,
                }}
              />
              {stage.label}
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <div
      aria-label="Emotional arc"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      {stages.map((stage) => {
        const active = stage.id === currentStageId;
        return (
          <section
            key={stage.id}
            aria-current={active ? 'step' : undefined}
            style={{
              padding: '1.25rem',
              borderLeft: `3px solid ${FEEL_COLOR[stage.feel]}`,
              background: active
                ? BRAND_COLORS.parchmentWarm
                : BRAND_COLORS.parchment,
              opacity: active ? 1 : 0.6,
            }}
          >
            <header
              style={{
                fontFamily: BRAND_FONTS.mono,
                fontSize: '0.72rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: FEEL_COLOR[stage.feel],
                marginBottom: '0.5rem',
              }}
            >
              {stage.label}
            </header>
            {renderStage ? renderStage(stage, active) : null}
          </section>
        );
      })}
    </div>
  );
}

export default EmotionalArc;
