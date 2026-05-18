'use client';

/**
 * RewindToast — C5, shown when the user is viewing a historical snapshot.
 *
 * Renders as a fixed banner near the top of the viewport with two affordances:
 *   1. "Viewing snapshot from [relative time]" — informational
 *   2. "Return to live" button — calls onReturnToLive
 *
 * Subscribes to `bkg:project:state-rewound` so any consumer can trigger it
 * without prop drilling.
 */

import { useEffect, useState } from 'react';
import { REWIND_EVENT, type RewindEventDetail } from '@/lib/use-time-machine-rewind';

function formatRelative(ts: string): string {
  try {
    const then = new Date(ts).getTime();
    const diffMs = Date.now() - then;
    const mins = Math.floor(diffMs / 60_000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'earlier';
  }
}

interface RewindToastProps {
  onReturnToLive?: () => void;
}

export default function RewindToast({ onReturnToLive }: RewindToastProps) {
  const [historical, setHistorical] = useState<{ ts: string } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onRewind = (e: Event) => {
      const detail = (e as CustomEvent<RewindEventDetail>).detail;
      if (!detail) return;
      if (detail.snapshotId && detail.timestamp) {
        setHistorical({ ts: detail.timestamp });
      } else {
        setHistorical(null);
      }
    };
    window.addEventListener(REWIND_EVENT, onRewind);
    return () => window.removeEventListener(REWIND_EVENT, onRewind);
  }, []);

  if (!historical) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 60,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 14px 8px 16px',
        borderRadius: 999,
        backgroundColor: '#1B3A5C',
        color: '#F4F0E6',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 12,
        fontWeight: 500,
        boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
        letterSpacing: '0.02em',
      }}
    >
      <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>⏪</span>
      <span>Viewing snapshot from {formatRelative(historical.ts)}</span>
      <button
        type="button"
        onClick={onReturnToLive}
        style={{
          padding: '4px 10px',
          borderRadius: 999,
          border: '1px solid #B6873A',
          backgroundColor: 'transparent',
          color: '#B6873A',
          fontWeight: 600,
          fontSize: 11,
          cursor: 'pointer',
          fontFamily: 'inherit',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        Return to live
      </button>
    </div>
  );
}
