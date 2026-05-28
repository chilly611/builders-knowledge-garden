'use client';

/**
 * JourneyRow — the persistent 7-stage lifecycle strip.
 *
 * Each stage is a node: a circular marker (emoji, or ✓ once the stage is
 * marked complete) with a plain-text label beneath it — labels always show,
 * never icons-only. The CURRENT stage gets a red-chrome glow; the connector
 * from current → next pulses to suggest forward motion. Whole node is a
 * ≥44px tap target. Completed state is read from the shared stage-complete
 * store (set by the StageActionBar).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LIFECYCLE_STAGES } from '@/lib/lifecycle-stages';
import { type StageId } from '@/design-system/tokens/stage-accents';
import { colors, fonts } from '@/design-system/tokens';
import { readCompletedStages, STAGE_COMPLETE_EVENT, STAGE_SLUG } from './StageActionBar';

const RUST = 'var(--specimen-rust)';          // herbarium specimen-rust (#A53A2D) = Killer App red
const RUST_GLOW = 'rgba(165, 58, 45, 0.125)'; // specimen-rust @ 12.5% — current-stage glow
const SAGE = 'var(--specimen-sage)';          // completed-ring fill (success)
const SAGE_DEEP = 'var(--specimen-sage-deep)'; // completed ✓ overlay
const EXISTING = new Set<StageId>([1, 2, 3, 4, 5, 6, 7]); // all 7 stage routes exist (5-7 are demo stubs)

function hrefFor(stageId: StageId, projectId: string | null): string {
  const base = EXISTING.has(stageId) ? `/killerapp/stages/${STAGE_SLUG[stageId]}` : '/killerapp';
  return projectId ? `${base}?project=${encodeURIComponent(projectId)}` : base;
}

export default function JourneyRow({
  currentStage,
  projectId,
}: {
  currentStage: StageId;
  projectId: string | null;
}) {
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  useEffect(() => {
    setCompleted(readCompletedStages(projectId));
    const onComplete = () => setCompleted(readCompletedStages(projectId));
    window.addEventListener(STAGE_COMPLETE_EVENT, onComplete);
    return () => window.removeEventListener(STAGE_COMPLETE_EVENT, onComplete);
  }, [projectId]);

  return (
    <nav
      aria-label="Project journey"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0,
        width: '100%',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        paddingBottom: 2,
      }}
    >
      {LIFECYCLE_STAGES.map((stage, idx) => {
        const id = stage.id as StageId;
        const isCurrent = id === currentStage;
        const isComplete = completed.has(id) || id < currentStage;
        const isNextAfterCurrent = id === currentStage + 1;

        return (
          <div key={id} style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>
            {idx > 0 && (
              <span
                aria-hidden
                className={isNextAfterCurrent ? 'journey-connector-pulse' : undefined}
                style={{
                  width: 16,
                  height: 2,
                  borderRadius: 2,
                  marginTop: 13,
                  background: isComplete || isCurrent ? RUST : colors.fadedRule,
                  opacity: isComplete || isCurrent ? 0.7 : 0.4,
                }}
              />
            )}
            <Link
              href={hrefFor(id, projectId)}
              title={stage.name}
              aria-current={isCurrent ? 'step' : undefined}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                textDecoration: 'none',
                minWidth: 56,
                minHeight: 44,
                padding: '2px 4px',
                borderRadius: 10,
                background: isCurrent ? RUST_GLOW : 'transparent',
                border: `1px solid ${isCurrent ? RUST : 'transparent'}`,
                cursor: 'pointer',
                transition: 'background 160ms ease',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isComplete ? 14 : 13,
                  fontWeight: 800,
                  color: isComplete ? SAGE_DEEP : isCurrent ? RUST : colors.graphite,
                  background: isComplete ? SAGE : isCurrent ? '#fff' : colors.paper.cream,
                  border: `1.5px solid ${isComplete ? SAGE : isCurrent ? RUST : colors.paper.border}`,
                }}
              >
                {isComplete ? '✓' : stage.emoji}
              </span>
              <span
                style={{
                  fontFamily: fonts.body,
                  fontSize: 10,
                  fontWeight: isCurrent ? 800 : 500,
                  lineHeight: 1.1,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  color: isCurrent ? RUST : isComplete ? colors.navy : colors.graphite,
                }}
              >
                {stage.name}
              </span>
            </Link>
          </div>
        );
      })}

      <style>{`
        nav[aria-label="Project journey"]::-webkit-scrollbar { display: none; }
        @keyframes journeyPulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
        .journey-connector-pulse { animation: journeyPulse 1.4s ease-in-out infinite; }
      `}</style>
    </nav>
  );
}
