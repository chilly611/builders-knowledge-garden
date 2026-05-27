'use client';

/**
 * StageActionBar — the single primary action pinned to the bottom of a stage.
 *
 * One button, one stage-appropriate verb. On activate it marks the current
 * stage complete (localStorage, read by JourneyRow for the ✓), then advances
 * to the next stage's route if that route exists, otherwise shows a brief
 * "wrapped — next coming soon" confirmation. The stage insight card sits
 * directly ABOVE this bar (the stage body renders it as its last block).
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { StageId } from '@/design-system/tokens/stage-accents';
import { colors, fonts } from '@/design-system/tokens';

const RED_CHROME = '#E8443A'; // Killer App brand

export const STAGE_VERBS: Record<StageId, string> = {
  1: 'Lock the scope',
  2: 'Send the agreement',
  3: 'Approve the plan, start building',
  4: 'Wrap up build, move to adapt',
  5: 'Settle changes, send pay app',
  6: 'Close the books',
  7: 'Save reflections, finish project',
};

export const STAGE_SLUG: Record<StageId, string> = {
  1: 'size-up',
  2: 'lock',
  3: 'plan',
  4: 'build',
  5: 'adapt',
  6: 'collect',
  7: 'reflect',
};

/** Stage routes that actually exist today (others show a "coming soon" wrap). */
const EXISTING_STAGE_ROUTES = new Set<StageId>([1, 2, 3, 4]);

const COMPLETE_EVENT = 'bkg:stage:complete';

function completeKey(projectId: string | null): string {
  return `bkg:stage-complete:${projectId ?? 'anon'}`;
}

export function readCompletedStages(projectId: string | null): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(completeKey(projectId));
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function markStageComplete(projectId: string | null, stageId: number): void {
  if (typeof window === 'undefined') return;
  try {
    const set = readCompletedStages(projectId);
    set.add(stageId);
    window.localStorage.setItem(completeKey(projectId), JSON.stringify([...set]));
    window.dispatchEvent(new CustomEvent(COMPLETE_EVENT, { detail: { projectId, stageId } }));
  } catch {
    /* ignore */
  }
}

export const STAGE_COMPLETE_EVENT = COMPLETE_EVENT;

export default function StageActionBar({
  stageId,
  projectId,
  label,
  onActivate,
}: {
  stageId: StageId;
  projectId: string | null;
  /** Override the default verb. */
  label?: string;
  /** Extra side-effect before advancing (e.g. emit a journey event). */
  onActivate?: () => void;
}) {
  const router = useRouter();
  const [done, setDone] = useState(false);
  const nextStage = (stageId + 1) as StageId;
  const nextExists = nextStage <= 7 && EXISTING_STAGE_ROUTES.has(nextStage);
  const verb = label ?? STAGE_VERBS[stageId];

  function activate() {
    if (done) return;
    onActivate?.();
    markStageComplete(projectId, stageId);
    setDone(true);
    if (nextExists) {
      const qs = projectId ? `?project=${encodeURIComponent(projectId)}` : '';
      setTimeout(() => router.push(`/killerapp/stages/${STAGE_SLUG[nextStage]}${qs}`), 450);
    }
  }

  return (
    <div
      style={{
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px clamp(12px, 3vw, 24px)',
        borderTop: `1px solid ${colors.paper.border}`,
        background: colors.paper.white,
      }}
    >
      <button
        type="button"
        onClick={activate}
        disabled={done}
        style={{
          flex: 1,
          minHeight: 48,
          padding: '12px 20px',
          borderRadius: 12,
          border: 'none',
          cursor: done ? 'default' : 'pointer',
          fontFamily: fonts.body,
          fontSize: 15,
          fontWeight: 800,
          letterSpacing: 0.2,
          color: '#fff',
          background: done ? colors.status?.success ?? '#4F7A4A' : RED_CHROME,
          boxShadow: done ? 'none' : `0 4px 14px ${RED_CHROME}40`,
          transition: 'background 200ms ease, box-shadow 200ms ease',
        }}
      >
        {done
          ? nextExists
            ? `✓ ${STAGE_SLUG[stageId]} complete — opening ${STAGE_SLUG[nextStage]}…`
            : `✓ ${STAGE_SLUG[stageId]} wrapped — ${STAGE_SLUG[nextStage] ?? 'done'} coming soon`
          : verb}
      </button>
    </div>
  );
}
