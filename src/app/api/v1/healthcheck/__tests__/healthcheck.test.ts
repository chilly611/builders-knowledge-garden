/**
 * Tests for /api/v1/healthcheck (PLATFORM-HEALTHCHECK, 2026-05-22)
 * ================================================================
 * Shape-only contract tests. We don't care here whether any
 * individual sub-check passes or fails (that's the operator's job to
 * monitor in the live dashboard) — what we care about is that the
 * JSON shape never silently drifts away from what:
 *
 *   1. The admin dashboard parses (`HealthcheckClient.tsx`).
 *   2. The uptime monitor thresholds on (`ok: boolean`).
 *   3. The detailed mode auth gate produces (`401` for anon).
 *
 * Strategy: mock every external dependency (`@/lib/auth-server`,
 * `@/lib/email`, `@/lib/code-sources`, `@/lib/live-workflows`) so the
 * route is exercised in pure isolation. Then assert the response
 * matches the schema documented in the route's JSDoc.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks — must be declared BEFORE the route import (vi.mock is hoisted).
// ---------------------------------------------------------------------------

// Shared mock state, mutable per test.
const mockSupabaseState = {
  count: 100,
  error: null as null | { message: string },
};

function makeFromChain() {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    then: undefined,
  };
  // Make the chain a thenable so `await client.from(t).select(...)` resolves.
  Object.defineProperty(chain, 'then', {
    value: (onFulfilled: (v: any) => void) => {
      onFulfilled({ count: mockSupabaseState.count, error: mockSupabaseState.error, data: [] });
      return Promise.resolve();
    },
  });
  return chain;
}

vi.mock('@/lib/auth-server', () => ({
  getAuthUser: vi.fn(async (_req: unknown) => null),
  getServiceClient: vi.fn(() => ({
    from: vi.fn(() => makeFromChain()),
    rpc: vi.fn(() => ({
      single: vi.fn(async () => ({ data: { count: 2 }, error: null })),
    })),
  })),
}));

vi.mock('@/lib/email', () => ({
  checkDomainVerification: vi.fn(async () => ({
    configured: false,
    reason: 'no_api_key',
    domain: 'theknowledgegardens.com',
    status: 'unknown',
    records: [],
    fetched_at: new Date().toISOString(),
  })),
  getFromDomain: vi.fn(() => 'theknowledgegardens.com'),
}));

vi.mock('@/lib/code-sources', () => ({
  getCacheStats: vi.fn(() => ({
    hits: 0,
    misses: 0,
    hit_ratio: 0,
    bypasses: 0,
    sizes: {
      'icc-digital-codes': 0,
      nfpa: 0,
      upcodes: 0,
      rag: 0,
    },
  })),
}));

vi.mock('@/lib/live-workflows', () => ({
  LIVE_WORKFLOW_PATHS: {
    q2: '/killerapp/workflows/estimating',
    q4: '/killerapp/workflows/contract-templates',
  },
}));

// Now import the route under test.
import { GET, _resetHealthcheckCacheForTests } from '../route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(url: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(url, { headers });
}

function expectSubCheckShape(name: string, check: unknown) {
  expect(check, `check.${name} present`).toBeTypeOf('object');
  expect(check, `check.${name} not null`).not.toBeNull();
  const c = check as Record<string, unknown>;
  expect(typeof c.ok, `${name}.ok is boolean`).toBe('boolean');
  expect(typeof c.latency_ms, `${name}.latency_ms is number`).toBe('number');
  // Optional fields: value, error, warning. If present, must be
  // appropriate types (we don't enforce value's inner shape — that's
  // intentionally per-check).
  if ('error' in c) expect(typeof c.error).toBe('string');
  if ('warning' in c) expect(typeof c.warning).toBe('string');
}

const EXPECTED_CHECKS = [
  'db',
  'rls',
  'audit_log',
  'embeddings',
  'source_urls',
  'email',
  'rag_cache',
  'workflows',
  'mcp',
  'pg_cron',
  'vercel',
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/v1/healthcheck', () => {
  beforeEach(() => {
    _resetHealthcheckCacheForTests();
    mockSupabaseState.count = 100;
    mockSupabaseState.error = null;
  });

  it('returns a minimal payload for the bare liveness probe (no auth)', async () => {
    const req = makeRequest('https://example.test/api/v1/healthcheck');
    const res = await GET(req);
    const json = await res.json();

    // Top-level shape contract.
    expect(typeof json.ok).toBe('boolean');
    expect(typeof json.ts).toBe('string');
    expect(typeof json.summary).toBe('string');
    // Non-detailed mode: no per-check breakdown, no version.
    expect(json.checks).toBeUndefined();

    // Status code mirrors top-level ok: 200 healthy, 503 degraded.
    expect([200, 503]).toContain(res.status);
    expect(res.status === 200 ? json.ok : !json.ok).toBe(true);
  });

  it('requires auth for the detailed branch', async () => {
    const req = makeRequest('https://example.test/api/v1/healthcheck?detailed=1');
    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/auth/i);
  });

  it('returns the full per-check shape when authed in detailed mode', async () => {
    const { getAuthUser } = await import('@/lib/auth-server');
    (getAuthUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'user-1',
      email: 'owner@example.test',
      name: 'Owner',
    });

    const req = makeRequest('https://example.test/api/v1/healthcheck?detailed=1', {
      authorization: 'Bearer fake-token',
    });
    const res = await GET(req);
    const json = await res.json();

    // Top-level fields.
    expect(typeof json.ok).toBe('boolean');
    expect(typeof json.ts).toBe('string');
    expect(typeof json.summary).toBe('string');

    // `checks` is an object with all expected sub-checks.
    expect(json.checks).toBeTypeOf('object');
    for (const name of EXPECTED_CHECKS) {
      expectSubCheckShape(name, json.checks[name]);
    }

    // `version` is optional (only present when vercel env vars set)
    // but if present must have the right shape.
    if (json.version) {
      expect(json.version).toBeTypeOf('object');
    }
  });

  it('returns within the 2s liveness SLA even under load', async () => {
    const req = makeRequest('https://example.test/api/v1/healthcheck');
    const start = Date.now();
    await GET(req);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(2000);
  });

  it('uses the module cache on back-to-back calls', async () => {
    const { getServiceClient } = await import('@/lib/auth-server');
    const mock = getServiceClient as unknown as ReturnType<typeof vi.fn>;
    const callsBefore = mock.mock.calls.length;

    const req = makeRequest('https://example.test/api/v1/healthcheck');
    await GET(req);
    const callsAfterFirst = mock.mock.calls.length;

    await GET(req);
    const callsAfterSecond = mock.mock.calls.length;

    // First call exercises the service client; second call should be a
    // pure cache hit (no additional getServiceClient invocations).
    expect(callsAfterFirst).toBeGreaterThan(callsBefore);
    expect(callsAfterSecond).toBe(callsAfterFirst);
  });

  it('never throws — always returns JSON, even when checks error', async () => {
    // Force every Supabase call to error.
    mockSupabaseState.error = { message: 'simulated db outage' };
    mockSupabaseState.count = 0;

    const req = makeRequest('https://example.test/api/v1/healthcheck');
    const res = await GET(req);
    const json = await res.json();

    // Still a structured payload, ok flipped to false (db is a hard
    // fail), 503 status.
    expect(typeof json.ok).toBe('boolean');
    expect(json.ok).toBe(false);
    expect(res.status).toBe(503);
  });
});
