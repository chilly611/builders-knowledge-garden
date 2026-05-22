'use client';

/**
 * RealtimeStatusDot — REALTIME (2026-05-22)
 * ==========================================
 * Tiny "Live" / "Reconnecting…" indicator for the cockpit footer.
 *
 * Listens on the *raw* Supabase realtime client connection state, NOT a
 * specific channel — this gives us a single global signal that doesn't
 * need to know which workflows are currently subscribed. When any channel
 * is in CHANNEL_ERROR or CLOSED we drop to "Reconnecting…"; once the
 * websocket reports OPEN, we flip back to "Live".
 *
 * Deliberately understated — green dot when healthy, amber when not. No
 * label by default; pass `showLabel` if a particular surface wants to
 * spell it out.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Status = 'connecting' | 'live' | 'reconnecting';

export interface RealtimeStatusDotProps {
  showLabel?: boolean;
  /** Override styling — useful in a tight footer slot. */
  size?: number;
  className?: string;
}

export default function RealtimeStatusDot({
  showLabel = false,
  size = 8,
  className,
}: RealtimeStatusDotProps) {
  const [status, setStatus] = useState<Status>('connecting');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Probe via a no-op heartbeat channel. The supabase-js client emits
    // 'SUBSCRIBED' once the websocket is healthy and 'CHANNEL_ERROR' /
    // 'CLOSED' / 'TIMED_OUT' on any disruption.
    const ch = supabase.channel('realtime-heartbeat');
    ch.subscribe((s) => {
      if (s === 'SUBSCRIBED') setStatus('live');
      else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
        setStatus('reconnecting');
      }
    });

    return () => {
      void supabase.removeChannel(ch);
    };
  }, []);

  const color =
    status === 'live' ? '#1D9E75' /* green */
    : status === 'reconnecting' ? '#C4A44A' /* amber */
    : '#B8B5AC' /* faded */;

  const label =
    status === 'live' ? 'Live'
    : status === 'reconnecting' ? 'Reconnecting…'
    : 'Connecting…';

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        color: '#3D3D3D',
        fontFamily: 'system-ui, sans-serif',
      }}
      aria-live="polite"
      aria-label={`Realtime status: ${label}`}
    >
      <span
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: color,
          // Subtle pulse only when reconnecting — avoids visual noise on
          // the healthy path.
          animation: status === 'reconnecting' ? 'bkg-realtime-pulse 1.2s ease-in-out infinite' : 'none',
        }}
      />
      {showLabel && <span>{label}</span>}
      <style>{`
        @keyframes bkg-realtime-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </span>
  );
}
