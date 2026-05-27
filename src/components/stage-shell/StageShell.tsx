'use client';

/**
 * StageShell — the persistent chrome every lifecycle stage lives inside.
 *
 *   ┌───────────────────────────────────────────────────────────┐
 *   │  Stage title · project meta        [BudgetRibbon] [Pro ▸]  │
 *   │  JourneyRow:  Size up › Lock › ‹Plan› › Build › …          │
 *   ├───────────────────────────────────────────────────────────┤
 *   │  {children — the stage body}                                │
 *   └───────────────────────────────────────────────────────────┘
 *
 * Sized to the viewport minus the global 48px KillerAppNav so the stage
 * fits without page scroll on desktop. Stubbed (WordPress'd) features still
 * render inside this same chrome — that's the rule.
 */

import { type ReactNode } from 'react';
import { StageChromeProvider } from './stage-chrome-context';
import JourneyRow from './JourneyRow';
import BudgetRibbon from './BudgetRibbon';
import ProToggle from './ProToggle';
import StageActionBar from './StageActionBar';
import { STAGE_ACCENTS, type StageId } from '@/design-system/tokens/stage-accents';
import { colors, fonts } from '@/design-system/tokens';

export interface StageShellProps {
  stageId: StageId;
  stageTitle: string;
  projectId: string | null;
  projectName?: string;
  projectMeta?: string;
  initialBudget?: number;
  /** Spent-to-date from the project record — renders "spent / total" in the ribbon. */
  budgetSpent?: number;
  /**
   * Opt-in sticky primary-action bar at the bottom of the stage. When set,
   * StageShell renders one button (default verb for the stage, overridable)
   * that marks the stage complete + advances the journey. Omit it and no bar
   * renders (so stages with their own internal CTA aren't double-actioned).
   */
  primaryAction?: { label?: string; onActivate?: () => void };
  children: ReactNode;
}

export default function StageShell({
  stageId,
  stageTitle,
  projectId,
  projectName,
  projectMeta,
  initialBudget,
  budgetSpent,
  primaryAction,
  children,
}: StageShellProps) {
  const accent = STAGE_ACCENTS[stageId].hex;

  return (
    <StageChromeProvider>
      <div
        style={{
          height: 'calc(100dvh - 48px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: colors.paper.cream,
          fontFamily: fonts.body,
        }}
      >
        <header
          style={{
            flex: '0 0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: '10px clamp(12px, 3vw, 28px) 10px',
            borderBottom: `1px solid ${colors.paper.border}`,
            background: colors.paper.white,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span
                aria-hidden
                style={{ width: 4, height: 34, borderRadius: 4, background: accent, flex: '0 0 auto' }}
              />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: fonts.display,
                    fontSize: 'clamp(18px, 2.6vw, 24px)',
                    fontWeight: 700,
                    color: colors.navy,
                    lineHeight: 1.1,
                  }}
                >
                  {stageTitle}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: colors.graphite,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {projectName && <b style={{ color: colors.navy }}>{projectName}</b>}
                  {projectName && projectMeta ? ' · ' : ''}
                  {projectMeta}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
              <BudgetRibbon projectId={projectId} initialBudget={initialBudget} spent={budgetSpent} />
              <ProToggle />
            </div>
          </div>

          <JourneyRow currentStage={stageId} projectId={projectId} />
        </header>

        <main style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex' }}>
          {children}
        </main>

        {primaryAction && (
          <StageActionBar
            stageId={stageId}
            projectId={projectId}
            label={primaryAction.label}
            onActivate={primaryAction.onActivate}
          />
        )}
      </div>
    </StageChromeProvider>
  );
}
