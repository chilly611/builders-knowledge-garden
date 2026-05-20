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
function GlobalChromeGateInner() {
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();
  const hideShell = searchParams?.get('hideShell') === '1';

  if (hideShell) return null;
  if (pathname === '/intro' || pathname.startsWith('/intro/')) return null;

  return (
    <>
      <CompassBloom />
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
