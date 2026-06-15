'use client';

/**
 * KillerAppNav — A1 surface-switcher (component-fidelity spec §A).
 *
 * The canonical top bar / masthead for every Killer App surface. Replaces the
 * old ad-hoc brand+Projects+Workflows links with a real surface switcher:
 *   - Left:   Viver seal + "builder's knowledge garden" wordmark → /killerapp
 *   - Center: 3 surface tabs (Killer App / Dream Machine / Knowledge Garden)
 *             each with a Space Mono undercaption; active tab boxed (cream fill
 *             + brass-aged hairline + teal marker), routing preserves ?project=
 *   - Right:  role chip (Builder / Owner, from the REAL per-project lane — no
 *             fabricated yard/crew) + the account menu (AuthAndProjectIndicator:
 *             new project / switch / sign out, preserved from #52)
 *
 * GROUND is LIGHT (paper-vellum), per the design system's canonical chrome
 * (the kit Sidebar + the no-dark constitution rule + the cream chrome-killer-app
 * plate) — NOT the spec's loose "brown/ink ground" wording.
 *
 * Export name preserved (default `KillerAppNav`) so the route groups that
 * import it don't break. Tabs link out to /dream + /knowledge; mounting the
 * switcher on those surfaces too is a follow-up. Mobile shows brand + account
 * only (tabs would overflow) — mobile surface-switching is a follow-up.
 */

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import Logomark from '@/components/Logomark';
import AuthAndProjectIndicator from '@/app/killerapp/AuthAndProjectIndicator';
import { useStageProject } from '@/lib/hooks/useStageProject';
import type { ProjectRole } from '@/lib/use-user-lane';

const MONO = 'var(--bp-font-mono, ui-monospace, monospace)';
const DISPLAY = 'var(--font-archivo), sans-serif';

const SURFACES = [
  { id: 'killer', label: 'Killer App', sub: 'What gets done', href: '/killerapp' },
  { id: 'dream', label: 'Dream Machine', sub: 'What gets imagined', href: '/dream' },
  { id: 'garden', label: 'Knowledge Garden', sub: 'What gets remembered', href: '/knowledge' },
] as const;

/** Real per-project lane → display role. Null lane (no project / picker) → no chip. */
function roleLabel(lane: ProjectRole | null): string | null {
  if (lane === 'owner') return 'Owner';
  if (lane === 'gc') return 'Builder';
  return null;
}

export default function KillerAppNav() {
  const pathname = usePathname() ?? '';
  const sp = useStageProject();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // Preserve ?project=<id> across the brand-link + surface-tab clicks.
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 760);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Watch the URL for ?project=<id> — read from window.location (not
  // useSearchParams, which would force a Suspense boundary around this global
  // chrome) and refresh on client navigations via our custom event.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = () => {
      // Project context lives either in ?project=<id> (picker/workflow surfaces)
      // or in the /killerapp/projects/<id> path (the lane-aware home) — read
      // both so the surface tabs preserve the active project everywhere.
      const q = new URLSearchParams(window.location.search).get('project');
      const fromPath = window.location.pathname.match(/^\/killerapp\/projects\/([^/?#]+)/);
      setActiveProjectId(q || (fromPath ? decodeURIComponent(fromPath[1]) : null));
    };
    sync();
    window.addEventListener('popstate', sync);
    window.addEventListener('bkg:project:changed', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('bkg:project:changed', sync);
    };
  }, [pathname]);

  if (!mounted) return null;

  const withProjectId = (href: string): string => {
    if (!activeProjectId) return href;
    if (href.includes('?project=')) return href;
    const sep = href.includes('?') ? '&' : '?';
    return `${href}${sep}project=${encodeURIComponent(activeProjectId)}`;
  };

  const activeSurface = pathname.startsWith('/dream')
    ? 'dream'
    : pathname.startsWith('/knowledge')
      ? 'garden'
      : 'killer';
  const role = roleLabel(sp.lane);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 48,
        zIndex: 99,
        background: 'rgba(242,233,210,0.86)', // paper-cream/vellum, light (no dark grounds)
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--faded-rule, rgba(42,38,32,0.12))',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: isMobile ? 18 : 24,
        paddingRight: isMobile ? 12 : 16,
        gap: 12,
        fontFamily: DISPLAY,
      }}
    >
      {/* Brand → workflow picker (preserves ?project=) */}
      <Link
        href={withProjectId('/killerapp')}
        style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 9, flexShrink: 0, zIndex: 2 }}
      >
        <Logomark size={isMobile ? 30 : 34} alt="Builder's Knowledge Garden" />
        {!isMobile && (
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'lowercase', color: 'var(--ink-graphite, #2A2620)', lineHeight: 1 }}>
            builder&apos;s knowledge garden
          </span>
        )}
      </Link>

      {/* Center — surface switcher (desktop). Absolutely centered so it stays
          put regardless of the left/right cluster widths. */}
      {!isMobile && (
        <nav
          aria-label="Surfaces"
          style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'stretch', gap: 4, height: '100%' }}
        >
          {SURFACES.map((s) => {
            const isActive = s.id === activeSurface;
            return (
              <Link
                key={s.id}
                href={withProjectId(s.href)}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: 1,
                  padding: '0 14px',
                  textDecoration: 'none',
                  borderLeft: '1px solid transparent',
                  borderRight: '1px solid transparent',
                  borderBottom: isActive ? '2px solid var(--specimen-teal, #3C7A8A)' : '2px solid transparent',
                  background: isActive ? 'var(--paper-cream, #F2E9D2)' : 'transparent',
                  borderTop: isActive ? '1px solid var(--specimen-brass-aged, #8C6D3F)' : '1px solid transparent',
                  ...(isActive ? { borderLeftColor: 'var(--specimen-brass-aged, #8C6D3F)', borderRightColor: 'var(--specimen-brass-aged, #8C6D3F)' } : null),
                }}
              >
                <span style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.01em', color: isActive ? 'var(--ink-graphite, #2A2620)' : 'var(--ink-faded, #6A6256)' }}>
                  {s.label}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: isActive ? 'var(--specimen-teal-deep, #234C5A)' : 'var(--ink-faded, #8A8478)', opacity: isActive ? 0.9 : 0.6 }}>
                  {s.sub}
                </span>
              </Link>
            );
          })}
        </nav>
      )}

      {/* spacer pushes the right cluster to the edge (tabs are absolute) */}
      <div style={{ flex: 1 }} />

      {/* Right — real role chip (no fabricated yard/crew), then the account menu */}
      {!isMobile && role ? (
        <span
          style={{
            flexShrink: 0,
            fontFamily: MONO,
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--specimen-brass-aged, #8C6D3F)',
            border: '1px solid var(--specimen-brass, #B08D5C)',
            borderRadius: 999,
            padding: '3px 9px',
            zIndex: 2,
          }}
          title="Your role on this project"
        >
          {role}
        </span>
      ) : null}

      <div style={{ zIndex: 2, flexShrink: 0 }}>
        <Suspense fallback={null}>
          <AuthAndProjectIndicator inline={!isMobile} />
        </Suspense>
      </div>
    </div>
  );
}
