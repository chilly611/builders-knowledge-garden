'use client';

/**
 * FirstEncounterWhisper — a one-time, self-dismissing tip shown the first
 * time a user meets a feature. Keyed by `id` in localStorage so it never
 * nags twice. Render it as the first child of a `position: relative` anchor.
 */

import { useEffect, useState } from 'react';
import { colors, fonts } from '@/design-system/tokens';

export default function FirstEncounterWhisper({
  id,
  text,
  placement = 'bottom',
}: {
  id: string;
  text: string;
  placement?: 'bottom' | 'top';
}) {
  const key = `bkg:whisper:${id}`;
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(key)) {
        const t = setTimeout(() => setShow(true), 500);
        return () => clearTimeout(t);
      }
    } catch {
      /* ignore */
    }
  }, [key]);

  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    try {
      window.localStorage.setItem(key, '1');
    } catch {
      /* ignore */
    }
  };

  const vertical: React.CSSProperties =
    placement === 'bottom' ? { top: 'calc(100% + 8px)' } : { bottom: 'calc(100% + 8px)' };
  const arrowStyle: React.CSSProperties = {
    position: 'absolute',
    left: 18,
    width: 10,
    height: 10,
    background: colors.navy,
    transform: 'rotate(45deg)',
    ...(placement === 'bottom' ? { top: -5 } : { bottom: -5 }),
  };

  return (
    <button
      type="button"
      onClick={dismiss}
      style={{
        position: 'absolute',
        left: 0,
        ...vertical,
        zIndex: 40,
        maxWidth: 250,
        textAlign: 'left',
        padding: '8px 11px',
        borderRadius: 10,
        background: colors.navy,
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        fontFamily: fonts.body,
        fontSize: 12,
        lineHeight: 1.35,
        boxShadow: '0 8px 24px rgba(27,58,92,0.28)',
        animation: 'bkg-whisper-in 240ms ease both',
      }}
    >
      <span aria-hidden style={{ marginRight: 4 }}>💡</span>
      {text}
      <span aria-hidden style={arrowStyle} />
    </button>
  );
}
