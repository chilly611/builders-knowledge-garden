'use client';

/**
 * JourneyStrip
 * ============
 * The top row of the W9 IntegratedNavigator.
 * Renders 7 lifecycle stages as horizontally-scrollable pills, color-coded
 * by progress status. Active stage highlighted with brass bottom-border.
 */

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { StageId, StageProgress } from './types';
import { STAGE_REGISTRY } from './types';

export interface JourneyStripProps {
  /** Per-stage progress rollup. Must contain all 7 stages. */
  stages: StageProgress[];
  /** The stage the user is currently viewing. null = picker/no context. */
  activeStageId: StageId | null;
  /** Fires when the user clicks a stage pill. Parent handles routing. */
  onStageClick: (stageId: StageId) => void;
  /** Compact = slim row for Navigator compact state. Default false. */
  compact?: boolean;
}

export default function JourneyStrip({
  stages,
  activeStageId,
  onStageClick,
  compact = false,
}: JourneyStripProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const handlePillKeyDown = useCallback(
    (e: React.KeyboardEvent, stageId: StageId) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onStageClick(stageId);
      }
    },
    [onStageClick],
  );

  const getStatusStyles = (stage: StageProgress): {
    bg: string;
    text: string;
    accentColor?: string;
    useAnimation?: boolean;
  } => {
    switch (stage.status) {
      case 'complete':
        return { bg: 'var(--robin)', text: 'var(--graphite)', accentColor: 'var(--robin)' };
      case 'in_progress':
        return { bg: 'transparent', text: 'var(--ink)', accentColor: 'var(--orange)' };
      case 'needs_attention':
        return {
          bg: 'var(--orange)',
          text: 'var(--ink)',
          useAnimation: !prefersReducedMotion,
        };
      case 'skipped':
        return {
          bg: 'transparent',
          text: 'var(--graphite)',
          accentColor: 'var(--graphite)',
        };
      default: // not_started
        return { bg: 'var(--trace)', text: 'var(--graphite)' };
    }
  };

  const containerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollbarWidth: 'none',
    WebkitOverflowScrolling: 'touch',
    padding: compact ? '6px 8px' : '12px 8px',
    background: 'var(--trace)',
    borderBottom: '1px solid var(--faded-rule)',
  };

  const pillStyle = (stage: StageProgress, isActive: boolean): CSSProperties => {
    const statusStyles = getStatusStyles(stage);
    const baseStyle: CSSProperties = {
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: compact ? '2px' : '4px',
      padding: compact ? '6px 10px' : '8px 12px',
      minWidth: compact ? 'auto' : '70px',
      borderRadius: '4px',
      fontSize: compact ? '10px' : '12px',
      fontWeight: isActive ? 600 : 500,
      color: statusStyles.text,
      background: statusStyles.bg,
      border: stage.status === 'skipped' ? `1px dashed var(--graphite)` : 'none',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      flexShrink: 0,
      transition: `cubic-bezier(0.4, 0.02, 0.2, 1) 200ms`,
      outline: 'none',
      position: 'relative',
    };

    if (isActive) {
      baseStyle.borderBottom = '2px solid var(--brass)';
    }

    if (statusStyles.useAnimation) {
      // Gentle pulse for needs_attention
      baseStyle.animation = 'journeyStripPulse 2s ease-in-out infinite';
    }

    return baseStyle;
  };

  const containerStyleWithAnimation: CSSProperties = {
    ...containerStyle,
  };

  if (!prefersReducedMotion && styles.keyframes) {
    // Inject pulse keyframes via style tag (handled at render level)
  }

  const renderCompactMode = () => {
    if (!compact) return null;
    const activeStage = stages.find((s) => s.stageId === activeStageId);
    const nextStage = activeStageId ? stages.find((s) => s.stageId === (activeStageId + 1)) : null;
    const prevStage = activeStageId ? stages.find((s) => s.stageId === (activeStageId - 1)) : null;

    return (
      <div style={containerStyleWithAnimation} role="tablist">
        {prevStage && (
          <span
            style={{
              fontSize: '10px',
              color: 'var(--graphite)',
              opacity: 0.6,
              marginRight: '4px',
            }}
          >
            {STAGE_REGISTRY.find((r) => r.id === prevStage.stageId)?.label}
          </span>
        )}
        {activeStage && (
          <button
            key={activeStage.stageId}
            role="tab"
            aria-selected
            onKeyDown={(e) => handlePillKeyDown(e, activeStage.stageId)}
            onClick={() => onStageClick(activeStage.stageId)}
            aria-label={`${STAGE_REGISTRY.find((r) => r.id === activeStage.stageId)?.label} — ${activeStage.status}, ${activeStage.doneCount} of ${activeStage.totalCount} workflows done`}
            style={pillStyle(activeStage, true)}
          >
            <span style={{ fontSize: '10px' }}>{activeStage.stageId}</span>
            <span>{STAGE_REGISTRY.find((r) => r.id === activeStage.stageId)?.label}</span>
          </button>
        )}
        {nextStage && (
          <span
            style={{
              fontSize: '10px',
              color: 'var(--graphite)',
              opacity: 0.6,
              marginLeft: '4px',
            }}
          >
            {STAGE_REGISTRY.find((r) => r.id === nextStage.stageId)?.label}
          </span>
        )}
      </div>
    );
  };

  const renderExpandedMode = () => {
    return (
      <>
        <style>{`
          @keyframes journeyStripPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.75; }
          }
        `}</style>
        <div style={containerStyleWithAnimation} role="tablist">
          {stages.map((stage) => {
            const isActive = stage.stageId === activeStageId;
            const stageMeta = STAGE_REGISTRY.find((r) => r.id === stage.stageId);
            return (
              <button
                key={stage.stageId}
                role="tab"
                aria-selected={isActive}
                onKeyDown={(e) => handlePillKeyDown(e, stage.stageId)}
                onClick={() => onStageClick(stage.stageId)}
                aria-label={`${stageMeta?.label} — ${stage.status}, ${stage.doneCount} of ${stage.totalCount} workflows done`}
                style={{
                  ...pillStyle(stage, isActive),
                  ...(isActive && {
                    outline: '2px solid var(--robin)',
                    outlineOffset: '2px',
                  }),
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 700 }}>
                  {stage.status === 'complete' ? '✓' : stage.stageId}
                </span>
                <span style={{ fontSize: '11px', lineHeight: 1.2 }}>
                  {stageMeta?.label}
                </span>
                {stage.totalCount > 0 && (
                  <span
                    style={{
                      fontSize: '9px',
                      opacity: 0.75,
                      marginTop: '2px',
                    }}
                  >
                    {stage.doneCount}/{stage.totalCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </>
    );
  };

  return compact ? renderCompactMode() : renderExpandedMode();
}

const styles = {
  keyframes: `
    @keyframes journeyStripPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.75; }
    }
  `,
};
