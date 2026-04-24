'use client';

import React, { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LIFECYCLE_STAGES } from '@/lib/lifecycle-stages';
import { stageFromPathname } from '@/lib/stage-from-pathname';
import { STAGE_ACCENTS, type StageId } from '@/design-system/tokens/stage-accents';
import { colors, spacing, radii, transitions } from '@/design-system/tokens';

export interface StageBreadcrumbProps {
  /** Optional override for stage detection. If not provided, derived from pathname. */
  currentStage?: number;
  className?: string;
}

/** Stage to first workflow route mapping. */
const STAGE_TO_WORKFLOW_ROUTE: Record<number, string> = {
  1: '/killerapp/workflows/estimating',
  2: '/killerapp/workflows/contract-templates',
  3: '/killerapp/workflows/job-sequencing',
  4: '/killerapp/workflows/daily-log',
  5: '/killerapp/workflows/services-todos',
  6: '/killerapp/workflows/expenses',
  7: '/killerapp/workflows/compass-nav',
};

/**
 * StageBreadcrumb — Video-game-style orientation strip
 *
 * Renders a thin, always-visible horizontal progress strip showing all 7 lifecycle stages.
 * Current stage gets an accent-colored pill with "(you're here)" label.
 * Completed stages show a checkmark prefix and fade to Graphite text.
 * Upcoming stages show faded Rule color and cursor "not-allowed" on hover.
 *
 * Mobile (<640px): Shows emojis only with "(you're here)" sub-label under current.
 *
 * Returns null on stage 0 (landing page).
 */
export default function StageBreadcrumb({
  currentStage: overrideStage,
  className,
}: StageBreadcrumbProps = {}): React.ReactElement | null {
  const pathname = usePathname() ?? '';
  const router = useRouter();

  const stageId = useMemo(() => {
    if (overrideStage !== undefined) return overrideStage;
    return stageFromPathname(pathname);
  }, [overrideStage, pathname]);

  // Hide on stage 0 (landing/picker)
  if (stageId === 0) {
    return null;
  }

  const handleStageClick = (targetStage: number) => {
    const route = STAGE_TO_WORKFLOW_ROUTE[targetStage];
    if (route) {
      router.push(route);
    }
  };

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing[3],
        padding: `${spacing[3]} ${spacing[4]}`,
        backgroundColor: colors.paper.cream,
        borderBottom: `1px solid ${colors.fadedRule}`,
        width: '100%',
        flexWrap: 'wrap',
      } as React.CSSProperties}
      role="navigation"
      aria-label="Journey progress"
    >
      {/* Stage pills and arrows */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2],
          justifyContent: 'center',
          flexWrap: 'wrap',
        } as React.CSSProperties}
      >
        {LIFECYCLE_STAGES.map((stage, index) => {
          const isCurrentStage = stage.id === stageId;
          const isCompletedStage = stage.id < stageId;
          const isUpcomingStage = stage.id > stageId;

          const stageAccent = STAGE_ACCENTS[stage.id as StageId];
          const isDarkAccent = ['#3E3A6E', '#5E4B7C', '#B23A7F'].includes(stageAccent.hex);
          const textColor = isDarkAccent ? colors.trace : colors.graphite;

          return (
            <React.Fragment key={stage.id}>
              {/* Stage pill or label */}
              {isCurrentStage ? (
                // Current stage: accent pill with highlight
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: spacing[1],
                  } as React.CSSProperties}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[2],
                      paddingLeft: spacing[3],
                      paddingRight: spacing[3],
                      paddingTop: spacing[2],
                      paddingBottom: spacing[2],
                      borderRadius: radii.full,
                      backgroundColor: stageAccent.hex,
                      color: textColor,
                      fontWeight: 600,
                      fontSize: '13px',
                      whiteSpace: 'nowrap',
                    } as React.CSSProperties}
                  >
                    <span style={{ fontSize: '14px' }}>{stage.emoji}</span>
                    <span style={{ display: 'inline' }} className="stage-name-desktop">
                      {stage.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      color: colors.graphite,
                      fontWeight: 500,
                      display: 'none',
                    }}
                    className="stage-label-desktop"
                  >
                    (you're here)
                  </span>
                </div>
              ) : isCompletedStage ? (
                // Completed stage: checkmark + faded text, clickable
                <button
                  type="button"
                  onClick={() => handleStageClick(stage.id)}
                  title={`Jump to ${stage.name}`}
                  aria-label={`Completed: ${stage.name}. Click to navigate.`}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[1],
                    color: colors.graphite,
                    fontWeight: 500,
                    fontSize: '13px',
                    opacity: 0.6,
                    transition: `opacity ${transitions.fast}`,
                    whiteSpace: 'nowrap',
                  } as React.CSSProperties}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.opacity = '0.6';
                  }}
                >
                  <span style={{ color: colors.brass, fontSize: '14px' }}>✓</span>
                  <span style={{ display: 'inline' }} className="stage-name-desktop">
                    {stage.name}
                  </span>
                  <span style={{ fontSize: '14px' }}>{stage.emoji}</span>
                </button>
              ) : (
                // Upcoming stage: faded, not-allowed cursor on hover
                <button
                  type="button"
                  onClick={() => handleStageClick(stage.id)}
                  title={`Jump to ${stage.name}`}
                  aria-label={`Upcoming: ${stage.name}. Click to jump ahead.`}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[1],
                    color: colors.fadedRule,
                    fontWeight: 500,
                    fontSize: '13px',
                    opacity: 0.5,
                    transition: `opacity ${transitions.fast}`,
                    whiteSpace: 'nowrap',
                  } as React.CSSProperties}
                  onMouseEnter={(e) => {
                    const btn = e.currentTarget as HTMLButtonElement;
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.opacity = '0.6';
                  }}
                >
                  <span style={{ fontSize: '14px' }}>{stage.emoji}</span>
                  <span style={{ display: 'inline' }} className="stage-name-desktop">
                    {stage.name}
                  </span>
                </button>
              )}

              {/* Arrow separator (not after last stage) */}
              {index < LIFECYCLE_STAGES.length - 1 && (
                <div
                  style={{
                    color: isCompletedStage ? colors.brass : colors.fadedRule,
                    fontSize: '12px',
                    opacity: isCompletedStage ? 1 : 0.5,
                  } as React.CSSProperties}
                >
                  {isCompletedStage ? '▸' : '→'}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Responsive styles and mobile layout */}
      <style>{`
        @media (min-width: 640px) {
          .stage-name-desktop {
            display: inline !important;
          }
          .stage-label-desktop {
            display: inline !important;
          }
        }

        @media (max-width: 639px) {
          /* Mobile: hide stage names, show emoji + centered sub-label under current */
          [role="navigation"] {
            flex-direction: column;
            gap: 8px;
          }

          [role="navigation"] > div {
            gap: 2px !important;
            flex-wrap: nowrap;
            overflow-x: auto;
            max-width: 100vw;
          }

          .stage-label-desktop {
            display: block !important;
            position: absolute;
            margin-top: 28px;
            font-size: 10px !important;
          }
        }
      `}</style>
    </div>
  );
}
