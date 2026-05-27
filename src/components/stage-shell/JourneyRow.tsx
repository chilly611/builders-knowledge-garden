'use client';

/**
 * JourneyRow — the persistent 7-stage lifecycle strip.
 *
 * Size up → Lock it in → Plan it out → Build → Adapt → Collect → Reflect.
 * The current stage is filled with its accent; completed stages read done;
 * upcoming stages are muted. Plan + Build deep-link to their stage pages
 * (the two wired in this restructure); the rest route to the picker.
 */

import Link from 'next/link';
import { LIFECYCLE_STAGES } from '@/lib/lifecycle-stages';
import { STAGE_ACCENTS, type StageId } from '@/design-system/tokens/stage-accents';
import { colors, fonts } from '@/design-system/tokens';

const STAGE_ROUTE: Partial<Record<StageId, string>> = {
  3: '/killerapp/stages/plan',
  4: '/killerapp/stages/build',
};

function hrefFor(stageId: StageId, projectId: string | null): string {
  const base = STAGE_ROUTE[stageId] ?? '/killerapp';
  return projectId ? `${base}?project=${encodeURIComponent(projectId)}` : base;
}

export default function JourneyRow({
  currentStage,
  projectId,
}: {
  currentStage: StageId;
  projectId: string | null;
}) {
  return (
    <nav
      aria-label="Project journey"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        width: '100%',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        padding: '2px 0',
      }}
    >
      {LIFECYCLE_STAGES.map((stage, idx) => {
        const id = stage.id as StageId;
        const accent = STAGE_ACCENTS[id].hex;
        const isCurrent = id === currentStage;
        const isDone = id < currentStage;
        const wired = id in STAGE_ROUTE;

        return (
          <div key={id} style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>
            {idx > 0 && (
              <span
                aria-hidden
                style={{
                  width: 10,
                  height: 2,
                  borderRadius: 2,
                  background: isDone || isCurrent ? accent : colors.fadedRule,
                  opacity: isDone || isCurrent ? 0.6 : 0.4,
                }}
              />
            )}
            <Link
              href={hrefFor(id, projectId)}
              title={stage.name}
              aria-current={isCurrent ? 'step' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                textDecoration: 'none',
                padding: '5px 10px',
                borderRadius: 999,
                fontFamily: fonts.body,
                fontSize: 12.5,
                fontWeight: isCurrent ? 700 : 500,
                lineHeight: 1,
                whiteSpace: 'nowrap',
                color: isCurrent ? '#fff' : isDone ? colors.navy : colors.graphite,
                background: isCurrent ? accent : isDone ? `${accent}1A` : 'transparent',
                border: `1.5px solid ${isCurrent ? accent : isDone ? `${accent}55` : 'transparent'}`,
                opacity: !isCurrent && !isDone && !wired ? 0.55 : 1,
                cursor: 'pointer',
                transition: 'background 160ms ease, color 160ms ease',
              }}
            >
              <span aria-hidden style={{ fontSize: 14 }}>
                {isDone ? '✓' : stage.emoji}
              </span>
              <span className="journey-stage-label">{stage.name}</span>
            </Link>
          </div>
        );
      })}

      <style>{`
        @media (max-width: 760px) {
          .journey-stage-label { display: none; }
        }
        nav[aria-label="Project journey"]::-webkit-scrollbar { display: none; }
      `}</style>
    </nav>
  );
}
