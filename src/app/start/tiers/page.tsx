'use client';

/**
 * /start/tiers — first-run "money & time" screen (Loop 3, Principle #3).
 *
 * The third screen in the wired sequence: One Door → infer-the-role →
 * /start/tiers (this) → cockpit via "go deeper" (Principle #5). Reads the
 * user's words (echoed back) and the inferred role (so the copy speaks the
 * right voice — "same engine, copy swaps only").
 *
 * Tier ranges are now GROUNDED: derived per-project from the user's own words
 * (size / building type / jurisdiction parsed from the intent) plus an optional
 * light refine row, via src/lib/first-run/estimate. No hallucinated money — the
 * numbers scale with the real project, stay honest ranges with the engine's-read
 * label, and every tier keeps a non-green "verify with your AHJ" flag. See that
 * lib's header for why we don't call POST /api/v1/projects/estimate from here.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import MoneyTimeTiers, { type CostTier } from '@/components/first-run/MoneyTimeTiers';
import { type FirstRunRole } from '@/components/first-run/InferRole';
import { estimateTiers } from '@/lib/first-run/estimate';

export default function StartTiersPage() {
  const router = useRouter();
  const [intent, setIntent] = useState<string | undefined>(undefined);
  const [role, setRole] = useState<FirstRunRole>('owner');
  // Light refine row — raw input strings. Empty means "use what we parsed from
  // the intent, or an honest type default"; the user's entries win over the parse.
  const [refine, setRefine] = useState<{ sqft: string; location: string }>({ sqft: '', location: '' });

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

  // The grounded estimate. Pure + synchronous, so it never blocks the next step
  // and recomputes instantly as the user refines size / location.
  const { tiers, basis } = useMemo(() => {
    const sqftDigits = refine.sqft.replace(/[^\d]/g, '');
    return estimateTiers({
      intent,
      sqft: sqftDigits ? Number(sqftDigits) : undefined,
      location: refine.location.trim() || undefined,
    });
  }, [intent, refine.sqft, refine.location]);

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

  return (
    <MoneyTimeTiers
      intent={intent}
      role={role}
      tiers={tiers}
      basis={basis}
      refine={{ value: refine, onChange: setRefine }}
      onSelect={handleSelect}
      onGoDeeper={handleGoDeeper}
    />
  );
}
