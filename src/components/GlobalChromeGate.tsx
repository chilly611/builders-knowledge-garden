'use client';

import { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import CompassBloom from '@/components/CompassBloom';
import GlobalAiFab from '@/components/GlobalAiFab';

/**
 * GlobalChromeGate — wraps the always-mounted bottom-right chrome
 * (CompassBloom + GlobalAiFab) and suppresses it on:
 *
 *   1. `/intro` (the investor cinematic — chrome would clutter it),
 *   2. any route with `?hideShell=1` (the iframe target for /intro Act 4,
 *      which loads /killerapp/budget?...&hideShell=1 — without this the
 *      iframe leaks the global FABs into the cinematic frame).
 *
 * Kept as a tiny client component so the root layout stays server-rendered
 * for the rest of the tree.
 */
// Same rollback flag as /killerapp/layout.tsx: when the shared app shell is
// active, ShellNav owns the bottom-right corner on every /killerapp surface.
const USE_APP_SHELL = process.env.NEXT_PUBLIC_APP_SHELL !== '0';

function GlobalChromeGateInner() {
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();
  const hideShell = searchParams?.get('hideShell') === '1';

  if (hideShell) return null;
  if (pathname === '/intro' || pathname.startsWith('/intro/')) return null;
  // Lifecycle stage screens render their own self-contained chrome + a sticky
  // primary-action bar at the bottom; the floating bloom + AI fab just hover
  // over that action button. Hide them on /killerapp/stages/* the same way.
  if (/^\/killerapp\/stages(\/|$)/.test(pathname)) return null;
  // With the shared app shell on, ShellNav provides the compass bloom and the
  // single "Ask or tell the garden" entry on every /killerapp route. The
  // legacy pair (CompassBloom z-9999 + GlobalAiFab z-9997) was never
  // suppressed here when the shell shipped, so it painted over the shell
  // cluster (z-60) and buried the rectangular bloom panel. One corner, one
  // chrome. NEXT_PUBLIC_APP_SHELL=0 restores the legacy pair with the rest
  // of the old chrome.
  if (USE_APP_SHELL && /^\/killerapp(\/|$)/.test(pathname)) return null;

  // The logged-out marketing homepage ("/") is a clean landing surface, not
  // the Killer App shell. The bloom compass (CompassBloom) is in-app chrome —
  // a project/lane navigator that only makes sense once you're inside a
  // project — so we suppress it here. The "ask the garden" composer
  // (GlobalAiFab) stays: it's the one ambient affordance a logged-out
  // visitor should have. (2026-06-01 homepage rebuild.)
  const isMarketingHome = pathname === '/';

  return (
    <>
      {!isMarketingHome && <CompassBloom />}
      <GlobalAiFab />
    </>
  );
}

export default function GlobalChromeGate() {
  return (
    <Suspense fallback={null}>
      <GlobalChromeGateInner />
    </Suspense>
  );
}
