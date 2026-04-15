'use client';

import { useRef, useEffect } from 'react';
import { ACCENT, ACCENT_DIM, BG_PANEL, BORDER, TEXT_PRIMARY, TEXT_DIM, EXAMPLE_PROMPTS } from './shared';

interface DesignBriefProps {
  brief: string;
  onBriefChange: (v: string) => void;
}

export default function DesignBrief({ brief, onBriefChange }: DesignBriefProps) {
  const promptRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!brief && promptRef.current) {
      const idx = Math.floor(Math.random() * EXAMPLE_PROMPTS.length);
      promptRef.current.setAttribute('placeholder', EXAMPLE_PROMPTS[idx]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      background: BG_PANEL, borderRadius: 16, border: `1px solid ${BORDER}`,
      padding: 24, marginBottom: 24, backdropFilter: 'blur(8px)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Holographic scan line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent 0%, ${ACCENT} 50%, transparent 100%)`,
        opacity: 0.3,
      }} />

      <label style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 12, fontWeight: 700, color: ACCENT,
        fontFamily: 'monospace', letterSpacing: '1.5px', marginBottom: 10,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%', background: ACCENT,
          boxShadow: `0 0 8px ${ACCENT}`,
        }} />
        DESIGN BRIEF
      </label>

      <textarea
        ref={promptRef}
        value={brief}
        onChange={(e) => onBriefChange(e.target.value)}
        placeholder="Describe what you want to see: a modern kitchen with white oak cabinets, quartz countertops..."
        rows={4}
        style={{
          width: '100%', background: 'rgba(0,0,0,0.3)', color: TEXT_PRIMARY,
          border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14,
          fontSize: 15, fontFamily: 'inherit', resize: 'vertical',
          lineHeight: 1.6, outline: 'none', boxSizing: 'border-box',
          transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        }}
        onFocus={(e) => {
          (e.target as HTMLTextAreaElement).style.borderColor = ACCENT;
          (e.target as HTMLTextAreaElement).style.boxShadow = `0 0 20px rgba(0,212,255,0.1)`;
        }}
        onBlur={(e) => {
          (e.target as HTMLTextAreaElement).style.borderColor = BORDER;
          (e.target as HTMLTextAreaElement).style.boxShadow = 'none';
        }}
      />

      {/* Quick prompt chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {EXAMPLE_PROMPTS.slice(0, 3).map((p, i) => (
          <button
            key={i}
            onClick={() => onBriefChange(p)}
            style={{
              background: ACCENT_DIM, color: TEXT_DIM, border: `1px solid ${BORDER}`,
              borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: 'pointer',
              fontFamily: 'monospace', transition: 'all 0.15s',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = TEXT_PRIMARY; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_DIM; }}
          >
            {p.slice(0, 50)}...
          </button>
        ))}
      </div>
    </div>
  );
}
