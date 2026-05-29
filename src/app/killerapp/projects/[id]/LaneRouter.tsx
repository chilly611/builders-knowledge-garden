'use client';

/**
 * LaneRouter — picks WHICH project home to render for the signed-in user.
 *
 *   - Lane = owner  → OwnerHomeClient (the Owner Lane home)
 *   - Lane = gc     → ProjectDashboardClient (the existing GC home, untouched)
 *   - anything else → "your Lane home is coming" placeholder
 *
 * Role resolution is parametrized by the ROUTE param `id` (not the
 * ProjectContext's active projectId, which is sourced from `?project=` /
 * localStorage and can disagree with the URL we're actually on). We mirror
 * `useUserLane()`'s logic — pull every `project_members.project_role` row for
 * (id, user) and pick the highest-priority one — so a user tagged both owner
 * and gc resolves to owner.
 *
 * IMPORTANT — two complementary systems:
 *   - `project_members.project_role` (here) selects WHICH home renders.
 *   - `checkLensPermission` / `project_lane_memberships` (server-side, in
 *     /api/owner-home) gates WHICH data cells are visible. LaneRouter never
 *     reads project data — it only routes.
 *
 * Dev preview: in non-production builds, `?preview=1` bypasses role resolution
 * and renders the Owner home in preview mode (which in turn bypasses the Lens
 * server-side) so the design can be verified without a seeded membership row.
 * `?lane=<role>` forces a specific home in dev without the data bypass.
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { pickHighestRole, type ProjectRole } from '@/lib/use-user-lane';
import ProjectDashboardClient from './ProjectDashboardClient';
import OwnerHomeClient from './owner/OwnerHomeClient';

const IS_DEV = process.env.NODE_ENV !== 'production';

function LanePlaceholder({ role }: { role: ProjectRole | null }) {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 48,
        textAlign: 'center',
        background: 'var(--paper-cream)',
        color: 'var(--ink-graphite)',
      }}
    >
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faded)' }}>
        {role ? `${role} lane` : 'Your lane'}
      </div>
      <h1 style={{ fontFamily: 'var(--font-editorial)', fontSize: 28, fontWeight: 500, margin: 0 }}>
        Your Lane home is coming
      </h1>
      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 15, maxWidth: 420, color: 'var(--ink-sepia)', margin: 0 }}>
        We&apos;re still building the home view for this Lane. In the meantime, ask your builder for what you need.
      </p>
    </div>
  );
}

export default function LaneRouter({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams();
  const devPreview = IS_DEV && searchParams.get('preview') === '1';
  const laneOverride = IS_DEV ? (searchParams.get('lane') as ProjectRole | null) : null;

  const [role, setRole] = useState<ProjectRole | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    // Preview bypass and lane override skip role resolution entirely.
    if (devPreview || laneOverride) {
      setResolved(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) {
          if (!cancelled) { setRole(null); setResolved(true); }
          return;
        }
        const { data, error } = await supabase
          .from('project_members')
          .select('project_role')
          .eq('project_id', projectId)
          .eq('user_id', userId);
        if (cancelled) return;
        if (error) {
          setRole(null);
        } else {
          const roles = (data ?? [])
            .map((r) => r.project_role as ProjectRole | null)
            .filter((r): r is ProjectRole => !!r);
          setRole(pickHighestRole(roles));
        }
      } finally {
        if (!cancelled) setResolved(true);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId, devPreview, laneOverride]);

  if (devPreview) {
    return <OwnerHomeClient projectId={projectId} preview />;
  }

  const effective = laneOverride ?? role;

  if (!resolved) {
    return (
      <div style={{ padding: 48, fontFamily: 'var(--font-editorial)', fontStyle: 'italic', color: 'var(--ink-faded)', background: 'var(--paper-cream)', minHeight: '60vh' }}>
        Loading your build…
      </div>
    );
  }

  if (effective === 'owner') {
    return <OwnerHomeClient projectId={projectId} />;
  }
  if (effective === 'gc' || effective === null) {
    // GC is the safe default for the current trial audience (mirrors
    // useUserLane's `gc` fallback). The existing GC home is untouched.
    return <ProjectDashboardClient projectId={projectId} />;
  }
  return <LanePlaceholder role={effective} />;
}
