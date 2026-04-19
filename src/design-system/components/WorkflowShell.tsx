'use client';

/**
 * WorkflowShell
 * =============
 * Reusable chrome for every wired workflow route.
 *
 * Extracted from the Week 2 code-compliance route so that the 15 Week 3
 * workflows don't each re-implement:
 *   - JourneyMapHeader mount
 *   - Breadcrumb + Pro Toggle row
 *   - Trade + Lane context chooser
 *   - WorkflowRenderer wiring + Time Machine event bus
 *   - "N actions recorded" footer
 *
 * Per `docs/week3-spine-spec.md` §1 every new workflow becomes:
 *
 *   <WorkflowShell
 *     workflow={...}
 *     stages={...}
 *     breadcrumbLabel="..."
 *     topPanel={<MyPanel />}          // optional, workflow-specific picker
 *     contextFields={['trade','lane']} // optional, default ['trade','lane']
 *     onStepComplete={...}             // optional, workflow hook
 *   />
 *
 * The shell owns: Pro Toggle state, context chooser state, event counter,
 * journey-progress event emission. Workflow-specific state lives in the
 * client component that wraps this shell (estimating panel, forecast
 * picker, receipt uploader, etc).
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import WorkflowRenderer from './WorkflowRenderer';
import type { Workflow, WorkflowContext } from './WorkflowRenderer.types';
import type { StepResult } from './StepCard.types';
import JourneyMapHeader, { type LifecycleStage } from '@/components/JourneyMapHeader';
import { colors, fonts, fontSizes, fontWeights, spacing, radii } from '@/design-system/tokens';
import { emitJourneyEvent, resolveProjectId } from '@/lib/journey-progress';

const TRADES = [
  { id: 'general', label: 'General / GC' },
  { id: 'structural', label: 'Structural' },
  { id: 'electrical', label: 'Electrical' },
  { id: 'plumbing', label: 'Plumbing' },
  { id: 'mechanical', label: 'Mechanical' },
  { id: 'landscape', label: 'Landscape / Hardscape' },
] as const;

const LANES: { id: NonNullable<WorkflowContext['lane']>; label: string }[] = [
  { id: 'gc', label: 'General Contractor' },
  { id: 'diy', label: 'DIY / Owner-Builder' },
  { id: 'specialty', label: 'Specialty Trade' },
  { id: 'worker', label: 'Crew / Field' },
  { id: 'supplier', label: 'Supplier' },
  { id: 'equipment', label: 'Equipment Fleet' },
  { id: 'service', label: 'Service Provider' },
  { id: 'agent', label: 'Agent / Broker' },
];

export type ContextField = 'trade' | 'lane';

export interface WorkflowShellProps {
  workflow: Workflow;
  stages: LifecycleStage[];
  /** Shown as the last breadcrumb segment and on the journey map header. */
  breadcrumbLabel: string;
  /** Which context fields render in the standard chooser. Default: both. */
  contextFields?: ContextField[];
  /** Initial values for Trade / Lane / other context. */
  defaultContext?: Partial<WorkflowContext>;
  /** Optional workflow-specific panel rendered above the step list. */
  topPanel?: ReactNode;
  /** Optional side-panel rendered beside WorkflowRenderer on wide screens. */
  sidePanel?: ReactNode;
  /** Hook fired after every step completion event. */
  onStepComplete?: (result: StepResult & { workflowId: string }) => void;
  /** Override project id lookup. Falls back to localStorage `bkg-active-project`. */
  projectId?: string;
  /** Tag the <main> with a surface id so the Global AI FAB knows where it is. */
  surfaceId?: string;
}

export default function WorkflowShell({
  workflow,
  stages,
  breadcrumbLabel,
  contextFields = ['trade', 'lane'],
  defaultContext,
  topPanel,
  sidePanel,
  onStepComplete,
  projectId: projectIdProp,
  surfaceId,
}: WorkflowShellProps) {
  const [trade, setTrade] = useState<string>(defaultContext?.trade ?? 'general');
  const [lane, setLane] = useState<WorkflowContext['lane']>(
    defaultContext?.lane ?? 'gc'
  );
  const [proMode, setProMode] = useState(false);
  const [eventCount, setEventCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  // Resolve the active project id exactly once on mount. Journey events
  // without a project id use the literal "default" so anonymous / no-project
  // users still leave a lightweight local trail.
  const [projectId, setProjectId] = useState<string>('default');
  useEffect(() => {
    setProjectId(projectIdProp ?? resolveProjectId());
  }, [projectIdProp]);

  const context: WorkflowContext = useMemo(
    () => ({
      trade,
      lane,
      projectPhase: defaultContext?.projectPhase ?? 'preconstruction',
      jurisdiction: defaultContext?.jurisdiction,
      extra: defaultContext?.extra,
    }),
    [trade, lane, defaultContext?.projectPhase, defaultContext?.jurisdiction, defaultContext?.extra]
  );

  const handleEvent = useCallback(
    (event: StepResult & { workflowId: string }) => {
      setEventCount((n) => n + 1);

      // Legacy event bus — preserve for anything still listening.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('bkg:workflow:event', { detail: event })
        );
      }

      // Journey progress emission — first meaningful event = started.
      if (!hasStarted) {
        setHasStarted(true);
        emitJourneyEvent({
          type: 'started',
          workflowId: workflow.id,
          projectId,
        });
      }

      if (event.type === 'step_completed') {
        const stepIndex = workflow.steps.findIndex((s) => s.id === event.stepId);
        emitJourneyEvent({
          type: 'step_completed',
          workflowId: workflow.id,
          projectId,
          stepId: event.stepId,
          stepIndex: stepIndex < 0 ? 0 : stepIndex,
          totalSteps: workflow.steps.length,
        });
      }

      onStepComplete?.(event);
    },
    [hasStarted, onStepComplete, projectId, workflow.id, workflow.steps]
  );

  const showContextChooser = contextFields.length > 0;

  return (
    <>
      <JourneyMapHeader
        stages={stages}
        currentStageId={workflow.stageId ?? 1}
        workflowLabel={workflow.label}
      />
      <main
        data-bkg-surface={surfaceId ?? `workflow-${workflow.id}`}
        style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: `${spacing[8]} ${spacing[4]}`,
          fontFamily: fonts.body,
        }}
      >
        {/* Breadcrumb + Pro Toggle */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing[6],
            flexWrap: 'wrap',
            gap: spacing[3],
          }}
        >
          <nav style={{ fontSize: fontSizes.sm, color: colors.ink[500] }}>
            <Link
              href="/killerapp"
              style={{ color: colors.ink[500], textDecoration: 'none' }}
            >
              Killer App
            </Link>
            <span style={{ margin: `0 ${spacing[2]}` }}>/</span>
            <span>Workflows</span>
            <span style={{ margin: `0 ${spacing[2]}` }}>/</span>
            <span
              style={{
                color: colors.ink[900],
                fontWeight: fontWeights.medium,
              }}
            >
              {breadcrumbLabel}
            </span>
          </nav>

          <button
            type="button"
            onClick={() => setProMode((p) => !p)}
            aria-pressed={proMode}
            style={{
              padding: `${spacing[2]} ${spacing[3]}`,
              fontSize: fontSizes.xs,
              fontWeight: fontWeights.semibold,
              fontFamily: fonts.mono,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              border: `1px solid ${proMode ? '#1D9E75' : colors.ink[200]}`,
              backgroundColor: proMode ? '#1D9E75' : 'transparent',
              color: proMode ? '#FFFFFF' : colors.ink[700],
              borderRadius: radii.full,
              cursor: 'pointer',
              transition: '150ms ease',
            }}
          >
            {proMode ? 'Pro: On' : 'Pro: Off'}
          </button>
        </div>

        {/* Optional workflow-specific panel above the step list */}
        {topPanel && (
          <section
            aria-label="Workflow setup"
            style={{ marginBottom: spacing[6] }}
          >
            {topPanel}
          </section>
        )}

        {/* Standard 3-way context chooser */}
        {showContextChooser && (
          <section
            aria-label="Workflow context"
            style={{
              display: 'grid',
              gridTemplateColumns:
                contextFields.length === 1
                  ? '1fr'
                  : 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: spacing[3],
              padding: spacing[4],
              marginBottom: spacing[6],
              backgroundColor: colors.ink[50],
              borderRadius: radii.md,
              border: `1px solid ${colors.ink[100]}`,
            }}
          >
            {contextFields.includes('trade') && (
              <LabeledSelect
                label="Trade"
                value={trade}
                onChange={setTrade}
                options={TRADES.map((t) => ({ value: t.id, label: t.label }))}
              />
            )}
            {contextFields.includes('lane') && (
              <LabeledSelect
                label="Lane"
                value={lane ?? 'gc'}
                onChange={(v) => setLane(v as WorkflowContext['lane'])}
                options={LANES.map((l) => ({ value: l.id, label: l.label }))}
              />
            )}
          </section>
        )}

        {/* Renderer + optional side panel */}
        <div
          style={{
            display: sidePanel ? 'grid' : 'block',
            gridTemplateColumns: sidePanel ? 'minmax(0, 1fr) 280px' : undefined,
            gap: spacing[6],
          }}
        >
          <WorkflowRenderer
            workflow={workflow}
            context={context}
            onEvent={handleEvent}
            proMode={proMode}
          />
          {sidePanel && <aside>{sidePanel}</aside>}
        </div>

        {/* Event footer */}
        <footer
          style={{
            marginTop: spacing[8],
            padding: spacing[4],
            fontSize: fontSizes.xs,
            color: colors.ink[400],
            fontFamily: fonts.mono,
            textAlign: 'center',
          }}
        >
          {eventCount} action{eventCount === 1 ? '' : 's'} recorded · Time
          Machine replay available
        </footer>
      </main>
    </>
  );
}

// ─── Internal helpers ──────────────────────────────────────────────────────

interface LabeledSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}

function LabeledSelect({ label, value, onChange, options }: LabeledSelectProps) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
      <span
        style={{
          fontSize: fontSizes.xs,
          fontWeight: fontWeights.semibold,
          color: colors.ink[500],
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: spacing[2],
          fontSize: fontSizes.sm,
          fontFamily: fonts.body,
          border: `1px solid ${colors.ink[200]}`,
          borderRadius: radii.sm,
          backgroundColor: '#FFFFFF',
          color: colors.ink[900],
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
