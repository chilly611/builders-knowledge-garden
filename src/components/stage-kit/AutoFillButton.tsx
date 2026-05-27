'use client';

/**
 * AutoFillButton — the ✨ affordance on any automatable field. Click to let
 * the app fill it from project context; shows a brief "Filled" confirmation.
 */

import { useState } from 'react';
import { colors, fonts } from '@/design-system/tokens';

export default function AutoFillButton({
  onFill,
  label = 'Auto-fill',
  title = 'Fill this from project context',
}: {
  onFill: () => void | Promise<void>;
  label?: string;
  title?: string;
}) {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');

  const handle = async () => {
    if (state === 'busy') return;
    setState('busy');
    try {
      await onFill();
      setState('done');
      setTimeout(() => setState('idle'), 1400);
    } catch {
      setState('idle');
    }
  };

  return (
    <button
      type="button"
      onClick={handle}
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 9px',
        borderRadius: 999,
        cursor: 'pointer',
        fontFamily: fonts.body,
        fontSize: 11.5,
        fontWeight: 700,
        color: state === 'done' ? '#fff' : colors.navy,
        background: state === 'done' ? '#14B8A6' : `${colors.robin}33`,
        border: `1.5px solid ${state === 'done' ? '#14B8A6' : colors.robin}`,
        transition: 'all 160ms ease',
      }}
    >
      <span aria-hidden>{state === 'busy' ? '…' : '✨'}</span>
      {state === 'done' ? 'Filled' : label}
    </button>
  );
}
