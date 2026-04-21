'use client';
// Builder's Knowledge Garden — App chrome (minimal, post-fork-correction)
//
// Replaces the legacy "Command Center" KillerAppNav:
//   ❌ 2,840 XP + 7-day streak badges  (violates direction doc Decision #8)
//   ❌ 7 hardcoded module tabs, 4 of them SOON placeholders (#1, #11)
//   ❌ /field-pointed Voice button + /knowledge Copilot button in chrome
//
// New minimal chrome:
//   ✓ Brand pill with actual Logomark that routes to /killerapp (the workflow picker — Decision #3)
//   ✓ Refined wordmark in graphite (not red), lowercase treatment, proper letterspacing
//   ✓ Blueprint hairline bottom border (0.5px var(--faded-rule)) in place of red divider
//   ✓ "Workflows" back-link when inside a workflow route (fluid, not quest-driven)
//   ✓ Nothing else. Per-workflow journey-map lives in a separate header component.
//
// Export name preserved (default `KillerAppNav`) so the 8 route groups
// that already import it don't break. Renaming can happen later.

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Logomark from '@/components/Logomark';

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
        borderBottom: '0.5px solid var(--faded-rule)',
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
          gap: 8,
          flexShrink: 0,
        }}
      >
        {/* Logomark: 28px tall, crisp */}
        <Logomark size={28} alt="Builder's Knowledge Garden" />

        {/* Wordmark: refined, graphite, lowercase treatment, proper letterspacing */}
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'lowercase',
            color: 'var(--graphite)',
            lineHeight: 1,
          }}
        >
          builder&apos;s knowledge garden
        </span>
      </Link>

      {inWorkflow && (
        <>
          <span
            style={{
              width: 1,
              height: 20,
              background: 'var(--faded-rule)',
              flexShrink: 0,
            }}
          />
          <Link
            href="/killerapp"
            style={{
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: 400,
              color: 'var(--fg-secondary)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{ fontSize: 11 }}>‹</span>
            <span>All Workflows</span>
          </Link>
        </>
      )}

      {/* spacer */}
      <div style={{ flex: 1 }} />
    </div>
  );
}
