'use client';

/**
 * StageWelcomeMount — wires the StageWelcome modal into the killerapp shell.
 *
 * Why this exists:
 *   - `StageWelcome.tsx` was built, tested, and copy-authored, but never
 *     mounted (TODO(W9.D-W2) in `src/app/killerapp/layout.tsx`).
 *   - The modal needs a live `projectId` + a live `stageId`. Both flip as
 *     the user navigates `/killerapp/*`. Mounting once at the layout means
 *     we react to project switches and stage transitions from a single
 *     spot — the layout already owns `stageFromPathname(pathname)`.
 *
 * Behavior:
 *   - Renders nothing until `projectId` is non-null and `stageId` is 1..7
 *     (the picker landing `/killerapp` resolves to stageId=0 and shows no
 *     welcome modal — that's the picker's own surface).
 *   - Uses `key={projectId}-${stageId}` so a project switch or stage
 *     transition forces a fresh `StageWelcome` mount. That re-runs the
 *     internal localStorage dismissal check with the new key, so the
 *     modal re-appears once per (project, stage) until dismissed.
 *   - Per-stage dismissal is owned by `StageWelcome.tsx` itself
 *     (`bkg:stage-welcome:<projectId>:<stageId>` → 'dismissed'). This
 *     mount does not duplicate that logic.
 *   - The `workflows` array passed in is ordered so the
 *     `STAGE_WELCOME[stageId].suggestedWorkflowId` sits first — that's
 *     what `StageWelcome` picks for its CTA — and so the CTA aligns with
 *     the per-stage intent expressed in `stage-welcome-copy.ts`. The
 *     suggested workflow's `href` is looked up via the canonical
 *     `LIVE_WORKFLOW_PATHS` map (same one `NextWorkflowCard` uses), so
 *     the two surfaces cannot diverge on what "the next workflow" means.
 *
 * Cross-account safety:
 *   - `ProjectContext` already clears `bkg:stage-welcome:*` on SIGNED_OUT
 *     and on a tenant switch (see ProjectProvider auth-state effect).
 *     We rely on that — there is no per-mount cleanup here.
 */

import { usePathname } from 'next/navigation';
import { useProject } from '@/lib/hooks/useProject';
import { stageFromPathname } from '@/lib/stage-from-pathname';
import { STAGE_WORKFLOWS } from '@/lib/lifecycle-stages';
import { STAGE_WELCOME } from '@/lib/stage-welcome-copy';
import { LIVE_WORKFLOW_PATHS, liveWorkflowHref } from '@/lib/live-workflows';
import StageWelcome from '@/design-system/components/StageWelcome';

// Workflow labels for the CTA text. Mirrors `WORKFLOW_LABELS` in
// `NextWorkflowCard.tsx` — kept inline to match `docs/workflows.json` and
// avoid pulling NextWorkflowCard's module just for a string table.
const WORKFLOW_LABELS: Record<string, string> = {
  q1: 'Should you take this bid?',
  q2: 'Estimating',
  q3: 'Budget baseline',
  q4: 'Contract Templates',
  q5: 'Code Compliance',
  q6: 'Job Sequencing',
  q7: 'Worker Count',
  q8: 'Permit Applications',
  q9: 'Sub-Management',
  q10: 'Equipment',
  q11: 'Supply Ordering',
  q12: 'Services & Todos',
  q13: 'Hiring',
  q14: 'Weather Scheduling',
  q15: 'Daily Log',
  q16: 'OSHA Toolbox',
  q17: 'Expenses',
  q18: 'Outreach',
  q19: 'Compass Nav',
  q20: 'Manage scope changes',
  q21: 'Request payment draws',
  q22: 'Collect lien waivers',
  q23: 'Payroll check',
  q24: 'Final walk-through',
  q25: 'Collect retainage',
  q26: 'Warranty handoff',
  q27: 'What we learned',
};

type StageId1to7 = 1 | 2 | 3 | 4 | 5 | 6 | 7;

function isStage1to7(n: number): n is StageId1to7 {
  return n >= 1 && n <= 7;
}

/**
 * Build the ordered workflow list for a given stage with the suggested
 * workflow at the head of the array. `StageWelcome` picks the first entry
 * with an `href` for its CTA, so the suggested one wins whenever it's live.
 */
function workflowsForStage(stageId: StageId1to7, projectId: string) {
  const suggestedId = STAGE_WELCOME[stageId].suggestedWorkflowId;
  const allInStage = STAGE_WORKFLOWS[stageId] ?? [];
  const ordered = [
    suggestedId,
    ...allInStage.filter((id) => id !== suggestedId),
  ];
  return ordered.map((id) => ({
    id,
    label: WORKFLOW_LABELS[id] ?? id.toUpperCase(),
    href: liveWorkflowHref(id, projectId) ?? undefined,
  }));
}

export default function StageWelcomeMount() {
  const pathname = usePathname() ?? '';
  const stageId = stageFromPathname(pathname);
  // `useProject` is safe here — StageWelcomeMount is mounted inside the
  // <ProjectProvider> in the killerapp layout. Throws-on-missing-provider
  // would surface as a clear error in dev rather than a silent no-render.
  const { projectId } = useProject();

  // Guard rails:
  //   - No project yet → user hasn't picked one; the picker landing handles
  //     onboarding, not the per-stage modal.
  //   - stageId 0 → landing `/killerapp` page (picker); no stage to welcome.
  //   - stageId not 1..7 → shouldn't happen per `stageFromPathname`, but
  //     belt + suspenders.
  if (!projectId) return null;
  if (!isStage1to7(stageId)) return null;

  const workflows = workflowsForStage(stageId, projectId);

  // `key` forces a fresh component mount when project or stage flips,
  // which re-evaluates the per-(project,stage) localStorage dismissal.
  // Without the key, `StageWelcome`'s internal `isDismissed` state would
  // persist a stale "true" across stage transitions and the modal would
  // never re-appear on the new stage.
  return (
    <StageWelcome
      key={`${projectId}:${stageId}`}
      stageId={stageId}
      projectId={projectId}
      workflows={workflows}
    />
  );
}

// Sanity check — picked up by `LIVE_WORKFLOW_PATHS` consumers in case it
// drifts from `STAGE_WELCOME`. Stages 5/6/7 have no live workflows yet;
// the modal falls back to /killerapp?project= per `StageWelcome.tsx`.
void LIVE_WORKFLOW_PATHS;
