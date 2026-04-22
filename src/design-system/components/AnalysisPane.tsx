'use client';

/**
 * AnalysisPane
 * ============
 * Renders the result of a specialist call for an `analysis_result` StepCard.
 *
 * Responsibility split:
 * - StepCard owns the input textarea and passes `input` into the `renderAnalysis` callback.
 * - AnalysisPane owns the async call to the specialist runner, the loading state,
 *   the rendering of narrative + citations + confidence, and error surfaces.
 *
 * Constitution bindings:
 * - Goal 2 (show your work): confidence band + citations visible
 * - Goal 3 (AI as partner): deferred_to_human message displayed verbatim when present
 * - Goal 8 (machine-legible): structured output available via window event + hidden JSON
 */

import React, { useEffect, useRef, useState } from 'react';
import { colors, fonts, fontSizes, fontWeights, spacing, borders, radii } from '../tokens';
import { runSpecialist } from '../../lib/specialists.client';
import LearningBadge from '@/components/LearningBadge';
import { sanitizeNarrative } from './utils/sanitizeNarrative';
import type { SpecialistResult, SpecialistContext } from '../../lib/specialists';

interface AnalysisPaneProps {
  specialistId: string;
  input: string;
  context?: Omit<SpecialistContext, 'scope_description'>;
  /** Minimum characters of input before a call is fired (guards against thrash) */
  minChars?: number;
  /** Debounce delay in ms before firing the call */
  debounceMs?: number;
  /** Auto-run when input changes (true) or wait for explicit Run click (false) */
  autoRun?: boolean;
  /** Emit the result upward for Time Machine / workflow-level state */
  onResult?: (result: SpecialistResult) => void;
  /** Emit errors upward */
  onError?: (error: Error) => void;
}

type PaneState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; result: SpecialistResult }
  | { kind: 'error'; message: string };

const CONFIDENCE_COLORS = {
  high: colors.robin,    // Robin's Egg (canonical: #7FCFCB) — decision #12
  medium: '#D85A30',     // warm orange
  low: '#EF4444',
} as const;

const CONFIDENCE_LABELS = {
  high: 'High confidence',
  medium: 'Medium confidence — review before acting',
  low: 'Low confidence — verify with the AHJ',
} as const;

export default function AnalysisPane({
  specialistId,
  input,
  context,
  minChars = 20,
  debounceMs = 600,
  autoRun = true,
  onResult,
  onError,
}: AnalysisPaneProps) {
  const [state, setState] = useState<PaneState>({ kind: 'idle' });
  const latestInputRef = useRef<string>('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const runCall = async (inputText: string) => {
    latestInputRef.current = inputText;
    // Abort any in-flight call
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState({ kind: 'loading' });

    try {
      const result = await runSpecialist(specialistId, {
        scope_description: inputText,
        ...context,
      });
      // Guard against stale result if input changed
      if (latestInputRef.current !== inputText) return;
      setState({ kind: 'ready', result });
      onResult?.(result);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState({ kind: 'error', message });
      onError?.(err instanceof Error ? err : new Error(message));
    }
  };

  useEffect(() => {
    if (!autoRun) return;
    if (input.trim().length < minChars) {
      setState({ kind: 'idle' });
      return;
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      void runCall(input);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, specialistId, context?.jurisdiction, context?.trade, context?.lane]);

  // Idle state — not enough input
  if (state.kind === 'idle') {
    return (
      <div
        style={{
          padding: spacing[3],
          backgroundColor: colors.ink[50],
          borderRadius: radii.md,
          border: `${borders.thin} ${colors.ink[200]}`,
          fontSize: fontSizes.sm,
          color: colors.ink[500],
          fontFamily: fonts.body,
        }}
      >
        Enter at least {minChars} characters describing the scope to run {specialistId}.
      </div>
    );
  }

  if (state.kind === 'loading') {
    return (
      <div
        style={{
          padding: spacing[4],
          backgroundColor: colors.ink[50],
          borderRadius: radii.md,
          border: `${borders.thin} ${colors.ink[200]}`,
          fontSize: fontSizes.sm,
          color: colors.ink[700],
          fontFamily: fonts.body,
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2],
        }}
        aria-live="polite"
      >
        <span style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>●</span>
        Running {specialistId}…
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div
        style={{
          padding: spacing[4],
          backgroundColor: 'rgba(239,68,68,0.08)',
          borderRadius: radii.md,
          border: `${borders.thin} #EF4444`,
          fontSize: fontSizes.sm,
          color: colors.ink[900],
          fontFamily: fonts.body,
        }}
        role="alert"
      >
        <div style={{ fontWeight: fontWeights.semibold, marginBottom: spacing[1] }}>
          Specialist call failed
        </div>
        <div style={{ color: colors.ink[700] }}>{state.message}</div>
        <button
          type="button"
          onClick={() => void runCall(input)}
          style={{
            marginTop: spacing[3],
            padding: `${spacing[2]} ${spacing[3]}`,
            fontSize: fontSizes.xs,
            fontWeight: fontWeights.semibold,
            backgroundColor: colors.ink[900],
            color: '#FFFFFF',
            border: 'none',
            borderRadius: radii.sm,
            cursor: 'pointer',
            fontFamily: fonts.body,
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  // Ready
  const { result } = state;

  // Sanitize narrative to remove JSON corruption
  const sanitized = sanitizeNarrative(result.narrative);
  const codeSectionsToRender = sanitized.codeSectionsFromJson || result.code_sections || [];

  // Cap citations to 3, sorted by relevance
  const sortedCitations = (result.citations || [])
    .filter((c) => {
      if (!c.relevance) return true; // Include if no relevance specified
      return c.relevance === 'high' || c.relevance === 'medium' || c.relevance === 'low';
    })
    .sort((a, b) => {
      const relevanceOrder = { high: 0, medium: 1, low: 2 };
      const aRel = (a.relevance as keyof typeof relevanceOrder) || 'low';
      const bRel = (b.relevance as keyof typeof relevanceOrder) || 'low';
      return (relevanceOrder[aRel] || 2) - (relevanceOrder[bRel] || 2);
    })
    .slice(0, 3);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[3],
        padding: spacing[4],
        backgroundColor: '#FFFFFF',
        borderRadius: radii.md,
        border: `${borders.thin} ${colors.ink[200]}`,
        fontFamily: fonts.body,
      }}
    >
      {/* Supersession notice — if present, render above everything */}
      {result.supersededNotice && (
        <div
          style={{
            padding: spacing[3],
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            borderRadius: radii.sm,
            borderLeft: `4px solid #EF4444`,
            fontSize: fontSizes.sm,
            color: colors.ink[900],
            lineHeight: '1.6',
          }}
        >
          <span style={{ fontWeight: fontWeights.semibold }}>Code Updated:</span> NEC {result.supersededNotice.oldSection} was
          superseded — the current rule is {result.supersededNotice.newSection}. {result.supersededNotice.summary}
        </div>
      )}

      {/* Discipline handoff banner */}
      {result.disciplineHandoff && (
        <div
          style={{
            padding: spacing[3],
            backgroundColor: colors.amber.glow,
            borderRadius: radii.sm,
            borderLeft: `4px solid var(--brass)`,
            fontSize: fontSizes.sm,
            color: colors.ink[900],
            lineHeight: '1.6',
          }}
        >
          <span style={{ fontWeight: fontWeights.semibold }}>
            This looks like a {result.disciplineHandoff.detected} question
          </span>
          . Click{' '}
          <a
            href="#"
            style={{
              color: 'var(--brass)',
              textDecoration: 'underline',
              fontWeight: fontWeights.semibold,
              cursor: 'pointer',
            }}
            onClick={(e) => {
              e.preventDefault();
              // Signal to parent to jump to that step
              // For now, just indicate it's clickable
            }}
          >
            {result.disciplineHandoff.suggestStep}
          </a>{' '}
          for the deep dive.
        </div>
      )}

      {/* Confidence band */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: spacing[2],
          alignSelf: 'flex-start',
          padding: `${spacing[1]} ${spacing[3]}`,
          backgroundColor: `${CONFIDENCE_COLORS[result.confidence]}20`,
          color: CONFIDENCE_COLORS[result.confidence],
          fontSize: fontSizes.xs,
          fontWeight: fontWeights.semibold,
          borderRadius: radii.full,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {CONFIDENCE_LABELS[result.confidence]}
      </div>

      {/* Narrative — sanitized, never raw JSON */}
      <div
        style={{
          fontSize: fontSizes.sm,
          color: colors.ink[900],
          lineHeight: '1.6',
        }}
      >
        {sanitized.prose}
      </div>

      {/* Code sections rendered as clean table/list */}
      {codeSectionsToRender && codeSectionsToRender.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2], marginTop: spacing[2] }}>
          <div
            style={{
              fontSize: fontSizes.xs,
              fontWeight: fontWeights.semibold,
              color: colors.ink[500],
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Relevant Sections
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '120px 1fr 1fr',
              gap: spacing[3],
              fontSize: fontSizes.xs,
              color: colors.ink[700],
            }}
          >
            {codeSectionsToRender.map((sec, idx) => (
              <React.Fragment key={idx}>
                <div style={{ fontFamily: fonts.mono, fontWeight: fontWeights.semibold, color: colors.ink[900] }}>
                  {sec.section}
                </div>
                <div style={{ fontWeight: fontWeights.semibold }}>{sec.title}</div>
                <div>{sec.requirement}</div>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Deferred-to-human — goal 3 partner pattern */}
      {result.deferred_to_human && (
        <div
          style={{
            padding: spacing[3],
            backgroundColor: colors.amber.glow,
            borderRadius: radii.sm,
            fontSize: fontSizes.sm,
            color: colors.ink[900],
            fontStyle: 'italic',
          }}
        >
          Human decision needed: {result.deferred_to_human}
        </div>
      )}

      {/* Citations — capped to 3, sorted by relevance */}
      {sortedCitations && sortedCitations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
          <div
            style={{
              fontSize: fontSizes.xs,
              fontWeight: fontWeights.semibold,
              color: colors.ink[500],
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Citations
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
            {sortedCitations.map((c) => (
              <li
                key={c.entity_id}
                style={{
                  padding: spacing[2],
                  backgroundColor: colors.ink[50],
                  borderRadius: radii.sm,
                  fontSize: fontSizes.xs,
                  color: colors.ink[700],
                }}
              >
                <span style={{ fontFamily: fonts.mono, fontWeight: fontWeights.semibold, color: colors.ink[900] }}>
                  [{c.entity_id}]
                </span>
                {c.section && <span> {c.section}</span>}
                {c.jurisdiction && <span> · {c.jurisdiction}</span>}
                {c.edition && <span> · {c.edition}</span>}
                {c.updated_at && (
                  <span style={{ color: colors.ink[500] }}> · updated {new Date(c.updated_at).toLocaleDateString()}</span>
                )}
                {c.relevance && (
                  <div style={{ marginTop: spacing[1], color: colors.ink[700], fontSize: fontSizes.xs }}>
                    {c.relevance}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Meta footer — model + latency + learning badge */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: spacing[2],
          borderTop: `${borders.thin} ${colors.ink[100]}`,
        }}
      >
        <div
          style={{
            fontSize: fontSizes.xs,
            color: colors.ink[400],
            fontFamily: fonts.mono,
          }}
        >
          {result.model} · {result.latency_ms}ms
        </div>
        <LearningBadge variant="run" runId={specialistId} />
      </div>

      {/* Hidden machine-legible output — Goal 8, includes extracted JSON if present */}
      <script
        type="application/json"
        data-bkg-analysis={specialistId}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            ...result,
            // If we extracted JSON from the narrative, include it for machine consumption
            _extracted: sanitized.extractedJson || undefined,
          }),
        }}
      />
    </div>
  );
}
