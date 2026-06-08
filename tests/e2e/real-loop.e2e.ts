import { test, expect } from '@playwright/test';
import { PROJECTS, DEMO, waitForChrome, pinAnonymous, dismissStageWelcome } from './fixtures/bkg';

/**
 * REAL-LOOP TEST — sign in → open a project → run a workflow → save → leave →
 * return → resume.
 *
 * This locks in the core promise of the app: your work persists and resumes.
 * It runs against the live Next dev server, fully anonymous, on the verified
 * localStorage happy-path (the budget editor; dogfood pass-01 confirms
 * "localStorage resume works — edits persist across reload").
 *
 * "Green where backend allows": auth is Supabase, and a genuinely signed-in
 * session needs a live instance + seeded credentials. So we ALWAYS verify the
 * sign-in surface, and perform a real sign-in only when E2E_EMAIL / E2E_PASSWORD
 * are provided; otherwise we take the app's own anonymous entry. The
 * save/resume loop itself is backend-free and should be green everywhere.
 */

const E2E_EMAIL = process.env.E2E_EMAIL;
const E2E_PASSWORD = process.env.E2E_PASSWORD;
const ANON_BUDGET_KEY = 'bkg-budget-anonymous';
const LINE_DESC = 'E2E resume probe — 17 yards concrete';
const LINE_AMOUNT = '42500';
const DESC_PLACEHOLDER = 'e.g., 20 yards concrete for foundation';

test.describe('real loop — sign in → open → run → save → leave → return → resume', () => {
  test.beforeEach(async ({ context, baseURL }) => {
    // Block the first-visit demo auto-seed so the budget editor stays on the
    // anonymous key (deterministic, backend-free).
    await pinAnonymous(context, baseURL);
    await dismissStageWelcome(context, PROJECTS.DEMO);
  });

  test('a saved budget line survives leave + return', async ({ page }) => {
    await test.step('1. sign in (surface always; real auth only with creds)', async () => {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('input[type="email"]'), 'the sign-in form should render').toBeVisible({ timeout: 30_000 });
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i }).first()).toBeVisible();

      if (E2E_EMAIL && E2E_PASSWORD) {
        await page.locator('input[type="email"]').fill(E2E_EMAIL);
        await page.locator('input[type="password"]').fill(E2E_PASSWORD);
        await page.getByRole('button', { name: /^\s*sign in\s*$/i }).first().click();
        await page.waitForURL(/\/(killerapp|welcome)/, { timeout: 30_000 });
        test.info().annotations.push({ type: 'auth', description: 'real Supabase sign-in' });
      } else {
        const explorer = page.getByRole('button', { name: /Continue as Explorer/i });
        if (await explorer.count()) await explorer.first().click();
        else await page.goto('/killerapp', { waitUntil: 'domcontentloaded' });
        await page.waitForURL(/\/killerapp/, { timeout: 30_000 }).catch(() => {});
        test.info().annotations.push({ type: 'auth', description: 'anonymous entry (no E2E creds; backend-gated sign-in skipped)' });
      }
    });

    await test.step('2. open a project (Willow Creek ADU)', async () => {
      await page.goto(`/killerapp/projects/${PROJECTS.DEMO}`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(DEMO.name).first(), 'the opened project should render').toBeVisible({ timeout: 30_000 });
      await waitForChrome(page);
      // Run the budget workflow on the anonymous ledger: drop any active project
      // the project route may have set, so /killerapp/budget uses the anon key.
      await page.evaluate(() => {
        try {
          localStorage.removeItem('bkg-active-project');
        } catch {
          /* ignore */
        }
      });
    });

    await test.step('3. run a workflow (open the budget editor, start a line)', async () => {
      await page.goto('/killerapp/budget', { waitUntil: 'domcontentloaded' });
      const desc = page.getByPlaceholder(DESC_PLACEHOLDER);
      if ((await desc.count()) === 0) {
        // Empty ledger → create the first line via a quick-start or "+ Add a line".
        const quickStart = page.getByRole('button', { name: 'Materials' });
        const addLine = page.getByRole('button', { name: '+ Add a line' });
        if (await quickStart.count()) await quickStart.first().click();
        else if (await addLine.count()) await addLine.first().click();
      }
      await expect(desc.first(), 'a budget line input should be available to fill').toBeVisible({ timeout: 30_000 });
    });

    await test.step('4. save (autosave debounces to localStorage)', async () => {
      await page.getByPlaceholder(DESC_PLACEHOLDER).first().fill(LINE_DESC);
      const amount = page.locator('input[type="number"][placeholder="0"]').first();
      if (await amount.count()) await amount.fill(LINE_AMOUNT);
      await expect
        .poll(async () => page.evaluate((k) => localStorage.getItem(k) ?? '', ANON_BUDGET_KEY), {
          timeout: 10_000,
          message: 'the debounced autosave should persist the line to localStorage',
        })
        .toContain(LINE_DESC);
    });

    await test.step('5. leave', async () => {
      await page.goto('/killerapp', { waitUntil: 'domcontentloaded' });
    });

    await test.step('6 + 7. return and resume', async () => {
      await page.goto('/killerapp/budget', { waitUntil: 'domcontentloaded' });

      // Definitive resume: the saved work survived the round-trip…
      const stored = await page.evaluate((k) => localStorage.getItem(k) ?? '', ANON_BUDGET_KEY);
      expect(stored, 'the saved line should survive leave → return').toContain(LINE_DESC);

      // …and the editor rehydrates it. On return a non-empty ledger renders the
      // saved line as a collapsed grid row (the editable input only appears
      // while adding/expanding), so the restored line is asserted as visible
      // text rather than as an input value.
      await expect(page.locator('.bkg-budget-grid'), 'the populated budget grid should rehydrate').toBeVisible({ timeout: 30_000 });
      await expect(
        page.getByText(LINE_DESC).first(),
        'the resumed line should be visible in the rehydrated ledger',
      ).toBeVisible({ timeout: 15_000 });
    });
  });
});
