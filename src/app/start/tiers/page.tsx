'use client';

/**
 * /start/tiers — first-run "money & time" screen (Loop 3 PR2, Principle #3).
 *
 * Renders MoneyTimeTiers. Reads the user's words from The One Door handoff
 * (sessionStorage / ?intent=) and echoes them back. Selections route forward
 * onto the proven engine (re-house, not rebuild). The full sequence — One Door
 * → infer-the-role (Principle #4) → these tiers fed by a grounded estimate →
 * cockpit via "go deeper" (Principle #5) — is wired in a follow-up; this route
 * is reachable on its own so the screen can be reviewed in a real browser.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MoneyTimeTiers, { type CostTier } from '@/components/first-run/MoneyTimeTiers';

export default function StartTiersPage() {
  const router = useRouter();
  const [intent, setIntent] = useState<string | undefined>(undefined);

  useEffect(() => {
    try {
      const fromQuery = new URLSearchParams(window.location.search).get('intent');
      const fromStore = window.sessionStorage.getItem('bkg-door-intent');
      const value = fromQuery || fromStore || undefined;
      if (value) setIntent(value);
    } catch {
      // no intent — the screen still works with its generic headline
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

  return <MoneyTimeTiers intent={intent} onSelect={handleSelect} onGoDeeper={handleGoDeeper} />;
}
