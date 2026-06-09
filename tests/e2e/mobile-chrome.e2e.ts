import { test, expect } from '@playwright/test';
import { PROJECTS, DEMO, chromeRegion, waitForChrome, pinAnonymous, dismissStageWelcome } from './fixtures/bkg';

/**
 * MOBILE CHROME RIBBON (375px) — readable, not overflowing.
 *
 * The mobile-first DIY owner meets the persistent budget+journey chrome on every
 * screen. Dogfood pass-01 finding #6: at 375px the KPI pills "collide into
 * illegible overlapping text." This asserts the ribbon is readable on a 375px
 * viewport — no horizontal page overflow and no overlapping KPI blocks — so a
 * regression in the chrome's responsive layout is caught.
 */

test.describe('mobile chrome ribbon at 375px', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ context, baseURL }) => {
    await pinAnonymous(context, baseURL);
    await dismissStageWelcome(context, PROJECTS.DEMO);
  });

  test('the chrome ribbon is readable and does not overflow a 375px viewport', async ({ page }) => {
    await page.goto(`/killerapp/projects/${PROJECTS.DEMO}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(DEMO.name).first()).toBeVisible({ timeout: 30_000 });
    await waitForChrome(page);

    const region = chromeRegion(page);
    await expect(region, 'the persistent chrome must be present at 375px').toBeVisible();

    // (a) No horizontal page overflow — the primary mobile-readability signal.
    const overflowPx = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    test.info().annotations.push({ type: 'doc-horizontal-overflow-px', description: String(overflowPx) });
    expect(overflowPx, 'the page must not scroll horizontally at 375px').toBeLessThanOrEqual(1);

    // (b) The chrome region lies within the viewport bounds.
    const box = await region.boundingBox();
    expect(box, 'the chrome should have a layout box').not.toBeNull();
    if (box) {
      test.info().annotations.push({ type: 'chrome-box', description: JSON.stringify(box) });
      expect(box.x, 'chrome left edge within viewport').toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width, 'chrome right edge within viewport').toBeLessThanOrEqual(376);
    }

    // (c) The budget KPI blocks must not collide (overlap = illegible at 375px).
    //     Works for the old chrome (Spend/Income/Headroom buttons) and the
    //     post-fix app-shell (.bcell budget cells). Only visible boxes count.
    const kpi = await page.evaluate(() => {
      const selectors = [
        '[role="banner"][aria-label="Project chrome"] [aria-label^="Spend "]',
        '[role="banner"][aria-label="Project chrome"] [aria-label^="Income:"]',
        '[role="banner"][aria-label="Project chrome"] [aria-label^="Headroom "]',
        '.bkg-shell .bcell',
      ];
      const els: Element[] = [];
      for (const s of selectors) document.querySelectorAll(s).forEach((e) => els.push(e));
      const boxes = els
        .map((e) => e.getBoundingClientRect())
        .filter((r) => r.width > 1 && r.height > 1);
      let collisions = 0;
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i];
          const b = boxes[j];
          const xOverlap = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const yOverlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (xOverlap > 2 && yOverlap > 2) collisions++;
        }
      }
      return { blocks: boxes.length, collisions };
    });
    test.info().annotations.push({ type: 'kpi-blocks', description: JSON.stringify(kpi) });
    expect(kpi.collisions, 'budget KPI blocks must not overlap (illegible collision) at 375px').toBe(0);

    // (d) Readability sanity: a budget figure is actually visible in the ribbon.
    await expect(region.getByText(/\$/).first(), 'a budget figure should be visible in the ribbon').toBeVisible();
  });
});
