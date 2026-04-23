'use client';

/**
 * JourneyStrip
 * ============
 * The top row of the W9 IntegratedNavigator.
 * Renders 7 lifecycle stages as horizontally-scrollable pills, color-coded
 * by progress status. Active stage highlighted with brass bottom-border.
 *
 * Each pill now includes:
 * - Stage accent color band (2px) at the bottom
 * - Tinted stage icon (accent on active, graphite on inactive)
 * - Hover backdrop image bleed (stages 1-4) or accent wash (stages 5-7)
 * - Brass underline (3px) on current active stage
 */

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { StageId, StageProgress } from './types';
import { STAGE_REGISTRY } from './types';
import { STAGE_ACCENTS } from '../../design-system/tokens/stage-accents';
import { STAGE_ICONS } from './icons';

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
    const stageAccent = STAGE_ACCENTS[stage.stageId];

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
      // Pseudo-element for stage accent band at bottom
      backgroundClip: 'padding-box',
      borderBottom: `2px solid ${stageAccent.hex}`,
    };

    if (isActive) {
      // Brass underline replaces the accent band for current stage
      baseStyle.borderBottom = '3px solid #B6873A';
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
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '20px',
                height: '20px',
                color: STAGE_ACCENTS[activeStage.stageId].hex,
                flexShrink: 0,
              }}
            >
              {(() => {
                const IconComponent = STAGE_ICONS[activeStage.stageId];
                return <IconComponent width={16} height={16} stroke={STAGE_ACCENTS[activeStage.stageId].hex} />;
              })()}
            </div>
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
    // Determine backdrop image paths for stages 1-4, none for 5-7
    const backdropPaths: Record<StageId, string | null> = {
      1: '/stage-backdrops/sizeup-journey.png',
      2: '/stage-backdrops/lock-journey.png',
      3: '/stage-backdrops/plan-journey.png',
      4: '/stage-backdrops/build-journey.png',
      5: null,
      6: null,
      7: null,
    };

    const getHoverBackdropStyle = (stageId: StageId): CSSProperties => {
      const backdropPath = backdropPaths[stageId];
      const stageAccent = STAGE_ACCENTS[stageId];

      if (backdropPath) {
        // Stages 1-4: use raster image as subtle tinted wash
        return {
          backgroundImage: `url('${backdropPath}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.15,
        };
      } else {
        // Stages 5-7: use stage accent color at low opacity
        return {
          backgroundColor: stageAccent.hex,
          opacity: 0.1,
        };
      }
    };

    return (
      <>
        <style>{`
          @keyframes journeyStripPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.75; }
          }
          .journey-pill-hover-backdrop {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border-radius: 4px;
            pointer-events: none;
            transition: opacity cubic-bezier(0.4, 0.02, 0.2, 1) 200ms;
            z-index: 0;
          }
          .journey-pill-content {
            position: relative;
            z-index: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
          }
        `}</style>
        <div style={containerStyleWithAnimation} role="tablist">
          {stages.map((stage) => {
            const isActive = stage.stageId === activeStageId;
            const stageMeta = STAGE_REGISTRY.find((r) => r.id === stage.stageId);
            const stageAccent = STAGE_ACCENTS[stage.stageId];
            const IconComponent = STAGE_ICONS[stage.stageId];
            const iconColor = isActive ? stageAccent.hex : '#2E2E30'; // Graphite when inactive

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
                {/* Hover backdrop bleed */}
                <div
                  className="journey-pill-hover-backdrop"
                  style={getHoverBackdropStyle(stage.stageId)}
                />

                {/* Content layer with icon and text */}
                <div className="journey-pill-content" style={{ gap: 'inherit' }}>
                  {/* Stage icon with stage accent tint on active */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      color: iconColor,
                      flexShrink: 0,
                    }}
                  >
                    <IconComponent width={20} height={20} stroke={iconColor} />
                  </div>

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
                </div>
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
