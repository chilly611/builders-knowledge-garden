/**
 * src/lib/posthog.ts — OBSERVABILITY-WIRE (2026-05-23)
 * ====================================================
 * Server-side PostHog client + thin `captureServerEvent` helper.
 *
 * Design rules:
 *   1. Graceful no-key — if neither POSTHOG_KEY nor
 *      NEXT_PUBLIC_POSTHOG_KEY is set, every call returns/no-ops
 *      without throwing. Observability MUST NOT break the request.
 *   2. Singleton — `posthog-node` opens a connection internally; we
 *      keep one client per Node process to avoid socket churn.
 *      Serverless platforms (Vercel) recycle the process per cold
 *      start, which is fine.
 *   3. flushAt: 1 — Vercel functions can terminate immediately after
 *      sending the response. Buffering events means we lose them.
 *      Setting flushAt:1 forces a network round-trip per event; we
 *      then `await client.flush()` in the helper to make sure the
 *      event is actually shipped before the function exits.
 *   4. Try/catch around capture — even with the no-key guard, any
 *      transient PostHog outage or DNS hiccup must NOT propagate up
 *      and 500 the user's request.
 */
import { PostHog } from 'posthog-node';

let serverClient: PostHog | null = null;

export function getPostHogServerClient(): PostHog | null {
  const key = process.env.POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  if (!serverClient) {
    serverClient = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com',
      flushAt: 1, // flush every event for serverless
    });
  }
  return serverClient;
}

/**
 * Capture a server-side product analytics event. Safe to call from any
 * route handler — never throws, never logs in the hot path unless we
 * explicitly choose to.
 *
 * PII rule: the caller should pass user.id (UUID) as distinctId. Do NOT
 * pass email or any PII as a property unless you're certain it belongs
 * in PostHog. The four wired routes follow this convention.
 */
export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  const client = getPostHogServerClient();
  if (!client) return;
  try {
    client.capture({
      distinctId,
      event,
      properties: {
        env: process.env.VERCEL_ENV || 'unknown',
        ...properties,
      },
    });
    await client.flush();
  } catch {
    // Swallow — observability failures must never break the request.
  }
}

/**
 * Test-only reset hook. The unit suite uses this to clear the
 * singleton between tests so different env permutations are honored.
 */
export function __resetPostHogClientForTests(): void {
  serverClient = null;
}
