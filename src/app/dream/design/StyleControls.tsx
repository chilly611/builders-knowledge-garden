'use client';

import { useRef, useCallback } from 'react';
import {
  ACCENT, ACCENT_DIM, ACCENT_GLOW, BG_PANEL, BORDER, TEXT_DIM,
  STYLE_SLIDERS, type StyleControlValues,
} from './shared';

/* ─── Individual Slider ─── */
function StudioSlider({ label, low, high, value, onChange }: {
  label: string; low: string; high: string; value: number; onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const handleInteraction = useCallback((clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onChange(Math.round(pct * 100));
  }, [onChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    handleInteraction(e.clientX);
    const move = (ev: MouseEvent) => handleInteraction(ev.clientX);
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }, [handleInteraction]);

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: TEXT_DIM, fontFamily: 'monospace', letterSpacing: '0.5px' }}>{label}</span>
        <span style={{ fontSize: 11, color: ACCENT, fontFamily: 'monospace' }}>{value}</span>
      </div>
      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        style={{
          position: 'relative', height: 28, cursor: 'pointer',
          background: `linear-gradient(90deg, ${ACCENT_DIM}, rgba(0,212,255,0.08))`,
          borderRadius: 6, border: `1px solid ${BORDER}`,
        }}
      >
        {/* Fill with holographic shimmer */}
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0,
          width: `${value}%`, borderRadius: 6,
          background: `linear-gradient(90deg, rgba(0,212,255,0.08), rgba(0,212,255,0.22))`,
          transition: 'width 0.05s linear',
        }} />
        {/* Thumb with glow */}
        <div style={{
          position: 'absolute', top: '50%', left: `${value}%`, transform: 'translate(-50%, -50%)',
          width: 16, height: 16, borderRadius: '50%',
          background: ACCENT, boxShadow: `0 0 14px ${ACCENT_GLOW}, 0 0 4px ${ACCENT}`,
          border: '2px solid rgba(255,255,255,0.9)',
          transition: 'left 0.05s linear',
        }} />
        {/* Labels */}
        <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: TEXT_DIM, fontFamily: 'monospace', pointerEvents: 'none' }}>{low}</span>
        <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: TEXT_DIM, fontFamily: 'monospace', pointerEvents: 'none' }}>{high}</span>
      </div>
    </div>
  );
}

/* ─── Style Controls Panel ─── */
interface StyleControlsProps {
  controls: StyleControlValues;
  onUpdate: (key: keyof StyleControlValues, value: number) => void;
}

export default function StyleControlsPanel({ controls, onUpdate }: StyleControlsProps) {
  return (
    <div style={{
      background: BG_PANEL, borderRadius: 16, border: `1px solid ${BORDER}`,
      padding: 24, marginBottom: 24, backdropFilter: 'blur(8px)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Holographic edge */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 2,
        background: `linear-gradient(180deg, transparent, ${ACCENT}44, transparent)`,
      }} />

      <label style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 12, fontWeight: 700, color: ACCENT,
        fontFamily: 'monospace', letterSpacing: '1.5px', marginBottom: 16,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%', background: ACCENT,
          boxShadow: `0 0 8px ${ACCENT}`,
        }} />
        STYLE CONTROLS
      </label>
      {STYLE_SLIDERS.map(s => (
        <StudioSlider
          key={s.key}
          label={s.label}
          low={s.low}
          high={s.high}
          value={controls[s.key]}
          onChange={(v) => onUpdate(s.key, v)}
        />
      ))}
    </div>
  );
}
