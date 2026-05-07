# Demo Readiness Pass — 2026-05-07

> Cold-start + 4-agent audit + manual prod walkthrough on `builders.theknowledgegardens.com`.
> Goal: tighten the demo path Chilly can share with John (real GC) and the contractor friend.

## TL;DR

**Production is solid.** Project Spine v1, the 17-workflow stack, the AI take, and the multi-project dashboard all work as advertised. The cold-start ADU scenario produced a stellar AI response (jurisdiction-aware, builder-vernacular, concrete decision rules) for a 1800sf Pasadena ADU.

**One genuine demo blocker** — raw markdown is leaking in the AI take section: `[Estimate the job](action:/killerapp/workflows/estimating)` shows as text in the response, AND the static button row renders below it. Visible on every cold-start; first thing John would see is "broken text + working buttons."

**Three mobile P0s** — pill maxWidth, AI fab panel width, and banner peer-link row will overflow at 375px on iPhone Safari.

**Sign-in flow is the highest-leverage UX upgrade** — pill copy is too soft for an anonymous user about to lose their work on refresh.

---

## Audits run this session

1. **Empty-state copy sweep** — all 17 workflows + dashboard + home (Explore agent, codebase grep)
2. **Sign-in discoverability** — 60-second cold-start trace through the auth + project flow
3. **Microcopy + CTA review** — every CTA, AI thinking state, and confirmation across the surface
4. **Mobile responsive audit** — codebase CSS audit at 375px (browser-window resize blocked at 1200px on macOS, so codebase-only)
5. **Manual cold-start walkthrough** — fresh-ish state on prod, ADU scope submitted, AI response captured, navigation chain to code-compliance verified

---

## P0 — Demo blockers (must ship before sharing with John)

### 1. Markdown action-link leak in `AI TAKE` section

**File:** `src/app/killerapp/KillerappProjectShell.tsx:378`
**Symptom:** AI streams a `**What next?**` block with `[Label](action:/path)` bullets at the end of every response. The shell renders `aiText` as plain text with `whiteSpace: 'pre-wrap'`, so the raw markdown shows up as text. THEN the same shell renders a static "What next?" link row below it. User sees both.
**Fix:** Strip the trailing `**What next?**` block from `aiText` before rendering. Keep the static link row.
**Severity:** P0 — visible in 100% of demos. First thing John sees after his AI take.

### 2. Mobile: `AuthAndProjectIndicator` pill overflows 375px

**File:** `src/app/killerapp/AuthAndProjectIndicator.tsx:217`
**Symptom:** `maxWidth: 360` + `right: 16` = 376px needed, 375px available. Pill spills off-screen on iPhone SE / 12 mini.
**Fix:** `maxWidth: 'min(360px, calc(100vw - 48px))'`
**Severity:** P0 — every iPhone demo, top-right pill clipped.

### 3. Mobile: `GlobalAiFab` floating panel overflows 375px

**File:** `src/components/GlobalAiFab.tsx:521-526`
**Symptom:** Panel `width: 360` + `right: 24` ≈ 384px needed. Panel content clipped on the left at 375px.
**Fix:** Tighten `maxWidth: 'min(360px, calc(100vw - 48px))'`
**Severity:** P0 — when John taps the AI fab on mobile, the panel is broken.

### 4. Empty-state on home: "You're not started yet. 7 stages to explore."

**File:** `src/app/killerapp/EmptyStateOrProjectIndicator.tsx:42`
**Symptom:** Confusing for first-time users; reads as "the app isn't set up." Convergent finding from empty-state agent + cold-start.
**Fix:** Soften to "Pick a workflow below to start." (action-first, builder-vernacular)
**Severity:** P0 — visible on cold-start, sets the tone.

### 5. "demo mode" badge in `EstimatingClient`

**File:** `src/app/killerapp/workflows/estimating/EstimatingClient.tsx:328`
**Symptom:** Renders the literal text "demo mode" in the budget panel. Anyone clicking q2 from a fresh project will see it.
**Fix:** Hide unconditionally OR gate behind `process.env.NEXT_PUBLIC_BKG_DEMO_BADGE === '1'`. The label was a dev affordance and should never have shipped to prod surfaces.
**Severity:** P0 — leaks dev/test feel on q2, the second-most-clicked workflow after home.

---

## P1 — High-impact polish (ship if time allows)

### 6. Sign-in pill copy upgrade

**File:** `src/app/killerapp/AuthAndProjectIndicator.tsx:196`
**Current:** `"sign in to save your project"`
**Fix:** `"sign in — your work won't save if you refresh"` (concrete, action-anchored)

### 7. Soft sign-in nudge after first AI stream completes

**File:** `src/app/killerapp/WorkflowPickerSearchBox.tsx:478-487` (after `responseContent` renders)
**Fix:** Inject inline note when user is anonymous and stream just finished:
> "Want this saved? Sign in (top right) — your work disappears on refresh until you do."

### 8. ProjectContextBanner peer-link verb cleanup

**File:** `src/app/killerapp/workflows/ProjectContextBanner.tsx:194-242`
**Current:** "Estimate / Codes / Permits / Contracts / Supply / Daily log"
**Fix:** Verbs that match builder voice — "Estimate / Check codes / Pull permits / Lock contracts / Order supply / Daily log". Standardize to noun → action where possible.

### 9. CTA standardization across StepCard step types

**File:** `src/design-system/components/WorkflowRenderer.tsx` and `StepCard.tsx`
**Current:** "Save this" / "Pick these" / "Record it" / "Lock jurisdiction" — verb chaos.
**Fix:** Standardize to builder-vernacular per microcopy agent:
- text/voice → "Note the scope"
- location → "Set jurisdiction"
- number → "Log the amount"
- multi_select → context-specific ("Pick your materials" / "Select crew")
- checklist → "Mark complete"
**Caveat:** Touches the workflow-rendering hot path. If we don't have time to verify all 17 workflows, defer.

### 10. "Thinking through your project…" copy

**File:** `src/app/killerapp/KillerappProjectShell.tsx:405` and `WorkflowPickerSearchBox.tsx:462`
**Current:** "Thinking through your project…"
**Fix:** "Running the numbers…" (microcopy agent's pick — builder-natural)
**Caveat:** Two places to keep in sync.

---

## P2 — Backlog (next session)

- Jurisdiction auto-default not picking up "Pasadena CA" from `ai_summary` (defaulted to IBC 2024 / US generic). Investigate `useProjectWorkflowState` jurisdiction extraction.
- Status counter on `code-compliance` showed "7 of 7 complete" on a fresh project. Likely shared anon journey state across project IDs.
- Vercel team toolbar leaks an "INP Issue" overlay for signed-in team users (Chilly only). Not a demo blocker.

---

## What's already great (don't touch)

- The AI's actual content was excellent: jurisdiction-aware (Pasadena ADU 1,200sf cap, expansive soil), builder-vernacular voice, concrete decision rules ($220/sf benchmarked, 8-12 week utility lead time).
- Project Spine v1 traveled cleanly from home → code-compliance with `?project=<uuid>` preserved.
- Top-right "saved · &lt;project name&gt;" pill renders correctly when a project exists.
- The 7-stage Compass, AI fab, glossary tooltips, hero typography all hold up.
- Touch targets meet 44×44px minimum.

---

## Prod cold-start trace (capture for John's demo prep)

1. Visit `/killerapp` cold (no project in localStorage) → see hero + search box + "You're not started yet"
2. Type ADU scope → hit Enter
3. URL gets `?project=<new-uuid>`, top-right pill shows "saved · &lt;scope preview&gt;"
4. **Friction:** raw markdown action-block leaks above the static button row
5. Click "Check codes →" in static button row → /killerapp/workflows/code-compliance preserves `?project=`
6. **Friction:** jurisdiction defaults to IBC 2024 not California-specific
7. Workflow steps hydrate, Pro toggle visible, status counter reads "7 of 7 complete" (likely stale cache)
