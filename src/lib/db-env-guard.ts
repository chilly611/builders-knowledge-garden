/**
 * Data-safety seatbelt — forbids a non-production runtime from talking to the production database.
 *
 * Runs once at server boot via `src/instrumentation.ts`. This is the code-level backstop behind the
 * env-level dev/prod separation: even if someone copies prod credentials into `.env.local`, a local
 * `next dev` (or a Vercel Preview) will refuse to boot rather than read/write the live database.
 *
 * See docs/runbooks/dev-prod-separation.md.
 */

// Production Supabase project ref(s) — a dev/preview/test runtime must NEVER point at any of these.
// Comma-separated, overridable via env. After the dedicated-prod cutover, list BOTH the new prod ref
// AND the old shared ref (`vlezoyalutexenbnzzui`) so dev can't reach either.
const PROD_PROJECT_REFS = (process.env.PROD_SUPABASE_PROJECT_REFS ?? 'vlezoyalutexenbnzzui')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/** Extract the Supabase project ref (the `xxxx` in `https://xxxx.supabase.co`) from a URL. */
function refFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  const m = url.match(/https?:\/\/([a-z0-9]+)\.supabase\.(?:co|in|net)/i);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Throws if a non-production runtime is pointed at the production database.
 * Safe to call during `next build` (no-op) and in CI.
 */
export function assertDbEnvSafe(env: NodeJS.ProcessEnv = process.env): void {
  if (env.DISABLE_DB_ENV_GUARD === '1') return;            // documented escape hatch (e.g. deliberate prod debug)
  if ((env.NEXT_PHASE ?? '').includes('build')) return;     // build does no DB traffic

  const vercelEnv = env.VERCEL_ENV; // 'production' | 'preview' | 'development' | undefined (local)
  const ref = refFromUrl(env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL);
  const pointsAtProd = ref !== null && PROD_PROJECT_REFS.includes(ref);
  const isProdServe = vercelEnv === 'production';

  // HARD RULE — the footgun this whole feature exists to prevent.
  if (!isProdServe && pointsAtProd) {
    throw new Error(
      `[db-env-guard] BLOCKED: a non-production runtime (NODE_ENV=${env.NODE_ENV ?? 'n/a'}, ` +
        `VERCEL_ENV=${vercelEnv ?? 'local'}) is pointed at the PRODUCTION database "${ref}". ` +
        `Point NEXT_PUBLIC_SUPABASE_URL at the dev/staging Supabase project, or set ` +
        `DISABLE_DB_ENV_GUARD=1 for a deliberate, supervised prod session. ` +
        `See docs/runbooks/dev-prod-separation.md.`,
    );
  }

  // SOFT RULE — production should point at a known prod ref. Warn by default; throw only if STRICT.
  if (isProdServe && ref !== null && !pointsAtProd) {
    const msg = `[db-env-guard] production runtime is pointed at a NON-production project "${ref}".`;
    if (env.STRICT_DB_ENV_GUARD === '1') throw new Error(`${msg} (STRICT_DB_ENV_GUARD=1)`);
    console.error(`WARNING: ${msg} Set NEXT_PUBLIC_SUPABASE_URL to prod or STRICT_DB_ENV_GUARD=1 to enforce.`);
  }
}
