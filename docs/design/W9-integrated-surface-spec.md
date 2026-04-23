# W9 Integrated Navigator Architecture Spec
## A Unified Chrome Surface for Journey, Time Machine, and Budget Timeline

**Status:** Architecture Design Document (locked pending founder review of Item 10: Open Questions)  
**Target Deploy:** Phase 1 (Compact only) by EOW9; Phase 2 (Expanded) by EOW10; Phase 3 (Time Machine) by EOW11  
**Authored:** Session serene-wonderful-feynman, April 22, 2026

---

## 1. Component Tree

### ASCII Diagram: IntegratedNavigator Hierarchy

```
<IntegratedNavigator projectId={string} collapseState="compact|expanded|hidden" />
├── <JourneyStrip>  [EXISTING: exists as conceptual part of GlobalJourneyMapHeader]
│   ├── Stage pills (7x, horizontally scrollable)
│   │   ├── Stage ID + emoji + name
│   │   ├── Progress indicator (worked/done/needsAttention)
│   │   └── Click handler: route to stage
│   │
│   └── Current-stage money display
│       └── Total committed + spent for active stage (from budget-spine)
│
├── <TimeMachineLever>  [NEW: horizontal scrubber to rewind to earlier states]
│   ├── Scrub track (visual rails)
│   ├── Draggable lever/thumb
│   ├── Snapshot labels (dates/stage names)
│   └── onScrub(snapshotId) callback
│
└── <BudgetTimeline>  [NEW: row-by-row money totals beneath each stage]
    ├── Stage label (left column)
    ├── Committed amount
    ├── Spent amount
    ├── Remaining amount
    └── Status badge (on-track / overbudget / not-started)
```

### Existing vs. New Components

| Component | Exists? | Notes |
|---|---|---|
| `GlobalJourneyMapHeader` | Yes | Wraps ProjectCompass; gated off on `/killerapp` picker. Will be refactored/replaced by IntegratedNavigator. |
| `JourneyMapHeader` | Yes | Thin presentational strip showing 7 stages. Reusable; will become `<JourneyStrip>` subcomponent. |
| `JourneyPills` | Yes | Engraved-plate stage visualization. Already styled per brand tokens. Can be adapted. |
| `ProjectCompass` | Yes | Large dashboard combining HeroBand + JourneyPills + BudgetRiver + more. `<IntegratedNavigator>` will **not** replace this; they coexist. |
| `TimeMachineLever` | NO | Must build. Horizontal scrubber metaphor — H.G. Wells lever. |
| `BudgetTimeline` | NO | Must build. Per-stage money breakdown in a horizontal row format. |
| `IntegratedNavigator` | NO | Must build. The orchestrator that composes the three surfaces into one stacked, collapsible chrome. |

---

## 2. State Model

### TypeScript Interfaces

```typescript
// Navigator collapse state — user controls via expand/collapse affordance
export type NavigatorCollapseState = 'hidden' | 'compact' | 'expanded';

export interface NavigatorState {
  // Collapse state (stored in URL param or Context, see § Architectural Choice below)
  collapseState: NavigatorCollapseState;

  // Which snapshot the time machine is showing (null = "now")
  // Snapshot format: { snapshotId: string; label: string; timestamp: ISO; stageId: number }
  currentSnapshotId: string | null;

  // Hover state on budget stage totals (for tooltip behavior)
  hoveredStageId: number | null;

  // Keyboard nav active stage (for a11y focus management)
  focusedStageId: number | null;

  // Reduced motion preference (from user system settings)
  prefersReducedMotion: boolean;
}

export interface JourneyState {
  // ← Existing from journey-progress.ts, reused as-is
  // Record<workflowId, JourneyWorkflowState>
  // Holds per-workflow status (in_progress, done, needs_attention, untouched)
}

export interface TimeMachineState {
  // Available snapshots (chronologically ordered, most recent first)
  snapshots: Array<{
    snapshotId: string;
    label: string; // e.g., "Apr 20, 10:30am" or "Before v2 estimates"
    timestamp: string; // ISO 8601
    stageId: number; // which stage was active when snapped
  }>;

  // What data does this snapshot represent?
  snapshotDataVersion: 'estimates' | 'actuals' | 'both';
}

export interface BudgetTimelineState {
  // Per-stage breakdown (maps directly to what budget-spine provides)
  byStage: Record<number, {
    stageId: number;
    committed: number;
    spent: number;
    remaining: number;
    status: 'not-started' | 'on-track' | 'overbudget';
  }>;

  // Running totals (cumulative left-to-right)
  cumulativeByStage: Record<number, {
    committed: number;
    spent: number;
    remaining: number;
  }>;

  // Overall signal
  isOverbudget: boolean;
  totalOverAmount: number;
}

// ─── Where state lives ───────────────────────────────────────────────────
// Architectural decision (see § Open Questions):
//
// Option A (Recommended): Context + localStorage
//   - NavigatorState lives in <NavigatorContext> (created in layout.tsx).
//   - Collapse state stored in localStorage for persistence across sessions.
//   - TimeMachine + BudgetTimeline state derived from:
//     a) budget-spine snapshots API (if available) OR
//     b) localStorage snapshot history (MVP fallback)
//
// Option B: URL params only
//   - collapseState=compact|expanded|hidden appended to every /killerapp/* URL.
//   - Time machine state encoded in ?snapshot=uuid.
//   - Lighter-weight; shareable links carry state.
//   - Trade-off: links become complex; history handling requires client-side router.
//
// Option C: Per-component local state
//   - Simplest MVP; each component owns its collapse/scrub state.
//   - Zero persistence; state resets on navigation.
//   - Not recommended for a "core chrome" that should be ever-present.
//
// **Recommendation:** Option A (Context + localStorage). Matches precedent
// set by `useActiveProject` hook and gives persistence without URL clutter.
```

### State Origin and Flow

```
┌─────────────────────────────────────────────────────┐
│ GlobalJourneyMapHeader / journey-progress.ts        │
│ (already fetches journey state + compass data)      │
└─────────────────────┬───────────────────────────────┘
                      │
                      ├─→ Pass to <IntegratedNavigator>
                      │
                      └─→ Filtered/transformed:
                         • progressByStage → JourneyStrip
                         • stagePayments → BudgetTimeline
                         • (time machine snapshots ← new API call)

┌─────────────────────────────────────────────────────┐
│ budget-spine.ts / getProjectBudget()                │
│ (fetches /api/v1/budget?project_id=X)              │
└─────────────────────┬───────────────────────────────┘
                      │
                      └─→ Derived in BudgetTimelineState:
                         • byStage[id].committed (from API byPhase[phase])
                         • byStage[id].spent (from API byPhase[phase].spent)
                         • byStage[id].remaining (calculated)
                         • isOverbudget flag
```

---

## 3. Interaction States

### Collapse Affordance

**Hidden → Compact → Expanded → Hidden (cycle)**

- **Hidden:** Zero height; pill shows only stage count (e.g., "3/7") as a minimalist whisper.
- **Compact:** Single horizontal strip showing current stage, current-stage money total, and small "expand" arrow. ~60px height.
- **Expanded:** Full three-layer stack (Journey + TimeMachine + Budget). ~240px height.
- **Trigger:** Click the collapse/expand affordance (≥44px touch target) at left of the pill.

### Stage Pill Click

1. Click a stage pill → dispatch `onStageClick(stageId)` callback.
2. Parent component (GlobalJourneyMapHeader / layout.tsx) routes via `router.push('/killerapp/workflows?stage=X')`.
3. As user lands on stage's first workflow, `markStageVisited(projectId, stageId)` fires.
4. JourneyStrip re-renders with updated visited state (visual change: gray → color).

### Time Machine Lever Drag

1. User clicks/touches lever thumb and drags horizontally.
2. As thumb moves, find nearest snapshot on the timeline; highlight it.
3. On release, call `onTimeScrub(snapshotId, snapshotData)`.
4. IntegratedNavigator dispatches `bkg:time-machine:scrubbed` event (custom event).
5. Downstream listeners (Budget widget, Journey state) check if they should show historical data or current data.
6. Visual affordance: lever moves smoothly; snapshot label + date appear above.

### Budget Stage Hover

1. Hover over a stage's money row (committed/spent/remaining).
2. Show a tooltip with breakdown:
   ```
   Committed: $15,000
   Spent: $12,300
   Remaining: $2,700
   Status: on-track
   ```
3. If overbudget, color the entire row in orange (`--orange`) and show "⚠ $X over."

### Keyboard Navigation

- Tab into the stage pills.
- Arrow keys: Left/Right to move between stages.
- Enter: "click" the current stage pill (dispatch navigation).
- Home/End: Jump to first/last stage.
- Space: Toggle collapse state.

### Reduced-Motion Fallback

- When `prefers-reduced-motion: reduce` is set in user's OS:
  - All transitions disabled (no slide, fade, or lever-drag animation).
  - Collapse state changes instantly.
  - Time machine scrub "snaps" to the nearest snapshot rather than smoothly gliding.
  - Budget totals update with no transition.

---

## 4. Data Contracts

### Input Data — What IntegratedNavigator Needs to Receive

#### From `journey-progress.ts` (existing)

```typescript
// JourneyState: Record<workflowId, JourneyWorkflowState>
// Already provided to GlobalJourneyMapHeader. Pass through to IntegratedNavigator.
const state: JourneyState = {
  'code-compliance-lookup': {
    status: 'done',
    stepsCompleted: 4,
    totalSteps: 4,
    lastEventAt: 1713624600,
  },
  // ...
};

// progressByStage: rolled-up state per lifecycle stage
// Computed via rollupByStage(state, STAGE_WORKFLOWS).
const progressByStage: Record<number, StageProgress> = {
  1: { worked: 2, done: 1, needsAttention: 0, total: 3 }, // Size Up: 2 worked, 1 done
  // ...
};
```

#### From `budget-spine.ts` / `getProjectBudget()` (existing)

```typescript
// BudgetApiSummary from /api/v1/budget?project_id=X
const budgetSummary = {
  totalBudget: 150000,
  totalSpent: 75000,
  totalEstimated: 130000,
  remaining: 20000,
  byPhase: {
    DREAM: { spent: 5000, estimated: 8000, count: 2 },
    DESIGN: { spent: 10000, estimated: 12000, count: 1 },
    PLAN: { spent: 15000, estimated: 20000, count: 3 },
    BUILD: { spent: 30000, estimated: 70000, count: 5 },
    DELIVER: { spent: 10000, estimated: 15000, count: 1 },
    GROW: { spent: 5000, estimated: 5000, count: 0 },
  },
};

// Need to map BudgetApiSummary.byPhase → IntegratedNavigator.BudgetTimelineState.byStage
// using STAGE_TO_PHASE mapping from project-compass-data.ts:
// 1→DREAM, 2→DESIGN, 3→PLAN, 4&5→BUILD, 6→DELIVER, 7→GROW
```

#### From `workflows.json` (existing)

```typescript
// LIFECYCLE_STAGES: used to label the stage pills
const lifecycleStages: LifecycleStage[] = [
  { id: 1, name: 'Size Up', emoji: '🧭' },
  { id: 2, name: 'Lock', emoji: '🔒' },
  // ...
];

// STAGE_WORKFLOWS: maps stageId → [workflowIds in that stage]
const stageWorkflows: Record<number, string[]> = {
  1: ['pre-bid-risk-score', 'ai-estimating-gate', 'crm-client-lookup'],
  2: ['contract-templates', 'code-compliance-lookup'],
  // ...
};
```

### Data Gaps — What Doesn't Exist Yet and Needs Building

#### 1. **Time Machine Snapshots API**

Currently no endpoint to fetch historical states. Need:

```typescript
// GET /api/v1/projects/{projectId}/snapshots
// Returns: Array<{
//   snapshotId: string; // UUID
//   label: string;      // "Before v2 estimates" or auto-labeled date
//   timestamp: string;  // ISO 8601
//   stageId: number;    // which stage was active
//   estimates?: { byPhase: Record<string, { estimated, committed }> };
//   actuals?: { byPhase: Record<string, { spent }> };
// }>

// For MVP: snapshots stored in ProjectSnapshots table (Supabase).
// Trigger: Every call to recordMaterialCost / recordLaborCost creates a snapshot automatically.
// Retention: Last 30 snapshots per project (configurable).
```

**Flag:** This is the biggest gap. Time machine cannot work without a way to fetch and label historical states. Either:
- **Option A (Recommended):** Wire up a snapshots table + API endpoint. Snapshots created at each budget write.
- **Option B (MVP Fallback):** Store snapshots in localStorage only (no cross-device sync; lost on browser clear).
- **Open Question § Item 2 below.**

#### 2. **Per-Stage Budget Breakdown**

Currently `budget-spine` groups by **phase** (DREAM, DESIGN, PLAN, BUILD, DELIVER, GROW).  
Need to map to **lifecycle stage** (1–7).

**Mapping already exists** in `project-compass-data.ts:STAGE_TO_PHASE`, so this is just a transform layer in the component. No new API needed, but need to **verify the 4&5→BUILD coalescing** doesn't lose per-stage granularity.

**Flag:** When stages 4 and 5 both exist, how should committed/spent be split? 50/50 or based on workflow count?  
**Open Question § Item 3 below.**

---

## 5. React API Surface

### IntegratedNavigator Props

```typescript
interface IntegratedNavigatorProps {
  /**
   * Active project ID. If null/undefined, component is silent (renders nothing).
   * Typically from useActiveProject() hook.
   */
  projectId: string | null;

  /**
   * Collapse state: 'hidden' | 'compact' | 'expanded'.
   * Defaults to 'compact'. Recommended: derive from URL param or Context.
   * When changed, IntegratedNavigator smoothly transitions height.
   */
  collapseState?: NavigatorCollapseState;

  /**
   * Callback fired when user clicks a stage pill.
   * Parent should route to that stage (e.g., router.push('/killerapp/workflows?stage=X')).
   */
  onStageClick?: (stageId: number) => void;

  /**
   * Callback fired when user scrubs the time machine lever.
   * Arg includes the snapshot ID and metadata (date, stage, label).
   * Parent can decide whether to re-render Budget widget, Journey state, etc.
   */
  onTimeScrub?: (snapshotId: string, snapshotLabel: string) => void;

  /**
   * Called when user clicks the expand/collapse affordance.
   * Parent (or Context setter) uses this to update collapseState.
   */
  onCollapseStateChange?: (newState: NavigatorCollapseState) => void;

  /**
   * Current stage ID (for highlighting the active pill).
   * Typically from stageIdForPath(pathname).
   */
  currentStageId?: number | null;

  /**
   * Progress rollup per stage. Computed via rollupByStage(journeyState, STAGE_WORKFLOWS).
   * Drives the progress dots/checkmarks on the stage pills.
   */
  progressByStage?: Record<number, StageProgress>;

  /**
   * Budget summary from getProjectBudget().
   * Used to compute per-stage committed/spent/remaining in BudgetTimeline.
   */
  budgetSummary?: BudgetApiSummary;

  /**
   * Visited stage IDs. Drives "gray-seen" vs "gray-unseen" visual.
   * From subscribeVisitedStages(projectId).
   */
  visitedStageIds?: number[];

  /**
   * Optional: Array of snapshots from time-machine API.
   * If provided, TimeMachineLever renders. If absent/empty, Time Machine hidden.
   */
  snapshots?: Array<{
    snapshotId: string;
    label: string;
    timestamp: string;
    stageId: number;
  }>;

  /**
   * Optional custom class name for root div.
   */
  className?: string;
}
```

### Default Values

```typescript
const DEFAULTS = {
  collapseState: 'compact' as NavigatorCollapseState,
  currentStageId: null,
  progressByStage: {},
  budgetSummary: null,
  visitedStageIds: [],
  snapshots: [],
};
```

---

## 6. Integration Points

### File Changes: High-Level Diffs

#### A. `src/app/killerapp/layout.tsx`

**Current:**
```tsx
const showJourneyStrip = pathname !== '/killerapp';
// ...
{showJourneyStrip && <GlobalJourneyMapHeader />}
```

**After Integration (Option 1: Replace GlobalJourneyMapHeader):**
```tsx
const showJourneyStrip = pathname !== '/killerapp';
// ...
{showJourneyStrip && <IntegratedNavigator projectId={...} collapseState={...} />}
// GlobalJourneyMapHeader is removed.
```

**After Integration (Option 2: Wrap GlobalJourneyMapHeader with IntegratedNavigator):**
```tsx
const showJourneyStrip = pathname !== '/killerapp';
// ...
{showJourneyStrip && (
  <IntegratedNavigator
    projectId={...}
    collapseState={...}
    onStageClick={...}
    onTimeScrub={...}
  >
    {/* ProjectCompass lives inside, styled as part of expanded state */}
  </IntegratedNavigator>
)}
```

**Recommendation:** Option 1 (replace). `GlobalJourneyMapHeader` becomes an internal detail of `IntegratedNavigator`. ProjectCompass stays as a separate dashboard on the project detail page.

#### B. `src/components/GlobalJourneyMapHeader.tsx`

**Fate:** Deleted OR refactored into IntegratedNavigator's initialization logic.

The logic that subscribes to journey state, fetches budget, and marks stages visited becomes internal to `IntegratedNavigator` (or passed down to it via props).

#### C. `src/components/GlobalBudgetWidget.tsx`

**No change.** Remains at top-right. IntegratedNavigator shows per-stage breakdowns; GlobalBudgetWidget shows overall summary pill. They coexist without conflict.

#### D. **New files:**

1. `src/components/IntegratedNavigator.tsx` — Main orchestrator component.
2. `src/components/navigator/JourneyStrip.tsx` — Refactored from JourneyMapHeader + JourneyPills. Shows stage pills + current-stage money.
3. `src/components/navigator/TimeMachineLever.tsx` — Horizontal scrubber. Uses React Spring or Framer Motion for smooth drag.
4. `src/components/navigator/BudgetTimeline.tsx` — Per-stage money breakdown row.
5. `src/hooks/use-navigator-state.tsx` — Hook to manage collapse state + localStorage persistence.
6. `src/context/NavigatorContext.tsx` — Context provider for collapse state, hover state, snapshot state.

#### E. **API changes (backend):**

1. Create `POST /api/v1/projects/{projectId}/snapshots` to save snapshots automatically on budget writes.
2. Create `GET /api/v1/projects/{projectId}/snapshots` to fetch snapshot history.
3. Add `Snapshots` table to Supabase schema if it doesn't exist.

---

## 7. Edge Cases

### No Project Selected

**Behavior:** IntegratedNavigator renders nothing. Matches pattern of GlobalBudgetWidget.

```typescript
if (!projectId) return null;
```

### Project with No Stages Completed

**Behavior:** All stage pills render in "not-started" (gray, no progress dot). Budget Timeline shows all zeros. Time Machine shows no snapshots.

Visual: Still renders the chrome; just inert / gray.

### Project Overbudget (flagged in budget-spine)

**Behavior:** 
- BudgetTimeline highlights the over-budget stage in orange.
- Overall status badge shows "⚠ $X over."
- Budget pill in top-right already red; IntegratedNavigator reinforces with consistent color.

### Time Machine on Fresh Project (no snapshots)

**Behavior:** TimeMachineLever does not render if snapshots array is empty. Only JourneyStrip + BudgetTimeline show.

**Edge case:** What if a project has 1+ snapshots but user scrubs to a snapshot from before a stage was added? Answer: Snapshot metadata should include `stageId` so the UI can gracefully handle timeline gaps. See § Open Question Item 5.

### Narrow Viewport (390px)

**Responsive rules:**
- **Compact state:** Single horizontal strip with stage pills scrollable (existing pattern from JourneyMapHeader).
- **Expanded state:** Stack remains vertical, but font sizes reduce; no horizontal scroll (budget timeline fits as-is).
- **Time Machine:** Lever track truncated but still draggable; labels hidden (show tooltip instead).
- Tested on: iPhone 12 (390px), iPad (768px), Desktop (1200px+).

### Offline / Network Failure

**Behavior:** 
- Journey state loads from localStorage (existing pattern).
- Budget summary: if fetch fails, show fallback "Loading budget…" or skip BudgetTimeline.
- Snapshots: if fetch fails, Time Machine hidden. No error toast (best-effort UI).

---

## 8. Visual Hierarchy — ASCII/Rough Sketch

### Expanded State Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ [◀ collapse arrow]  JOURNEY MAP — Stage Progression             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1           2          3           4        5         6    7   │
│ [🧭 Size]  [🔒 Lock] [📐 Plan]  [🔨 Build] [🔄 Adapt] [💰 Co…] [📖 Re…]
│  Up         ✓         ✓          ⊙ current  —          —    —   │
│ (0/3)      (3/3)      (5/5)       ($8.2K)           (0/1) (0/1) │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ TIME MACHINE (horizontal lever)                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ◀ ─────◇─────────────────────────────────────────────── ▶      │
│    Apr 19    Apr 20 ◆ [NOW]        Apr 22         Apr 23        │
│   snapshot      snapshot           snapshot       snapshot       │
│  (show labels above on hover)                                    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ BUDGET TIMELINE (per-stage money breakdown)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Size Up    Committed: $5K   Spent: $3.2K  Remaining: $1.8K  ✓   │
│ Lock       Committed: $8K   Spent: $8K    Remaining: $0K    ✓   │
│ Plan       Committed: $20K  Spent: $15K   Remaining: $5K    ▸   │
│ Build      Committed: $85K  Spent: $40K   Remaining: $45K   ⊙   │
│ Adapt      Committed: $10K  Spent: $0K    Remaining: $10K   —   │
│ Collect    Committed: $10K  Spent: $0K    Remaining: $10K   —   │
│ Reflect    Committed: $2K   Spent: $0K    Remaining: $2K    —   │
│                                                                 │
│ TOTAL      Committed: $140K Spent: $66.2K Remaining: $73.8K    │
│                                  [Status: on-track]            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Compact State Layout

```
┌──────────────────────────────────────────────────────────────┐
│ [▶ expand arrow]  Build (4/7)  ⊙ current stage  $8.2K spent  │
└──────────────────────────────────────────────────────────────┘
```

### Hidden State Layout

```
┌──────────────────────────────────────────────────────────────┐
│ [▶ expand arrow]  4/7                                        │
└──────────────────────────────────────────────────────────────┘
```

### Money Display Placement (BudgetTimeline Row)

**Left to right:**
```
Stage Name | Committed $ | Spent $ | Remaining $ | Status Badge
```

**Status badge symbols:**
- `✓` = complete (all workflows in stage marked done)
- `▸` = in progress (some workflows started)
- `⊙` = current stage (bold highlighting)
- `—` = not started (gray, muted)
- `⚠` = overbudget (orange, appears next to stage name if over)

---

## 9. Build Phases

### Phase 1: MVP (Compact Only) — Target EOW9

**Scope:**
- `<IntegratedNavigator>` renders only in **Compact state**.
- No expand/collapse toggle (static compact display).
- Shows:
  - Current stage name + emoji
  - Stage number (e.g., "4/7")
  - Current-stage total committed amount (from budget-spine)
  - No Time Machine, no BudgetTimeline detail.
- Mounted in `src/app/killerapp/layout.tsx` in place of `GlobalJourneyMapHeader`.

**Files:**
1. `src/components/IntegratedNavigator.tsx` (compact-only)
2. `src/components/navigator/JourneyStrip.tsx` (single-line version)
3. Hook up to existing journey-progress + budget-spine data.

**Testing:**
- Journey state updates → stage chips update.
- Budget writes → current-stage money updates.
- Route changes → current stage highlights.

---

### Phase 2: Expanded State & Budget Timeline — Target EOW10

**Scope:**
- Add expand/collapse affordance (hamburger icon or chevron).
- Implement full **JourneyStrip** (all 7 pills with progress indicators).
- Implement **BudgetTimeline** (per-stage committed/spent/remaining table).
- Smooth height transition between compact ↔ expanded.
- Collapse state persisted to localStorage.

**Files:**
1. Extend `src/components/IntegratedNavigator.tsx` with collapse logic.
2. `src/components/navigator/BudgetTimeline.tsx` (new).
3. `src/hooks/use-navigator-state.tsx` (collapse state + localStorage).
4. `src/context/NavigatorContext.tsx` (if needed for hover/focus).

**Testing:**
- Collapse state toggles smoothly.
- Persists across navigation and page reload.
- Budget totals calculate correctly per stage.
- Overbudget highlighting appears when appropriate.
- Responsive on mobile (stacks, scrollable if needed).

---

### Phase 3: Time Machine Scrubber — Target EOW11

**Scope:**
- Implement **TimeMachineLever** component (horizontal scrubber).
- Wire up snapshots API (`GET /api/v1/projects/{projectId}/snapshots`).
- Dispatch `onTimeScrub` callback when lever moves.
- Show snapshot labels and dates on hover.
- Smooth drag animation (Framer Motion or React Spring).

**Backend Dependencies:**
1. `POST /api/v1/projects/{projectId}/snapshots` — save snapshots on budget writes.
2. `GET /api/v1/projects/{projectId}/snapshots` — fetch snapshot history.
3. Supabase `ProjectSnapshots` table (if doesn't exist).

**Files:**
1. `src/components/navigator/TimeMachineLever.tsx` (new).
2. `src/lib/time-machine.ts` (API calls + snapshot logic).
3. Backend: snapshots API routes + migrations.

**Testing:**
- Snapshots created and fetched correctly.
- Lever drag updates UI smoothly.
- Snapshot labels display on hover.
- Budget widget/journey state can optionally re-render to show historical data.

---

## 10. Open Questions (for Founder Input)

### 1. **Should Time Machine show historical journey state + budget, or just budget?**

When user scrubs to a past snapshot, should:
- **A (Full Rewind):** Both journey state AND budget show historical values?
  - Pro: Full audit trail; see exactly what was planned vs. executed at any moment.
  - Con: Complex; requires storing journey snapshots too (snapshots table grows).
- **B (Budget Only):** Only budget/estimates change; journey state stays current?
  - Pro: Simpler; budget is the changeable part.
  - Con: Less useful for "comparing what we estimated then vs. what we've done now."
- **Decision required:** A or B?

### 2. **What triggers snapshots? Auto on every budget write, or manual "save checkpoint"?**

- **A (Auto):** Every `recordMaterialCost`, `recordLaborCost`, etc. creates a snapshot.
  - Pro: Complete history.
  - Con: Snapshot table grows quickly; potentially noisy.
- **B (Manual):** User clicks a "Save checkpoint" button before major changes.
  - Pro: Intentional, clean history.
  - Con: User must remember; easy to miss important transitions.
- **C (Hybrid):** Auto-snapshots daily + manual save on demand.
  - Pro: Best of both.
  - Con: Most complex.
- **Decision required:** A, B, or C?

### 3. **How to split BUILD stage (4 & 5) when both have budget but no workflow distinction?**

Stages 4 (Build) and 5 (Adapt) both map to API phase "BUILD". When displaying per-stage breakdown:
- **A (50/50):** Split committed/spent equally.
- **B (By Workflow Count):** Allocate based on how many workflows are in each stage.
- **C (Separate from Start):** Extend budget API to return per-stage breakdowns (not per-phase).
- **Decision required:** A, B, or C? (Recommend C long-term, A for MVP.)

### 4. **Should IntegratedNavigator also replace ProjectCompass, or just coexist?**

Currently:
- `GlobalJourneyMapHeader` + `ProjectCompass` live in `/killerapp/projects/{id}` route.
- IntegratedNavigator will live in `/killerapp/layout.tsx` (every sub-route).

Should IntegratedNavigator's expanded state be the primary project dashboard, or keep ProjectCompass as a separate "details" route?
- **A (Coexist):** IntegratedNavigator is chrome; ProjectCompass is a deep-dive detail view (kept).
- **B (Replace):** IntegratedNavigator expanded = the main dashboard; deprecate ProjectCompass.
- **Decision required:** A or B?

### 5. **What happens if a snapshot was taken before a new stage was added to the project?**

Example: Snapshot from "when there were 6 stages" but project now has 7 (Reflect was added later).

Should the UI:
- **A:** Show the snapshot with only stages 1–6, hide stage 7?
- **B:** Extrapolate/pad stage 7 with zeros?
- **C:** Disable scrubbing to pre-stage-7 snapshots?
- **Decision required:** A, B, or C? (Recommend A; let snapshots be immutable.)

---

## Summary

**IntegratedNavigator** unifies three separate surfaces (Journey, Time Machine, Budget) into a single, stacked, collapsible chrome that sits at the top of every `/killerapp/*` page. It is a **core wayfinding + financial visibility** artifact, tightly integrated with the journey-progress and budget-spine modules.

### Architectural Bet

The design centralizes per-project state (journey progress, budget totals, stage-level financial detail, historical snapshots) into a persistent, ever-present chrome. This trades surface real estate (≤240px height when expanded) for constant visibility of project health. Combined with the top-right GlobalBudgetWidget pill, the builder has a complete financial picture without context-switching. The three-layer stack (Journey | TimeMachine | Budget) establishes a visual metaphor: where you are, where you've been, what it cost.

---

## Critical Files for Implementation

1. **`/sessions/serene-wonderful-feynman/bkg-repo/src/components/IntegratedNavigator.tsx`** — Main orchestrator; glues journey state, budget data, collapse state, and callbacks together.
2. **`/sessions/serene-wonderful-feynman/bkg-repo/src/components/navigator/BudgetTimeline.tsx`** — Per-stage money breakdown; transforms BudgetApiSummary.byPhase into per-stage rows.
3. **`/sessions/serene-wonderful-feynman/bkg-repo/src/components/navigator/TimeMachineLever.tsx`** — Horizontal scrubber; Framer Motion drag + snapshot library.
4. **`/sessions/serene-wonderful-feynman/bkg-repo/src/app/killerapp/layout.tsx`** — Integration point; replace `GlobalJourneyMapHeader` mount.
5. **`/sessions/serene-wonderful-feynman/bkg-repo/src/hooks/use-navigator-state.tsx`** — Collapse state management + localStorage persistence.

