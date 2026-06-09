import { test, expect } from '@playwright/test';
import {
  PROJECTS,
  DEMO,
  MARIN_CHROME,
  chromeRegion,
  waitForChrome,
  readChromeBudget,
  readChromeJourney,
  readDemoBody,
  pinAnonymous,
  dismissStageWelcome,
} from './fixtures/bkg';

/**
 * DATA-CONSISTENCY REGRESSION NET
 * ===============================
 * Invariant: for a single project on a single screen, the persistent chrome's
 * budget + journey numbers must equal that project's ledger and its page body.
 *   chrome  ===  ledger  ===  body
 *
 * The bug ("Marin-over-other-project"): src/app/killerapp/layout.tsx mounts
 * <KillerAppChrome /> with NO `project` prop, so it falls back to
 * marinKacProject() -> getCanonicalProject() and renders the canonical Marin
 * Farmhouse numbers on EVERY project. At /killerapp/projects/demo-project the
 * body is the Willow Creek ADU ($116k remaining / $340k total / Build) while
 * the chrome insists on Marin ($1.15M remaining / $1.65M total / Build 42%) —
 * one screen, two projects (dogfood pass-01, finding P-DEV).
 *
 * Why demo-project specifically: it is the one project whose body AND ledger
 * resolve with no backend (ProjectDashboardClient -> getDemoProject() ->
 * docs/demo-data/demo-project.json). The post-fix app-shell reads that SAME
 * fixture (src/components/app-shell/useProjectLedger.ts), so this net flips
 * RED -> GREEN with zero auth and zero test edits. Real UUIDs can't: their
 * ledger is GET /api/v1/budget -> 401 anonymous.
 *
 * Assertions compare PARSED rendered values (so chrome "$116K" == body "$116k")
 * and EQUALITY rather than Marin literals, so the net documents the invariant
 * and turns green the moment the chrome is bound to the viewed project.
 *
 * Expected status today (origin/main, KillerAppChrome): the "control" is GREEN
 * (body===ledger, always), the "net" is RED (chrome===body fails). After Stage
 * 2 binds the chrome to the project: both GREEN.
 */

test.describe('chrome ↔ ledger ↔ page body consistency (demo-project)', () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await pinAnonymous(context, baseURL);
    await dismissStageWelcome(context, PROJECTS.DEMO);
  });

  test('control — page body matches the project ledger (stays GREEN)', async ({ page }) => {
    // Guards the body/ledger leg: proves we read the right project and that the
    // ledger->body mapping is stable, so a net failure is unambiguously the chrome.
    await page.goto(`/killerapp/projects/${PROJECTS.DEMO}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(DEMO.name).first(), 'body should render the Willow Creek ADU project').toBeVisible({
      timeout: 30_000,
    });

    const body = await readDemoBody(page);
    expect(body.name, 'body project identity').toBe(DEMO.name);
    expect(body.remaining, 'body remaining === ledger remaining ($116k)').toBe(DEMO.parsed.remaining);
    expect(body.committed, 'body committed === ledger committed ($224k)').toBe(DEMO.parsed.committed);
    expect(body.spent, 'body spent === ledger spent ($187k)').toBe(DEMO.parsed.spent);
    expect(body.total, 'body total (committed+remaining) === ledger total ($340k)').toBe(DEMO.parsed.total);
  });

  test('regression net — chrome must equal the ledger/body, not the Marin demo (RED today)', async ({ page }) => {
    await page.goto(`/killerapp/projects/${PROJECTS.DEMO}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(DEMO.name).first()).toBeVisible({ timeout: 30_000 });
    await waitForChrome(page);

    const body = await readDemoBody(page);
    const cb = await readChromeBudget(page);
    const cj = await readChromeJourney(page);

    // Make the RED failure self-documenting: record exactly what each surface shows.
    test.info().annotations.push(
      { type: 'chrome-source', description: cb.source },
      { type: 'chrome-budget', description: JSON.stringify(cb) },
      { type: 'chrome-journey', description: JSON.stringify(cj) },
      { type: 'body-budget', description: JSON.stringify(body) },
      {
        type: 'expected-after-fix',
        description: `chrome should show remaining=${DEMO.parsed.remaining}, total=${DEMO.parsed.total}, journey "${DEMO.stageLabel}" ${DEMO.stageProgress}% — i.e. the Willow Creek ledger, not Marin.`,
      },
    );

    // Sanity: the chrome is actually mounted and readable on this route.
    expect(cb.source, 'a persistent chrome must be mounted on the project route').not.toBe('none');

    // Soft expects so EVERY disagreement prints in one run (full bug picture),
    // while still failing the test (RED) until the chrome is project-bound.

    // (1) IDENTITY — the chrome must name the project the body is showing.
    expect
      .soft(cb.text, `chrome should reference "${DEMO.name}" (the open project), not the Marin demo`)
      .toContain(DEMO.name);

    // (2) BUDGET — chrome remaining/total === ledger === body.
    expect.soft(cb.remaining, 'chrome remaining === body/ledger remaining').toBe(body.remaining);
    expect.soft(cb.remaining, 'chrome remaining === ledger remaining ($116k)').toBe(DEMO.parsed.remaining);
    expect.soft(cb.total, 'chrome total === body/ledger total').toBe(body.total);
    expect.soft(cb.total, 'chrome total === ledger total ($340k)').toBe(DEMO.parsed.total);

    // (3) JOURNEY — chrome active-stage progress === the project's stage progress.
    expect.soft(cj.activeStage, 'chrome active journey stage === ledger current stage (Build)').toBe(DEMO.stageLabel);
    expect
      .soft(cj.activePct, `chrome journey % === ledger stage-4 progress (${DEMO.stageProgress}%), not Marin's Build ${MARIN_CHROME.buildPct}%`)
      .toBe(DEMO.stageProgress);
  });

  test('regression net — chrome is decoupled from a seeded budget edit (RED today)', async ({ page, context }) => {
    // Seed a deliberately distinct ledger for demo-project, then prove the chrome
    // still shows none of it (it shows Marin). After the fix the chrome tracks
    // the active project, so Marin's signature numbers must be gone.
    await context.addInitScript(() => {
      try {
        localStorage.setItem(
          'bkg-budget-demo-project',
          JSON.stringify([
            { id: 'e2e-1', category: 'materials', description: 'E2E distinct line', amount: 500_000, state: 'estimated', createdAt: '2026-05-31T00:00:00.000Z', updatedAt: '2026-05-31T00:00:00.000Z' },
          ]),
        );
      } catch {
        /* storage unavailable */
      }
    });

    await page.goto(`/killerapp/projects/${PROJECTS.DEMO}`, { waitUntil: 'domcontentloaded' });
    await waitForChrome(page);
    const cb = await readChromeBudget(page);

    test.info().annotations.push({ type: 'chrome-budget', description: JSON.stringify(cb) });

    // The chrome must NOT be parroting Marin's hardcoded budget over this project.
    expect
      .soft(cb.text, `chrome must not show Marin's hardcoded spend "${MARIN_CHROME.spent}" over a different project`)
      .not.toContain(MARIN_CHROME.spent);
    expect
      .soft(cb.text, `chrome must not show Marin's hardcoded total "${MARIN_CHROME.total}" over a different project`)
      .not.toContain(MARIN_CHROME.total);
    expect
      .soft(cb.remaining, "chrome remaining must not be Marin's $1.15M (1,151,400)")
      .not.toBe(1_151_400);
  });
});
