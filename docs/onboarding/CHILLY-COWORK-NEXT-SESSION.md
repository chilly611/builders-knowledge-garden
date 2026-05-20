# Cowork — Next session prompt (paste this verbatim into a fresh Cowork window)

You are Cowork. We are in the final-prep window before the SF investor demo (Wed May 20, 9am SF time). Today is Tuesday May 19, 2026 — dress-rehearsal day. Michael Bou is on-site with me; we're both at our laptops.

Repo: `chilly611/builders-knowledge-garden`, branch `main`, auto-deploys to `https://builders.theknowledgegardens.com` via Vercel. Supabase project `vlezoyalutexenbnzzui`. Local working tree at `/Users/chillydahlgren/Desktop/The Builder Garden/app/`. Docs workspace at `/Users/chillydahlgren/Desktop/The Builder Garden/Builder's Knowledge Garden/`.

Your mandate this session: **(1) make the existing demo bulletproof, (2) build the cinematic intro/presentation that frames the vision, (3) prep the contractor-handover path so real GCs can kick the tires on prod.** Burn tokens. Run parallel agents. Be opinionated. Diff-before-push is non-negotiable.

## PHASE 0 — Orientation (5 min, must do first)

Read in this exact order:

1. `Builder's Knowledge Garden/CLAUDE.md`
2. `Builder's Knowledge Garden/michael-onboarding/MICHAEL-START-HERE.md`
3. `Builder's Knowledge Garden/michael-onboarding/DEMO-MAY20-PLAN.md`
4. The bottom 300 lines of `Builder's Knowledge Garden/tasks.todo.md`
5. The bottom 12 lessons of `Builder's Knowledge Garden/tasks.lessons.md`
6. The most recent 3 entries of `Builder's Knowledge Garden/docs/session-log.md`
7. The two new specs: `Builder's Knowledge Garden/docs/onboarding/DEMO-CINEMATIC-SPEC.md` and `CONTRACTOR-HANDOVER-PLAN.md`

DO NOT summarize back. Just read and proceed.

## PHASE 1 — Parallel cold-start verify (~15 min, all in one dispatch)

Spawn ALL of these as parallel general-purpose agents in a single message. Use Claude in Chrome for the live UI checks; load via `ToolSearch` (`select:mcp__Claude_in_Chrome__navigate,mcp__Claude_in_Chrome__get_page_text,mcp__Claude_in_Chrome__find,mcp__Claude_in_Chrome__computer,mcp__Claude_in_Chrome__form_input,mcp__Claude_in_Chrome__read_console_messages`).

- **Agent A — Demo path cold-start (incognito).** Walk: home → `/dream/oracle` → speak intent → "Make This Real" → `/killerapp?project=…` → 4 workflows (code-compliance / estimating / contracts / who-is-asking). Report every rough edge with P0/P1/P2 ranking and exact file:line citations.
- **Agent B — Cockpit reactivity verify.** On a workflow page, edit something → confirm "saved Xs ago" updates → confirm BudgetSnapshot pulses → click compass → confirm "Choose your next move" panel + search work → click stage on JourneyTimeline → confirm rewind dial scrubs.
- **Agent C — Auth + identity verify.** Incognito → land on `/killerapp` → confirm "Not signed in · Sign in / Sign up" pill visible top-right. Click Sign up → arrive at `/signup` → fill + submit (use throwaway email). Confirm email-confirmation success view. Click Sign in from a workflow page → confirm `next=` brings you back.
- **Agent D — Mobile (375px) cold-start.** Same demo path but resized to iPhone-SE width. Confirm: AuthAndProjectIndicator drawer toggle works, JourneyTimeline shows compact pill strip + slider, BudgetSnapshot truncates gracefully, CompassWorkflowNav opens to full-width panel.
- **Agent E — Budget flow end-to-end.** Open `/killerapp/workflows/estimating?project=55730cd3-…` → run AI estimate → click "Push to budget →" → land on `/killerapp/budget?project=…` → confirm line items pre-populated with correct categories + state chips → cycle a chip → confirm "Refreshed N lines" message on second push.
- **Agent F — Act 4 MCP cold-start** (REQUIRES Chilly's demo Mac with bridge installed). Open Claude Desktop, ask "What are the Marin County building code requirements for a single-family home?" Confirm `lookup_code` and/or `search_knowledge` fire and return seeded Marin codes.

While agents run, you have nothing to do. Wait.

## PHASE 2 — Synthesize + decide (~5 min)

When all 6 agents return:
1. Compile a single ranked list of every P0 across all agents.
2. Pick **top 3 P0 items** that are demo-blocking and shippable in ~40 min each.
3. Announce picks to me as: `Picks: 1) X, 2) Y, 3) Z. Starting in parallel unless you stop me.`
4. Start in 2 min if I don't reply.

## PHASE 3 — Parallel ship (~60-90 min)

- Trees API for multi-file atomic commits. Contents API for single-file edits.
- **DIFF-BEFORE-PUSH (non-negotiable):** for every modified file, fetch the canonical version from main via Contents API and `diff` against the local working tree. Confirm ONLY intended hunks are present. ANY unintended deletion = STOP + restore canonical + reapply minimally. (Burn 4 + Ship 28 + Ship 29 lessons — see `tasks.lessons.md`.)
- If `StageId` widens in any way, your build will fail. Use `StageAccentKey = keyof typeof STAGE_ACCENTS` for the wider key set; keep `StageId = 1 | 2 | 3 | 4 | 5 | 6 | 7` narrow for lifecycle Records.
- Watch Vercel via `GET /repos/.../commits/<sha>/status` (the legacy combined-status endpoint — not check-runs).
- If Vercel fails: rollback main to last green via force-push of the ref, then bisect by re-layering (Playbook Pattern C). Never push a fix-forward without re-verifying the diff.

## PHASE 4 — Build the cinematic intro (~2-3 hours, the headline work)

Read `docs/onboarding/DEMO-CINEMATIC-SPEC.md` start-to-finish. Then:

1. Create `src/app/intro/page.tsx` — full-bleed cinematic presentation. Five "acts":
   - **Act 1 — The umbrella.** Knowledge Gardens (logomark + tagline), three chromes orbit into view (Green KG / Warm Dream / Red Killer App). 8s.
   - **Act 2 — The problem.** "Contractors are drowning in paper, apps, and AI noise." Cut between four micro-vignettes (estimate-on-napkin, code-lookup-by-text-message, contract-in-Word, schedule-on-whiteboard). 12s.
   - **Act 3 — #aikidotheAI.** The motto. Voice-first demo: a contractor speaks → text streams in → an estimate forms → a code citation appears → a contract draft fills in. All in 30 seconds of compressed-time scroll. 30s.
   - **Act 4 — The killer app, live.** Embed a real, working `<iframe>` (or seamless route) showing `/killerapp/budget` populated with the Marin demo project's data. Investor can hover the categories, drag the JourneyTimeline scrubber, click into the cockpit. This is the "kick the tires" moment.
   - **Act 5 — The vision.** Three chromes pull apart into the Knowledge Gardens umbrella. "Today: Builder's Garden. Tomorrow: Health, Legal, Education, Energy. The same engine, every domain." 12s.

2. Use Framer Motion for entry/exit + scroll-triggered timing. Use the design-system tokens (no hardcoded hex outside the three chromes). Respect `prefers-reduced-motion`.

3. Mount at `/intro` (a top-level route, not under `/killerapp` — this is investor-facing). Add a "Skip → Start building" link in the top-right that goes to `/onboard`.

4. The demo flow on Wednesday morning is: open `/intro` → watch (or skip) → land on `/onboard` → pick lane → land on `/killerapp` → the rest of the demo as scripted.

## PHASE 5 — Contractor handover prep (~1 hour)

Read `docs/onboarding/CONTRACTOR-HANDOVER-PLAN.md`. Then:

1. Build `src/app/feedback/page.tsx` — a single page contractors can hit to leave structured feedback. Fields: name, trade (matches our 8-lane picker), what worked / what didn't / what's missing. Save to a new Supabase `contractor_feedback` table (build the migration; apply via `apply_migration` MCP).
2. Add a small "Help us improve" link in the global footer (LegalFooter) → `/feedback`.
3. Pre-seed 5 contractor demo accounts in Supabase auth (use throwaway emails like `gc-trial-001@theknowledgegardens.com`). Each account: pre-attached to one of the 3 demo projects. Give Chilly the credentials as a markdown table.

## PHASE 6 — Final dress rehearsal + close-out (~30 min)

1. Run Agent A's cold-start audit ONCE MORE on prod. Confirm everything from Phase 3 + Phase 4 + Phase 5 is observable.
2. Append to `docs/session-log.md` with everything shipped + open items.
3. Update `tasks.todo.md` — check off shipped items, add Wednesday-morning ("if X breaks, do Y") fallback notes.
4. Append to `tasks.lessons.md` if any new patterns emerged.
5. One final summary message to me with: every commit SHA shipped, what's observable on prod, what's the Wednesday-morning fallback plan if a step breaks.

## RULES FOR THIS SESSION

- **Diff-before-push for every modified file, no exceptions.** Three separate subagents have stomped files this week; one was caught only because the orchestrator did a manual `diff` against canonical. Make it routine.
- **The Cowork sandbox CANNOT run `next build`.** Verify via Vercel commit status only. Bisect by re-layering if a build fails.
- **The Cowork sandbox CANNOT write inside `.git/`.** Use Trees API / Contents API for all pushes.
- **The Cowork sandbox CANNOT reach `~/Library/Application Support/Claude/`.** If you need to touch Claude Desktop config, write an installer script to `app/scripts/` and have me run it.
- **Demo project UUIDs:**
  - Marin farmhouse: `55730cd3-5225-493d-8b5c-49086d942565`
  - ADU in Sausalito: `aa11b22c-1111-4d78-aaaa-bbccdd112233`
  - Commercial TI in SoMa: `bb22c33d-2222-4d78-bbbb-ccddee223344`
- **Wednesday morning rule:** after 8am SF time, no more pushes to main. Whatever's live at 8am is what we demo.

Go. Burn tokens. Spawn agents. Ship.
