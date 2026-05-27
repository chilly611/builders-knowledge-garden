'use client';

/**
 * ProToggle — the always-top-right Pro mode switch.
 *
 * Plain-speak (off) ⇄ Pro (on). Pro mode is read by the stage body to swap
 * foreman vernacular for code citations, section numbers, and spec detail.
 * First encounter shows a one-time whisper so the affordance is discoverable
 * without a tour.
 */

import { useEffect, useState } from 'react';
import { useStageChrome } from './stage-chrome-context';
import { colors, fonts } from '@/design-system/tokens';

const WHISPER_KEY = 'bkg:whisper:pro-toggle';

export default function ProToggle() {
  const { proMode, setProMode } = useStageChrome();
  const [showWhisper, setShowWhisper] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(WHISPER_KEY)) {
        const id = setTimeout(() => setShowWhisper(true), 700);
        return () => clearTimeout(id);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const dismissWhisper = () => {
    setShowWhisper(false);
    try {
      window.localStorage.setItem(WHISPER_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  return (
    <div style={{ position: 'relative', flex: '0 0 auto' }}>
      <button
        type="button"
        onClick={() => {
          setProMode((p) => !p);
          dismissWhisper();
        }}
        aria-pressed={proMode}
        title={proMode ? 'Pro mode — code citations & specs' : 'Plain-speak mode'}
        style={{
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

      {showWhisper && (
        <button
          type="button"
          onClick={dismissWhisper}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            zIndex: 50,
            maxWidth: 220,
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
          Flip to <b>Pro</b> any time for code citations, section numbers &amp; specs.
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: -5,
              right: 18,
              width: 10,
              height: 10,
              background: colors.navy,
              transform: 'rotate(45deg)',
            }}
          />
        </button>
      )}

      <style>{`
        @keyframes bkg-whisper-in {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
