/**
 * ProToggle (Pattern Language #06 Constitutional + #12 Dimensional Rendering).
 *
 * Category: Constitutional + Dimensional (it shows up in both manifests because
 *           it is the cardinal axis-switcher between human and pro labels).
 * Axes touched: lane × skill_signal (primary), modality (active — collapses
 *               to voice command "switch to pro mode" when modality is voice).
 *
 * One visible switch that flips labels and order from human-default to
 * pro-vocabulary. Visible on every screen. Not in settings. Not buried.
 * The visibility is itself a signal that the platform respects both audiences.
 */

'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { BRAND_COLORS, BRAND_FONTS } from '@/lib/brand-tokens';
import { persistStanceOverride } from '@/lib/stance-card';

export interface ProToggleProps {
  /** Initial state; defaults to false (human mode). */
  initialPro?: boolean;
  /** Called when the toggle flips. */
  onChange?: (isPro: boolean) => void;
  /** Optional label override for the off/human state. */
  humanLabel?: string;
  /** Optional label override for the on/pro state. */
  proLabel?: string;
}

const STORAGE_KEY = 'kgos:pro-toggle:v1';

export function ProToggle({
  initialPro = false,
  onChange,
  humanLabel = 'Plain',
  proLabel = 'Pro',
}: ProToggleProps) {
  const [isPro, setIsPro] = useState(initialPro);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'true' || stored === 'false') {
      const next = stored === 'true';
      setIsPro(next);
      onChange?.(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFlip = () => {
    const next = !isPro;
    setIsPro(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      /* localStorage disabled */
    }
    persistStanceOverride({
      skill_signal: next ? 0.85 : 0.3,
      lane: next ? 'professional' : 'public',
    });
    onChange?.(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isPro}
      aria-label={`Switch to ${isPro ? humanLabel : proLabel} mode`}
      onClick={handleFlip}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.35rem 0.75rem',
        background: BRAND_COLORS.parchment,
        border: `1px solid ${BRAND_COLORS.copperLine}`,
        borderRadius: '999px',
        cursor: 'pointer',
        fontFamily: BRAND_FONTS.mono,
        fontSize: '0.72rem',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: BRAND_COLORS.forestInk,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: '0.6rem',
          height: '0.6rem',
          borderRadius: '50%',
          background: isPro ? BRAND_COLORS.copper : BRAND_COLORS.steel,
        }}
      />
      <span>{isPro ? proLabel : humanLabel}</span>
    </button>
  );
}

export default ProToggle;
