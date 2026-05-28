# Demo morning prep — Thursday 2026-05-28

**Audience:** the Chen / contractor demo.  
**Live URL:** `https://builders.theknowledgegardens.com`  
**Branch shipped:** `main` @ `da74786` (auto-deploys to Vercel).  
**Build status:** `npm run build` ✓ Compiled successfully, all 7 stage routes register.

**Verified live the night before (2026-05-27 late):** Plan and Adapt confirmed rendering on the production URL — budget chip reads `$312K / $1.65M`, journey ring shows labels, current stage glows red-chrome, action bar pinned, **no floating FABs over the action bar on `/killerapp/stages/*`** (the Patch-1 FAB-gating commit `da74786` is in effect). Reflect and Collect confirmed as honest "ALPHA — COMING SOON" placeholders (not functional bodies).

## What's actually working end-to-end now

The lifecycle journey runs the full seven stages, each with a sticky single primary-action button that advances to the next stage:

| Stage | Slug | Verb on the action button | What you'll see |
|---|---|---|---|
| 1 Size up | `/killerapp/stages/size-up` | **Lock the scope** | Wizard (building type → address → sqft → trades → review). Voice + ✨ Auto-fill + Sketch. Insight card just above the action bar. |
| 2 Lock it in | `/killerapp/stages/lock` | **Send the agreement** | Three Invitation Cards (materials, budget, client agreement). Documenso fallback is configured for a safe demo. |
| 3 Plan it out | `/killerapp/stages/plan` | **Approve the plan, start building** | Drag the phases — the ribbon's TIMELINE and the insight's overhead figure update live. Contract total stays pinned at $1.65M (Marin seed). Plain-speak code lookup + collapsible Coming-soon. |
| 4 Build | `/killerapp/stages/build` | **Wrap up build, move to adapt** | Voice field report (talk → structured daily log), plain-speak code lookup, project photos. Insight: "62% complete · framing inspection passed · $186K committed". |
| 5 Adapt | `/killerapp/stages/adapt` | **Settle changes, send pay app** | **Honest alpha placeholder.** Card: "Adapt — in-flight changes / Change orders, RFIs, submittals, and schedule adjustments will live here. ALPHA — COMING SOON." Insight: "3 changes this week · +$4,200 cost · +1 wk schedule." Action bar still advances. |
| 6 Collect | `/killerapp/stages/collect` | **Close the books** | **Honest alpha placeholder.** Card: "Collect — invoicing & draws / Pay applications (AIA G702/G703), draw requests, and lien-waiver management will live here. ALPHA — COMING SOON." Insight: "Awaiting first draw close · $0 collected · 12 draws pending." |
| 7 Reflect | `/killerapp/stages/reflect` | **Save reflections, finish project** | **Honest alpha placeholder.** Card: "Reflect — close out & learn / Warranty management, lessons learned, portfolio update, and referrals will live here. ALPHA — COMING SOON." Insight: "Project complete · 9 mo total · final variance −$8,300." Terminal — finishing wraps the project. |

The journey row above each stage shows ring-and-label nodes for all seven stages, the current one wears a red-chrome glow, and the current→next connector pulses.

The floating bottom-right FABs (`CompassBloom`, `GlobalAiFab`, `CompassWorkflowNav`) **are now hidden on `/killerapp/stages/*`** — that was the last Patch-1 fix landed (commit `da74786`). The sticky action bar no longer has any floating chrome on top of it.

## The 90-second demo path (mobile, 380 px)

1. Open `https://builders.theknowledgegardens.com/killerapp/stages/size-up?project=55730cd3-5225-493d-8b5c-49086d942565` on your phone.
2. Tap a building type (Home / Shop / Mix), Next, Next, Next — fill in or accept defaults.
3. Tap **Lock the scope** → it animates the Size Up ring to ✓ and lands on Lock.
4. On Lock, tap **Send the agreement** → lands on Plan.
5. On Plan, drag the MEP rough-ins (electrical / plumbing / HVAC) so they sit adjacent. Point out the live timeline + overhead change in the ribbon and insight card. Tap **Approve the plan, start building** → Build.
6. On Build, demo the voice button or paste a daily-log line in. Tap **Wrap up build, move to adapt** → Adapt.
7. On Adapt, walk the contractor through the "in-flight changes will live here" card and the insight line ("3 changes this week · +$4,200 cost · +1 wk schedule"). Tap **Settle changes, send pay app** → Collect.
8. On Collect, walk the placeholder card + insight ("Awaiting first draw close · $0 collected · 12 draws pending"). Tap **Close the books** → Reflect.
9. On Reflect, walk the placeholder card + insight ("Project complete · 9 mo total · final variance −$8,300"). Tap **Save reflections, finish project** to wrap the project.

**Demo arc to narrate, stages 5/6/7:** "Adapt / Collect / Reflect are honestly marked alpha — coming soon. The journey *runs* end-to-end, the budget and timeline arithmetic is real, and we'll fill in the change-order interactivity, the AIA G702/G703 draws, and the lessons-learned capture before you're at those points on a real build."

## Pre-demo morning checklist

In order, with the phone you'll demo on:

- [ ] Open `https://builders.theknowledgegardens.com/killerapp/stages/plan?project=55730cd3-5225-493d-8b5c-49086d942565` — confirm: budget chip shows `$312K / $1.65M`, journey ring has labels, current Plan node has the red-chrome glow, **no floating FABs over the action bar**.
- [ ] Drag a phase in the sequencer — the ribbon's "wk" number and the insight's overhead figure both change as you reorder.
- [ ] Tap **Approve the plan, start building** — ring fills to ✓, page transitions to Build within ~450 ms.
- [ ] Repeat the tap-the-action walk through Build → Adapt → Collect → Reflect. Each transition should land in well under a second.
- [ ] Confirm Reflect lands at the "ALPHA — COMING SOON" card and the action button reads "Save reflections, finish project."
- [ ] **Reset the journey for a clean live demo.** The StageActionBar stores per-stage completion in localStorage so refreshes don't unwind the ✓ ticks. Before showing the contractor, open devtools console on the demo phone (or just clear site data for `builders.theknowledgegardens.com`) and run:
  ```js
  localStorage.removeItem('bkg:stage-complete:55730cd3-5225-493d-8b5c-49086d942565');
  ```
  Then reload. The journey row should show Size up / Lock it in / Plan it out / Build / Adapt / Collect / Reflect with no ✓ ticks, ready to walk fresh.

If any of those fail, see "Recovery" below before showing the contractor.

## Known issues (visible-but-honest, not blockers)

- **Journey row scroll at 380 px:** only 5 of 7 stages fit horizontally; Collect + Reflect sit off-screen-right until you swipe the row. The current stage doesn't auto-scroll into view. Not load-bearing — the chrome's stage title + accent bar always tell you where you are. Polish item, not a fix-tonight.
- **`docs/session-log.md` line 1** has a literal `$(cat /tmp/session-log-b64.txt)` token at the top (a shell-substitution leak from an earlier session). Cosmetic; doesn't affect anything.
- **Local build environment in `~/Developer/bkg`** stays finicky — if you ever need to build locally, run `rm -rf node_modules && npm install` first. `npm ci` refuses (the committed `package-lock.json` is out of sync with `package.json`). This is documented in memory and the earlier session-log entries.
- **Two stage-chrome systems still coexist** (`killerapp-chrome/` + `stage-shell/`) per the Agent B note — fine for the demo; reconciliation is a post-demo task.

## Recovery if something looks off live

Most live issues are deploy timing — Vercel may be mid-build of `da74786` if you check immediately.

| Symptom | Quick check |
|---|---|
| Build action does nothing | The page is rendering an older deploy. Hard-refresh (cmd-shift-R) or wait 1–2 min for Vercel. |
| Floating FAB still over the action bar | Same — old deploy. After `da74786` lands, no FABs on `/killerapp/stages/*`. |
| Budget chip reads `$NaNK` or empty | This is the `/projects/[id]` page, not `/killerapp/stages/*`. The demo path stays on `/killerapp/stages/*`. (The `/projects/[id]` mismatch was fixed earlier in `51924bf`.) |
| Journey row shows ✓ on stages you haven't walked yet | Stale `bkg:stage-complete:<projectId>` from a prior session. Clear it (see the checklist above) and reload. |
| Vercel build failed | The previous good deploy stays live (Vercel never promotes a failed build), so the demo doesn't regress. Look at the Vercel dashboard for the failure, fix forward. |

## Backup demo path if anything's broken

If `/killerapp/stages/*` fails on the demo phone, the **`/projects/proj-chen-farmhouse` AI-COO surface still works** (shipped 2026-05-27 in `51924bf`): a single page showing the killerapp-chrome BudgetRibbon ($1.65M / $312K / $426K headroom), a 7-stage JourneyTimeRow, and six curated AI Attention Items in the Marin/Harwell voice. It's not the live action-bar journey, but it's a one-screen story that holds up.

URL: `https://builders.theknowledgegardens.com/projects/proj-chen-farmhouse`

## Repo state at end of session

- `main` @ `da74786` ("fix(stages): gate floating FABs off /killerapp/stages/*").
- Working tree clean except `.claude/launch.json` (local-only dev config, untracked, do not commit) and `docs/asset-manifest.md` (not mine — appears to be from a parallel session, untracked).
- Earlier in the session, local commit `81afca4` had my full parallel Patch-1 redesign (20 files). It's preserved in the reflog (`git show 81afca4`) if you ever want to compare approaches post-demo, but it was abandoned per coordination call. The in-flight Patch-1 architecture (separate `StageActionBar.tsx`, inline insight cards, `MARIN_BUDGET_TOTAL`/`MARIN_BUDGET_SPENT` constants on the chip) is what's live.
