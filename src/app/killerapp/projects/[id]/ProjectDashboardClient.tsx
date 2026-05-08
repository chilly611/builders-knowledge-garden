'use client';

/**
 * Project Dashboard Client
 * ========================
 *
 * Renders a populated project dashboard for a given projectId.
 * For demo-project, loads realistic mid-flight data and displays it
 * via the ProjectCompass component.
 *
 * Future: will integrate with real API endpoints for live projects.
 */

import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import ProjectCompass from '@/components/ProjectCompass';
import { LIFECYCLE_STAGES } from '@/lib/lifecycle-stages';
import { getDemoProject } from '@/lib/demo-seeder';

interface ProjectDashboardClientProps {
  projectId: string;
}

export default function ProjectDashboardClient({
  projectId,
}: ProjectDashboardClientProps) {
  const demoProject = useMemo(() => {
    if (projectId === 'demo-project') {
      try {
        return getDemoProject();
      } catch (err) {
        console.error('[ProjectDashboard] Failed to load demo data:', err);
        return null;
      }
    }
    return null;
  }, [projectId]);

  if (!demoProject) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--graphite)' }}>
          Project not found
        </div>
      </div>
    );
  }

  return (
    <ProjectCompass
      stages={LIFECYCLE_STAGES}
      currentStageId={demoProject.currentStage}
      progressByStage={{
        1: { worked: 4, done: 4, needsAttention: 0, total: 4 },
        2: { worked: 3, done: 3, needsAttention: 0, total: 3 },
        3: { worked: 5, done: 5, needsAttention: 0, total: 5 },
        4: { worked: 8, done: 5, needsAttention: 1, total: 13 },
        5: { worked: 0, done: 0, needsAttention: 0, total: 8 },
        6: { worked: 0, done: 0, needsAttention: 0, total: 6 },
        7: { worked: 0, done: 0, needsAttention: 0, total: 5 },
      }}
      visitedStageIds={[1, 2, 3, 4]}
      projectId={projectId}
      demoProject={demoProject}
      onCloseOutClick={() => {
        // 2026-05-08: was a no-op stub. Now navigates to the close-out
        // sub-route (already exists at /killerapp/projects/[id]/close-out).
        if (typeof window !== 'undefined') {
          window.location.href = `/killerapp/projects/${encodeURIComponent(projectId)}/close-out`;
        }
      }}
    />
  );
}
