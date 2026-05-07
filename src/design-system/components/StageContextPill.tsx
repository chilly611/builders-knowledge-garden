'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { LIFECYCLE_STAGES } from '@/lib/lifecycle-stages';
import { stageFromPathname } from '@/lib/stage-from-pathname';
import { STAGE_ACCENTS, type StageId } from '@/design-system/tokens/stage-accents';
import { colors, spacing, radii, shadows, transitions } from '@/design-system/tokens';

export interface StageContextPillProps {
  /**
   * Optional override for stage detection. If not provided,
   * the component will use usePathname() and stageFromPathname().
   */
  stageId?: number;
}

/**
 * StageContextPill — "You are here" indicator for killerapp workflows
 *
 * Renders a persistent pill in the bottom-right corner showing:
 * - Stage emoji (🧭 / 🔒 / 📐 / 🔨 / 🔄 / 💰 / 📖)
 * - Stage name ("Size up", "Lock it in", etc.)
 * - Optional hover: small "next →" label
 * - Background: stage-accent color at 12% opacity; 1px stage-accent border
 * - Text: Trace if dark bg, Graphite if light bg
 *
 * Positioning:
 * - position: fixed; bottom: 90px; right: 24px; z-index: 9995
 * - Stacks above VoiceCommandNav FAB (z-index: 9996)
 * - Hidden entirely on stage 0 (picker)
 *
 * Mobile (<640px):
 * - Max width 160px; emoji + short name only
 * - Respects prefers-reduced-motion: reduce
 */
export default function StageContextPill({
  stageId: overrideStageId,
}: StageContextPillProps = {}): React.ReactElement | null {
  const pathname = usePathname() ?? '';
  const stageId = overrideStageId !== undefined ? overrideStageId : stageFromPathname(pathname);

  // Hooks must run on every render — keep above any early returns.
  const [showModal, setShowModal] = useState(false);
  const [showNextLabel, setShowNextLabel] = useState(false);

  // Hide on stage 0 (picker)
  if (stageId === 0) {
    return null;
  }

  // Get stage data
  const currentStage = LIFECYCLE_STAGES.find(s => s.id === stageId);
  if (!currentStage) {
    return null;
  }

  // Get next stage (if it exists)
  const nextStageIndex = LIFECYCLE_STAGES.findIndex(s => s.id === stageId) + 1;
  const nextStage = nextStageIndex < LIFECYCLE_STAGES.length ? LIFECYCLE_STAGES[nextStageIndex] : null;

  // Get stage accent
  const stageAccent = STAGE_ACCENTS[stageId as StageId];
  if (!stageAccent) {
    return null;
  }

  // Determine text color: use Trace on darker accents, Graphite on lighter ones
  // This is a simple heuristic based on stage accent hex values
  const isDarkAccent = ['#3E3A6E', '#5E4B7C', '#B23A7F'].includes(stageAccent.hex);
  const textColor = isDarkAccent ? colors.trace : colors.graphite;

  // Prefers reduced motion
  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const handlePillClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowModal(true);
  };

  const handleModalBackdropClick = () => {
    setShowModal(false);
  };

  // Calculate bg opacity: 12% of stage accent
  const bgColor = `rgba(${parseInt(stageAccent.hex.slice(1, 3), 16)}, ${parseInt(stageAccent.hex.slice(3, 5), 16)}, ${parseInt(stageAccent.hex.slice(5, 7), 16)}, 0.12)`;

  return (
    <>
      {/* Pill button */}
      <button
        type="button"
        onClick={handlePillClick}
        onMouseEnter={() => setShowNextLabel(true)}
        onMouseLeave={() => setShowNextLabel(false)}
        aria-label={`Current stage: ${currentStage.name}. Click to see navigation options.`}
        title={`Current stage: ${currentStage.name}`}
        className="stage-context-pill"
        style={{
          position: 'fixed',
          bottom: spacing[6],
          right: spacing[6],
          paddingLeft: spacing[3],
          paddingRight: spacing[3],
          paddingTop: spacing[2],
          paddingBottom: spacing[2],
          borderRadius: radii.full,
          border: `1px solid ${stageAccent.hex}`,
          backgroundColor: bgColor,
          color: textColor,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2],
          fontSize: '14px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontWeight: 500,
          lineHeight: 1.4,
          boxShadow: shadows.md,
          zIndex: 9995,
          transition: !prefersReducedMotion ? `all ${transitions.base}` : 'none',
          whiteSpace: 'nowrap',
          maxWidth: '240px',
        } as React.CSSProperties}
      >
        <span style={{ fontSize: '16px', flexShrink: 0 }}>{currentStage.emoji}</span>
        <span style={{ flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {currentStage.name}
        </span>
        {nextStage && showNextLabel && (
          <span
            style={{
              fontSize: '12px',
              opacity: 0.7,
              marginLeft: spacing[1],
              transition: !prefersReducedMotion ? `opacity ${transitions.fast}` : 'none',
            }}
          >
            next →
          </span>
        )}
      </button>

      {/* Modal overlay (click to close or backdrop click) */}
      {showModal && (
        <>
          {/* Backdrop */}
          <div
            onClick={handleModalBackdropClick}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(11, 29, 51, 0.4)',
              zIndex: 9998,
              cursor: 'pointer',
            }}
            aria-hidden="true"
          />

          {/* Modal card */}
          <div
            style={{
              position: 'fixed',
              bottom: spacing[8],
              right: spacing[6],
              backgroundColor: colors.paper.white,
              border: `1px solid ${colors.fadedRule}`,
              borderRadius: radii.lg,
              padding: spacing[4],
              boxShadow: shadows.lg,
              zIndex: 9999,
              maxWidth: '320px',
              animation: !prefersReducedMotion
                ? `slideUp ${transitions.base} ease-out`
                : 'none',
            }}
          >
            {/* Modal title and current stage info */}
            <div style={{ marginBottom: spacing[3] }}>
              <p
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: colors.graphite,
                  margin: 0,
                  marginBottom: spacing[1],
                }}
              >
                {currentStage.emoji} You're in stage {stageId}
              </p>
              <p
                style={{
                  fontSize: '13px',
                  color: colors.graphite,
                  margin: 0,
                  opacity: 0.75,
                }}
              >
                {currentStage.name}
              </p>
            </div>

            {/* Next stage info */}
            {nextStage && (
              <div
                style={{
                  marginBottom: spacing[3],
                  paddingTop: spacing[3],
                  borderTop: `1px solid ${colors.fadedRule}`,
                }}
              >
                <p
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: colors.graphite,
                    margin: 0,
                    marginBottom: spacing[1],
                  }}
                >
                  Next:
                </p>
                <p
                  style={{
                    fontSize: '13px',
                    color: colors.graphite,
                    margin: 0,
                    opacity: 0.75,
                  }}
                >
                  {nextStage.emoji} {nextStage.name}
                </p>
              </div>
            )}

            {/* Stage selector (quick jump) */}
            <div
              style={{
                marginTop: spacing[3],
                paddingTop: spacing[3],
                borderTop: `1px solid ${colors.fadedRule}`,
              }}
            >
              <p
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: colors.graphite,
                  margin: 0,
                  marginBottom: spacing[2],
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  opacity: 0.6,
                }}
              >
                Jump to:
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: spacing[1],
                }}
              >
                {LIFECYCLE_STAGES.map(stage => (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => {
                      // Note: actual navigation would be handled by parent or via router
                      // For now, just close modal
                      setShowModal(false);
                    }}
                    title={stage.name}
                    aria-label={`Jump to ${stage.name}`}
                    style={{
                      backgroundColor:
                        stage.id === stageId ? STAGE_ACCENTS[stage.id as StageId].hex : colors.paper.aged,
                      color: stage.id === stageId ? colors.paper.white : colors.graphite,
                      border: 'none',
                      borderRadius: radii.md,
                      padding: spacing[2],
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: !prefersReducedMotion ? `all ${transitions.fast}` : 'none',
                      opacity: stage.id === stageId ? 1 : 0.7,
                      ':hover': {
                        opacity: 1,
                      },
                    } as React.CSSProperties}
                  >
                    {stage.emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Close hint */}
            <p
              style={{
                fontSize: '11px',
                color: colors.fadedRule,
                margin: 0,
                marginTop: spacing[2],
                textAlign: 'center',
              }}
            >
              Click backdrop to close
            </p>
          </div>
        </>
      )}

      {/* Animation keyframes and responsive styles */}
      <style>{`
        .stage-context-pill {
          max-width: 240px;
        }

        @media (max-width: 640px) {
          .stage-context-pill {
            max-width: 160px;
            padding-left: 8px !important;
            padding-right: 8px !important;
            font-size: 13px !important;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          @keyframes slideUp {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
        }
      `}</style>
    </>
  );
}
