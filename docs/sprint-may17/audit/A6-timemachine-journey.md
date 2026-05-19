# A6 — Time Machine + Journey Map Audit

**Status:** partial. Auditor read `time-machine.ts`, `journey-progress.ts`, and `JourneyMapHeader.tsx`. Some files in `src/components/cockpit/` (TimeMachineDial, JourneyArc, BudgetSnapshot, `use-time-machine-rewind.ts`) plus the B5 spec and Chilly's uncommitted layout diffs were not fully verified — flagged below as risks.

## Shipped (code confirmed)

### Time Machine core (`time-machine.ts`)
- `createSnapshot()` with auto-label and 50-snapshot retention cap
- localStorage persistence keyed `bkg:time-machine:{projectId}`
- Custom event dispatch `bkg:time-machine:changed` for UI subscribers
- SSR-safe guards throughout (`isBrowser` checks)
- API: `createSnapshot`, `getSnapshots`, `subscribeSnapshots`, `clearSnapshots`, `createWelcomeSnapshot`

### Journey progress (`journey-progress.ts`)
- Event reducer for four types: `started`, `step_completed`, `completed`, `needs_attention`
- Per-workflow state rollup (`stepsCompleted` / `totalSteps`)
- localStorage persistence per (user, project) tuple
- Custom event dispatch `bkg:journey:changed`
- `step_completed` events trigger snapshot creation via lazy import to Time Machine
- API: `emitJourneyEvent`, `getJourneyState`, `subscribeJourney`, `rollupByStage`

### JourneyMapHeader (`JourneyMapHeader.tsx`)
- 7-stage chip strip: Size Up → Lock → Plan → Build → Adapt → Collect → Reflect (hardcoded)
- Stage color mapping (7 colors)
- Progress dots: green (working), amber (needs_attention), check (done)
- Optional workflow label, stage link routes to `/killerapp?stage={id}`
- Proper ARIA: `role="navigation"`, `aria-current`

## Claimed but not directly audited

- `use-time-machine-rewind.ts` — does the dial scrub AND actually rewind workflow state? Per session log, ship `9f25b240` claimed this works.
- TimeMachineDial — Agent G flagged 9px stage labels (`JourneyArc.tsx:287` — fontSize="9") + SVG `<g onClick>` not keyboard-focusable.
- JourneyArc — wiring to `emitJourneyEvent` confirmed in flow but not verified visually.
- BudgetSnapshot — cockpit integration unclear from this audit pass.
- "Return to live" banner — no implementation found in accessible source.
- KillerappProjectShell.tsx — Chilly's 76-line uncommitted WIP; status unknown.
- layout.tsx (`/killerapp/`) — 20-line uncommitted WIP; status unknown.

## Spec alignment

`docs/sprint-may17/specs/B5-timemachine-journey.md` exists in the repo (2,882 bytes). Should be cross-checked against the actual ship.

## Demo-day risks

1. **Rewind mechanism unverified.** Core Time Machine feature (scrub + state rollback) needs hands-on confirmation Tuesday. If incomplete, Act 3 of the demo fails.
2. **A11y gap confirmed.** SVG `<g onClick>` is keyboard-inaccessible; Tab won't reach the dial. 9px labels fail readability. Quick wins from Agent G: bump labels to 11px, wrap `<g>` in `<button>`.
3. **Chilly's uncommitted WIP.** 76 + 20 line diffs in `KillerappProjectShell.tsx` + `layout.tsx` are unaccounted for. If they block cockpit mount or routing, Wednesday demo is at risk. Audit + commit or revert before dress rehearsal.
4. **No "Return to live" banner found.** Investor demo Act 3 narrates "tap Return to live" — confirm this UI element exists and reaches the snapshot-clearing path.

## Green signals

- Journey state machine is solid (event reducer, persistence, rollup).
- JourneyMapHeader is accessible (semantic HTML, proper ARIA labels).
- Time Machine snapshot API is clean and SSR-safe.

## Recommendation

**Tuesday morning** session priority:
- Audit `use-time-machine-rewind.ts` line-by-line — confirm rewind path actually unwinds workflow state.
- Audit + commit (or revert) Chilly's two uncommitted local diffs (`KillerappProjectShell.tsx`, `layout.tsx`).
- Patch the a11y quick wins on TimeMachineDial + JourneyArc (11px labels, `<button>` wrap, focus-visible outline). ~15 min of work.
- Verify "Return to live" banner exists or implement minimal version.

Status for investor deck: "Journey Map stages + Time Machine snapshots foundation complete; dial scrubber interaction and rewind state rollback under final QA."
