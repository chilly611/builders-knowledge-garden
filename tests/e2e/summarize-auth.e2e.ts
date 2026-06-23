import { test, expect } from '@playwright/test';

/**
 * AUTH FOUNDATION — non-owner /summarize survives back/forward (zero 401s)
 * ========================================================================
 * The literal item-4 acceptance for fix/auth-foundation-singleton: a NON-OWNER
 * (invited collaborator) session hits POST /api/v1/projects/summarize 10x across
 * history transitions with ZERO 401s. Each call is made with same-origin cookies
 * only (no Bearer), so it exercises the new server-side COOKIE-auth fallback in
 * getAuthUser — the path that's immune to the in-memory token going stale after
 * a bfcache restore.
 *
 * Requires a real backend + a seeded non-owner session, which the unauthenticated
 * harness can't provide. Supply via env (skips cleanly otherwise):
 *   BKG_E2E_STORAGE_STATE     path to a Playwright storageState.json for a user who is
 *                             a project_members collaborator (NOT the owner) of the project below
 *   BKG_E2E_SUMMARIZE_PROJECT a command_center_projects id that user collaborates on
 *
 * The deterministic, always-on guarantee for the same behavior lives in
 * src/app/api/v1/projects/summarize/__tests__/summarize.test.ts (non-owner 10x → zero 401)
 * and src/lib/__tests__/auth-server.test.ts (cookie fallback).
 */
const STORAGE = process.env.BKG_E2E_STORAGE_STATE;
const PROJECT = process.env.BKG_E2E_SUMMARIZE_PROJECT;

test.describe('auth foundation — non-owner /summarize across navigation', () => {
  test.skip(
    !STORAGE || !PROJECT,
    'Set BKG_E2E_STORAGE_STATE (non-owner session) + BKG_E2E_SUMMARIZE_PROJECT to run against a live backend.',
  );
  test.use({ storageState: STORAGE });

  test('10x summarize across back/forward → zero 401s (cookie auth)', async ({ page }) => {
    await page.goto(`/killerapp/projects/${PROJECT}`, { waitUntil: 'domcontentloaded' });
    await page.goto('/killerapp', { waitUntil: 'domcontentloaded' });

    const statuses: number[] = [];
    for (let i = 0; i < 10; i++) {
      // Exercise the history transition that re-triggered the bug.
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await page.goForward({ waitUntil: 'domcontentloaded' });

      // Same-origin POST with cookies only (no Authorization header): proves the
      // server authenticates via the cookie the navigation just kept fresh.
      const status = await page.evaluate(async (projectId) => {
        const res = await fetch('/api/v1/projects/summarize', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: projectId }),
        });
        return res.status;
      }, PROJECT);
      statuses.push(status);
    }

    expect(statuses, `statuses: ${statuses.join(',')}`).not.toContain(401);
    expect(statuses.every((s) => s === 200)).toBe(true);
  });
});
