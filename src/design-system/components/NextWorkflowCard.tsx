'use client';

import { useState } from 'react';
import { LIFECYCLE_STAGES, STAGE_WORKFLOWS, WORKFLOW_TO_STAGE } from '@/lib/lifecycle-stages';
import { colors, fonts, fontSizes, fontWeights, spacing, radii } from '../tokens';
import { stageAccent } from '../tokens/stage-accents';

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

  if (isLastInStage) {
    // Move to next stage
    nextStageId = currentStageId < 7 ? currentStageId + 1 : null;
    if (nextStageId) {
      const nextStageName = LIFECYCLE_STAGES.find((s) => s.id === nextStageId)?.name || `Stage ${nextStageId}`;
      const nextStageWorkflows = STAGE_WORKFLOWS[nextStageId] || [];
      const nextWorkflowLabel = nextStageWorkflows.length > 0
        ? WORKFLOW_LABELS[nextStageWorkflows[0]] || 'next workflow'
        : 'next workflow';
      nextCTALabel = `Move to ${nextStageName}: ${nextWorkflowLabel}`;
    } else {
      nextCTALabel = 'You\'ve completed the journey';
    }
  } else {
    // Continue within stage
    const nextWorkflowId = currentStageWorkflows[currentIndex + 1];
    const nextLabel = WORKFLOW_LABELS[nextWorkflowId] || 'next workflow';
    nextCTALabel = `Continue to ${nextLabel}`;
  }

  const handleAIFab = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bkg:ai-fab:open'));
    }
  };

  const handleStageSelect = (selectedStageId: number) => {
    setShowStagePicker(false);
    // Navigate to first workflow in selected stage
    const workflows = STAGE_WORKFLOWS[selectedStageId] || [];
    if (workflows.length > 0) {
      // TODO: Navigate to /killerapp/workflows/${workflows[0]}
      console.log(`Navigate to stage ${selectedStageId}, workflow ${workflows[0]}`);
    }
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
            onClick={() => {
              // TODO: Navigate using next workflow/stage
              console.log('Navigate to next workflow');
            }}
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
            }}
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
