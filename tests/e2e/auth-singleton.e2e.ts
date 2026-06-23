import { test, expect, type ConsoleMessage } from '@playwright/test';
import { PROJECTS, pinAnonymous } from './fixtures/bkg';

/**
 * AUTH FOUNDATION — ONE GoTrueClient, console clean across navigation
 * ===================================================================
 * Regression net for fix/auth-foundation-singleton (2026-06-23).
 *
 * Symptom this guards: "Multiple GoTrueClient instances detected in the same
 * browser context" — supabase-js logs it from the GoTrueClient constructor when
 * a SECOND auth client is created in one tab. Each survivor holds its own
 * (stale) storage and races autoRefresh → the random-looking 401s the lesson
 * (tasks.lessons.md, 2026-06-11) tied to this exact warning.
 *
 * The app must construct exactly ONE browser auth client (src/lib/supabase.ts,
 * the @supabase/ssr singleton) no matter how the user moves around — including
 * BACK/FORWARD (bfcache) history transitions, which is precisely when the
 * /summarize 401 was reported. Runs unauthenticated against the real dev server
 * (placeholder Supabase still constructs the client, so the warning is
 * observable without a backend).
 */
test.describe('auth foundation — GoTrueClient singleton', () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await pinAnonymous(context, baseURL);
  });

  test('no "Multiple GoTrueClient" warning across navigation + back/forward', async ({ page }) => {
    const gotrueWarnings: string[] = [];
    const collect = (msg: ConsoleMessage) => {
      const text = msg.text();
      if (/multiple\s+gotrueclient\s+instances/i.test(text)) gotrueWarnings.push(text);
    };
    page.on('console', collect);

    // Visit several client surfaces that mount the auth provider, then exercise
    // the back/forward history transitions that re-triggered the bug.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.goto(`/killerapp/projects/${PROJECTS.DEMO}`, { waitUntil: 'domcontentloaded' });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    await page.goBack({ waitUntil: 'domcontentloaded' });   // -> demo project (bfcache restore)
    await page.goForward({ waitUntil: 'domcontentloaded' }); // -> login
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.goBack({ waitUntil: 'domcontentloaded' });    // -> home

    // Let any post-restore client construction / auth events flush.
    await page.waitForTimeout(750);

    expect(
      gotrueWarnings,
      `Expected ONE browser auth client; saw Multiple-GoTrueClient warning(s):\n${gotrueWarnings.join('\n')}`,
    ).toHaveLength(0);

    // Guard against a false pass from a blank page: the app actually rendered.
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
