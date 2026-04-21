'use client';

/**
 * JourneyPills
 * ============
 * Horizontal engraved-plate treatment of 7 stages.
 * Active stage gets Robin's Egg 2px ring + "current" micro-label.
 * Completed stages have graphite fill + white text + checkmark.
 * Progress within current stage shows as a brass progress bar.
 */

import type { CSSProperties } from 'react';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type { StageProgress } from '@/lib/journey-progress';

interface JourneyPillsProps {
  stages: LifecycleStage[];
  currentStageId: number | null;
  progressByStage: Record<number, StageProgress>;
}

export default function JourneyPills({
  stages,
  currentStageId,
  progressByStage,
}: JourneyPillsProps) {
  const sorted = [...stages].sort((a, b) => a.id - b.id);

  const containerStyle: CSSProperties = {
    padding: '0 24px 32px',
    maxWidth: '1200px',
    margin: '0 auto',
  };

  const titleStyle: CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--brass)',
    fontFamily: 'var(--font-archivo)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: '16px',
  };

  const pillsWrapperStyle: CSSProperties = {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
    overflowX: 'auto',
  };

  const getPillContent = (stage: LifecycleStage, index: number) => {
    const progress = progressByStage[stage.id];
    const isCurrent = stage.id === currentStageId;
    const isCompleted = progress && progress.done === progress.total && progress.total > 0;

    const pillStyle: CSSProperties = {
      position: 'relative',
      flex: '0 0 auto',
      padding: '12px 16px',
      borderRadius: '6px',
      border: '1px solid var(--faded-rule)',
      backgroundColor: isCompleted ? 'var(--graphite)' : 'transparent',
      minWidth: '90px',
      textAlign: 'center',
      cursor: 'default',
      transition: 'all 200ms ease',
      ...(isCurrent && {
        boxShadow: `inset 0 0 0 2px var(--robin)`,
      }),
    };

    const stageNumberStyle: CSSProperties = {
      fontSize: '11px',
      fontWeight: 600,
      color: isCompleted ? 'var(--trace)' : 'var(--brass)',
      fontFamily: 'var(--font-archivo)',
      letterSpacing: '0.05em',
      display: 'block',
      marginBottom: '4px',
    };

    const stageNameStyle: CSSProperties = {
      fontSize: '13px',
      fontWeight: 500,
      color: isCompleted ? 'var(--trace)' : 'var(--graphite)',
      fontFamily: 'var(--font-archivo)',
      display: 'block',
      lineHeight: 1.2,
    };

    const currentBadgeStyle: CSSProperties = {
      position: 'absolute',
      top: '-18px',
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: '9px',
      fontWeight: 600,
      color: 'var(--robin)',
      fontFamily: 'var(--font-archivo)',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    };

    return (
      <div
        key={`stage-${stage.id}`}
        style={pillStyle}
        className="bkg-fade-up"
        style={{
          ...pillStyle,
          animationDelay: `${40 + index * 40}ms`,
        } as CSSProperties}
      >
        {isCurrent && <div style={currentBadgeStyle}>Current</div>}
        <div style={stageNumberStyle}>
          {isCompleted ? '✓' : stage.id}
        </div>
        <div style={stageNameStyle}>{stage.name}</div>

        {/* Progress bar within current stage */}
        {isCurrent && progress && progress.total > 0 && (
          <div
            style={{
              marginTop: '8px',
              height: '3px',
              backgroundColor: 'var(--faded-rule)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                backgroundColor: 'var(--brass)',
                width: `${(progress.worked / progress.total) * 100}%`,
                transition: 'width 300ms ease',
              }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>Journey</div>
      <div style={pillsWrapperStyle}>
        {sorted.map((stage, index) => getPillContent(stage, index))}
      </div>
    </div>
  );
}
