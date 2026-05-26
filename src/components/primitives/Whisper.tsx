/**
 * Whisper (Pattern Language #03, Constitutional Primitive).
 *
 * Category: Constitutional Primitive.
 * Axes touched: trust_posture (primary — low-trust new users see whispers,
 *               long-tenured users have already dismissed them),
 *               accessibility (active — screen readers always read whispers
 *               via aria-live polite).
 *
 * A one-time, one-sentence self-introduction near an element on first
 * encounter. Dismissed with a tap, never shown again for that whisperId.
 *
 * Persisted via localStorage by whisperId. Whispers are not modals — they sit
 * inline near their target, never block, never interrupt.
 */

'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { BRAND_COLORS, BRAND_FONTS } from '@/lib/brand-tokens';

export interface WhisperProps {
  /** Stable id — same whisper across the app uses the same id. */
  whisperId: string;
  /** The one-sentence introduction. */
  message: string;
  /** Optional dismiss button label. */
  dismissLabel?: string;
}

const STORAGE_KEY_PREFIX = 'kgos:whisper:dismissed:';

export function Whisper({
  whisperId,
  message,
  dismissLabel = 'Got it',
}: WhisperProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = window.localStorage.getItem(STORAGE_KEY_PREFIX + whisperId);
    if (!dismissed) setVisible(true);
  }, [whisperId]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY_PREFIX + whisperId, '1');
    } catch {
      /* localStorage disabled */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '0.55rem 0.85rem',
        background: BRAND_COLORS.parchmentWarm,
        border: `1px solid ${BRAND_COLORS.copperLine}`,
        borderRadius: '4px',
        fontFamily: BRAND_FONTS.display,
        fontSize: '0.85rem',
        color: BRAND_COLORS.forestInk,
        fontStyle: 'italic',
      }}
    >
      <span aria-hidden="true" style={{ color: BRAND_COLORS.copper }}>
        ◦
      </span>
      <span style={{ flex: 1 }}>{message}</span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss whisper"
        style={{
          background: 'transparent',
          border: `1px solid ${BRAND_COLORS.copperLine}`,
          padding: '0.2rem 0.5rem',
          borderRadius: '2px',
          fontFamily: BRAND_FONTS.mono,
          fontSize: '0.7rem',
          color: BRAND_COLORS.copper,
          cursor: 'pointer',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {dismissLabel}
      </button>
    </aside>
  );
}

export default Whisper;
