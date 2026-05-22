/**
 * HTTP Fetcher — Generic helper for ICC / NFPA / future paywalled code APIs.
 *
 * Design goals:
 *   1. When NO API key is set for a publisher, the adapter is in "preview mode":
 *      it never makes a network call, returns the citation-only payload, and
 *      flags `verified: false`. This is the production reality today — ICC
 *      DigitalCodes and NFPA Link are paywalled commercial SaaS and we have
 *      no contract.
 *   2. When an API key IS set, the adapter is in "live mode": it issues a
 *      real HTTP request to the publisher (or a stub endpoint, when wiring
 *      up before contracts are signed), with timeout + retry, parses the
 *      response, and returns `verified: true`.
 *   3. Failures in live mode (timeout, 4xx, 5xx, parse error) fall back
 *      gracefully to the same citation-only payload preview mode would have
 *      returned. We never break the orchestrator — at worst we degrade to
 *      "the badge stays at the BKG-seed count."
 *
 * This module is publisher-agnostic. Callers (icc.ts, nfpa.ts) pass in the
 * resolved URL, the API key env var, and the response parser.
 */

export type FetchMode = "preview" | "live";

export interface PublisherFetchOptions {
  /** Publisher API endpoint URL (or stub URL pre-contract). */
  url: string;
  /** Name of the env var holding the API key (e.g. "ICC_API_KEY"). */
  apiKeyEnv: string;
  /** Optional auth header name; defaults to "Authorization". */
  authHeader?: string;
  /** Optional auth scheme; defaults to "Bearer". Use "" for raw key. */
  authScheme?: string;
  /** Request timeout in ms. Defaults to 5000. */
  timeoutMs?: number;
  /** Retry attempts on transient failure. Defaults to 3. */
  retries?: number;
  /** Initial retry delay in ms; doubles each attempt. Defaults to 250. */
  retryBaseDelayMs?: number;
  /** Optional extra headers (Accept, version pinning, etc). */
  extraHeaders?: Record<string, string>;
}

export interface PublisherFetchResult<T = unknown> {
  mode: FetchMode;
  /** When mode === "live" && ok, contains the parsed JSON. Otherwise null. */
  data: T | null;
  /** True iff mode === "live" AND a 2xx response was parsed successfully. */
  ok: boolean;
  /** Short reason string for telemetry: "no-api-key", "timeout", "http-404", "parse-error", "ok". */
  reason: string;
  /** HTTP status when a response was received. */
  status?: number;
}

/**
 * Read an API key from process.env. Returns null when missing OR placeholder.
 * (We treat "your-key-here" or "<set me>"-style placeholders as missing.)
 */
export function readApiKey(envVar: string): string | null {
  const raw = process.env[envVar];
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^(your|placeholder|set\s*me|todo|<.*>)/i.test(trimmed)) return null;
  if (trimmed.length < 8) return null;
  return trimmed;
}

/**
 * Sleep helper for retry backoff. Honors fake timers by using setTimeout.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generic HTTP GET against a publisher API with timeout + exponential backoff.
 *
 * Preview mode: when the API key env var is not set, returns
 * { mode: "preview", ok: false, data: null, reason: "no-api-key" } WITHOUT
 * any network call. Adapter then builds its citation-only payload.
 *
 * Live mode: issues fetch with AbortController timeout. Retries on:
 *   - network error
 *   - 5xx status
 *   - timeout (AbortError)
 * Does NOT retry on 4xx (those are deterministic — bad request or auth).
 */
export async function fetchPublisher<T = unknown>(
  opts: PublisherFetchOptions
): Promise<PublisherFetchResult<T>> {
  const apiKey = readApiKey(opts.apiKeyEnv);
  if (!apiKey) {
    return { mode: "preview", ok: false, data: null, reason: "no-api-key" };
  }

  const timeoutMs = opts.timeoutMs ?? 5000;
  const retries = opts.retries ?? 3;
  const baseDelay = opts.retryBaseDelayMs ?? 250;
  const authHeader = opts.authHeader ?? "Authorization";
  const authScheme = opts.authScheme ?? "Bearer";

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts.extraHeaders ?? {}),
  };
  headers[authHeader] = authScheme ? `${authScheme} ${apiKey}` : apiKey;

  let lastReason = "unknown";
  let lastStatus: number | undefined = undefined;

  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(opts.url, {
        method: "GET",
        headers,
        signal: controller.signal,
      });
      clearTimeout(timer);
      lastStatus = res.status;

      if (res.ok) {
        try {
          const data = (await res.json()) as T;
          return { mode: "live", ok: true, data, reason: "ok", status: res.status };
        } catch (parseErr) {
          // Bad JSON from publisher — don't retry, return parse-error
          return {
            mode: "live",
            ok: false,
            data: null,
            reason: "parse-error",
            status: res.status,
          };
        }
      }

      // 4xx: deterministic, don't retry
      if (res.status >= 400 && res.status < 500) {
        return {
          mode: "live",
          ok: false,
          data: null,
          reason: `http-${res.status}`,
          status: res.status,
        };
      }

      // 5xx: retry with backoff
      lastReason = `http-${res.status}`;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof Error && err.name === "AbortError") {
        lastReason = "timeout";
      } else {
        lastReason = "network-error";
      }
    }

    // Backoff before next attempt
    if (attempt < retries - 1) {
      await sleep(baseDelay * Math.pow(2, attempt));
    }
  }

  return { mode: "live", ok: false, data: null, reason: lastReason, status: lastStatus };
}

/**
 * Lightweight check used by adapters to decide if they should bother building
 * a fetch call at all. Returns true when a real key is configured.
 */
export function hasApiKey(envVar: string): boolean {
  return readApiKey(envVar) !== null;
}
