/**
 * LifecycleMemory (Pattern Language #19, Dimensional Rendering).
 *
 * Category: Dimensional Rendering.
 * Axes touched: time_horizon (primary — multi-year project memory), trust_posture
 *               (active — high trust unlocks deeper history), lane (active —
 *               admin sees all-projects view, professional sees this-project).
 *
 * Same project, same user, multi-year horizon. Surface context across stages
 * (Size Up → Lock → Plan → Build → Adapt → Collect → Reflect for construction).
 *
 * The component renders a stage timeline + a "what happened in the prior
 * stage" summary so the user always sees the lineage of the current state.
 */

'use client';

import * as React from 'react';
import { BRAND_COLORS, BRAND_FONTS } from '@/lib/brand-tokens';

export interface LifecycleStageRecord {
  /** Stable id, e.g. 'size-up' | 'lock' | 'plan'. */
  id: string;
  /** Human label. */
  label: string;
  /** ISO date the user entered this stage. */
  enteredAt?: string;
  /** One-line summary of what was committed at this stage. */
  summary?: string;
  /** Whether the stage is complete. */
  complete?: boolean;
}

export interface LifecycleMemoryProps {
  /** Ordered list of stages from the start of the lifecycle. */
  stages: LifecycleStageRecord[];
  /** Which stage id is currently active. */
  currentStageId: string;
  /** Optional click handler when a prior stage is selected. */
  onSelectStage?: (stageId: string) => void;
}

export function LifecycleMemory({
  stages,
  currentStageId,
  onSelectStage,
}: LifecycleMemoryProps) {
  const currentIdx = stages.findIndex((s) => s.id === currentStageId);
  const priorStage = currentIdx > 0 ? stages[currentIdx - 1] : null;

  return (
    <section
      aria-label="Lifecycle memory"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        padding: '0.85rem 1rem',
        background: BRAND_COLORS.parchment,
        border: `1px solid ${BRAND_COLORS.copperLine}`,
        borderRadius: '4px',
      }}
    >
      <ol
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.4rem',
        }}
      >
        {stages.map((stage, idx) => {
          const isActive = stage.id === currentStageId;
          const isPast = idx < currentIdx;
          return (
            <li key={stage.id}>
              <button
                type="button"
                onClick={() => onSelectStage?.(stage.id)}
                aria-current={isActive ? 'step' : undefined}
                style={{
                  padding: '0.25rem 0.6rem',
                  borderRadius: '999px',
                  border: `1px solid ${
                    isActive
                      ? BRAND_COLORS.copper
                      : isPast
                        ? BRAND_COLORS.greenPrimary
                        : BRAND_COLORS.copperLine
                  }`,
                  background: isActive
                    ? BRAND_COLORS.parchmentWarm
                    : 'transparent',
                  color: isActive
                    ? BRAND_COLORS.copper
                    : isPast
                      ? BRAND_COLORS.greenPrimary
                      : BRAND_COLORS.steel,
                  fontFamily: BRAND_FONTS.mono,
                  fontSize: '0.7rem',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                {idx + 1}. {stage.label}
                {stage.complete ? ' ✓' : ''}
              </button>
            </li>
          );
        })}
      </ol>
      {priorStage?.summary ? (
        <p
          style={{
            margin: 0,
            fontFamily: BRAND_FONTS.display,
            fontSize: '0.85rem',
            color: BRAND_COLORS.forestInk,
            fontStyle: 'italic',
          }}
        >
          From {priorStage.label}: {priorStage.summary}
        </p>
      ) : null}
    </section>
  );
}

export default LifecycleMemory;
