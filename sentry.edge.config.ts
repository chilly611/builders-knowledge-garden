/**
 * sentry.edge.config.ts — OBSERVABILITY-WIRE (2026-05-23)
 * =======================================================
 * Edge runtime Sentry init — picked up by middleware.ts and any route
 * declared with `export const runtime = 'edge'`. Kept minimal because
 * the edge runtime is more restrictive (no Node APIs, smaller bundle).
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
