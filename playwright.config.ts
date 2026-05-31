import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright e2e + data-consistency harness for Builder's Knowledge Garden.
 *
 * Scope: tests/ only — this harness adds NO app code. It exercises the real
 * Next.js dev server (Turbopack) unauthenticated; the app boots and renders
 * with no real Clerk/Supabase keys (Clerk is unwired, Supabase has baked-in
 * placeholder fallbacks), so no login or auth bypass is required.
 *
 * Runs on a dedicated port (3210, override with BKG_E2E_PORT) so it never
 * collides with a `next dev` already running on :3000 in another worktree.
 */
const PORT = Number(process.env.BKG_E2E_PORT ?? 3210);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  // Specs use the *.e2e.ts suffix so the app's vitest run (`npm test`, default
  // **/*.{test,spec}.* glob) never tries to execute these Playwright files.
  testMatch: '**/*.e2e.ts',
  outputDir: './tests/.artifacts/results',
  // The Next dev server compiles routes on first hit (Turbopack); keep the
  // suite serial so we don't trigger simultaneous cold compiles and time out.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: './tests/.artifacts/report' }]],
  use: {
    baseURL: BASE_URL,
    // Pin locale + timezone so date strings the app renders via
    // toLocaleDateString are deterministic across machines/CI (otherwise a
    // UTC runner shifts e.g. "Mar 18" -> "Mar 17").
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // First-hit Turbopack compiles can be slow; be patient on navigation.
    navigationTimeout: 60_000,
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
  ],
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: BASE_URL,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
