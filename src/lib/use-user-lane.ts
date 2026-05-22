'use client';

/**
 * useUserLane — LANE-INFRA spine (2026-05-22 sprint).
 *
 * Single client hook that resolves "what role is this user playing on
 * THIS project?" so any UI surface can declaratively gate features by
 * lane via <LaneGate>. The truth-source priority is:
 *
 *   1. `project_members.project_role` for (projectId, userId) — the
 *      schema shipped by SCHEMA-ALPHA. This is the per-project ground
 *      truth (a user can have different roles on different projects).
 *   2. `auth.users.raw_user_meta_data.lane` — the legacy "default lane"
 *      a user picked during onboarding. Mapped through
 *      LEGACY_TO_PROJECT_ROLE so existing trial users keep working
 *      while we migrate.
 *   3. Default of `gc` — the safest fallback for the current demo
 *      audience (most trial accounts are contractors).
 *
 * The hook re-loads when the active projectId changes (so switching
 * projects flips the role correctly) and on any auth state change.
 *
 * Companion: `<LaneGate allow={...} />` in `src/components/LaneGate.tsx`.
 */

import { useEffect, useState } from 'react';
import { useProject } from '@/lib/hooks/useProject';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export type ProjectRole =
  | 'owner'
  | 'gc'
  | 'contractor'
  | 'teammate'
  | 'day_hire'
  | 'specialist'
  | 'diy';

export type LegacyLane = 'builder' | 'specialist' | 'dreamer';

export interface UserLane {
  /** Row from `project_members` for (projectId, userId); null if no row. */
  projectRole: ProjectRole | null;
  /** From `auth.users.raw_user_meta_data.lane`. */
  legacyLane: LegacyLane | null;
  /** Best-guess role: project_members wins, else mapped legacy lane, else `gc`. */
  effectiveLane: ProjectRole;
  /** True while resolving. UI should typically not gate on this — the default `gc`
   *  is safe — but `<LaneGate loadingFallback>` uses it for "loading skeleton" cases. */
  loading: boolean;
}

const LEGACY_TO_PROJECT_ROLE: Record<LegacyLane, ProjectRole> = {
  builder: 'gc',
  specialist: 'specialist',
  dreamer: 'diy',
};

/**
 * Privilege ranking for resolving ambiguity when a user holds multiple
 * roles on the same project (allowed by the schema — unique constraint is
 * `(project_id, user_id, project_role)`). Highest number wins.
 */
const ROLE_PRIORITY: Record<ProjectRole, number> = {
  owner: 100,
  gc: 90,
  contractor: 70,
  specialist: 60,
  teammate: 50,
  diy: 40,
  day_hire: 30,
};

export function pickHighestRole(roles: ProjectRole[]): ProjectRole | null {
  if (!roles.length) return null;
  return [...roles].sort((a, b) => ROLE_PRIORITY[b] - ROLE_PRIORITY[a])[0];
}

export function useUserLane(): UserLane {
  const { projectId } = useProject();
  const [user, setUser] = useState<User | null>(null);
  const [projectRole, setProjectRole] = useState<ProjectRole | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const { data: userData } = await supabase.auth.getUser();
        const u = userData.user ?? null;
        if (cancelled) return;
        setUser(u);

        if (u && projectId) {
          // A user can hold multiple roles on the same project (schema
          // unique key is (project_id, user_id, project_role)). Pull them
          // all and pick the highest-priority one — e.g. an "owner" who
          // is also tagged "gc" should resolve to "owner".
          const { data, error } = await supabase
            .from('project_members')
            .select('project_role')
            .eq('project_id', projectId)
            .eq('user_id', u.id);
          if (cancelled) return;
          if (error) {
            // RLS denial or transient failure — fall back to metadata-derived lane.
            setProjectRole(null);
          } else {
            const roles = (data ?? [])
              .map((r) => r.project_role as ProjectRole | null)
              .filter((r): r is ProjectRole => !!r);
            setProjectRole(pickHighestRole(roles));
          }
        } else {
          setProjectRole(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [projectId]);

  const rawLane = (user?.user_metadata?.lane as string | undefined) ?? null;
  const legacyLane: LegacyLane | null =
    rawLane === 'builder' || rawLane === 'specialist' || rawLane === 'dreamer'
      ? rawLane
      : null;

  const effectiveLane: ProjectRole =
    projectRole ?? (legacyLane ? LEGACY_TO_PROJECT_ROLE[legacyLane] : 'gc');

  return { projectRole, legacyLane, effectiveLane, loading };
}

/** Exported for testing + for the server helper to share one mapping. */
export const LEGACY_LANE_TO_PROJECT_ROLE = LEGACY_TO_PROJECT_ROLE;
