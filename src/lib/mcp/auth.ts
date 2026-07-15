/**
 * RKG — caller resolution: API-key gating + free EVAL tier + rate limiting.
 *
 * Tiers:
 *   eval     — no key (or `Bearer eval`). Open for agent discovery + trial.
 *              Rate limited per IP. Tool results are size-capped by the tools.
 *   metered  — a recognised API key. Higher limit; every call is metered for
 *              usage-based billing (see ./metering.ts).
 *
 * Keys are read from env so the layer ships without a DB dependency:
 *   RKG_API_KEYS = "rkg_live_abc:Acme Robotics,rkg_live_def:Survey Drone Co"
 * The legacy single-secret `MCP_API_KEY` is also honoured for back-compat.
 *
 * Rate limiting is in-memory (per serverless instance) — intentionally light
 * for a moat-seed eval gate. Durable, key-scoped quotas move to the metering
 * ledger when per-query billing turns on.
 */

export type Tier = "eval" | "metered";

export interface Caller {
  tier: Tier;
  /** Stable id for metering: the key label (metered) or `ip:<addr>` (eval). */
  keyId: string;
  /** Human label for logs/usage. */
  label: string;
  ip: string;
  limitPerHour: number;
}

const EVAL_LIMIT_PER_HOUR = 40;
const METERED_LIMIT_PER_HOUR = 1000;

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function presentedKey(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const k = auth.slice(7).trim();
    if (k && k.toLowerCase() !== "eval") return k;
  }
  const x = request.headers.get("x-api-key");
  if (x?.trim()) return x.trim();
  return null;
}

/** Parse RKG_API_KEYS into a key→label map. */
function knownKeys(): Map<string, string> {
  const map = new Map<string, string>();
  const raw = process.env.RKG_API_KEYS || "";
  for (const pair of raw.split(",")) {
    const [key, ...labelParts] = pair.split(":");
    const k = key?.trim();
    if (k) map.set(k, labelParts.join(":").trim() || k.slice(0, 12));
  }
  // Back-compat: the legacy shared secret behaves as one metered key.
  if (process.env.MCP_API_KEY) map.set(process.env.MCP_API_KEY, "legacy-mcp-key");
  return map;
}

export function resolveCaller(request: Request): Caller {
  const ip = clientIp(request);
  const key = presentedKey(request);
  if (key) {
    const label = knownKeys().get(key);
    if (label) {
      return { tier: "metered", keyId: `key:${label}`, label, ip, limitPerHour: METERED_LIMIT_PER_HOUR };
    }
    // A key was presented but isn't recognised — treat as eval (do not 401,
    // so discovery never hard-fails) but mark it so the route can hint.
    return { tier: "eval", keyId: `ip:${ip}`, label: "unrecognised-key", ip, limitPerHour: EVAL_LIMIT_PER_HOUR };
  }
  return { tier: "eval", keyId: `ip:${ip}`, label: "eval", ip, limitPerHour: EVAL_LIMIT_PER_HOUR };
}

// ─── In-memory sliding-window rate limit ───
const WINDOW_MS = 60 * 60 * 1000;
const buckets = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string;
  limit: number;
}

export function checkRateLimit(caller: Caller, now: number = Date.now()): RateLimitResult {
  const arr = (buckets.get(caller.keyId) || []).filter((t) => now - t < WINDOW_MS);
  const limit = caller.limitPerHour;
  const resetAt = new Date((arr[0] ?? now) + WINDOW_MS).toISOString();
  if (arr.length >= limit) {
    buckets.set(caller.keyId, arr);
    return { allowed: false, remaining: 0, resetAt, limit };
  }
  arr.push(now);
  buckets.set(caller.keyId, arr);
  return { allowed: true, remaining: Math.max(0, limit - arr.length), resetAt, limit };
}

/** Test seam — clear the in-memory buckets. */
export function __resetRateLimits() {
  buckets.clear();
}
