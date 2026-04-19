// Builder's Knowledge Garden — Journey Map Header.
//
// Shows the 7-stage lifecycle (Size Up → Lock → Plan → Build → Adapt →
// Collect → Reflect) as a horizontal chip strip, with the current
// workflow's stage highlighted. Renders above every workflow route.
//
// Lifecycle-aware, but not gamified. Per killer-app-direction.md
// Decisions #1, #8, #11: stages are wayfinding, not unlockable tiers —
// so no locks, no progress bars, no quest counters here.
//
// Pure presentational: no side effects, no client hooks. Works in
// either Server or Client Components.

import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { StageProgress } from '@/lib/journey-progress';

export interface LifecycleStage {
  id: number;
  name: string;
  emoji: string;
}

const STAGE_COLORS: Record<number, string> = {
  1: '#D85A30', // Size Up
  2: '#7F77DD', // Lock
  3: '#1D9E75', // Plan
  4: '#378ADD', // Build
  5: '#F59E0B', // Adapt
  6: '#BA7517', // Collect
  7: '#639922', // Reflect
};

interface JourneyMapHeaderProps {
  stages: LifecycleStage[];
  currentStageId: number;
  /**
   * Optional workflow label shown beneath the strip (e.g. "Code
   * Compliance Lookup"). Keeps the header self-explanatory without
   * forcing a surrounding title component to exist.
   */
  workflowLabel?: string;
  /**
   * When true, each stage chip is a link to /killerapp that filters
   * the picker to that stage. Off by default; we don't have the
   * filter route yet.
   */
  linkStages?: boolean;
  /**
   * Optional rollup of per-stage journey state (Week 3). When provided,
   * each chip renders a small dot: green = any worked, amber = any
   * needs_attention, check = all done. Absent → stays presentational.
   */
  progressByStage?: Record<number, StageProgress>;
}

export default function JourneyMapHeader({
  stages,
  currentStageId,
  workflowLabel,
  linkStages = false,
  progressByStage,
}: JourneyMapHeaderProps) {
  const sorted = [...stages].sort((a, b) => a.id - b.id);
  const currentStage = sorted.find((s) => s.id === currentStageId);
  const currentColor = STAGE_COLORS[currentStageId] ?? '#555';

  return (
    <div
      style={{
        width: '100%',
        padding: '14px 0 12px',
        borderBottom: '1px solid #eee',
        background: '#FAFAF8',
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '0 16px',
        }}
      >
        <div
          role="navigation"
          aria-label="Lifecycle journey map"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          {sorted.map((stage, i) => {
            const isCurrent = stage.id === currentStageId;
            const color = STAGE_COLORS[stage.id] ?? '#999';
            const chipStyle: CSSProperties = {
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 10px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: isCurrent ? 800 : 500,
              letterSpacing: '0.4px',
              color: isCurrent ? '#fff' : 'var(--fg-secondary, #666)',
              background: isCurrent ? color : 'transparent',
              border: `1px solid ${isCurrent ? color : `${color}40`}`,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              textDecoration: 'none',
              fontFamily: 'inherit',
            };
            const progress = progressByStage?.[stage.id];
            const dot = progress && progress.worked > 0
              ? progress.needsAttention > 0
                ? { color: '#F59E0B', glyph: '•' } // amber = attention
                : progress.done === progress.total
                  ? { color: '#22C55E', glyph: '✓' } // emerald = all done
                  : { color: '#1D9E75', glyph: '•' } // green = working
              : null;
            const label = (
              <>
                <span style={{ fontSize: 12 }}>{stage.emoji}</span>
                <span>{stage.name}</span>
                {dot && (
                  <span
                    aria-label={`${progress!.done}/${progress!.total} workflows done${
                      progress!.needsAttention > 0 ? ', needs attention' : ''
                    }`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 14,
                      height: 14,
                      borderRadius: 7,
                      background: isCurrent ? 'rgba(255,255,255,0.25)' : `${dot.color}22`,
                      color: isCurrent ? '#fff' : dot.color,
                      fontSize: 9,
                      fontWeight: 800,
                      marginLeft: 2,
                    }}
                  >
                    {dot.glyph}
                  </span>
                )}
              </>
            );
            const node =
              linkStages && !isCurrent ? (
                <Link
                  href={`/killerapp?stage=${stage.id}`}
                  style={chipStyle}
                  aria-label={`Filter picker to stage ${stage.id}: ${stage.name}`}
                >
                  {label}
                </Link>
              ) : (
                <span
                  style={chipStyle}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {label}
                </span>
              );
            return (
              <span
                key={stage.id}
                style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
              >
                {node}
                {i < sorted.length - 1 && (
                  <span
                    aria-hidden="true"
                    style={{
                      width: 10,
                      height: 1,
                      background: '#d0d0cc',
                      margin: '0 2px',
                      flexShrink: 0,
                    }}
                  />
                )}
              </span>
            );
          })}
        </div>

        {(currentStage || workflowLabel) && (
          <p
            style={{
              fontSize: 11,
              color: '#888',
              margin: '8px 0 0',
              letterSpacing: '0.2px',
            }}
          >
            {currentStage && (
              <>
                Stage <strong style={{ color: currentColor }}>{currentStage.id}</strong> of 7
                {' · '}
                <strong style={{ color: currentColor }}>{currentStage.name}</strong>
              </>
            )}
            {workflowLabel && (
              <>
                {currentStage ? ' · ' : ''}
                {workflowLabel}
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
