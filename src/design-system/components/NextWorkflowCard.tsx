'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LIFECYCLE_STAGES, STAGE_WORKFLOWS, WORKFLOW_TO_STAGE } from '@/lib/lifecycle-stages';
import { colors, fonts, fontSizes, fontWeights, spacing, radii } from '../tokens';
import { stageAccent } from '../tokens/stage-accents';

// Map workflow id → live URL path. Mirrors LIVE_WORKFLOWS from
// src/app/killerapp/page.tsx — kept inline here so this primitive
// doesn't depend on the page module's internals.
// Workflows not in this map have no live route yet ("coming soon").
const LIVE_WORKFLOW_PATHS: Record<string, string> = {
  q2: '/killerapp/workflows/estimating',
  q4: '/killerapp/workflows/contract-templates',
  q5: '/killerapp/workflows/code-compliance',
  q6: '/killerapp/workflows/job-sequencing',
  q7: '/killerapp/workflows/worker-count',
  q8: '/killerapp/workflows/permit-applications',
  q9: '/killerapp/workflows/sub-management',
  q10: '/killerapp/workflows/equipment',
  q11: '/killerapp/workflows/supply-ordering',
  q12: '/killerapp/workflows/services-todos',
  q13: '/killerapp/workflows/hiring',
  q14: '/killerapp/workflows/weather-scheduling',
  q15: '/killerapp/workflows/daily-log',
  q16: '/killerapp/workflows/osha-toolbox',
  q17: '/killerapp/workflows/expenses',
  q18: '/killerapp/workflows/outreach',
  q19: '/killerapp/workflows/compass-nav',
};

/**
 * NextWorkflowCard — Stage-exit card with 3 next-step options
 * ============================================================
 *
 * Renders at the bottom of a workflow showing:
 * - Headline acknowledging completion or progress
 * - Primary CTA: Continue to next workflow in stage, or move to next stage
 * - Secondary CTA: Jump to a different stage (grid picker)
 * - Tertiary CTA: Ask AI what to do next
 *
 * Accepts workflow IDs and stage IDs to determine which stage/workflow comes next.
 * Uses stage-accent tinted border and Trace background.
 */

export interface NextWorkflowCardProps {
  currentWorkflowId: string;
  currentStageId: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  stepsComplete?: boolean;
  className?: string;
}

// Map q-IDs to workflow labels for display
const WORKFLOW_LABELS: Record<string, string> = {
  q1: 'Should you take this bid?',
  q2: 'Estimating',
  q3: 'Budget baseline',
  q4: 'Contract Templates',
  q5: 'Code Compliance',
  q6: 'Job Sequencing',
  q7: 'Worker Count',
  q8: 'Permit Applications',
  q9: 'Sub-Management',
  q10: 'Equipment',
  q11: 'Supply Ordering',
  q12: 'Services & Todos',
  q13: 'Hiring',
  q14: 'Weather Scheduling',
  q15: 'Daily Log',
  q16: 'OSHA Toolbox',
  q17: 'Expenses',
  q18: 'Outreach',
  q19: 'Compass Nav',
  q20: 'Adapt (TBD)',
  q21: 'Collect (TBD)',
  q22: 'Collect (TBD)',
  q23: 'Collect (TBD)',
  q24: 'Collect (TBD)',
  q25: 'Reflect (TBD)',
  q26: 'Reflect (TBD)',
  q27: 'Reflect (TBD)',
};

export default function NextWorkflowCard({
  currentWorkflowId,
  currentStageId,
  stepsComplete = false,
  className = '',
}: NextWorkflowCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');
  const [showStagePicker, setShowStagePicker] = useState(false);
  const accent = stageAccent(currentStageId);
  const currentWorkflowLabel = WORKFLOW_LABELS[currentWorkflowId] || 'This workflow';
  const currentStageName = LIFECYCLE_STAGES.find((s) => s.id === currentStageId)?.name || 'the current stage';

  // Determine next workflow in current stage
  const currentStageWorkflows = STAGE_WORKFLOWS[currentStageId] || [];
  const currentIndex = currentStageWorkflows.indexOf(currentWorkflowId);
  const isLastInStage = currentIndex === -1 || currentIndex === currentStageWorkflows.length - 1;

  let nextCTALabel = 'Continue to next workflow';
  let nextStageId: number | null = null;
  let nextWorkflowId: string | null = null;

  if (isLastInStage) {
    // Move to next stage
    nextStageId = currentStageId < 7 ? currentStageId + 1 : null;
    if (nextStageId) {
      const nextStageName = LIFECYCLE_STAGES.find((s) => s.id === nextStageId)?.name || `Stage ${nextStageId}`;
      const nextStageWorkflows = STAGE_WORKFLOWS[nextStageId] || [];
      nextWorkflowId = nextStageWorkflows[0] ?? null;
      const nextWorkflowLabel = nextWorkflowId
        ? WORKFLOW_LABELS[nextWorkflowId] || 'next workflow'
        : 'next workflow';
      nextCTALabel = `Move to ${nextStageName}: ${nextWorkflowLabel}`;
    } else {
      nextCTALabel = 'You\'ve completed the journey';
    }
  } else {
    // Continue within stage
    nextWorkflowId = currentStageWorkflows[currentIndex + 1];
    const nextLabel = WORKFLOW_LABELS[nextWorkflowId] || 'next workflow';
    nextCTALabel = `Continue to ${nextLabel}`;
  }

  // Compute the actual destination URL for the primary CTA.
  // Preserves ?project=<id> so the project context follows the user.
  // Falls back to /killerapp if the next workflow has no live route yet.
  const nextLivePath = nextWorkflowId
    ? LIVE_WORKFLOW_PATHS[nextWorkflowId]
    : undefined;
  const nextHref = nextLivePath
    ? projectId
      ? `${nextLivePath}?project=${encodeURIComponent(projectId)}`
      : nextLivePath
    : projectId
      ? `/killerapp?project=${encodeURIComponent(projectId)}`
      : '/killerapp';
  const isComingSoon = nextWorkflowId && !nextLivePath;
  const handlePrimaryCTA = () => {
    router.push(nextHref);
  };

  const handleAIFab = () => {
    if (typeof window !== 'undefined') {
      // Pre-fill the AI fab with a contextual question so the user
      // doesn't land on an empty input. GlobalAiFab listens for this
      // event's detail.prompt and seeds its textarea.
      const prompt = `I'm working on ${currentWorkflowLabel}. What's the most useful next step here?`;
      window.dispatchEvent(
        new CustomEvent('bkg:ai-fab:open', { detail: { prompt } })
      );
    }
  };

  const handleStageSelect = (selectedStageId: number) => {
    setShowStagePicker(false);
    const workflows = STAGE_WORKFLOWS[selectedStageId] || [];
    const firstId = workflows[0];
    const livePath = firstId ? LIVE_WORKFLOW_PATHS[firstId] : undefined;
    // Land on the first live workflow in the chosen stage; fall back to
    // /killerapp if nothing in that stage is wired up yet. Preserve
    // ?project=<id> so the project context follows.
    const target = livePath
      ? projectId
        ? `${livePath}?project=${encodeURIComponent(projectId)}`
        : livePath
      : projectId
        ? `/killerapp?project=${encodeURIComponent(projectId)}`
        : '/killerapp';
    router.push(target);
  };

  return (
    <div className={className}>
      <div
        style={{
          borderTop: `2px solid ${accent.hex}`,
          backgroundColor: colors.trace,
          borderRadius: radii.md,
          padding: spacing[6],
          marginTop: spacing[8],
        }}
      >
        {/* Headline */}
        <h2
          style={{
            fontFamily: fonts.heading,
            fontSize: fontSizes.xl,
            fontWeight: fontWeights.bold,
            color: colors.navy,
            margin: `0 0 ${spacing[6]} 0`,
          }}
        >
          {stepsComplete
            ? `Nice. That's ${currentStageName} in the books.`
            : `Making progress on ${currentStageName}.`}
        </h2>

        {/* Button group */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: spacing[3],
          }}
        >
          {/* Primary CTA */}
          <button
            onClick={handlePrimaryCTA}
            style={{
              backgroundColor: colors.brass,
              color: 'white',
              fontFamily: fonts.body,
              fontSize: fontSizes.md,
              fontWeight: fontWeights.semibold,
              padding: `${spacing[3]} ${spacing[4]}`,
              borderRadius: radii.md,
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
              opacity: isComingSoon ? 0.65 : 1,
            }}
            title={isComingSoon ? `${nextCTALabel} — coming soon (returning to summary)` : undefined}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#9E6F2F';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = colors.brass;
            }}
          >
            {nextCTALabel}
          </button>

          {/* Secondary CTA - Stage Picker Toggle */}
          <button
            onClick={() => setShowStagePicker(!showStagePicker)}
            style={{
              backgroundColor: 'transparent',
              border: `1px solid ${colors.fadedRule}`,
              color: colors.graphite,
              fontFamily: fonts.body,
              fontSize: fontSizes.md,
              fontWeight: fontWeights.semibold,
              padding: `${spacing[3]} ${spacing[4]}`,
              borderRadius: radii.md,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = colors.graphite;
              (e.currentTarget as HTMLElement).style.color = colors.navy;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = colors.fadedRule;
              (e.currentTarget as HTMLElement).style.color = colors.graphite;
            }}
          >
            Jump to a different stage
          </button>

          {/* Tertiary CTA - AI Fab */}
          <button
            onClick={handleAIFab}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: colors.graphite,
              fontFamily: fonts.body,
              fontSize: fontSizes.md,
              textDecoration: 'underline',
              padding: `${spacing[2]} ${spacing[1]}`,
              cursor: 'pointer',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = colors.navy;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = colors.graphite;
            }}
          >
            Ask the AI what to do next
          </button>
        </div>

        {/* Stage Picker Modal - 2-row grid of 7 stages */}
        {showStagePicker && (
          <div
            style={{
              marginTop: spacing[6],
              padding: spacing[4],
              backgroundColor: colors.trace,
              border: `1px solid ${colors.fadedRule}`,
              borderRadius: radii.md,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: spacing[3],
              }}
            >
              {LIFECYCLE_STAGES.map((stage) => {
                const isCurrentStage = stage.id === currentStageId;
                const stageAccentColor = stageAccent(stage.id as 1 | 2 | 3 | 4 | 5 | 6 | 7);
                return (
                  <button
                    key={stage.id}
                    onClick={() => handleStageSelect(stage.id)}
                    disabled={isCurrentStage}
                    style={{
                      backgroundColor: isCurrentStage ? colors.fadedRule : 'white',
                      border: `2px solid ${stageAccentColor.hex}`,
                      color: colors.navy,
                      fontFamily: fonts.body,
                      fontSize: fontSizes.sm,
                      fontWeight: fontWeights.semibold,
                      padding: `${spacing[3]} ${spacing[2]}`,
                      borderRadius: radii.md,
                      cursor: isCurrentStage ? 'default' : 'pointer',
                      opacity: isCurrentStage ? 0.6 : 1,
                      transition: 'all 0.2s ease',
                      textAlign: 'center',
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrentStage) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = '#F0EBE0';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCurrentStage) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'white';
                      }
                    }}
                  >
                    <div style={{ marginBottom: spacing[1] }}>{stage.emoji}</div>
                    <div>{stage.name}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
