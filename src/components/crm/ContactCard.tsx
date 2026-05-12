'use client';

// ContactCard — Brief 1 Invitation Card primitive for a single contact.
// Progressive Reveal: minimal info by default (avatar, name, company,
// last-touch); tap-to-expand reveals address, source, confidence, lane.
// Pro Toggle exposes additional columns inline.

import { useState } from 'react';

export interface ContactCardData {
  id: string;
  firstName: string;
  lastName?: string;
  company?: string;
  email?: string;
  phone?: string;
  lane?: string;
  lifecycleStage?: string;
  projectLocation?: string;
  source?: string;
  confidence?: number;
  lastContactAt?: string;
}

interface ContactCardProps {
  contact: ContactCardData;
  proMode?: boolean;
  onTap?: (id: string) => void;
}

const STAGE_COLOR: Record<string, string> = {
  lead: '#B6873A',
  size_up: '#D85A30',
  lock: '#C4A44A',
  plan: '#1D9E75',
  build: '#1D9E75',
  adapt: '#E8443A',
  collect: '#81D8D0',
  reflect: '#6B6655',
  repeat: '#1D9E75',
};

function initials(first: string, last?: string): string {
  const f = first.trim().charAt(0).toUpperCase();
  const l = last ? last.trim().charAt(0).toUpperCase() : '';
  return (f + l) || '?';
}

function timeSince(iso?: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  if (diff < 0) return 'just now';
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  const y = Math.floor(mo / 12);
  return `${y}y ago`;
}

export default function ContactCard({ contact, proMode = false, onTap }: ContactCardProps): JSX.Element {
  const [expanded, setExpanded] = useState<boolean>(false);
  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ');
  const stage = contact.lifecycleStage ?? 'lead';
  const stageColor = STAGE_COLOR[stage] ?? '#6B6655';

  const handleClick = () => {
    setExpanded((e) => !e);
    onTap?.(contact.id);
  };

  return (
    <article
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        background: 'var(--paper, #FFFDF7)',
        border: '1px solid #E5DFC4',
        borderRadius: 12,
        padding: 14,
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'box-shadow 150ms ease, transform 150ms ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Avatar */}
        <div
          aria-hidden="true"
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: stageColor,
            color: '#FFFDF7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          {initials(contact.firstName, contact.lastName)}
        </div>

        {/* Middle: name + company */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
              fontSize: 16,
              lineHeight: 1.2,
              color: '#1A1A1A',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {fullName || 'Unknown'}
          </div>
          {contact.company && (
            <div
              style={{
                fontSize: 12,
                color: '#6B6655',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {contact.company}
            </div>
          )}
        </div>

        {/* Right: last-touch + stage dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: '#6B6655' }}>{timeSince(contact.lastContactAt)}</span>
          <span
            aria-hidden="true"
            title={stage}
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: stageColor,
            }}
          />
        </div>
      </div>

      {(expanded || proMode) && (
        <div
          style={{
            borderTop: '1px dashed #E5DFC4',
            paddingTop: 8,
            display: 'grid',
            gridTemplateColumns: proMode ? 'repeat(2, 1fr)' : '1fr',
            gap: 6,
            fontSize: 12,
            color: '#3A3A3A',
          }}
        >
          {contact.projectLocation && (
            <div>
              <strong style={{ color: '#6B6655' }}>Location: </strong>
              {contact.projectLocation}
            </div>
          )}
          {contact.phone && (
            <div>
              <strong style={{ color: '#6B6655' }}>Phone: </strong>
              {contact.phone}
            </div>
          )}
          {contact.email && (
            <div>
              <strong style={{ color: '#6B6655' }}>Email: </strong>
              {contact.email}
            </div>
          )}
          {proMode && contact.source && (
            <div>
              <strong style={{ color: '#6B6655' }}>Source: </strong>
              {contact.source}
            </div>
          )}
          {proMode && typeof contact.confidence === 'number' && (
            <div>
              <strong style={{ color: '#6B6655' }}>Confidence: </strong>
              {(contact.confidence * 100).toFixed(0)}%
            </div>
          )}
          {proMode && contact.lane && (
            <div>
              <strong style={{ color: '#6B6655' }}>Lane: </strong>
              {contact.lane}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
