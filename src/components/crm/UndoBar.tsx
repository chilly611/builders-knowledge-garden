'use client';

// Builder's Knowledge Garden — UndoBar (Brief 2)
//
// Time Machine primitive — sticky 90-second countdown with one big Undo
// button. Fires onExpire when the window elapses; the parent then flips
// state to "sent" and dismisses the bar.

import { useEffect, useState } from 'react';

const BRASS = '#B6873A';
const INK = '#1A1A1A';
const PAPER = '#FFFDF7';
const ROBIN = '#81D8D0';

interface UndoBarProps {
  messageId: string;
  expiresAt: number;
  label?: string;
  onUndo: () => Promise<void> | void;
  onExpire: () => void;
}

export default function UndoBar({
  messageId,
  expiresAt,
  label,
  onUndo,
  onExpire,
}: UndoBarProps) {
  const [now, setNow] = useState<number>(Date.now());
  const [undoing, setUndoing] = useState<boolean>(false);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (Date.now() >= expiresAt) {
      onExpire();
    }
  }, [expiresAt, now, onExpire]);

  const remaining = Math.max(0, expiresAt - now);
  const secs = Math.ceil(remaining / 1000);
  const pct = Math.max(0, Math.min(100, (remaining / 90_000) * 100));

  const handleUndo = async () => {
    setUndoing(true);
    try {
      await onUndo();
    } finally {
      setUndoing(false);
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      data-bkg-component="undo-bar"
      data-bkg-message-id={messageId}
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        background: INK,
        color: PAPER,
        padding: '12px 16px',
        borderRadius: 999,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        zIndex: 70,
        boxShadow: '0 10px 28px rgba(0,0,0,0.35)',
        minWidth: 280,
        maxWidth: '92vw',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: `conic-gradient(${ROBIN} ${pct}%, transparent ${pct}%)`,
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 14, fontWeight: 600 }}>
        Sending{label ? ` to ${label}` : ''} in {secs}s
      </span>
      <button
        type="button"
        onClick={() => void handleUndo()}
        disabled={undoing || remaining <= 0}
        style={{
          marginLeft: 'auto',
          background: BRASS,
          color: INK,
          border: 'none',
          borderRadius: 999,
          padding: '8px 16px',
          fontSize: 14,
          fontWeight: 800,
          cursor: undoing ? 'wait' : 'pointer',
          letterSpacing: 0.3,
        }}
      >
        {undoing ? 'Undoing…' : 'Undo'}
      </button>
    </div>
  );
}
