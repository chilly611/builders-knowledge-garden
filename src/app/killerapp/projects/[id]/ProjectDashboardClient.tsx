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
import {
  deriveCompassData,
  type BudgetApiSummary,
} from '@/lib/project-compass-data';

interface ProjectDashboardClientProps {
  projectId: string;
}

// Import demo seeder on the client side via dynamic import fallback
async function loadDemoData(projectId: string) {
  if (projectId === 'demo-project') {
    try {
      // Dynamic import to load the seeder from the client
      // (normally would use useEffect to hydrate)
      const module = await import('@/lib/demo-seeder');
      return {
        isDemo: true,
        project: module.getDemoProject(),
        budgetSummary: module.getDemoProjectBudgetApiSummary(),
      };
    } catch (err) {
      console.error('[ProjectDashboard] Failed to load demo data:', err);
      return null;
    }
  }
  return null;
}

export default function ProjectDashboardClient({
  projectId,
}: ProjectDashboardClientProps) {
  // For demo-project, we'll render a static compassData derived from demo budget
  // In a real scenario, this would fetch from /api/v1/budget?project_id=...

  const compassData = useMemo(() => {
    // This is a placeholder that will be populated by the real implementation
    // For now, render with demo compass data if this is the demo project
    if (projectId === 'demo-project') {
      // Mock budget summary based on demo project structure
      const mockSummary: BudgetApiSummary = {
        totalBudget: 340000,
        totalSpent: 187400,
        actualExpenses: 187400,
        clientPaymentsReceived: 170000, // 50% of budget
        plAfterPayments: 170000 - 187400, // -$17,400 mid-flight (normal)
        percentUsed: (187400 / 340000) * 100,
        byPhase: {
          DREAM: { spent: 8500, estimated: 0, count: 1 },
          DESIGN: { spent: 0, estimated: 0, count: 0 },
          PLAN: { spent: 33150, estimated: 900, count: 1 },
          BUILD: {
            spent: 132600,
            estimated: 61850,
            count: 5,
          },
          DELIVER: { spent: 4200, estimated: 63800, count: 1 },
          GROW: { spent: 9050, estimated: 40150, count: 1 },
        },
      };
      return deriveCompassData(mockSummary);
    }
    // Fallback to unknown/empty state
    return {
      isDemo: true,
      stagePayments: {},
      profitSignal: 'unknown' as const,
      totalSpent: 0,
      totalReceived: 0,
      totalBudget: 0,
    };
  }, [projectId]);

  const wrapperStyle: CSSProperties = {
    padding: '24px 16px',
    maxWidth: 1200,
    margin: '0 auto',
  };

  const titleStyle: CSSProperties = {
    fontSize: 24,
    fontWeight: 600,
    marginBottom: 8,
    color: '#1F2937',
  };

  const subtitleStyle: CSSProperties = {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  };

  return (
    <div style={wrapperStyle}>
      <div style={titleStyle}>Project Dashboard</div>
      <div style={subtitleStyle}>
        {projectId === 'demo-project'
          ? 'Willow Creek ADU — Demo Project'
          : `Project: ${projectId}`}
      </div>

      <ProjectCompass
        stages={LIFECYCLE_STAGES}
        currentStageId={projectId === 'demo-project' ? 4 : null}
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
        stagePayments={compassData.stagePayments}
        profitSignal={compassData.profitSignal}
        isDemo={compassData.isDemo}
        projectId={projectId}
        onDemoCtaClick={() => {
          // Navigate to compass-nav to set up a real project
        }}
      />

      {projectId === 'demo-project' && (
        <div
          style={{
            marginTop: 32,
            padding: 16,
            backgroundColor: '#FEF3C7',
            borderLeft: '4px solid #F59E0B',
            borderRadius: 4,
          }}
        >
          <div style={{ fontWeight: 600, color: '#92400E', marginBottom: 8 }}>
            Demo Project
          </div>
          <div style={{ fontSize: 14, color: '#78350F', lineHeight: 1.5 }}>
            This is the Willow Creek ADU demo project. It shows a realistic
            mid-flight residential build: 1,800 sqft ADU in Napa, $340k budget,
            Stage 4 (Build) at 62% complete. Use this to explore the Compass
            visualization and understand your project's journey.
          </div>
        </div>
      )}
    </div>
  );
}
