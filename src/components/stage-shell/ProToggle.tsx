'use client';

/**
 * ProToggle — the always-top-right Pro mode switch.
 *
 * Plain-speak (off) ⇄ Pro (on). Pro mode is read by the stage body to swap
 * foreman vernacular for code citations, section numbers, and spec detail.
 * Discoverability is handled by the in-flow FirstEncounterWhisper banner, so
 * this control no longer floats its own tooltip (one whisper at a time, and
 * nothing floats over content).
 */

import { useStageChrome } from './stage-chrome-context';
import { colors, fonts } from '@/design-system/tokens';

export default function ProToggle() {
  const { proMode, setProMode } = useStageChrome();

  return (
    <button
      type="button"
      onClick={() => setProMode((p) => !p)}
      aria-pressed={proMode}
      title={proMode ? 'Pro mode — code citations & specs' : 'Plain-speak mode'}
      style={{
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '6px 12px',
        borderRadius: 999,
        cursor: 'pointer',
        fontFamily: fonts.body,
        fontSize: 12.5,
        fontWeight: 700,
        color: proMode ? '#fff' : colors.navy,
        background: proMode ? colors.navy : colors.paper.white,
        border: `1.5px solid ${proMode ? colors.navy : colors.paper.border}`,
        transition: 'all 160ms ease',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 26,
          height: 15,
          borderRadius: 999,
          background: proMode ? colors.robin : colors.fadedRule,
          position: 'relative',
          transition: 'background 160ms ease',
          flex: '0 0 auto',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 1.5,
            left: proMode ? 13 : 1.5,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
            transition: 'left 160ms ease',
          }}
        />
      </span>
      {proMode ? 'Pro' : 'Plain-speak'}
    </button>
  );
}
