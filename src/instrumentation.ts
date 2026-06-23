/**
 * Next.js instrumentation hook — runs once per server boot (Node runtime only).
 * Enforces the dev/prod database seatbelt before any request is served.
 * See src/lib/db-env-guard.ts and docs/runbooks/dev-prod-separation.md.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertDbEnvSafe } = await import('./lib/db-env-guard');
    assertDbEnvSafe();
  }
}
