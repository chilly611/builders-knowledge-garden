/**
 * Tests for caller resolution (eval vs metered) + in-memory rate limiting.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveCaller, checkRateLimit, __resetRateLimits } from "../auth";

function req(headers: Record<string, string> = {}): Request {
  return new Request("https://x/api/mcp/bkg", { method: "POST", headers });
}

const ORIG = process.env.RKG_API_KEYS;
beforeEach(() => {
  __resetRateLimits();
  process.env.RKG_API_KEYS = "rkg_live_abc:Acme Robotics";
});
afterEach(() => {
  if (ORIG === undefined) delete process.env.RKG_API_KEYS;
  else process.env.RKG_API_KEYS = ORIG;
});

describe("resolveCaller", () => {
  it("no key → free eval tier keyed by IP", () => {
    const c = resolveCaller(req({ "x-forwarded-for": "1.2.3.4" }));
    expect(c.tier).toBe("eval");
    expect(c.keyId).toBe("ip:1.2.3.4");
    expect(c.limitPerHour).toBe(40);
  });

  it("recognised key (Bearer) → metered tier with label", () => {
    const c = resolveCaller(req({ authorization: "Bearer rkg_live_abc" }));
    expect(c.tier).toBe("metered");
    expect(c.label).toBe("Acme Robotics");
    expect(c.keyId).toBe("key:Acme Robotics");
    expect(c.limitPerHour).toBe(1000);
  });

  it("recognised key via X-API-Key header also works", () => {
    const c = resolveCaller(req({ "x-api-key": "rkg_live_abc" }));
    expect(c.tier).toBe("metered");
  });

  it("`Bearer eval` is treated as the eval tier", () => {
    const c = resolveCaller(req({ authorization: "Bearer eval", "x-forwarded-for": "9.9.9.9" }));
    expect(c.tier).toBe("eval");
  });

  it("unrecognised key does NOT hard-fail — falls back to eval (discovery never breaks)", () => {
    const c = resolveCaller(req({ authorization: "Bearer totally-unknown", "x-forwarded-for": "5.5.5.5" }));
    expect(c.tier).toBe("eval");
    expect(c.label).toBe("unrecognised-key");
  });
});

describe("checkRateLimit", () => {
  it("allows up to the limit, then blocks", () => {
    const caller = resolveCaller(req({ "x-forwarded-for": "7.7.7.7" })); // eval = 40/hr
    let last = { allowed: true, remaining: 0, resetAt: "", limit: 0 };
    for (let i = 0; i < 40; i++) last = checkRateLimit(caller, 1_000_000 + i);
    expect(last.allowed).toBe(true);
    expect(last.remaining).toBe(0);
    const over = checkRateLimit(caller, 1_000_041);
    expect(over.allowed).toBe(false);
  });

  it("isolates buckets per caller", () => {
    const a = resolveCaller(req({ "x-forwarded-for": "a" }));
    const b = resolveCaller(req({ "x-forwarded-for": "b" }));
    for (let i = 0; i < 40; i++) checkRateLimit(a, 2_000_000 + i);
    expect(checkRateLimit(a, 2_000_100).allowed).toBe(false);
    expect(checkRateLimit(b, 2_000_100).allowed).toBe(true);
  });
});
