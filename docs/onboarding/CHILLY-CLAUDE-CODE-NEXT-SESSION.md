# Claude Code — Next session prompt (paste verbatim into Claude Code after `git pull`)

You are Claude Code running in the terminal at `/Users/chillydahlgren/Desktop/The Builder Garden/app/`. We are on Tuesday May 19, 2026 — the day before the SF investor demo. Michael Bou is in the room with me; we're both at our laptops.

Your role complements Cowork (which is running in a separate desktop window doing the heavier multi-file ships + orchestration). Your strengths over Cowork:

- You can run `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm lint`, `tsc --noEmit` and get real local feedback.
- You can interact with the working tree's `.git/` directly (Cowork can't).
- You can integrate with the editor (Cursor / VS Code) so refactors land alongside live LSP feedback.

## What I need you to do today, in order

### 1. First check (30s)

```bash
cd "/Users/chillydahlgren/Desktop/The Builder Garden/app"
git pull origin main
git status
```

Confirm clean working tree (or know what's there). The last big push from Cowork should be at HEAD; commits earlier today: `b73435c` (safe group Ships 30-34), `7909465` (Ship 29 fixed).

### 2. Local green-gate verify (2-5 min)

```bash
pnpm install
npx tsc --noEmit > /tmp/tsc.log 2>&1 &
echo "tsc PID=$!"
# in another shell:
npx vitest run --reporter=basic > /tmp/vitest.log 2>&1 &
echo "vitest PID=$!"
```

While those run, do a visual sanity check:
```bash
pnpm dev
# open http://localhost:3000/killerapp in your browser
```

Confirm:
- The JourneyTimeline cockpit renders (merged journey + time machine)
- The BudgetSnapshot pulses when you click into a workflow + back
- The compass FAB at bottom-right opens a panel with 18 workflows
- `/killerapp/budget?project=55730cd3-…` shows the 10-category grid

Report any tsc errors or test failures to me. If clean, move to step 3.

### 3. Take ownership of the "needs local verification" items (~30-60 min)

Cowork can't easily run these. You can.

- **Run `pnpm build` end-to-end.** Cowork has been deferring to Vercel; you can catch issues earlier locally. Report any failures.
- **Mobile viewport test.** Resize Chrome dev tools to 375px and walk the demo path. Confirm AuthAndProjectIndicator drawer toggles, JourneyTimeline shows compact pill strip, BudgetSnapshot doesn't overflow.
- **Lighthouse pass.** `npx lighthouse https://builders.theknowledgegardens.com/killerapp --view`. Investors notice perf scores. Report any score < 70 with the top 3 actionable items.

### 4. Pair with Cowork on the cinematic intro (~2-3 hours)

Cowork is building `src/app/intro/page.tsx` (full-bleed 5-act cinematic presentation — see `docs/onboarding/DEMO-CINEMATIC-SPEC.md`). Your role:

- **Local iteration.** As Cowork pushes commits to `/intro`, you `git pull` and refresh `http://localhost:3000/intro` to feel the actual motion. Cowork can't experience the animation timing — you can.
- **Polish the timing.** Framer Motion durations + delays often need tuning by eye. Edit + push small commits to `/intro` for things Cowork wouldn't notice (e.g., an ease curve that feels jerky, a delay that's a beat too long).
- **Cross-browser smoke.** Open `/intro` on Safari + Chrome + Firefox. Note any rendering differences. Report to Cowork via a shared markdown file at `app/docs/intro-cross-browser-notes.md`.

### 5. Contractor handover testing (~30 min)

Cowork is building `/feedback` + seeding 5 contractor demo accounts. Your job:

- **Sign in as each of the 5 demo accounts.** Confirm each lands on the pre-attached project.
- **Walk the demo path as a real GC would.** Note any "this would confuse a non-tech-savvy person" moments. Don't fix them yourself — note them as feedback in `app/docs/contractor-walkthrough-notes.md` so Cowork can sweep them in batch.

### 6. Wednesday morning prep (~15 min, at end of session)

```bash
git pull origin main
git log --oneline -20
# confirm the last commit timestamp is BEFORE 8am SF
```

If anything looks off, ping me immediately. After 8am SF on Wednesday we don't push to main.

## Rules

- **Push directly to main only for changes you've verified locally with `pnpm build` AND `pnpm test`.** If either fails, push to a feature branch instead and open a PR; Vercel will preview-build it.
- **For multi-file refactors, prefer Cowork's Trees API approach over your git workflow.** Cowork is set up for atomicity; your strength is single-file polish + local iteration.
- **Update `tasks.todo.md` + `docs/session-log.md` at the end of your session** — same protocol as Cowork. Use the GitHub Contents API or a normal git commit.
- **If you and Cowork are about to edit the same file**, declare it in a shared markdown file `app/docs/in-flight.md` so you don't collide.

## Key files to know

- `src/app/intro/page.tsx` — the cinematic intro (being built today)
- `src/app/killerapp/budget/BudgetClient.tsx` — the new dedicated budget interface (~1940 lines, hero+stacked bar+10-category grid+cash flow+empty state+tour cue+help strip)
- `src/components/cockpit/JourneyTimeline.tsx` — merged journey+time machine (~1100 lines, desktop + mobile branches)
- `src/components/CompassWorkflowNav.tsx` — bottom-right compass nav with 18 LIVE workflows + Money group
- `src/app/killerapp/AuthAndProjectIndicator.tsx` — persistent identity pill (desktop) + mobile drawer
- `src/lib/hooks/useProjectWorkflowState.ts` — the spine. Now listens for `bkg:nav:flush-and-go`.
- `src/design-system/tokens/stage-accents.ts` — 8 accent colors (0=Money brass, 1-7=lifecycle)

## Demo project UUIDs (for testing)

- Marin farmhouse: `55730cd3-5225-493d-8b5c-49086d942565`
- ADU in Sausalito: `aa11b22c-1111-4d78-aaaa-bbccdd112233`
- Commercial TI in SoMa: `bb22c33d-2222-4d78-bbbb-ccddee223344`

Go.
