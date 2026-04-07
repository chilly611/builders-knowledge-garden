'use client';

import React from 'react';

const ink = { 900: '#0B1D33', 700: '#1B3A5C', 500: '#2E6699', 400: '#4A89BE', 200: '#A8CAE8', 100: '#D4E5F4' };
const paper = { white: '#FEFEFE', warm: '#FAF3E8' };
const cyan = { main: '#00B8D4', bright: '#00D4E8' };
const phase: Record<string, string> = { dream: '#D85A30', design: '#7F77DD', plan: '#1B3A5C', build: '#378ADD', deliver: '#BA7517', grow: '#2E7D32' };

export interface RecentProject {
  id: string;
  name: string;
  sourceInterface: string;
  updatedAt: string;
  themeColor?: string;
  phase?: string;
  progress?: number;
}

interface ContinueSectionProps {
  projects: RecentProject[];
  onProjectClick?: (id: string) => void;
}

function timeAgo(date: string): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const INTERFACE_ICONS: Record<string, string> = {
  upload: '\u{1F4D0}', imagine: '\u2728', design: '\u270F\uFE0F',
  oracle: '\u{1F52E}', alchemist: '\u2697\uFE0F', cosmos: '\u{1F30C}',
};

export default function ContinueSection({ projects, onProjectClick }: ContinueSectionProps) {
  if (!projects.length) return null;

  return (
    <div style={{ marginBottom: '24px' }}>
      <h2 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: ink[400], margin: '0 0 12px 0' }}>
        Continue Where You Left Off
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
        {projects.slice(0, 3).map((p) => {
          const color = p.themeColor || phase[p.phase || 'dream'] || ink[700];
          return (
            <button
              key={p.id}
              onClick={() => onProjectClick?.(p.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                background: paper.white, border: `1.5px solid ${ink[200]}`, borderRadius: '10px',
                cursor: 'pointer', textAlign: 'left', transition: 'all 150ms ease',
                borderLeft: `4px solid ${color}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
            >
              <span style={{ fontSize: '24px', lineHeight: 1 }}>
                {INTERFACE_ICONS[p.sourceInterface] || '\u{1F3D7}\uFE0F'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: '14px', fontWeight: 600, color: ink[900], margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </p>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: ink[400], margin: '2px 0 0 0' }}>
                  {p.sourceInterface} &middot; {timeAgo(p.updatedAt)}
                </p>
              </div>
              {typeof p.progress === 'number' && (
                <div style={{ width: '36px', height: '36px', position: 'relative' }}>
                  <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="18" cy="18" r="15" fill="none" stroke={ink[100]} strokeWidth="3" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke={color} strokeWidth="3"
                      strokeDasharray={`${p.progress * 94.25} 94.25`} strokeLinecap="round" />
                  </svg>
                  <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', fontWeight: 600, color: ink[700] }}>
                    {Math.round(p.progress * 100)}%
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
