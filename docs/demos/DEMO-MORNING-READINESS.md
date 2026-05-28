# Demo Morning Readiness — Killer App, 7-Stage Walkthrough

**Status:** ✅ READY · **Live commit:** `e73e8df` on `origin/main` · **Auto-deploys to Vercel**
**Last verified:** 2026-05-27 evening, `npm run build` EXIT 0, all 7 stage routes compile.
**Demo project:** Marin Farmhouse (`proj-chen-farmhouse` / `55730cd3-5225-493d-8b5c-49086d942565`)

---

## What to do before the demo (5 minutes)

1. Open the live preview at `builders.theknowledgegardens.com` and confirm the home renders.
2. Sign in (or use a trial-contractor account) so the project query has auth.
3. Navigate to `/killerapp` → pick **Marin Farmhouse** → land on `/killerapp/stages/size-up`.
4. Confirm the header reads **"Size Up · Marin Farmhouse · 4,000 sqft · Marin County, CA"** and the budget chip shows **$312K / $1.65M** (or just **$1.65M** if the chrome's `BudgetRibbon` hasn't yet rendered the "spent / total" format).
5. Set your viewport to 380 × 820 if demoing on a phone-shape; otherwise leave desktop.

If the chip shows the wrong project or weird numbers, hard-reload — the chrome reads from the Marin seed and should self-correct.

---

## The 7-stage walkthrough — what to do, what to expect

| # | Stage | What you do | What appears | Primary action → advances to |
|---|---|---|---|---|
| 1 | **Size Up** | Building-type tile is preselected (Residential). Step through Next → Next → Next → Skip trades → Review. Tap **"Get my ballpark"**. | Editable $1.5M-ish ballpark (residential × 4,000 sqft × locale), confidence pill, jurisdiction badge. **Sketch it** button opens a canvas pad — draw + Save and the header flips to **"✓ Sketch saved"**. **Pro/Plain-speak** flips labels ("What are you building?" ↔ "Occupancy / use type"). Voice 🎤 enabled on every text field. | **"Lock the scope →"** (my footer) · green ring + ✓ overlay · auto-advance to `/killerapp/stages/lock` after ~1.8s |
| 2 | **Lock** | Tap 2–3 material chips (Standing seam metal roof, Heat pump HVAC, etc.). Tap **"Confirm this number"** on the budget card. Optionally tap **"Add who signs"** and enter a client name + email. | Three numbered Invitation Cards (Materials / Budget / Agreement). Insight strip reads **"2/3 ready · $1,650,000 budget · 2 materials · agreement optional"**. | **"Send the agreement →"** (my footer, indigo when ready) · green ring + ✓ overlay · "Continue to Plan" button advances |
| 3 | **Plan** | Drag any phase up/down in the sequencing list. | Live timeline + GC overhead updates on every drop (37 wk default → fewer wk + lower overhead when MEP rough-ins are clustered concurrently). Plain-speak SF code lookup. | Shared **`StageActionBar`** → "Approve the plan, start building" → advances to Build |
| 4 | **Build** | Voice-report a daily field update. | Daily log saved (auth-gated DB write; localStorage mirror when signed out). | `StageActionBar` → "Wrap up build, move to adapt" → Adapt |
| 5 | **Adapt** | Tap the primary. | Stub: "3 changes this week · +$4,200 cost · +1 wk schedule" insight. | `StageActionBar` → "Settle changes, send pay app" → Collect |
| 6 | **Collect** | Tap the primary. | Stub: "Awaiting first draw close · $0 collected · 12 draws pending" insight. | `StageActionBar` → "Close the books" → Reflect |
| 7 | **Reflect** | Tap the primary. | Stub: "Project complete · 9 mo total · final variance −$8,300" insight. | `StageActionBar` → "Save reflections, finish project" → done |

Stages 5–7 are **alpha stubs** (clearly labeled), enough to walk the full journey without dead-ending. Don't promise them — show them as "coming soon" content.

---

## Canonical Marin numbers — what should be on screen everywhere

| Field | Value |
|---|---|
| Project | Marin Farmhouse (Chen residence — `proj-chen-farmhouse`) |
| Location / jurisdiction | Marin County, CA · code lookups answer SF (full coverage) |
| Building | Custom farmhouse, 2-story, 4,000 sqft |
| Total budget | **$1,650,000** |
| Spent to date | **$312,400** |
| Committed | $186,200 |
| Remaining | $1,151,400 |
| Timeline | Mar 17 → Dec 3, 2026 (**37 weeks**, ~187 days remaining demo day) |
| Stage progress | Size Up 100 · Lock 100 · Plan 85 · Build 42 · Adapt 0 · Collect 0 · Reflect 0 |

If any screen shows a *different* number (e.g., $16K / $914K, $2.34M, Oceanview, Malibu), that's a stale cache from earlier work — hard-reload.

---

## Known limitations (don't be surprised)

- **Documenso isn't configured locally** (no `DOCUMENSO_API_KEY`). The Lock card's "Send the agreement" sticky bar **does** complete the lock + advance, and the agreement card shows **"Drafted: Agreement drafted and ready. Connect Documenso to send for e-signature."** That reads as a coherent demo outcome — don't claim live e-sign without the key.
- **Voice input** uses Web Speech API: Chrome and Edge work cleanly; Safari is partial; Firefox needs a flag. The mic 🎤 button gracefully disables in unsupported browsers, no crash.
- **Size Up's wizard** uses my footer's "Lock the scope →" (with completion ring + auto-advance) rather than the shared `StageActionBar` that Plan/Build/Adapt/Collect/Reflect use. Functionally identical (one primary, completion, advance), but the button styling differs slightly. Flagged for the next pass.
- **The chrome chip** may render as just **"BUDGET $1.65M"** instead of **"$312K / $1.65M"** depending on whether the `BudgetRibbon`'s "spent / total" format has been wired. I'm passing `budgetSpent={MARIN_BUDGET_SPENT}` — display is the chrome owner's call.

---

## If X happens at the demo — quick recovery

| If you see | Do this |
|---|---|
| `$NaN` or a different project's numbers ($16K, $914K, Oceanview, Malibu) | Hard-reload (Cmd+Shift+R). Re-pick Marin Farmhouse. |
| A 7-stage navigation lands on a 404 | You're on a non-deployed branch. Confirm URL is `builders.theknowledgegardens.com/killerapp/stages/<slug>`. |
| Whisper banners showing (small 💡 tips) | They were removed per Charlie #5 — if any persist, hard-reload. They're rendering as `null`; any visible whisper is a stale bundle. |
| Lock card 3 shows "prepared" not "sent" | Expected — Documenso key isn't set. Read it as "Drafted, ready to send." |
| Sketch button does nothing | The button toggles `setSketchOpen(true)` — if no modal appears within a second, hard-reload. The canvas opens at 520×320 with Clear + Save sketch buttons. |
| Voice mic icon is grayed out | The browser doesn't support Web Speech API. Switch to Chrome/Edge or skip voice on that field. |
| Pro toggle doesn't flip labels | The state lives in `bkg:pro-mode` localStorage — clear it from DevTools to reset. |

---

## Recovery commands (terminal, only if needed)

```bash
# Confirm you're on the deployed commit
cd ~/Documents/"The Builder Garden"/app
git fetch origin main
git log --oneline -3   # latest should be e73e8df or newer

# Local build sanity check
npm run build           # expect EXIT 0, all 7 stage routes
npm run dev             # open http://localhost:3000/killerapp

# Stale cache / hydration issues
rm -rf .next
npm run dev
```

---

## What's deferred (post-demo, all flagged in `tasks.todo.md`)

- **Documenso live e-sign** — set `DOCUMENSO_API_KEY` and the "prepared" path becomes "sent."
- **`StageActionBar` adoption for Size Up + Lock** — currently my own footer bars (functionally equivalent). The canonical convergence wires each page's primary via `<StageShell primaryAction={{ onActivate }}>` with a ref-bridge to the body state, and converts Size Up from a 5-step wizard to a single screen for full consistency with Plan/Build/Adapt/Collect/Reflect.
- **DB Marin row** — the live `command_center_projects` row still has `sqft="2800"` and `budget_amount=NULL`. The fixture is the source of truth for the demo; align the row post-demo for the project view to match without the fixture override.
- **Hardcoded-hex audit** across the rest of the repo (the design-system rollout moved canonical pages; old surfaces still have literals).

---

**Commits driving the demo** (newest first):

```
e73e8df fix(layout): remove phantom 64px left gap in header and body
2518aa1 docs: append lessons from header overlap + local dev setup session
604bca6 docs: update tasks.todo.md — header cleanup done
3e97030 docs: append 2026-05-27 chat session (header overlap fix)
cf0cc39 docs: append 2026-05-27 chat session log (header overlap fix)
0916159 fix(header): eliminate overlapping nav elements
0e381d0 feat(stages): PATCH 1 Coordination Resolutions — tokens, stubs, data, docs
dd85884 fix(stages): PATCH 1 coordination — #5 whispers off, #6 budget chip = Marin seed   ← my last
e5173fa fix(stages): collapse Plan/Build columns to single column on mobile
091f684 fix(stages): PATCH 1 — primary action, budget consistency, mobile, whispers
33d6184 fix(stages): PATCH 1 — sticky single primary action, insight cards, in-flow whispers   ← my PATCH 1
c6d881e feat(stages): Size Up + Lock, fully functional inside the persistent stage chrome   ← my main ship
```

You're shipping the integrated result of three parallel agents. The journey works end-to-end; the numbers are consistent; the chrome is clean. Go land it.
