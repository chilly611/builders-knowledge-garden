'use client';

/**
 * CodeComplianceClient
 * =====================
 * Client Component for /killerapp/workflows/code-compliance.
 *
 * Owns:
 * - Jurisdiction selection (drives context injection for analysis_result steps)
 * - Trade + lane selection
 * - Pro Toggle state (visible top-right, Decision #1)
 * - Time Machine event log buffer
 *
 * Delegates rendering to <WorkflowRenderer>. Does NOT reimplement step logic.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { WorkflowRenderer } from '@/design-system/components';
import type { Workflow, WorkflowContext } from '@/design-system/components';
import type { StepResult } from '@/design-system/components';
import { colors, fonts, fontSizes, fontWeights, spacing, radii } from '@/design-system/tokens';
import { type LifecycleStage } from '@/components/JourneyMapHeader';
import { type Jurisdiction } from '@/lib/knowledge-data';
import JurisdictionPicker from '@/components/JurisdictionPicker';
import { useProjectWorkflowState, seedPayloadsFromRaw, statusFromSeeded } from '@/lib/hooks/useProjectWorkflowState';
import ProjectContextBanner from '../ProjectContextBanner';

interface CodeComplianceClientProps {
  workflow: Workflow;
  jurisdictions: Jurisdiction[];
  stages: LifecycleStage[];
}

const TRADES = [
  { id: 'general', label: 'General / GC' },
  { id: 'structural', label: 'Structural' },
  { id: 'electrical', label: 'Electrical' },
  { id: 'plumbing', label: 'Plumbing' },
  { id: 'mechanical', label: 'Mechanical' },
] as const;

const LANES = [
  { id: 'gc', label: 'General Contractor' },
  { id: 'diy', label: 'DIY / Owner-Builder' },
  { id: 'specialty', label: 'Specialty Trade' },
  { id: 'worker', label: 'Crew / Field' },
] as const;

export default function CodeComplianceClient({ workflow, jurisdictions, stages }: CodeComplianceClientProps) {
  // Project Spine v1: hydrate + autosave the per-workflow JSONB state.
  const {
    hydratedPayloads,
    recordStepEvent,
    lastSavedAt,
    saving,
    project,
  } = useProjectWorkflowState({
    column: 'code_compliance_state',
    workflowId: workflow.id,
  });

  const [jurisdictionId, setJurisdictionId] = useState<string>(jurisdictions[0]?.id ?? 'ibc-2024');
  const [trade, setTrade] = useState<string>('general');
  const [lane, setLane] = useState<WorkflowContext['lane']>('gc');
  const [proMode, setProMode] = useState(false);
  const [eventCount, setEventCount] = useState(0);

  // Project Spine v1: when the project hydrates with a jurisdiction
  // (e.g. AI take parsed "California" or raw_input mentions San Diego),
  // default the picker to the matching jurisdiction instead of the
  // first-in-list. The user can still change it manually after.
  // Persona findings: Pete, Sarah, Diana ALL flagged this as a trust
  // killer — code-compliance defaulting to "IBC 2024 generic" when the
  // project clearly says California is the moment they walk away.
  useEffect(() => {
    const projJurisdiction = project?.jurisdiction?.toLowerCase()?.trim();
    if (!projJurisdiction) return;

    // Look for a jurisdiction in the list whose name OR id matches.
    // Match on substring so "California" matches "ca-title-24-part-2" or
    // a city-level entry like "san-diego". Prefer a city/county match
    // (more specific) over a state match if the project mentions one.
    const matches = jurisdictions.filter((j) => {
      const name = `${j.name ?? ''} ${j.state ?? ''} ${j.id}`.toLowerCase();
      return projJurisdiction.split(/[,\s]+/).some(
        (token) => token.length > 2 && name.includes(token)
      );
    });

    if (matches.length === 0) return;
    // If the user hasn't changed the default, adopt the project's jurisdiction.
    setJurisdictionId((current) =>
      current === (jurisdictions[0]?.id ?? 'ibc-2024') ? matches[0].id : current
    );
  }, [project?.jurisdiction, jurisdictions]);

  // Project Spine v1: track step status locally; seed from hydrated.
  const [stepStatusMap, setStepStatusMap] = useState<
    Record<string, 'pending' | 'in_progress' | 'complete'>
  >({});

  useEffect(() => {
    if (Object.keys(hydratedPayloads).length === 0) return;
    setStepStatusMap((prev) => {
      const next = { ...prev };
      for (const stepId of Object.keys(hydratedPayloads)) {
        if (!next[stepId]) next[stepId] = 'complete';
      }
      return next;
    });
  }, [hydratedPayloads]);

  const context: WorkflowContext = {
    jurisdiction: jurisdictionId,
    trade,
    lane,
    projectPhase: 'preconstruction',
  };

  const handleEvent = useCallback(
    (event: StepResult & { workflowId: string }) => {
      setEventCount((n) => n + 1);
      // Project Spine v1: persist to code_compliance_state JSONB.
      recordStepEvent(event);
      // Local statusMap so counter updates in-session.
      if (event.type === 'step_completed') {
        setStepStatusMap((prev) => ({ ...prev, [event.stepId]: 'complete' }));
      } else if (event.type === 'step_saved') {
        setStepStatusMap((prev) => ({
          ...prev,
          [event.stepId]: prev[event.stepId] ?? 'in_progress',
        }));
      }
      // Time Machine event bus.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('bkg:workflow:event', { detail: event })
        );
      }
    },
    [recordStepEvent]
  );

  const savedLabel = saving
    ? 'Saving…'
    : lastSavedAt
      ? `Saved · ${new Date(lastSavedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
      : null;

  // Pre-fill text/voice/analysis + location + sqft from raw_input.
  const seededPayloads = useMemo(
    () => seedPayloadsFromRaw(workflow.steps, project?.raw_input, hydratedPayloads),
    [hydratedPayloads, project, workflow.steps]
  );
  const mergedStatusMap = useMemo(
    () => statusFromSeeded(seededPayloads, stepStatusMap),
    [seededPayloads, stepStatusMap]
  );

  // JourneyMapHeader is mounted globally in src/app/killerapp/layout.tsx
  // since W4.1b; no longer rendered per workflow. `stages` prop still
  // accepted for back-compat but unused here.
  void stages;

  return (
    <>
      <div style={{ paddingTop: spacing[6] }}>
        <ProjectContextBanner project={project} selfWorkflow="code-compliance" />
      </div>
      <div
        style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: `${spacing[8]} ${spacing[4]}`,
          fontFamily: fonts.body,
        }}
      >
        {savedLabel && (
          <div
            aria-live="polite"
            style={{
              textAlign: 'right',
              marginBottom: spacing[2],
              fontSize: fontSizes.xs,
              color: colors.ink[500],
              fontFamily: fonts.body,
            }}
            data-testid="code-compliance-saved-indicator"
          >
            {savedLabel}
          </div>
        )}
        {/* Top bar — breadcrumb + Pro Toggle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing[6],
        }}
      >
        <nav style={{ fontSize: fontSizes.sm, color: colors.ink[500] }}>
          <Link href="/killerapp" style={{ color: colors.ink[500], textDecoration: 'none' }}>
            Killer App
          </Link>
          <span style={{ margin: `0 ${spacing[2]}` }}>/</span>
          <span>Workflows</span>
          <span style={{ margin: `0 ${spacing[2]}` }}>/</span>
          <span style={{ color: colors.ink[900], fontWeight: fontWeights.medium }}>
            Code Compliance Lookup
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

      {/* Context chooser */}
      <section
        aria-label="Workflow context"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: spacing[3],
          padding: spacing[4],
          marginBottom: spacing[6],
          backgroundColor: colors.ink[50],
          borderRadius: radii.md,
          border: `1px solid ${colors.ink[100]}`,
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
          <span style={{ fontSize: fontSizes.xs, fontWeight: fontWeights.semibold, color: colors.ink[500], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Jurisdiction
          </span>
          <JurisdictionPicker
            jurisdictions={jurisdictions}
            value={jurisdictionId}
            onChange={setJurisdictionId}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
          <span style={{ fontSize: fontSizes.xs, fontWeight: fontWeights.semibold, color: colors.ink[500], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Trade
          </span>
          <select
            value={trade}
            onChange={(e) => setTrade(e.target.value)}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = colors.amber.main;
              e.currentTarget.style.boxShadow = `0 0 0 2px ${colors.amber.glow}40`;
              e.currentTarget.style.outline = 'none';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = colors.ink[200];
              e.currentTarget.style.boxShadow = 'none';
            }}
            style={{
              padding: spacing[2],
              fontSize: fontSizes.sm,
              fontFamily: fonts.body,
              border: `1px solid ${colors.ink[200]}`,
              borderRadius: radii.sm,
              backgroundColor: '#FFFFFF',
              color: colors.ink[900],
              cursor: 'pointer',
              transition: '100ms ease',
            }}
          >
            {TRADES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
          <span style={{ fontSize: fontSizes.xs, fontWeight: fontWeights.semibold, color: colors.ink[500], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Lane
          </span>
          <select
            value={lane}
            onChange={(e) => setLane(e.target.value as WorkflowContext['lane'])}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = colors.amber.main;
              e.currentTarget.style.boxShadow = `0 0 0 2px ${colors.amber.glow}40`;
              e.currentTarget.style.outline = 'none';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = colors.ink[200];
              e.currentTarget.style.boxShadow = 'none';
            }}
            style={{
              padding: spacing[2],
              fontSize: fontSizes.sm,
              fontFamily: fonts.body,
              border: `1px solid ${colors.ink[200]}`,
              borderRadius: radii.sm,
              backgroundColor: '#FFFFFF',
              color: colors.ink[900],
              cursor: 'pointer',
              transition: '100ms ease',
            }}
          >
            {LANES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <WorkflowRenderer
        workflow={workflow}
        context={context}
        onEvent={handleEvent}
        proMode={proMode}
        hydratedPayloads={seededPayloads}
        statusMap={mergedStatusMap}
      />

      {/* Footer — Time Machine signal */}
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
        {eventCount} action{eventCount === 1 ? '' : 's'} recorded · Time Machine replay available
      </footer>
      </div>
    </>
  );
}
