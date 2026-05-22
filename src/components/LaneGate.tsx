'use client';

/**
 * LaneGate — declarative role-gate component (LANE-INFRA, 2026-05-22).
 *
 * Usage:
 *   <LaneGate allow={['owner', 'gc']}>
 *     <ApproveChangeOrderButton />
 *   </LaneGate>
 *
 *   <LaneGate allow="specialist" fallback={<p>Specialists only.</p>}>
 *     <BidInbox />
 *   </LaneGate>
 *
 * Resolves the current user's `effectiveLane` via `useUserLane()`. While
 * loading we render `loadingFallback` (null by default — most gates can
 * just stay hidden until the role is known). When loaded:
 *   - if effectiveLane is in `deny` → render `fallback`
 *   - else if effectiveLane is in `allow` → render `children`
 *   - else → render `fallback`
 *
 * The `deny` list takes precedence over `allow` so combos like
 * `allow="*"` (everyone) + `deny={['day_hire']}` are clean.
 */

import { ReactNode } from 'react';
import { useUserLane, ProjectRole } from '@/lib/use-user-lane';

export interface LaneGateProps {
  /** Roles allowed to see `children`. Use `'*'` to mean "all roles". */
  allow: ProjectRole | ProjectRole[] | '*';
  /** Optional explicit block list. Takes precedence over `allow`. */
  deny?: ProjectRole | ProjectRole[];
  /** Shown to blocked roles. Defaults to nothing (hide quietly). */
  fallback?: ReactNode;
  /** Shown while the lane is being resolved. Defaults to nothing. */
  loadingFallback?: ReactNode;
  children: ReactNode;
}

function asList<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

export function LaneGate({
  allow,
  deny,
  fallback = null,
  loadingFallback = null,
  children,
}: LaneGateProps) {
  const { effectiveLane, loading } = useUserLane();

  if (loading) return <>{loadingFallback}</>;

  const denyList = asList(deny);
  if (denyList.includes(effectiveLane)) return <>{fallback}</>;

  if (allow === '*') return <>{children}</>;
  const allowList = asList(allow);
  if (allowList.includes(effectiveLane)) return <>{children}</>;

  return <>{fallback}</>;
}

export default LaneGate;
