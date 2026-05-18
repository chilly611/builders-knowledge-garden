# B5: Time Machine rewind + Journey Map
**Lane C executor:** C5 | **Depends on:** C1 spine | **Demo:** contractor scrubs dial back, state visibly reverts

## Decision: BUILD the minimal rewind (~4 hours)
Rationale: dead UI on screen during demo invites picking. Plumbing is 70% there: snapshots persist, dial+lever dispatch events, ProjectCockpit forwards them. Schema extension needed.

## Schema extension (Snapshot type — additive, non-breaking)
Add optional `journey?: Record<string, WorkflowState>` and `budget?: BudgetSummary`.
`createSnapshot()` reads current `getJourneyState(projectId)` + `getProjectBudget(projectId)` and embeds at capture. Legacy snapshots without these fields show "legacy snapshot — rewind unavailable" tooltip.

## Rewind state machine (new hook: `useTimeMachineRewind`)
- Owns `currentSnapshotId: string | null` (null = "now")
- On scrub to S: read S's journey + budget; dispatch `bkg:project:state-rewound` with `{ projectId, snapshotId, journey, budget }`
- On scrub to "now": dispatch with `journey: null, budget: null`
- **No DB writes** — pure visual overlay
- 90s undo toast: "Rewound to {label} · Undo"

## Consumer changes
- `ProjectCockpit.tsx` — listen for `bkg:project:state-rewound`. Override journeyState/budgetData from event when non-null. Pass currentSnapshotId to TimeMachineDial.
- `JourneyArc` — already prop-driven; no internal change
- `BudgetSnapshot` — already prop-driven; no internal change

## Journey Map polish (P1)
- Mobile 375px pill row: verify horizontal scroll + active pill scrollIntoView on mount
- `ProjectCockpit.tsx:157` — change `router.push(/killerapp/workflows?stage=${slug})` to append `&project=${effectiveProjectId}`

## Files
- `src/components/navigator/types.ts` — extend Snapshot with optional journey/budget; export STATE_REWOUND constant
- `src/lib/time-machine.ts` — createSnapshot() embeds current state; add getSnapshot(projectId, snapshotId) helper
- `src/lib/use-time-machine-rewind.ts` [NEW] — hook owning currentSnapshotId + dispatching event
- `src/components/cockpit/ProjectCockpit.tsx` — wire hook, listen to event, override state when rewound, preserve ?project= on stage nav
- `src/components/cockpit/TimeMachineDial.tsx` — receive currentSnapshotId prop
- `src/components/cockpit/RewindToast.tsx` [NEW] — 90s "Undo rewind" toast
- `src/components/cockpit/JourneyArc.tsx` — mobile scrollIntoView for active pill

## Acceptance criteria
- Scrub dial to past snapshot → JourneyArc + BudgetSnapshot revert visually within 200ms
- Scrub back to "now" or click Undo toast → live state restored
- Refresh during rewind → resets to "now" (no DB pollution)
- Mobile 375px renders all 7 pills, active pill auto-scrolled
- Click stage pill while rewound → navigates with ?project=, drops rewind
- Legacy snapshots show "legacy snapshot" tooltip; non-interactive
