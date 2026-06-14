'use client';

/**
 * /start/role — first-run "infer the role" step (Loop 3 close-out, Principle #4,
 * docs/first-run-and-onboarding.md). The second screen in the sequence:
 *
 *   /start (One Door) → /start/role (this) → /start/tiers → cockpit (go deeper)
 *
 * Reads the user's words from The One Door handoff (sessionStorage / ?intent=),
 * echoes them back unedited, and infers Owner vs GC for a one-tap confirm. The
 * chosen role is stored so the money screen (and beyond) speaks the right voice
 * — "same engine, copy swaps only." Reachable on its own for review.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import InferRole, { type FirstRunRole } from '@/components/first-run/InferRole';

/** Handoff key the downstream first-run screens read to swap voice. */
export const ROLE_KEY = 'bkg-role';

export default function StartRolePage() {
  const router = useRouter();
  const [intent, setIntent] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const fromQuery = new URLSearchParams(window.location.search).get('intent');
      const fromStore = window.sessionStorage.getItem('bkg-door-intent');
      const value = fromQuery || fromStore || undefined;
      if (value) setIntent(value);
    } catch {
      // no intent — InferRole still works (no echo line, owner default)
    }
  }, []);

  const handleConfirm = useCallback(
    (role: FirstRunRole) => {
      setBusy(true);
      try {
        window.sessionStorage.setItem(ROLE_KEY, role);
      } catch {
        // private mode — the tiers screen falls back to the owner voice
      }
      router.push('/start/tiers');
    },
    [router]
  );

  return <InferRole intent={intent} onConfirm={handleConfirm} busy={busy} />;
}
