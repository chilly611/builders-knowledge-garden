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
//   ✓ Auth + project chip on the right (signed-in + project name)
//   (Stage chip row removed 2026-05-28 — KillerAppChrome Journey row owns
//    stage nav; rendering both produced a duplicate strip.)
//
// Export name preserved (default `KillerAppNav`) so the 8 route groups
// that already import it don't break. Renaming can happen later.

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import Logomark from '@/components/Logomark';
import AuthAndProjectIndicator from '@/app/killerapp/AuthAndProjectIndicator';

export default function KillerAppNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // Preserve ?project=<id> across the brand-link click + workflow back-link.
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

  // Show "Projects" link when NOT on the projects page itself.
  // Used for quick navigation to the projects dashboard.
  const inProjects = pathname === '/killerapp/projects';
  const showProjectsNav = !inProjects;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 48,
        zIndex: 99,
        background: 'rgba(244,240,230,0.72)',
        backdropFilter: 'blur(14px)',
        borderBottom: 'none',
        display: 'flex',
        alignItems: 'center',
        // Match the page content's 28px horizontal padding so the logo
        // aligns with body content on all screen sizes. Previously left:64
        // + paddingLeft:16 left a phantom 64px sidebar gap (the sidebar
        // component exists but is never mounted — GlobalAiFab: "unused").
        paddingLeft: isMobile ? 20 : 28,
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
        {/* Canonical B mark — 40px on desktop, 32px on mobile.
            One mark, every page. The tree drawing is a hero/illustration
            asset only; it never appears as the brand mark. */}
        <Logomark size={isMobile ? 32 : 40} alt="Builder's Knowledge Garden" />

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

      {/* Projects link — visible except when already on projects page */}
      {showProjectsNav && !isMobile && (
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
            href="/killerapp/projects"
            style={{
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: 400,
              color: 'var(--fg-secondary)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              minHeight: 44,
              minWidth: 44,
              justifyContent: 'center',
              padding: '0 8px',
            }}
            title="View all projects"
          >
            <span>Projects</span>
          </Link>
        </>
      )}

      {/* spacer */}
      <div style={{ flex: 1 }} />

      {/* Stage landscape chip row REMOVED (2026-05-28): the new Journey row
          inside KillerAppChrome (completion rings + due-date markers) IS
          the stage nav now. Mounting both produced a duplicate stage strip
          in the header AND below — see brand-consolidation pass. */}

      {/* Auth + project indicator — embedded in the nav bar to avoid
          overlapping the stage chips. Uses inline mode (no fixed position).
          Suspense required: AuthAndProjectIndicator uses useSearchParams. */}
      <Suspense fallback={null}>
        <AuthAndProjectIndicator inline={!isMobile} />
      </Suspense>
    </div>
  );
}
