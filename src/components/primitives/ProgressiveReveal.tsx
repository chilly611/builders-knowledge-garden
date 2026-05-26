/**
 * ProgressiveReveal (Pattern Language #07, Constitutional Primitive).
 *
 * Category: Constitutional Primitive.
 * Axes touched: skill_signal (primary), trust_posture (active — long-tenured
 *               users see everything immediately), accessibility (active —
 *               simplified cognitive mode keeps reveal collapsed).
 *
 * Advanced controls literally don't render until basics are done. The reveal
 * fires when the host calls `unlock()` (typically after a successful primary
 * action) — not on hover, not on time delay.
 */

'use client';

import * as React from 'react';
import { useState } from 'react';
import { BRAND_COLORS, BRAND_FONTS } from '@/lib/brand-tokens';
import { useStanceCard } from '@/lib/stance-card';

export interface ProgressiveRevealProps {
  /** What's always visible — the basic surface. */
  base: React.ReactNode;
  /** What unlocks after the user demonstrates basic use. */
  advanced: React.ReactNode;
  /** Stable id for the reveal — persisted so it stays unlocked across reloads. */
  revealId: string;
  /** Initial unlock state. */
  initiallyUnlocked?: boolean;
  /** Optional label for the reveal affordance once unlocked. */
  advancedLabel?: string;
  /** Render the unlock button — host may also call unlockRef() to unlock programmatically. */
  showUnlockButton?: boolean;
}

const STORAGE_KEY_PREFIX = 'kgos:reveal:';

export function ProgressiveReveal({
  base,
  advanced,
  revealId,
  initiallyUnlocked = false,
  advancedLabel = 'Show advanced',
  showUnlockButton = true,
}: ProgressiveRevealProps) {
  const stance = useStanceCard();
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return initiallyUnlocked;
    const stored = window.localStorage.getItem(STORAGE_KEY_PREFIX + revealId);
    return stored === '1' || initiallyUnlocked;
  });

  const skipReveal =
    stance.trust_posture > 0.7 ||
    stance.skill_signal > 0.7 ||
    stance.accessibility.cognitive === 'simplified';
  const effectiveUnlocked = unlocked || skipReveal === true && stance.accessibility.cognitive !== 'simplified';

  const unlock = () => {
    setUnlocked(true);
    try {
      window.localStorage.setItem(STORAGE_KEY_PREFIX + revealId, '1');
    } catch {
      /* localStorage disabled */
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>{base}</div>
      {effectiveUnlocked ? (
        <div>{advanced}</div>
      ) : showUnlockButton ? (
        <button
          type="button"
          onClick={unlock}
          style={{
            alignSelf: 'flex-start',
            padding: '0.4rem 0.8rem',
            background: 'transparent',
            border: `1px dashed ${BRAND_COLORS.copperLine}`,
            color: BRAND_COLORS.copper,
            fontFamily: BRAND_FONTS.mono,
            fontSize: '0.72rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            borderRadius: '2px',
          }}
        >
          {advancedLabel}
        </button>
      ) : null}
    </div>
  );
}

export default ProgressiveReveal;
