'use client';

/**
 * ProjectCompass
 * ==============
 *
 * Typographic master dashboard for the master builder. Composes sub-components:
 *   - HeroBand: Large project name + address + compact stat
 *   - JourneyPills: 7-stage horizontal engraved-plate row
 *   - BudgetRiver: Horizontal stacked bar + category breakdown
 *   - OpenItems: Typographic numbered list
 *   - RecentActivity: Timeline view
 *   - Team: 4-row mini cards
 *   - CloseOutCTA: Deep Orange CTA when stage 7 = 100%
 *
 * Consumes demo data from demo-seeder for demo-project.
 */

import type { CSSProperties } from 'react';
import type { StageProgress } from '@/lib/journey-progress';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type { PaymentPool, ProfitSignal } from '@/lib/project-compass-data';
import HeroBand from './compass/HeroBand';
import JourneyPills from './compass/JourneyPills';
import BudgetRiver from './compass/BudgetRiver';
import OpenItems from './compass/OpenItems';
import RecentActivity from './compass/RecentActivity';
import Team from './compass/Team';
import CloseOutCTA from './compass/CloseOutCTA';
import ProjectCompassSVG from './compass/ProjectCompassSVG';

export interface ProjectCompassProps {
  stages: LifecycleStage[];
  currentStageId: number | null;
  progressByStage: Record<number, StageProgress>;
  visitedStageIds: number[];
  projectId?: string;
  onCloseOutClick?: (projectId: string) => void;
  // Legacy SVG compass props (for GlobalJourneyMapHeader)
  stagePayments?: Record<string, any>;
  profitSignal?: string;
  isDemo?: boolean;
  onDemoCtaClick?: () => void;
  // New typographic dashboard props (for demo-project route)
  demoProject?: {
    name: string;
    address: string;
    budget: {
      approved: number;
      spent: number;
      committed: number;
      byCategory: Record<string, { budgeted: number; spent: number }>;
    };
    team: Array<{
      name: string;
      role: string;
      trade: string;
      verified: boolean;
    }>;
    recentActivity: Array<{
      ts: string;
      summary: string;
      source: string;
    }>;
    openItems: Array<{
      priority: 'high' | 'med' | 'low';
      label: string;
      dueBy?: string;
    }>;
    stageProgress: Record<string | number, number>;
  };
}

export default function ProjectCompass({
  stages,
  currentStageId,
  progressByStage,
  visitedStageIds,
  projectId,
  onCloseOutClick,
  stagePayments,
  profitSignal,
  isDemo,
  onDemoCtaClick,
  demoProject,
}: ProjectCompassProps) {
  // If SVG props are provided (legacy for GlobalJourneyMapHeader), use SVG version
  if (stagePayments && profitSignal) {
    return (
      <ProjectCompassSVG
        stages={stages}
        currentStageId={currentStageId}
        progressByStage={progressByStage}
        visitedStageIds={visitedStageIds}
        stagePayments={stagePayments as Record<number, PaymentPool>}
        profitSignal={profitSignal as ProfitSignal}
        isDemo={isDemo}
        onDemoCtaClick={onDemoCtaClick}
        projectId={projectId}
        onCloseOutClick={onCloseOutClick}
      />
    );
  }

  // If demoProject is provided, use new typographic dashboard
  if (!demoProject) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--graphite)' }}>
        No project data available.
      </div>
    );
  }

  const sorted = [...stages].sort((a, b) => a.id - b.id);
  const currentStage = currentStageId
    ? sorted.find((s) => s.id === currentStageId)
    : undefined;

  // Calculate stats
  const totalBudget = demoProject.budget.approved;
  const totalSpent = demoProject.budget.spent;
  const totalCommitted = demoProject.budget.committed;
  const remaining = totalBudget - totalCommitted;
  const percentageThrough = (totalSpent / totalBudget) * 100;

  // Get stage 7 progress for close-out CTA
  const stage7Progress = demoProject.stageProgress[7] ?? 0;

  // Map budget categories
  const budgetCategories = Object.entries(demoProject.budget.byCategory).map(
    ([key, data]) => ({
      label: key
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
      spent: data.spent,
      budgeted: data.budgeted,
    })
  );

  const containerStyle: CSSProperties = {
    backgroundColor: 'var(--trace)',
    minHeight: '100vh',
    paddingBottom: '32px',
  };

  return (
    <div style={containerStyle}>
      <HeroBand
        projectName={demoProject.name}
        projectAddress={demoProject.address}
        percentageThrough={percentageThrough}
        currentStageId={currentStageId ?? 1}
        currentStageName={currentStage?.name ?? 'Unknown'}
        remainingBudget={remaining}
      />

      <JourneyPills
        stages={stages}
        currentStageId={currentStageId}
        progressByStage={progressByStage}
      />

      <BudgetRiver
        totalBudget={totalBudget}
        totalSpent={totalSpent}
        totalCommitted={totalCommitted}
        categories={budgetCategories}
      />

      <OpenItems items={demoProject.openItems} />

      <RecentActivity activities={demoProject.recentActivity} />

      <Team members={demoProject.team} />

      {projectId && (
        <CloseOutCTA
          projectId={projectId}
          stage7Progress={stage7Progress}
          onCloseOutClick={onCloseOutClick}
        />
      )}
    </div>
  );
}
