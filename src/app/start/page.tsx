'use client';

/**
 * /start — the first-run door (Loop 3, docs/first-run-and-onboarding.md).
 *
 * Renders The One Door (Principle #1) and hands the user's exact words to the
 * next step via sessionStorage. The full first-run sequence is now wired:
 *
 *   /start (this) → /start/role (infer the role) → /start/tiers (money) →
 *   cockpit via "go deeper" (Principle #5).
 *
 * Not yet wired as the post-signup LANDING — that rewire (touching the Loop 1
 * onboarding routing) is a deliberate, separate PR. This route is reachable on
 * its own so the door can be reviewed in a real browser.
 */

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import OneDoor from '@/components/first-run/OneDoor';

/** Handoff key the downstream first-run screens (role, tiers) read to echo the user's words. */
export const DOOR_INTENT_KEY = 'bkg-door-intent';

export default function StartPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleSubmit = useCallback(
    (text: string) => {
      setBusy(true);
      try {
        window.sessionStorage.setItem(DOOR_INTENT_KEY, text);
      } catch {
        // private mode / storage disabled — the next screen still loads, just
        // without the echoed words. Never block the door on storage.
      }
      router.push('/start/role');
    },
    [router]
  );

  return <OneDoor onSubmit={handleSubmit} busy={busy} />;
}
