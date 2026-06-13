'use client';

/**
 * /start — the first-run door (Loop 3 PR1, docs/first-run-and-onboarding.md).
 *
 * Renders The One Door and re-houses onto the proven engine (Principle #7):
 * the user's exact words are handed to the existing /dream express flow via
 * sessionStorage (no URL param → no useSearchParams/Suspense coupling on the
 * heavy /dream page). The money-and-time tiers screen (Principle #3) and the
 * infer-the-role step (Principle #4) replace this handoff in later Loop 3 PRs;
 * for now the door is the clean front and /dream is the existing destination.
 *
 * Not yet wired as the post-signup landing — that rewire (touching the Loop 1
 * onboarding routing) is a deliberate, separate PR. This route is reachable on
 * its own so the door can be reviewed in a real browser.
 */

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import OneDoor from '@/components/first-run/OneDoor';

/** Handoff key the /dream welcome phase reads once on mount to seed its input. */
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
        // private mode / storage disabled — the dream flow still loads, just
        // without the pre-filled words. Never block the door on storage.
      }
      router.push('/dream');
    },
    [router]
  );

  return <OneDoor onSubmit={handleSubmit} busy={busy} />;
}
