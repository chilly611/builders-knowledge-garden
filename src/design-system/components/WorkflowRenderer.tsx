'use client';

/**
 * WorkflowRenderer Primitive
 * ===========================
 * Consumes a Workflow (from workflows.json) and renders a sequence of StepCards.
 * Wires analysis_result steps to the live specialist runner via AnalysisPane.
 *
 * Constitution bindings:
 * - Goal 5 (fearless navigation): every step emits replayable events via onEvent
 * - Goal 8 (machine-legible): hidden <script type="application/json" data-bkg-workflow>
 *   exposes the full workflow + progress to MCP consumers
 * - Decision #12 (status colors): in_progress orange, complete teal
 *
 * Integration points:
 * - StepCard: one per workflow.steps
 * - AnalysisPane: wired via renderAnalysis callback for analysis_result type
 */

import React, { useCallback, useMemo, useState } from 'react';
import StepCard from './StepCard';
import AnalysisPane from './AnalysisPane';
import type { StepStatus, StepResult, WorkflowStep } from './StepCard.types';
import type { Workflow, WorkflowRendererProps, WorkflowContext } from './WorkflowRenderer.types';
import { colors, fonts, fontSizes, fontWeights, spacing, radii } from '../tokens';

/**
 * Spread XP across steps evenly when step-level XP is not encoded.
 * Workflows.json only stores totalXp at the workflow level.
 */
function xpPerStep(workflow: Workflow): number {
  if (!workflow.totalXp || workflow.steps.length === 0) return 0;
  return Math.round(workflow.totalXp / workflow.steps.length);
}

/**
 * Map step types and IDs to step-specific CTA labels.
 * Follows foreman voice: concrete action verbs, no hedging.
 */
function getCtaLabelForStep(step: WorkflowStep): string {
  switch (step.type) {
    case 'text_input':
      // text_input on scope/code questions
      if (step.id?.includes('code') || step.label?.toLowerCase().includes('code')) {
        return 'Check code compliance';
      }
      return 'Save this';
    case 'voice_input':
      return 'Save this scope';
    case 'location_input':
      return 'Lock jurisdiction';
    case 'number_input':
      return 'Record it';
    case 'multi_select':
    case 'select':
      return 'Pick these';
    case 'checklist':
      return 'Record answers';
    case 'file_upload':
      return 'Upload files';
    case 'template_chooser':
      return 'Choose one';
    case 'analysis_result':
      // analysis_result steps don't show CTA (read-only)
      return '';
    default:
      return 'Next step';
  }
}

function buildContextForAnalysis(context: WorkflowContext | undefined) {
  if (!context) return undefined;
  return {
    jurisdiction: context.jurisdiction,
    trade: context.trade,
    lane: context.lane,
    project_phase: context.projectPhase,
    extra: context.extra,
  };
}

export default function WorkflowRenderer({
  workflow,
  context,
  statusMap: controlledStatusMap,
  expandedMap: controlledExpandedMap,
  onEvent,
  proMode = false,
  showHeader = true,
}: WorkflowRendererProps) {
  // Local uncontrolled state — used when parent doesn't pass controlled maps
  const [localStatus, setLocalStatus] = useState<Record<string, StepStatus>>({});
  const [localExpanded, setLocalExpanded] = useState<Record<string, boolean>>(() => {
    // First step expanded by default — gentle progressive reveal (primitive #7)
    if (workflow.steps.length === 0) return {};
    return { [workflow.steps[0].id]: true };
  });

  const statusMap = controlledStatusMap ?? localStatus;
  const expandedMap = controlledExpandedMap ?? localExpanded;

  const xpEach = useMemo(() => xpPerStep(workflow), [workflow]);
  const analysisContext = useMemo(() => buildContextForAnalysis(context), [context]);

  // Aggregate counts for the header
  const completeCount = workflow.steps.filter((s) => statusMap[s.id] === 'complete').length;

  const handleToggle = useCallback(
    (stepId: string) => {
      if (controlledExpandedMap) return; // parent is in charge
      setLocalExpanded((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
    },
    [controlledExpandedMap]
  );

  const handleStepEvent = useCallback(
    (event: StepResult) => {
      // Update local status based on event type
      if (!controlledStatusMap) {
        setLocalStatus((prev) => {
          switch (event.type) {
            case 'step_opened':
              // only bump to in_progress if not already complete
              if (prev[event.stepId] === 'complete') return prev;
              return { ...prev, [event.stepId]: 'in_progress' };
            case 'step_saved':
              return { ...prev, [event.stepId]: 'in_progress' };
            case 'step_completed':
              return { ...prev, [event.stepId]: 'complete' };
            case 'step_skipped':
              // leave pending; don't silently mark complete
              return prev;
            default:
              return prev;
          }
        });
      }
      onEvent?.({ ...event, workflowId: workflow.id });
    },
    [controlledStatusMap, onEvent, workflow.id]
  );

  const renderAnalysis = useCallback(
    (step: WorkflowStep, input: string) => {
      if (!step.promptId) return null;
      return (
        <AnalysisPane
          specialistId={step.promptId}
          input={input}
          context={analysisContext}
        />
      );
    },
    [analysisContext]
  );

  // Calculate progress percentage
  const progressPercent = workflow.steps.length > 0
    ? (completeCount / workflow.steps.length) * 100
    : 0;

  return (
    <div
      data-bkg-workflow-id={workflow.id}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[4],
        fontFamily: fonts.body,
      }}
    >
      {/* Progress bar — 2px graphite on faded-rule */}
      <div
        style={{
          width: '100%',
          height: '2px',
          backgroundColor: 'var(--faded-rule)',
          borderRadius: '1px',
          overflow: 'hidden',
          marginBottom: spacing[2],
        }}
      >
        <div
          style={{
            height: '100%',
            backgroundColor: 'var(--graphite)',
            width: `${progressPercent}%`,
            transition: 'width 300ms ease',
          }}
        />
      </div>
      {/* Header */}
      {showHeader && (
        <header
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: spacing[2],
            paddingBottom: spacing[4],
            borderBottom: `1px solid ${colors.ink[100]}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: spacing[3] }}>
            <h1
              style={{
                margin: 0,
                fontSize: fontSizes['2xl'],
                fontWeight: fontWeights.semibold,
                color: colors.ink[900],
                fontFamily: fonts.heading,
              }}
            >
              {workflow.label}
            </h1>
            <span
              style={{
                fontSize: fontSizes.xs,
                color: colors.ink[500],
                fontFamily: fonts.mono,
              }}
            >
              {workflow.id}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              gap: spacing[4],
              fontSize: fontSizes.sm,
              color: colors.ink[600],
            }}
          >
            <span>
              {completeCount} of {workflow.steps.length} complete
            </span>
            {workflow.totalXp ? (
              <span>{workflow.totalXp} XP available</span>
            ) : null}
            {context?.jurisdiction ? (
              <span style={{ color: colors.ink[700], fontWeight: fontWeights.medium }}>
                Jurisdiction: {context.jurisdiction}
              </span>
            ) : null}
          </div>
        </header>
      )}

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
        {workflow.steps.map((step, idx) => {
          const status = statusMap[step.id] ?? 'pending';
          const expanded = expandedMap[step.id] ?? false;
          // Determine step-specific CTA label
          const ctaLabel = getCtaLabelForStep(step);
          return (
            <StepCard
              key={step.id}
              step={step}
              status={status}
              stepNumber={idx + 1}
              totalSteps={workflow.steps.length}
              xpReward={xpEach}
              expanded={expanded}
              onToggleExpand={() => handleToggle(step.id)}
              onAction={handleStepEvent}
              renderAnalysis={renderAnalysis}
              proMode={proMode}
              ctaLabel={ctaLabel}
            />
          );
        })}
      </div>

      {/* Hidden machine-legible snapshot — Goal 8 */}
      <script
        type="application/json"
        data-bkg-workflow={workflow.id}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            workflowId: workflow.id,
            label: workflow.label,
            totalSteps: workflow.steps.length,
            completeCount,
            stepStatuses: Object.fromEntries(
              workflow.steps.map((s) => [s.id, statusMap[s.id] ?? 'pending'])
            ),
            context,
          }),
        }}
      />
    </div>
  );
}
