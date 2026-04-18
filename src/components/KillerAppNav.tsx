'use client';
// Builder's Knowledge Garden — App chrome (minimal, post-fork-correction)
//
// Replaces the legacy "Command Center" KillerAppNav:
//   ❌ 2,840 XP + 7-day streak badges  (violates direction doc Decision #8)
//   ❌ 7 hardcoded module tabs, 4 of them SOON placeholders (#1, #11)
//   ❌ /field-pointed Voice button + /knowledge Copilot button in chrome
//
// New minimal chrome:
//   ✓ Brand pill that routes to /killerapp (the workflow picker — Decision #3)
//   ✓ "Workflows" back-link when inside a workflow route (fluid, not quest-driven)
//   ✓ Nothing else. Per-workflow journey-map lives in a separate header component.
//
// Export name preserved (default `KillerAppNav`) so the 8 route groups
// that already import it don't break. Renaming can happen later.

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function KillerAppNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  // Show "Workflows" back-link whenever we're nested under a workflow route.
  // Root /killerapp is the picker itself, so no back-link there.
  const inWorkflow = pathname.startsWith('/killerapp/workflows/');

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 64,
        right: 0,
        height: 48,
        zIndex: 99,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(232,68,58,0.18)',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 16,
        paddingRight: 16,
        gap: 12,
        fontFamily: 'var(--font-archivo), sans-serif',
      }}
    >
      {/* Brand → workflow picker */}
      <Link
        href="/killerapp"
        style={{
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: '#E8443A',
          flexShrink: 0,
        }}
      >
        <span>⚡</span>
        <span>Builder&apos;s Knowledge Garden</span>
      </Link>

      {inWorkflow && (
        <>
          <span
            style={{
              width: 1,
              height: 20,
              background: 'var(--border, #e2e4e8)',
              flexShrink: 0,
            }}
          />
          <Link
            href="/killerapp"
            style={{
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--fg-secondary, #555555)',
              flexShrink: 0,
            }}
          >
            ← All workflows
          </Link>
        </>
      )}

      {/* spacer */}
      <div style={{ flex: 1 }} />
    </div>
  );
}
