'use client';

/**
 * SurfaceSwitcher — the A1 surface-switcher nav bar (spec docs/design/component-fidelity.md §A1).
 * ================================================================================
 *
 * The full-width top bar that REPLACES the legacy `KillerAppNav` mount in the
 * Killer App layout, reconciling chrome to the one canonical app-shell:
 *   Left   — seal + "Builder's Knowledge Garden" + active project (Cormorant italic)
 *   Center — 3 surface tabs (Killer App / Dream Machine / Knowledge Garden) with
 *            Space Mono undercaptions; active tab boxed; routes preserve ?project=
 *   Right  — resolved role (from useStageProject().lane) + AuthAndProjectIndicator
 *            (sign-in / account — reused verbatim so no auth function is dropped)
 *
 * Brand note: the spec mockup shows a "brown/ink ground"; the LOCKED rule is
 * light-backgrounds-only / no pure-dark grounds (the spec's own prohibited
 * list), so the ground is a warm aged-tan (--paper-fold) with ink text + brass
 * accents — distinct from the cream strips below, brand-compliant, and keeps the
 * auth indicator legible. Data-driven; no fabricated "yard/crew".
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import Logomark from '@/components/Logomark';
import AuthAndProjectIndicator from '@/app/killerapp/AuthAndProjectIndicator';
import { useStageProject } from '@/lib/hooks/useStageProject';
import { laneLabel } from './config';
import './app-shell.css';

const SURFACES = [
  { id: 'killer', label: 'Killer App', sub: 'What gets done', href: '/killerapp' },
  { id: 'dream', label: 'Dream Machine', sub: 'What gets imagined', href: '/dream' },
  { id: 'garden', label: 'Knowledge Garden', sub: 'What gets remembered', href: '/knowledge' },
] as const;

function activeSurface(pathname: string): string {
  if (pathname.startsWith('/dream')) return 'dream';
  if (pathname.startsWith('/knowledge')) return 'garden';
  return 'killer';
}

export function SurfaceSwitcher() {
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();
  const sp = useStageProject();
  const active = activeSurface(pathname);

  // Preserve the active project across surface switches (mirror ShellStrips).
  const pid = searchParams?.get('project') ?? (sp.projectId || null);
  const withProject = (href: string) =>
    pid ? `${href}?project=${encodeURIComponent(pid)}` : href;

  return (
    <header className="surfbar">
      <Link href={withProject('/killerapp')} className="surfbar-brand" aria-label="Builder's Knowledge Garden — workflow picker">
        <Logomark size={34} alt="Builder's Knowledge Garden" />
        <span className="surfbar-brand-txt">
          <span className="surfbar-brand-name">Builder&apos;s Knowledge Garden</span>
          {sp.projectName && <span className="surfbar-brand-sub">{sp.projectName}</span>}
        </span>
      </Link>

      <nav className="surfbar-tabs" aria-label="Surfaces">
        {SURFACES.map((s) => (
          <Link
            key={s.id}
            href={withProject(s.href)}
            className={`surfbar-tab ${s.id === active ? 'is-active' : ''}`}
            aria-current={s.id === active ? 'page' : undefined}
          >
            <span className="surfbar-tab-label">{s.label}</span>
            <span className="surfbar-tab-sub">{s.sub}</span>
          </Link>
        ))}
      </nav>

      <div className="surfbar-right">
        {sp.lane && <span className="surfbar-role">{laneLabel(sp.lane)}</span>}
        <Suspense fallback={null}>
          <AuthAndProjectIndicator inline />
        </Suspense>
      </div>
    </header>
  );
}

export default SurfaceSwitcher;
