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
//   ✓ Stage landscape chip row on right side showing all 7 stages
//
// Export name preserved (default `KillerAppNav`) so the 8 route groups
// that already import it don't break. Renaming can happen later.

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Logomark from '@/components/Logomark';
import { STAGE_ACCENTS, type StageId } from '@/design-system/tokens/stage-accents';
import { stageFromPathname } from '@/lib/stage-from-pathname';

// Stage landscape mapping: stage ID → label + first workflow href
const STAGE_LANDSCAPE: Record<StageId, { label: string; href: string }> = {
  1: { label: 'Size up', href: '/killerapp/workflows/estimating' },
  2: { label: 'Lock it in', href: '/killerapp/workflows/contract-templates' },
  3: { label: 'Plan it out', href: '/killerapp/workflows/job-sequencing' },
  4: { label: 'Build', href: '/killerapp/workflows/daily-log' },
  5: { label: 'Adapt', href: '/killerapp/workflows/services-todos' },
  6: { label: 'Collect', href: '/killerapp/workflows/expenses' },
  7: { label: 'Reflect', href: '/killerapp/workflows/compass-nav' },
};

export default function KillerAppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const currentStageId = stageFromPathname(pathname);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // Project Spine v1 (2026-05-06 fix): preserve ?project=<id> when the
  // user clicks a stage chip. Without this, clicking "Lock it in" or
  // "Build" navigates to a workflow without project_id, the workflow
  // hook redirects back to /killerapp, and the user reports "the page
  // just refreshes."
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    // Check if mobile on mount and listen to window resize
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Watch the URL for ?project=<id>. We can't use useSearchParams here
  // because this component renders inside the global layout — wrapping
  // it in Suspense at the layout level would cascade through the rest
  // of the app. Read directly from window.location instead and update
  // on the popstate event so client-side navigations refresh the value.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveProjectId(params.get('project'));
    };
    sync();
    window.addEventListener('popstate', sync);
    // Next.js doesn't fire popstate on router.push, so listen to a custom
    // event we dispatch ourselves whenever a Spine-aware nav happens.
    window.addEventListener('bkg:project:changed', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('bkg:project:changed', sync);
    };
  }, [pathname]); // re-read on every route change

  if (!mounted) return null;

  // Append ?project=<id> to a stage href if a project is active.
  const withProjectId = (href: string): string => {
    if (!activeProjectId) return href;
    if (href.includes('?project=')) return href;
    const sep = href.includes('?') ? '&' : '?';
    return `${href}${sep}project=${encodeURIComponent(activeProjectId)}`;
  };

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
        background: 'rgba(244,240,230,0.72)',
        backdropFilter: 'blur(14px)',
        borderBottom: 'none',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: isMobile ? 12 : 16,
        paddingRight: isMobile ? 12 : 16,
        gap: 12,
        fontFamily: 'var(--font-archivo), sans-serif',
      }}
    >
      {/* Brand → workflow picker (preserves ?project=<id> if active) */}
      <Link
        href={withProjectId('/killerapp')}
        style={{
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 6 : 8,
          flexShrink: 0,
        }}
      >
        {/* Logomark: 28px tall on desktop, 24px on mobile */}
        <Logomark size={isMobile ? 24 : 28} alt="Builder's Knowledge Garden" />

        {/* Wordmark: hidden on mobile (<640px), visible above */}
        {!isMobile && (
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
        )}
      </Link>

      {inWorkflow && (
        <>
          <span
            style={{
              width: 1,
              height: isMobile ? 16 : 20,
              background: 'var(--faded-rule)',
              flexShrink: 0,
            }}
          />
          <Link
            href={withProjectId('/killerapp')}
            style={{
              textDecoration: 'none',
              fontSize: isMobile ? 11 : 12,
              fontWeight: 400,
              color: 'var(--fg-secondary)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? 2 : 4,
              minHeight: 44,
              minWidth: 44,
              justifyContent: 'center',
            }}
            title="Back to all workflows"
          >
            <span style={{ fontSize: isMobile ? 14 : 11, lineHeight: 1 }}>‹</span>
            {!isMobile && <span>All Workflows</span>}
          </Link>
        </>
      )}

      {/* spacer */}
      <div style={{ flex: 1 }} />

      {/* Stage landscape chip row — desktop only (640px+) */}
      {!isMobile && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          {(Object.keys(STAGE_LANDSCAPE) as unknown as StageId[]).map((stageId) => {
            const stage = STAGE_LANDSCAPE[stageId];
            const isActive = currentStageId === stageId;
            const accentColor = STAGE_ACCENTS[stageId].hex;

            return (
              <button
                key={stageId}
                onClick={() => router.push(withProjectId(stage.href))}
                style={{
                  height: 24,
                  paddingLeft: 10,
                  paddingRight: 10,
                  borderRadius: 12,
                  border: isActive ? 'none' : `1px solid var(--faded-rule)`,
                  background: isActive ? accentColor : 'transparent',
                  color: isActive ? 'var(--trace)' : 'var(--graphite)',
                  fontSize: 11,
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  textTransform: 'lowercase',
                  transition: 'border-color 0.2s',
                  ...(isActive && {
                    transform: 'translateY(-1px)',
                  }),
                }}
                onMouseEnter={(e) => {
                  if (!isActive && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                    e.currentTarget.style.borderColor = '#1B3B5E';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = 'var(--faded-rule)';
                  }
                }}
                title={`Go to ${stage.label}`}
              >
                {stage.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
