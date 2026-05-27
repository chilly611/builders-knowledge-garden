'use client';

/**
 * FirstEncounterWhisper — a one-time onboarding tip shown the first time a
 * user meets a feature. Renders as an in-flow BANNER ROW (not a floating
 * overlay), so it never occludes content — place it directly above the
 * section it describes. Keyed by `id` in localStorage so it never nags twice.
 * Mount at most one per screen (one whisper at a time).
 */

import { useEffect, useState } from 'react';
import { colors, fonts } from '@/design-system/tokens';

export default function FirstEncounterWhisper({
  id,
  text,
}: {
  id: string;
  text: string;
}) {
  const key = `bkg:whisper:${id}`;
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(key)) setShow(true);
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

  return (
    <div
      role="note"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 10px',
        borderRadius: 9,
        background: `${colors.robin}1A`,
        border: `1px solid ${colors.robin}`,
        fontFamily: fonts.body,
        fontSize: 12,
        lineHeight: 1.35,
        color: colors.navy,
      }}
    >
      <span aria-hidden style={{ flex: '0 0 auto' }}>💡</span>
      <span style={{ flex: 1 }}>{text}</span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss tip"
        style={{
          flex: '0 0 auto',
          width: 20,
          height: 20,
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          background: 'transparent',
          color: colors.brass,
          fontSize: 14,
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}
