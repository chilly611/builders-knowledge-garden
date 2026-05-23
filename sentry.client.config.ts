/**
 * sentry.client.config.ts — OBSERVABILITY-WIRE (2026-05-23)
 * =========================================================
 * Browser-side Sentry init. Auto-loaded by @sentry/nextjs at the start
 * of every client bundle.
 *
 * Graceful no-key behavior: when NEXT_PUBLIC_SENTRY_DSN is absent, the
 * SDK init effectively becomes a no-op (enabled:false). The Sentry SDK
 * also tolerates being called with no DSN, so even if a stray
 * `Sentry.captureException(...)` runs through the codebase it won't
 * throw — it just drops the event silently.
 *
 * We keep tracesSampleRate low in prod (10%) to control quota, full in
 * dev so engineers see every transaction.
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  // Errors are obviously the headline use case; performance traces are
  // the secondary one. Replay is intentionally not enabled here — we
  // can add @sentry/replay later if support needs UI repro tooling.
  environment:
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
    process.env.NEXT_PUBLIC_VERCEL_ENV ||
    process.env.NODE_ENV,
});
