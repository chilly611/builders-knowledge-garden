'use client';

/**
 * /start/tiers — first-run "money & time" screen (Loop 3, Principle #3).
 *
 * The third screen in the wired sequence: One Door → infer-the-role →
 * /start/tiers (this) → cockpit via "go deeper" (Principle #5). Reads the
 * user's words (echoed back) and the inferred role (so the copy speaks the
 * right voice — "same engine, copy swaps only"). Tier ranges are still honest
 * SAMPLES with the engine's-read label; wiring them to a grounded per-project
 * estimate (/api/v1/projects/estimate) is the remaining enhancement.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MoneyTimeTiers, { type CostTier } from '@/components/first-run/MoneyTimeTiers';
import { type FirstRunRole } from '@/components/first-run/InferRole';

export default function StartTiersPage() {
  const router = useRouter();
  const [intent, setIntent] = useState<string | undefined>(undefined);
  const [role, setRole] = useState<FirstRunRole>('owner');

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const value = sp.get('intent') || window.sessionStorage.getItem('bkg-door-intent') || undefined;
      if (value) setIntent(value);
      const r = sp.get('role') || window.sessionStorage.getItem('bkg-role');
      if (r === 'owner' || r === 'gc') setRole(r);
    } catch {
      // no intent/role — the screen still works (owner voice, generic headline)
    }
  }, []);

  const handleSelect = useCallback(
    (key: CostTier['key']) => {
      try {
        window.sessionStorage.setItem('bkg-tier', key);
      } catch {
        // best-effort
      }
      router.push('/dream');
    },
    [router]
  );

  const handleGoDeeper = useCallback(() => {
    router.push('/killerapp');
  }, [router]);

  return <MoneyTimeTiers intent={intent} role={role} onSelect={handleSelect} onGoDeeper={handleGoDeeper} />;
}
