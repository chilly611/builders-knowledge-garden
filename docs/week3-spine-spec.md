# Week 3 Spine Spec — The Contract for Every Workflow Agent

**Last locked:** 2026-04-18 · Chilly + Claude, after the 2B ship.

This document is **binding** for every parallel agent building a Week 3 workflow route. Read it end-to-end before writing a single line of code. If this spec disagrees with your instincts, follow the spec. If the spec disagrees with reality, flag it — don't silently diverge.

---

## 0. Why this spec exists

15 workflows going out in parallel means 15 agents all tempted to:

1. Invent their own budget-write paths → orphaned `budget_items` rows + a broken P&L.
2. Invent their own event shapes → JourneyMapHeader can't surface per-workflow state.
3. Re-implement the workflow chrome → 15 different page skeletons, 15 different Pro Toggles.
4. Wire themselves into `LIVE_WORKFLOWS` from their own commit → merge hell.

This spec locks each of those to a single shared primitive. Do not reimplement.

---

## 1. Route layout — exactly like `code-compliance`

Every new workflow lives at `src/app/killerapp/workflows/<slug>/` with:

```
page.tsx                 ← Server Component. Loads workflow from workflows.json. ~30 LOC.
<QxClient>.tsx           ← Client Component. Wraps <WorkflowShell>. ~60-120 LOC.
```

`<slug>` examples — use kebab-case and match the blurb:

| Workflow | Slug | q-id |
|---|---|---|
| AI Estimating Gate | `estimating` | q2 |
| Job Sequencing | `job-sequencing` | q6 |
| Worker Count | `worker-count` | q7 |
| Permit Applications | `permit-applications` | q8 |
| Sub Management | `sub-management` | q9 |
| Equipment Management | `equipment` | q10 |
| Supply Ordering | `supply-ordering` | q11 |
| Services Todos | `services-todos` | q12 |
| Hiring Lane | `hiring` | q13 |
| Weather Scheduling | `weather-scheduling` | q14 |
| Voice Daily Log | `daily-log` | q15 |
| OSHA Toolbox | `osha-toolbox` | q16 |
| Expense Tracking | `expenses` | q17 |
| Contacts + Outreach | `outreach` | q18 |
| Compass Navigation | `compass-nav` | q19 |

### page.tsx template

```tsx
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import QxClient from './QxClient';

const WORKFLOW_ID = 'qX'; // replace

interface WorkflowsJson {
  lifecycleStages: LifecycleStage[];
  workflows: Workflow[];
}

function loadWorkflow() {
  const raw = readFileSync(resolve(process.cwd(), 'docs/workflows.json'), 'utf-8');
  const parsed = JSON.parse(raw) as WorkflowsJson;
  const wf = parsed.workflows.find((w) => w.id === WORKFLOW_ID);
  if (!wf) throw new Error(`Workflow ${WORKFLOW_ID} missing from workflows.json`);
  return { workflow: wf, stages: parsed.lifecycleStages };
}

export const metadata = {
  title: 'Human-readable title — Builder\'s Knowledge Garden',
  description: 'One-sentence blurb matching killerapp/page.tsx WORKFLOW_BLURBS[qX].',
};

export default function Page() {
  const { workflow, stages } = loadWorkflow();
  return <QxClient workflow={workflow} stages={stages} />;
}
```

### QxClient.tsx template

```tsx
'use client';
import WorkflowShell from '@/design-system/components/WorkflowShell';
import type { Workflow } from '@/design-system/components/WorkflowRenderer.types';
import type { LifecycleStage } from '@/components/JourneyMapHeader';

interface Props { workflow: Workflow; stages: LifecycleStage[]; }

export default function QxClient({ workflow, stages }: Props) {
  return (
    <WorkflowShell
      workflow={workflow}
      stages={stages}
      breadcrumbLabel="Human-readable label"
      // Optional — provide if this workflow needs jurisdiction / trade / lane context.
      // If omitted, WorkflowShell uses sensible defaults from localStorage or the user profile.
      defaultContext={{ lane: 'gc', projectPhase: 'preconstruction' }}
      // Optional — render a workflow-specific panel above the step list.
      // Use this for things like "attach PDF plans" (q2), "pick forecast site" (q14),
      // "pick invoice recipient" (q17). Keep it under ~100 LOC; otherwise factor out.
      topPanel={<MyCustomPanel />}
      // Optional — hook called after every step completion so the workflow can
      // trigger budget writes, emit analysis, etc.
      onStepComplete={(stepResult) => { /* … */ }}
    />
  );
}
```

**If your workflow has no custom panel**, omit `topPanel`. The shell handles everything else — breadcrumb, Pro Toggle, JourneyMapHeader, the 3-way context chooser, the <WorkflowRenderer> mount, and the event footer.

---

## 2. Budget spine — `@/lib/budget-spine`

**Every write to money flows through this module.** Do not `fetch('/api/v1/budget/items', ...)` directly; do not touch Supabase from a workflow component. The spine gives you typed helpers that:

- Look up the active project's `project_budgets.id` (creating it lazily if the user doesn't have one yet with a sensible default budget).
- Map workflow-local concepts to the existing `{phase, category}` pair the API demands.
- Post the row, refresh the summary, and dispatch a `bkg:budget:changed` event so `BudgetWidget` and the Journey Map both light up live.

```ts
// Import everything from this one barrel. Do not reach into submodules.
import {
  recordMaterialCost,      // q11 Supply Ordering
  recordSubcontractorCost, // q9 Sub Management, q20 Change Order
  recordEquipmentCost,     // q10 Equipment Management
  recordLaborCost,         // q7 Worker Count, q13 Hiring
  recordPermitCost,        // q8 Permit Applications
  recordExpense,           // q17 Expense Tracking (receipts)
  recordClientPayment,     // q21 Draw Request / invoice payment (Week 4)
  getProjectBudget,        // any workflow that wants to read current burn
  type BudgetWriteResult,
} from '@/lib/budget-spine';
```

### Phase mapping (Lifecycle stage → budget phase enum)

The budget API wants phase ∈ `{DREAM, DESIGN, PLAN, BUILD, DELIVER, GROW}` — which does NOT match the 7-stage lifecycle. The spine handles this mapping internally; agents should pass `lifecycleStageId` and let the spine translate:

| Lifecycle stage | Budget phase |
|---|---|
| 1 Size Up | DREAM |
| 2 Lock | DESIGN |
| 3 Plan | PLAN |
| 4 Build | BUILD |
| 5 Adapt | BUILD |
| 6 Collect | DELIVER |
| 7 Reflect | GROW |

### Estimate vs. actual

- `is_estimate: true` — budgeting / forecasting. q2 AI Estimate, q9 initial sub bids, q11 supply list forecast.
- `is_estimate: false` — money has actually moved. q17 receipts, paid invoices, signed change orders.

**If you're not sure which, default `is_estimate: true` and leave a comment.** An estimate row is recoverable; a fake "spent" row pollutes P&L.

### Silent-failure rule

If the user has no saved project yet (no `saved_projects` row), the spine returns `{ok: false, reason: 'no-active-project'}` without throwing. Workflow UI should show a gentle "Set up a project first →" link, not an error. Same rule for anonymous/unauthenticated users.

---

## 3. Journey progress events — `@/lib/journey-progress`

Workflow agents emit four event types; the journey store + JourneyMapHeader subscribe. **Never write to localStorage directly from a workflow component.**

```ts
import { emitJourneyEvent } from '@/lib/journey-progress';

// On mount / first interaction
emitJourneyEvent({ type: 'started', workflowId: 'qX', projectId });

// After each step
emitJourneyEvent({
  type: 'step_completed',
  workflowId: 'qX',
  projectId,
  stepId: 'sX-3',
  stepIndex: 2,
  totalSteps: 5,
});

// When all steps marked complete
emitJourneyEvent({ type: 'completed', workflowId: 'qX', projectId });

// When the user hits a blocker, error, or abandons mid-flow
emitJourneyEvent({
  type: 'needs_attention',
  workflowId: 'qX',
  projectId,
  reason: 'plans_pdf_unreadable' | 'budget_over_threshold' | 'sub_missing' | ...,
});
```

**`WorkflowShell` already emits `started` and `step_completed` for you** by piping through the existing `<WorkflowRenderer onEvent>` hook. Agents only need to emit `completed` and `needs_attention` explicitly when their flow has a terminal action or fails gracefully.

### Storage

MVP is per-browser localStorage, keyed `bkg:journey:<userId|anon>:<projectId|default>`. Clerk / Supabase sync waits for the auth push. The store exposes:

```ts
getJourneyState(projectId): Record<workflowId, JourneyWorkflowState>
subscribeJourney(projectId, callback): unsubscribe
```

`JourneyMapHeader` with the new `projectId` prop subscribes and colors each stage chip:

- untouched = no events
- worked (green dot) = at least one `started` or `step_completed`
- needs attention (amber dot) = latest event is `needs_attention`
- done (emerald check) = latest event is `completed`

---

## 4. Context chooser slot

`WorkflowShell` renders the standard 3-way chooser (Jurisdiction · Trade · Lane) by default. If your workflow doesn't need one of these (e.g. q15 Voice Daily Log doesn't care about jurisdiction), pass:

```tsx
<WorkflowShell ... contextFields={['trade', 'lane']} />
```

If your workflow needs MORE than those three (e.g. q14 Weather Scheduling needs a forecast site), use `topPanel`:

```tsx
<WorkflowShell
  ...
  contextFields={['lane']}
  topPanel={<ForecastSitePicker />}
/>
```

---

## 5. Specialist prompts for `analysis_result` steps

Four of the assigned workflows have `analysis_result` steps with **no `promptId`** in workflows.json (orphans from the prototype):

| Workflow | Step | Analysis title | Owner |
|---|---|---|---|
| q9 Sub Management | s9-3 | Bid Analysis | Agent B |
| q10 Equipment Management | s10-3 | Equipment Rental vs. Buy | Agent B |
| q16 OSHA Toolbox | s16-1 | Weekly Toolbox Talk | Agent D |
| q23 Payroll Classification | s23-2 | 1099 vs W-2 Review | — (not in Week 3 scope) |

For the three in-scope orphans, the owning agent writes a specialist prompt at `docs/ai-prompts/<slug>.md` matching the pattern of existing prompts (check any file in that directory). Register it via whatever `PROMPTS` map already aggregates them (grep for `sequencing-bottlenecks` to find the registry), and pass `promptId` into the workflow step override. If registering a prompt proves hard, the agent can render a simple static placeholder with a TODO so the route still ships — but prefer authoring the prompt.

---

## 6. LIVE_WORKFLOWS wiring — do NOT touch page.tsx

Each agent appends one line to **`docs/week3-integration-worksheet.md`** with the form:

```
q2  estimating        Agent A  (2026-04-18 09:15Z)  ready
q6  job-sequencing    Agent A  (2026-04-18 09:18Z)  ready
```

The integrator pass (W3.7) collects these and makes a single edit to `src/app/killerapp/page.tsx` adding all 15 rows to `LIVE_WORKFLOWS`. This avoids 15 agents trying to edit the same file.

---

## 7. Acceptance checklist (per agent, per workflow)

Before you mark your workflow `ready` in the integration worksheet:

- [ ] `page.tsx` loads the correct workflow id from `workflows.json` with the Server Component pattern.
- [ ] `<QxClient>` is a Client Component (`'use client'`), wraps `<WorkflowShell>`, and is under ~150 LOC.
- [ ] Any budget-touching step calls `recordXxxCost` from `@/lib/budget-spine` — not `fetch` or Supabase directly.
- [ ] Terminal steps emit `journey-progress` `completed` or `needs_attention`.
- [ ] `npx tsc --noEmit` exits 0 for the files you added.
- [ ] Your route renders without crashing on an empty project / anonymous user (spine returns `no-active-project`, UI shows gentle CTA, no white-screen).
- [ ] Blurb in `src/app/killerapp/page.tsx WORKFLOW_BLURBS[qX]` still matches what your route actually does. If you meaningfully changed scope, propose a blurb rewrite in your integration worksheet row.

---

## 8. What you absolutely do NOT do

- Edit `src/app/killerapp/page.tsx` — integrator's job.
- Edit `docs/workflows.json` — workflows are frozen input.
- Edit `src/components/JourneyMapHeader.tsx` — W3.3 owns that.
- Edit `src/lib/budget-spine.ts` — W3.2 owns that. Ask for a new helper instead.
- Edit `src/app/layout.tsx` or anything rendering `<CompassBloom>` — W3.6 owns nav.
- Add a new top-level folder under `src/`. Everything you need already has a home.
- Ship a workflow whose only step is a TODO. If an orphan analysis prompt is blocking, say so in the worksheet — don't silently stub.

---

## 9. If something feels wrong

Flag it in the integration worksheet under your row. Phrases like "spec says X but X seems to contradict Y in workflows.json" are exactly the kind of feedback that should land there. Spec updates between Phase 1 (now) and Phase 2 (farm) are cheap. Spec drift across 15 merged routes is expensive.

Ship boldly. Flag honestly. The goal is all 15 routes lighting up `LIVE` on the picker by the end of Week 3.
