/**
 * sentry.server.config.ts — OBSERVABILITY-WIRE (2026-05-23)
 * =========================================================
 * Node-runtime Sentry init (API routes, route handlers, server
 * components). Reads `SENTRY_DSN` from the server-only env so the
 * key never ships to the client bundle.
 *
 * Falls back to NEXT_PUBLIC_SENTRY_DSN if SENTRY_DSN isn't set — this
 * keeps single-DSN setups simple (one Vercel env var, both sides).
 * Production deployments should prefer the server-only var.
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  environment:
    process.env.SENTRY_ENVIRONMENT ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV,
});
