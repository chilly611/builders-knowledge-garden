'use client';

/**
 * SaveStatusToast — surface autosave failures.
 *
 * Listens for the `bkg:workflow:save-unauthed` event dispatched by
 * useProjectWorkflowState / useProjectStateBlob when a PATCH returns 401
 * (session expired / signed out). Previously these failures were
 * console-only, so the user kept typing without realizing nothing was
 * landing in the project spine. Now we render a small redline banner at
 * the top-right with a "Sign in to keep saving" link.
 *
 * Auto-hides 10s after the most recent failure.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SaveStatusToast() {
  const pathname = usePathname() ?? '/killerapp';
  const [visible, setVisible] = useState(false);
  const [hideTimer, setHideTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onUnauthed = () => {
      setVisible(true);
      if (hideTimer) clearTimeout(hideTimer);
      const t = setTimeout(() => setVisible(false), 10_000);
      setHideTimer(t);
    };
    window.addEventListener('bkg:workflow:save-unauthed', onUnauthed);
    return () => {
      window.removeEventListener('bkg:workflow:save-unauthed', onUnauthed);
      if (hideTimer) clearTimeout(hideTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 56,
        right: 16,
        zIndex: 1000,
        maxWidth: 360,
        padding: '10px 14px',
        borderRadius: 8,
        border: '1px solid var(--redline)',
        backgroundColor: '#F4F0E6',
        color: 'var(--graphite)',
        fontSize: 13,
        fontFamily: 'inherit',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <span style={{ color: 'var(--redline)', fontWeight: 600 }}>Not saving.</span>
      <span>Your session expired.</span>
      <Link
        href={`/login?next=${encodeURIComponent(pathname)}`}
        style={{
          color: 'var(--navy)',
          textDecoration: 'underline',
          fontWeight: 600,
        }}
      >
        Sign in
      </Link>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setVisible(false)}
        style={{
          marginLeft: 4,
          background: 'transparent',
          border: 'none',
          color: 'var(--graphite)',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
          opacity: 0.6,
        }}
      >
        ×
      </button>
    </div>
  );
}
