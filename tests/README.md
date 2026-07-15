# BKG end-to-end + data-consistency harness

Playwright suite that (1) locks in the **real loop** — sign in → open a project →
run a workflow → save → leave → return → resume — and (2) is a **regression net**
for the dogfood's #1 bug class: the persistent budget/journey chrome showing the
**Marin demo over the active project** (numbers that don't agree across chrome,
ledger, and page body).

> Scope: `tests/` only — **no app code**. The one root file is
> `playwright.config.ts` (Playwright must live at the project root to start the
> dev server); `package.json` gains only the `@playwright/test` devDependency and
> a `test:e2e` script.

## Run it

```bash
npm run test:e2e                 # all specs (boots `next dev` on :3210 itself)
npm run test:e2e -- --headed     # watch it drive the browser
BKG_E2E_PORT=3333 npm run test:e2e   # use a different port
npx playwright show-report tests/.artifacts/report
```

No `.env.local` needed: the app boots and renders fully unauthenticated (Clerk is
unwired; Supabase has placeholder fallbacks), so the whole surface here is
exercised with **no backend**. Specs use the `*.e2e.ts` suffix so the app's
`npm test` (vitest) never picks them up.

## Expected status (this is the point)

| Spec | Today (`origin/main`) | After Stage 2 (chrome bound to the project) |
|---|---|---|
| `data-consistency` · **control** (body === ledger) | 🟢 green | 🟢 green |
| `data-consistency` · **regression net** (chrome === ledger === body) | 🔴 **red** | 🟢 green |
| `real-loop` | 🟢 green (anonymous path) | 🟢 green |
| `mobile-chrome` (375px) | 🟢 green | 🟢 green |

The two **regression-net** failures are **intended on today's main** — they
document the live bug. They flip green automatically (no test edit) once the
chrome reads the viewed project's ledger.

## How the consistency net works

Target: `/killerapp/projects/demo-project` — the dogfood's starkest screen and
the **one project that resolves with no backend** (`getDemoProject()` reads
`docs/demo-data/demo-project.json`; the post-fix app-shell `useProjectLedger`
reads the *same* fixture). Real UUID projects are backend-gated
(`GET /api/v1/budget` → 401 anonymously), so they can't flip green offline.

For that one project on one screen we read three surfaces and assert they agree:

- **Ledger** — `docs/demo-data/demo-project.json` (Willow Creek ADU): remaining
  `$116k`, total `$340k`, stage **Build** / 62 %.
- **Body** — ProjectCompass / BudgetRiver renders those numbers.
- **Chrome** — the persistent ribbon. **Today it hardcodes Marin**: remaining
  `$1.15M`, total `$1.65M`, **Plan** 85 % / **Build** 42 % — a different project.

Assertions compare **parsed rendered values** (so chrome `$116K` == body `$116k`)
and assert **equality**, never Marin literals — so the net states the invariant
and flips the moment the chrome is project-bound.

### Implementation-agnostic chrome reading

Today the chrome is `KillerAppChrome` (no `data-testid` — only ARIA role +
accessible name). Stage 2 swaps in the app-shell (`.bkg-shell .gstrip-*` class
hooks). The readers in `e2e/fixtures/bkg.ts` (`readChromeBudget`,
`readChromeJourney`, `chromeRegion`) try **both**, so the same test reads the
chrome before and after the fix.

## Files

```
playwright.config.ts            # root; serial, single port (3210), artifacts → tests/.artifacts
tests/e2e/
  data-consistency.e2e.ts       # the regression net (RED today) + control (green)
  real-loop.e2e.ts              # sign in → open → run → save → leave → return → resume
  mobile-chrome.e2e.ts          # 375px ribbon: no overflow, no KPI collision
  fixtures/bkg.ts               # projects, ground-truth numbers, money parser,
                                # localStorage seeding, chrome/body readers
```

## Notes / gotchas

- **Serial, dedicated port.** Runs `workers: 1` on `:3210` (override
  `BKG_E2E_PORT`) so cold Turbopack compiles don't time out and it never
  collides with a `next dev` already on `:3000` in another worktree.
- **Auth is Supabase, not Clerk** (Clerk is installed but unwired) and **not
  enforced by middleware** — every `/killerapp/*` route is reachable
  anonymously. The loop's sign-in step verifies the `/login` surface and does a
  real sign-in only if `E2E_EMAIL` / `E2E_PASSWORD` are set; otherwise it takes
  the app's "Continue as Explorer" entry. The save/resume itself is localStorage
  (`bkg-budget-anonymous`, 500 ms debounce) — backend-free.
- **Determinism.** Locale `en-US` + timezone `America/Los_Angeles` are pinned so
  the app's `toLocaleDateString` output is stable (a UTC runner shifts dates a
  day). The first-visit demo auto-seed is short-circuited (`pinAnonymous`) so the
  budget editor stays on the anonymous key.
- **Scope to project home, not `/killerapp/stages/*`** — stage pages mount their
  own Marin-bound `BudgetRibbon`, a separate decoupling that Stage 2 does not
  cover.
- Run artifacts land in `tests/.artifacts/` (git-ignored).
```
