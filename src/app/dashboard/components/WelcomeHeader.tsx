'use client';

import React from 'react';

/* ── Blueprint Design Tokens (inline to keep module self-contained) ── */
const ink = { 900: '#0B1D33', 700: '#1B3A5C', 500: '#2E6699', 400: '#4A89BE', 200: '#A8CAE8', 100: '#D4E5F4' };
const paper = { cream: '#FDF8F0', warm: '#FAF3E8' };
const cyan = { main: '#00B8D4', bright: '#00D4E8', glow: '#00F5FF' };
const amber = { main: '#FFA726', bright: '#FFCA28' };
const status = { success: '#2E7D32' };

const LEVELS = [
  { name: 'Apprentice', min: 0 },
  { name: 'Builder', min: 500 },
  { name: 'Craftsman', min: 2000 },
  { name: 'Master', min: 5000 },
  { name: 'Architect', min: 15000 },
];

function getLevel(xp: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].min) {
      const next = LEVELS[i + 1];
      const progress = next ? (xp - LEVELS[i].min) / (next.min - LEVELS[i].min) : 1;
      return { name: LEVELS[i].name, progress: Math.min(progress, 1), nextName: next?.name, xpToNext: next ? next.min - xp : 0 };
    }
  }
  return { name: 'Apprentice', progress: 0, nextName: 'Builder', xpToNext: 500 };
}

interface WelcomeHeaderProps {
  userName?: string;
  xp?: number;
  streak?: number;
}

export default function WelcomeHeader({ userName, xp = 0, streak = 0 }: WelcomeHeaderProps) {
  const level = getLevel(xp);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = userName || 'Builder';

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
      {/* Left: Greeting */}
      <div>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', color: ink[400], margin: 0 }}>
          {greeting}
        </p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '32px', fontWeight: 700, color: ink[900], margin: '4px 0 0 0', lineHeight: 1.2 }}>
          {displayName}
        </h1>
      </div>

      {/* Right: XP + Streak */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Streak */}
        {streak > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: `${amber.main}18`, borderRadius: '20px', border: `1px solid ${amber.main}40` }}>
            <span style={{ fontSize: '18px' }}>&#x1F525;</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', fontWeight: 600, color: amber.main }}>
              {streak} day streak
            </span>
          </div>
        )}

        {/* XP / Level */}
        <div style={{ minWidth: '160px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: cyan.main }}>
              {level.name}
            </span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: ink[400] }}>
              {xp.toLocaleString()} XP
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ height: '6px', borderRadius: '3px', background: ink[100], overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${level.progress * 100}%`,
              borderRadius: '3px',
              background: `linear-gradient(90deg, ${cyan.main}, ${cyan.bright})`,
              transition: 'width 0.6s ease',
            }} />
          </div>
          {level.nextName && (
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: ink[400], margin: '2px 0 0 0', textAlign: 'right' }}>
              {level.xpToNext.toLocaleString()} XP to {level.nextName}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

