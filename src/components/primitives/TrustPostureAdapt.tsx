/**
 * TrustPostureAdapt (Pattern Language #20, Dimensional Rendering).
 *
 * Category: Dimensional Rendering.
 * Axes touched: trust_posture (primary — 0.0 first-time → 1.0 long-tenured),
 *               tempo (active — emergency overrides any onboarding chrome),
 *               lane (active — administrators always see audit-trail affordances).
 *
 * Platform defensiveness scales inversely with user trust. First-time visitor
 * gets reassurance; long-term user gets shortcuts.
 *
 * Caller supplies content for each posture band. The component picks the
 * highest-trust slot the user has earned.
 */

'use client';

import * as React from 'react';
import { useStanceCard } from '@/lib/stance-card';
import type { StanceCard } from './StanceCard.types';

export interface TrustPostureAdaptProps {
  /** What a brand-new visitor sees (0.0 - 0.25). */
  newcomer?: React.ReactNode;
  /** What a returning user sees (0.25 - 0.6). */
  returning?: React.ReactNode;
  /** What a veteran sees (0.6 - 0.9). */
  veteran?: React.ReactNode;
  /** What a long-tenured insider sees (0.9+). */
  insider?: React.ReactNode;
  /** Pin stance for SSR. */
  stance?: StanceCard;
  /** Pin posture explicitly (e.g. preview mode). */
  forcePosture?: number;
}

export function TrustPostureAdapt({
  newcomer,
  returning,
  veteran,
  insider,
  stance,
  forcePosture,
}: TrustPostureAdaptProps) {
  const clientStance = useStanceCard();
  const card = stance ?? clientStance;
  const posture = forcePosture ?? card.trust_posture;

  // Walk down from insider to newcomer, picking the highest-trust slot that
  // (a) is defined and (b) the user has earned access to.
  if (posture >= 0.9 && insider !== undefined) return <>{insider}</>;
  if (posture >= 0.6 && veteran !== undefined) return <>{veteran}</>;
  if (posture >= 0.25 && returning !== undefined) return <>{returning}</>;
  if (newcomer !== undefined) return <>{newcomer}</>;

  // Fall back to whatever the caller did define, in trust order.
  return <>{insider ?? veteran ?? returning ?? newcomer ?? null}</>;
}

export default TrustPostureAdapt;
