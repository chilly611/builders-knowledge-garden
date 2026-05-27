'use client';

/**
 * JourneyTimeRow — Row 2 of KillerAppChrome.
 *
 *   TimelineMarkers (draggable, positioned along the schedule axis)
 *   ─────────────────────────────────────────────────────────────────
 *   StageNode × 7  (size-up | lock | plan | build | adapt | collect | reflect)
 *
 * Each StageNode is clickable and routes to ?stage=<slug>. The active
 * stage is derived from the URL — if no ?stage= is set, we infer the
 * "in-flight" stage as the first stage whose completion < 100.
 */

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { KAC_COLORS, KAC_FONTS, KAC_STAGES } from './types';
import type { KacProject, KacStageSlug } from './types';
import StageNode from './StageNode';
import TimelineMarkers from './TimelineMarkers';

export interface JourneyTimeRowProps {
  project: KacProject;
  /** Fired with the reordered marker ids when a timeline drag finishes. */
  onMarkersReorder?: (orderedIds: string[]) => void;
}

function inferActiveSlug(
  project: KacProject,
  param: string | null
): KacStageSlug {
  if (param) {
    const hit = KAC_STAGES.find((s) => s.slug === param);
    if (hit) return hit.slug;
  }
  // First stage that's not yet done — that's "where the builder is."
  const inflight = project.stages.find((s) => s.completion < 100);
  return (inflight?.slug as KacStageSlug | undefined) ?? KAC_STAGES[0].slug;
}

export default function JourneyTimeRow({
  project,
  onMarkersReorder,
}: JourneyTimeRowProps) {
  const searchParams = useSearchParams();
  const stageParam = searchParams?.get('stage') ?? null;
  const activeSlug = useMemo(
    () => inferActiveSlug(project, stageParam),
    [project, stageParam]
  );

  // Look up completion + dueDate for each canonical stage from project data.
  const stageById = useMemo(() => {
    const map: Record<number, { completion: number; dueDate?: string }> = {};
    for (const s of project.stages) {
      map[s.id] = { completion: s.completion, dueDate: s.dueDate };
    }
    return map;
  }, [project.stages]);

  return (
    <div
      role="region"
      aria-label="Project journey and timeline"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '10px 12px 8px',
        background: KAC_COLORS.card,
        border: `1px solid ${KAC_COLORS.cardBorder}`,
        borderRadius: 12,
        boxShadow: `0 1px 2px ${KAC_COLORS.shadow}`,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
          minHeight: 14,
        }}
      >
        <span
          style={{
            fontFamily: KAC_FONTS.body,
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: KAC_COLORS.textWarmGray,
          }}
        >
          Journey
        </span>
        <span
          style={{
            fontFamily: KAC_FONTS.mono,
            fontSize: 10,
            color: KAC_COLORS.textWarmGray,
            whiteSpace: 'nowrap',
          }}
        >
          {new Date(project.schedule.startDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}{' '}
          →{' '}
          {new Date(project.schedule.substantialCompletionDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      </div>

      <TimelineMarkers
        startDate={project.schedule.startDate}
        endDate={project.schedule.substantialCompletionDate}
        markers={project.schedule.markers}
        onReorder={onMarkersReorder}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: 4,
        }}
      >
        {KAC_STAGES.map((stage) => {
          const data = stageById[stage.id] ?? { completion: 0, dueDate: undefined };
          return (
            <StageNode
              key={stage.id}
              id={stage.id}
              slug={stage.slug}
              label={stage.short}
              completion={data.completion}
              dueDate={data.dueDate}
              active={stage.slug === activeSlug}
            />
          );
        })}
      </div>
    </div>
  );
}
