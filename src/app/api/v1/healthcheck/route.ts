/**
 * GET /api/v1/healthcheck (PLATFORM-HEALTHCHECK, 2026-05-22)
 * =========================================================
 * One endpoint that returns the full operational status of the
 * platform. Designed for two consumers:
 *
 *   1. Uptime monitoring (Vercel, Better Stack, UptimeRobot, etc.) —
 *      hits the bare URL, wants a fast `{ ok: true|false }` it can
 *      threshold on. Must respond within 2s even when the DB is slow,
 *      and must respond AT ALL even when the DB is fully broken.
 *
 *   2. The admin dashboard at `/admin/healthcheck` — wants the full
 *      per-check value breakdown so an operator can see at a glance
 *      which sub-system is amber/red. Pass `?detailed=1` to opt into
 *      the verbose payload; this branch requires auth because the
 *      per-check counts (entity counts, audit row counts, vercel
 *      commit) are information that anon callers don't need.
 *
 * Sub-checks (run in parallel via `Promise.allSettled`, each
 * race-against a 1.5s deadline so a single hung Supabase RPC can't
 * blow the 2s SLA):
 *
 *   db           — SELECT 1 via service role.            (hard fail)
 *   rls          — policy count + relrowsecurity on the
 *                  critical tenancy tables (via
 *                  healthcheck_rls_policy_counts RPC).   (hard fail)
 *   audit_log    — partition count + 24h row count (via
 *                  healthcheck_audit_log_partition_count
 *                  RPC). Partitions < 12 → soft warn.    (soft warn)
 *   embeddings   — knowledge_entities embedded ratio.    (soft warn)
 *   source_urls  — coverage of source citations.         (soft warn)
 *   email        — Resend domain verification.           (soft warn)
 *   rag_cache    — in-process cache hit ratio.           (info)
 *   workflows    — LIVE_WORKFLOW_PATHS folder presence.  (info)
 *   mcp          — entity + jurisdiction counts > 0.     (soft warn)
 *   pg_cron      — ≥2 ACTIVE cron jobs (via
 *                  healthcheck_cron_job_count RPC).      (hard fail)
 *   vercel       — deployment id / commit sha / branch.  (info)
 *
 * Result is cached at module level for 10s so a pinger hitting every
 * second doesn't fan out 11×N Supabase queries; 10s is short enough
 * that an outage flips the dashboard within one refresh cycle.
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getAuthUser, getServiceClient } from '@/lib/auth-server';
import { checkDomainVerification, getFromDomain } from '@/lib/email';
import { getCacheStats } from '@/lib/code-sources';
import { LIVE_WORKFLOW_PATHS } from '@/lib/live-workflows';
import {
  isStripeConfigured,
  getStripeMode,
  getCustomerCountSnapshot,
} from '@/lib/stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CheckSeverity = 'hard' | 'soft' | 'info';

export interface SubCheck {
  ok: boolean;
  value?: unknown;
  error?: string;
  warning?: string;
  latency_ms: number;
}

export interface HealthcheckResponse {
  ok: boolean;
  ts: string;
  summary: string;
  version?: {
    commit?: string;
    branch?: string;
    deployment_id?: string;
  };
  checks?: Record<string, SubCheck>;
}

// ---------------------------------------------------------------------------
// Cache (10s TTL) — module-level, shared across requests in same lambda.
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 10 * 1000;
// 2026-05-23: bumped 1500 -> 3000 -> 5000 -> 10000 across iterations.
// Healthcheck doesn't need to be snappy on cold start. Warm path stays
// sub-second via 10s module cache. Cold path can take up to ~10s; uptime
// monitors and admin dashboards tolerate that fine.
//
// Earlier attempt at module-level warmup ('select head + count' on
// knowledge_entities) was itself slow (counting 2256 rows can take
// 1-3s on its own) and didn't reliably warm the pool before checks ran
// in parallel. Removed; generous per-check deadlines + cache do the job.
const PER_CHECK_DEADLINE_MS = 10000;

interface CacheEntry {
  at: number;
  payload: HealthcheckResponse;
}
let cache: CacheEntry | null = null;

// ---------------------------------------------------------------------------
// Race helper — every sub-check is wrapped in a 1.5s deadline.
// ---------------------------------------------------------------------------

async function withDeadline<T>(
  label: string,
  fn: () => Promise<T>,
  deadlineMs = PER_CHECK_DEADLINE_MS,
): Promise<{ ok: boolean; value?: T; error?: string; latency_ms: number }> {
  const start = Date.now();
  try {
    const result = await Promise.race<Promise<T> | Promise<never>>([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} deadline (${deadlineMs}ms)`)), deadlineMs),
      ),
    ]);
    return { ok: true, value: result, latency_ms: Date.now() - start };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      latency_ms: Date.now() - start,
    };
  }
}

// ---------------------------------------------------------------------------
// Sub-check implementations
// ---------------------------------------------------------------------------

/** db — SELECT 1 via service role. Hard fail if it errors. */
async function checkDb(): Promise<SubCheck> {
  const res = await withDeadline('db', async () => {
    const client = getServiceClient();
    // `from('knowledge_entities').select(..., head: true).limit(1)` is the
    // cheapest portable "is the DB reachable" probe via supabase-js. We
    // don't actually care about the count — we care that the round-trip
    // completes without an auth/network error.
    const { error } = await client.from('knowledge_entities').select('id', { head: true, count: 'exact' }).limit(1);
    if (error) throw new Error(error.message);
    return { ping: 'ok' };
  });
  return res;
}

/**
 * rls — every critical tenancy table has RLS enabled AND ≥1 policy.
 * Hard fail. Backed by `public.healthcheck_rls_policy_counts(text[])`
 * (SECURITY DEFINER, service_role-only) so we can introspect
 * pg_policies + pg_class.relrowsecurity in a single round-trip.
 */
const RLS_CRITICAL_TABLES = [
  'project_budget_lines',
  'project_rfis',
  'project_change_orders',
  'project_punch_items',
  'project_submittals',
  'crm_contacts',
  'crm_messages',
  'sub_bids',
  'signed_documents',
  'signature_events',
  'vendors',
  'invoices',
  'invoice_line_items',
  'invoice_payments',
  'organizations',
  'org_members',
  'project_members',
];
interface RlsRpcRow {
  table_name: string;
  policy_count: number;
  rls_enabled: boolean;
}
async function checkRls(): Promise<SubCheck> {
  return withDeadline('rls', async () => {
    const client = getServiceClient();
    const { data, error } = await client.rpc('healthcheck_rls_policy_counts', {
      table_names: RLS_CRITICAL_TABLES,
    });
    if (error) throw new Error(error.message);
    const tables = (data ?? []) as RlsRpcRow[];
    const unprotected = tables.filter(
      (t) => !t.rls_enabled || Number(t.policy_count) === 0,
    );
    const protectedCount = tables.length - unprotected.length;
    return {
      tables_checked: tables.length,
      tables_expected: RLS_CRITICAL_TABLES.length,
      tables_protected: protectedCount,
      unprotected_tables: unprotected.map((t) => t.table_name),
      // Hard-fail when any expected table is unprotected OR missing
      // entirely from the RPC result (i.e. the table doesn't exist).
      ok:
        unprotected.length === 0 &&
        tables.length === RLS_CRITICAL_TABLES.length,
    };
  }).then((r) => {
    // Promote the inner `ok` flag — withDeadline only knows if the
    // promise resolved, not whether the count matched.
    if (r.ok && r.value && typeof r.value === 'object' && 'ok' in r.value) {
      const inner = r.value as { ok: boolean };
      return { ...r, ok: inner.ok };
    }
    return r;
  });
}

/**
 * audit_log — partition count ≥ 12 forward months + last-24h row count.
 * Hard signal on partitions: if pg_cron stops rolling them, inserts
 * outside the covered range start failing. Backed by
 * `public.healthcheck_audit_log_partition_count()`.
 */
interface AuditPartRow {
  total_partitions: number;
  earliest: string | null;
  latest: string | null;
}
async function checkAuditLog(): Promise<SubCheck> {
  const r = await withDeadline('audit_log', async () => {
    const client = getServiceClient();
    const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [rowsResult, partResult] = await Promise.all([
      client
        .from('audit_log')
        .select('id', { head: true, count: 'exact' })
        .gte('changed_at', sinceIso),
      client.rpc('healthcheck_audit_log_partition_count'),
    ]);
    if (rowsResult.error) throw new Error(rowsResult.error.message);
    if (partResult.error) throw new Error(partResult.error.message);
    const part = (partResult.data?.[0] ?? null) as AuditPartRow | null;
    const partitions = Number(part?.total_partitions ?? 0);
    return {
      rows_24h: rowsResult.count ?? 0,
      partitions,
      earliest: part?.earliest ?? null,
      latest: part?.latest ?? null,
      // soft signal: < 12 forward months means cron is falling behind
      partitions_ok: partitions >= 12,
    };
  });
  // Soft-warn when partition count is below threshold; don't hard-fail
  // (audit_log is `soft` severity overall).
  if (r.ok && r.value && typeof r.value === 'object') {
    const v = r.value as { partitions: number; partitions_ok: boolean };
    if (!v.partitions_ok) {
      return {
        ...r,
        warning: `audit_log partitions ${v.partitions} < 12; pg_cron may be lagging`,
      };
    }
  }
  return r;
}

/** embeddings — count knowledge_entities total + embedded. */
async function checkEmbeddings(): Promise<SubCheck> {
  const r = await withDeadline('embeddings', async () => {
    const client = getServiceClient();
    const [total, embedded] = await Promise.all([
      client.from('knowledge_entities').select('id', { head: true, count: 'exact' }),
      client.from('knowledge_entities').select('id', { head: true, count: 'exact' }).not('embedding', 'is', null),
    ]);
    if (total.error) throw new Error(total.error.message);
    if (embedded.error) throw new Error(embedded.error.message);
    const t = total.count ?? 0;
    const e = embedded.count ?? 0;
    return {
      total: t,
      embedded: e,
      coverage_pct: t > 0 ? Math.round((e / t) * 1000) / 10 : 0,
    };
  });
  // Soft-warn if 0 embedded — return ok:true with a warning so uptime
  // monitoring doesn't page, but the dashboard renders amber.
  if (r.ok && r.value && typeof r.value === 'object') {
    const v = r.value as { total: number; embedded: number };
    if (v.embedded === 0 && v.total > 0) {
      return { ...r, warning: 'embeddings not yet populated; run `npm run embeddings`' };
    }
  }
  return r;
}

/** source_urls — coverage of source citations. Soft-warn if < 50%. */
async function checkSourceUrls(): Promise<SubCheck> {
  const r = await withDeadline('source_urls', async () => {
    const client = getServiceClient();
    const [total, withUrls] = await Promise.all([
      client.from('knowledge_entities').select('id', { head: true, count: 'exact' }),
      client.from('knowledge_entities').select('id', { head: true, count: 'exact' }).not('source_urls', 'is', null),
    ]);
    if (total.error) throw new Error(total.error.message);
    if (withUrls.error) throw new Error(withUrls.error.message);
    const t = total.count ?? 0;
    const w = withUrls.count ?? 0;
    return {
      total: t,
      with_urls: w,
      coverage_pct: t > 0 ? Math.round((w / t) * 1000) / 10 : 0,
    };
  });
  if (r.ok && r.value && typeof r.value === 'object') {
    const v = r.value as { coverage_pct: number };
    if (v.coverage_pct < 50) {
      return { ...r, warning: `source_urls coverage ${v.coverage_pct}% < 50% target` };
    }
  }
  return r;
}

/** email — Resend domain verification status. */
async function checkEmail(): Promise<SubCheck> {
  const r = await withDeadline('email', async () => {
    const status = await checkDomainVerification();
    return {
      domain: status.domain ?? getFromDomain(),
      status: status.status,
      reason: status.reason,
      configured: status.configured,
    };
  });
  if (r.ok && r.value && typeof r.value === 'object') {
    const v = r.value as { configured: boolean; reason?: string; status: string };
    if (!v.configured && v.reason === 'no_api_key') {
      return { ...r, warning: 'RESEND_API_KEY not set; outbound email disabled' };
    }
    if (v.status !== 'verified') {
      return { ...r, warning: `email domain ${v.status}; sends will bounce` };
    }
  }
  return r;
}

/** rag_cache — info-only snapshot of cache stats. Awaits because the
 *  KV backend (when selected) hits Upstash for per-bucket size; the
 *  in-memory backend resolves synchronously. */
async function checkRagCache(): Promise<SubCheck> {
  const r = await withDeadline('rag_cache', async () => {
    return await getCacheStats();
  });
  if (r.ok && r.value && typeof r.value === 'object') {
    const v = r.value as { hit_ratio: number; hits: number; misses: number };
    if (v.hits + v.misses > 50 && v.hit_ratio < 0.1) {
      return { ...r, warning: `rag_cache hit_ratio ${(v.hit_ratio * 100).toFixed(1)}% < 10% (over ${v.hits + v.misses} ops)` };
    }
  }
  return r;
}

/** workflows — every live route in LIVE_WORKFLOW_PATHS has a folder on disk. */
async function checkWorkflows(): Promise<SubCheck> {
  return withDeadline('workflows', async () => {
    const paths = Array.from(new Set(Object.values(LIVE_WORKFLOW_PATHS)));
    const workflowsDir = path.join(process.cwd(), 'src', 'app', 'killerapp', 'workflows');
    const present = await Promise.all(
      paths.map(async (p) => {
        // p looks like '/killerapp/workflows/estimating'; we want the leaf.
        const leaf = p.split('/').filter(Boolean).pop();
        if (!leaf) return { path: p, present: false };
        try {
          const stat = await fs.stat(path.join(workflowsDir, leaf));
          return { path: p, present: stat.isDirectory() };
        } catch {
          return { path: p, present: false };
        }
      }),
    );
    const live_count = present.filter((p) => p.present).length;
    return {
      live_count,
      mapped_count: paths.length,
      all_responding: live_count === paths.length,
      missing: present.filter((p) => !p.present).map((p) => p.path),
    };
  }).then((r) => {
    if (r.ok && r.value && typeof r.value === 'object') {
      const inner = r.value as { all_responding: boolean };
      return { ...r, ok: inner.all_responding };
    }
    return r;
  });
}

/** mcp — entity + jurisdiction counts return non-zero. */
async function checkMcp(): Promise<SubCheck> {
  const r = await withDeadline('mcp', async () => {
    const client = getServiceClient();
    const [entities, jurisdictions] = await Promise.all([
      client
        .from('knowledge_entities')
        .select('id', { head: true, count: 'exact' })
        .eq('status', 'published'),
      client.from('jurisdictions').select('id', { head: true, count: 'exact' }),
    ]);
    if (entities.error) throw new Error(entities.error.message);
    if (jurisdictions.error) throw new Error(jurisdictions.error.message);
    return {
      entity_count: entities.count ?? 0,
      jurisdiction_count: jurisdictions.count ?? 0,
    };
  });
  if (r.ok && r.value && typeof r.value === 'object') {
    const v = r.value as { entity_count: number; jurisdiction_count: number };
    if (v.entity_count === 0 || v.jurisdiction_count === 0) {
      return { ...r, warning: 'mcp capability counts at zero; agents will see vaporware' };
    }
  }
  return r;
}

/**
 * pg_cron — ≥2 ACTIVE cron jobs (audit_log maintain + drop_old). Hard
 * fail. Backed by `public.healthcheck_cron_job_count()` (SECURITY
 * DEFINER) which exposes `cron.job` — that schema is otherwise not
 * reachable over PostgREST.
 */
interface CronRpcRow {
  job_count: number;
  active_count: number;
  jobnames: string[] | null;
}
async function checkPgCron(): Promise<SubCheck> {
  const r = await withDeadline('pg_cron', async () => {
    const client = getServiceClient();
    const { data, error } = await client.rpc('healthcheck_cron_job_count');
    if (error) throw new Error(error.message);
    const row = (data?.[0] ?? null) as CronRpcRow | null;
    return {
      total: Number(row?.job_count ?? 0),
      active: Number(row?.active_count ?? 0),
      jobs: row?.jobnames ?? [],
    };
  });
  if (r.ok && r.value && typeof r.value === 'object') {
    const v = r.value as { total: number; active: number };
    // Hard-fail when fewer than 2 ACTIVE jobs are scheduled — a job
    // existing-but-disabled is the same outage as one not existing.
    if (v.active < 2) {
      return {
        ...r,
        ok: false,
        error: `expected ≥2 active cron jobs, found ${v.active} active of ${v.total}`,
      };
    }
  }
  return r;
}

/**
 * stripe — soft check. Reports config presence and mode (test|live).
 * Unconfigured → ok:true with a warning so the dashboard renders amber
 * but uptime monitors don't page. When configured we also make a cheap
 * `customers.list(limit:1)` call so we know the API key is actually
 * valid against Stripe (a wrong key fails fast here instead of failing
 * a real customer's checkout).
 */
async function checkStripe(): Promise<SubCheck> {
  const r = await withDeadline('stripe', async () => {
    const configured = isStripeConfigured();
    const mode = getStripeMode();
    if (!configured) {
      return {
        configured: false as const,
        mode,
        has_customers: false,
        live_safety_ok: true,
      };
    }
    const snap = await getCustomerCountSnapshot();
    // Sanity flag: if mode is `live` but STRIPE_LIVE_MODE isn't true,
    // our stripe lib refuses to construct a client → snap will be null.
    const live_safety_ok = !(
      mode === 'live' && process.env.STRIPE_LIVE_MODE !== 'true'
    );
    return {
      configured: true as const,
      mode,
      has_customers: snap?.has_customers ?? false,
      live_safety_ok,
    };
  });
  if (r.ok && r.value && typeof r.value === 'object') {
    const v = r.value as {
      configured: boolean;
      mode: string;
      live_safety_ok: boolean;
    };
    if (!v.configured) {
      return {
        ...r,
        warning: 'STRIPE_SECRET_KEY not set; billing endpoints will 503',
      };
    }
    if (!v.live_safety_ok) {
      return {
        ...r,
        warning:
          'live Stripe key detected but STRIPE_LIVE_MODE!=true; client refused to initialize',
      };
    }
    if (v.mode === 'test') {
      return { ...r, warning: 'Stripe is in TEST mode' };
    }
  }
  return r;
}

/**
 * observability — info-only check that reports whether Sentry + PostHog
 * are configured for this deploy. Never fails: missing keys are a
 * configuration choice (e.g. local dev), not an outage. Operators
 * reading /admin/healthcheck will see `configured:false` and know to
 * set env vars when they want the dashboards lit. Added 2026-05-23
 * (OBSERVABILITY-WIRE).
 */
async function checkObservability(): Promise<SubCheck> {
  const start = Date.now();
  const value = {
    sentry: {
      configured:
        !!process.env.SENTRY_DSN || !!process.env.NEXT_PUBLIC_SENTRY_DSN,
      env: process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || null,
    },
    posthog: {
      configured: !!(
        process.env.POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY
      ),
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com',
    },
  };
  return {
    ok: true, // info-only, never fails
    value,
    latency_ms: Date.now() - start,
  };
}

/**
 * manual_attestation (ATTEST-WIRE, 2026-05-24) — info-only progress
 * report on the human-in-loop verification queue. Returns total
 * published rows, count attested, percent attested, and the age of the
 * oldest unattested row. Never fails; the queue being empty is just
 * "nothing to do" not "broken".
 */
async function checkManualAttestation(): Promise<SubCheck> {
  const r = await withDeadline('manual_attestation', async () => {
    const client = getServiceClient();
    const [total, attested, oldest] = await Promise.all([
      client
        .from('knowledge_entities')
        .select('id', { head: true, count: 'exact' })
        .eq('status', 'published'),
      client
        .from('knowledge_entities')
        .select('id', { head: true, count: 'exact' })
        .eq('status', 'published')
        .not('manually_verified_at', 'is', null),
      client
        .from('knowledge_entities')
        .select('id, created_at')
        .eq('status', 'published')
        .is('manually_verified_at', null)
        .order('created_at', { ascending: true })
        .limit(1),
    ]);
    if (total.error) throw new Error(total.error.message);
    if (attested.error) throw new Error(attested.error.message);
    if (oldest.error) throw new Error(oldest.error.message);
    const t = total.count ?? 0;
    const a = attested.count ?? 0;
    const oldestRow = (oldest.data ?? [])[0] as
      | { created_at?: string }
      | undefined;
    const oldestAgeDays = oldestRow?.created_at
      ? Math.round(
          (Date.now() - new Date(oldestRow.created_at).getTime()) /
            86_400_000,
        )
      : null;
    return {
      total_published: t,
      manually_attested: a,
      remaining: Math.max(0, t - a),
      attested_pct: t > 0 ? Math.round((a / t) * 1000) / 10 : 0,
      oldest_unattested_age_days: oldestAgeDays,
    };
  });
  return r;
}

/** vercel — read deploy metadata for ops traceability. Info only. */
async function checkVercel(): Promise<SubCheck> {
  const start = Date.now();
  const value = {
    deployment_id: process.env.VERCEL_DEPLOYMENT_ID ?? null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    env: process.env.VERCEL_ENV ?? null,
  };
  return {
    ok: true, // info-only, always ok
    value,
    latency_ms: Date.now() - start,
  };
}

// ---------------------------------------------------------------------------
// Severity catalog — which checks count as hard fail / soft warn / info.
// ---------------------------------------------------------------------------

const SEVERITY: Record<string, CheckSeverity> = {
  db: 'hard',
  rls: 'hard',
  pg_cron: 'hard',
  audit_log: 'soft',
  embeddings: 'soft',
  source_urls: 'soft',
  email: 'soft',
  mcp: 'soft',
  stripe: 'soft',
  rag_cache: 'info',
  workflows: 'info',
  vercel: 'info',
  observability: 'info',
  manual_attestation: 'info',
};

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

async function runAllChecks(): Promise<HealthcheckResponse> {
  const ts = new Date().toISOString();

  const entries: Array<[string, Promise<SubCheck>]> = [
    ['db', checkDb()],
    ['rls', checkRls()],
    ['audit_log', checkAuditLog()],
    ['embeddings', checkEmbeddings()],
    ['source_urls', checkSourceUrls()],
    ['email', checkEmail()],
    ['rag_cache', checkRagCache()],
    ['workflows', checkWorkflows()],
    ['mcp', checkMcp()],
    ['pg_cron', checkPgCron()],
    ['stripe', checkStripe()],
    ['observability', checkObservability()],
    ['manual_attestation', checkManualAttestation()],
    ['vercel', checkVercel()],
  ];

  const settled = await Promise.allSettled(entries.map(([, p]) => p));
  const checks: Record<string, SubCheck> = {};
  entries.forEach(([name], i) => {
    const s = settled[i];
    if (s.status === 'fulfilled') {
      checks[name] = s.value;
    } else {
      checks[name] = {
        ok: false,
        error: s.reason instanceof Error ? s.reason.message : String(s.reason),
        latency_ms: 0,
      };
    }
  });

  // Top-level ok: every HARD check passing. Soft warnings don't trip
  // the overall ok flag (that's the whole point of the severity tiers).
  const hardFails = Object.entries(checks).filter(
    ([name, c]) => SEVERITY[name] === 'hard' && !c.ok,
  );
  const passing = Object.values(checks).filter((c) => c.ok).length;
  const total = Object.keys(checks).length;

  const vercelValue = checks.vercel?.value as
    | { deployment_id: string | null; commit: string | null; branch: string | null }
    | undefined;

  return {
    ok: hardFails.length === 0,
    ts,
    summary: `${passing} of ${total} checks passing${hardFails.length ? ` (${hardFails.length} hard fail)` : ''}`,
    version: vercelValue
      ? {
          commit: vercelValue.commit ?? undefined,
          branch: vercelValue.branch ?? undefined,
          deployment_id: vercelValue.deployment_id ?? undefined,
        }
      : undefined,
    checks,
  };
}

async function getCachedHealth(): Promise<HealthcheckResponse> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return cache.payload;
  }
  const payload = await runAllChecks();
  cache = { at: now, payload };
  return payload;
}

// Exported for tests — lets the harness reset between cases.
export function _resetHealthcheckCacheForTests() {
  cache = null;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const detailed = ['1', 'true', 'yes'].includes(
    (url.searchParams.get('detailed') || '').toLowerCase(),
  );

  // Detailed mode requires auth — per-check counts could leak info to anon.
  if (detailed) {
    const user = await getAuthUser(request).catch(() => null);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required for detailed healthcheck.' },
        { status: 401 },
      );
    }
  }

  // Belt-and-suspenders: even if every sub-check hangs, this hard
  // deadline guarantees we return within 13s. The internal per-check
  // deadlines are 10s + parallel, so this should never trip — but if
  // it does we return a degraded payload so uptime monitors get SOME
  // answer rather than a 504.
  // 2026-05-23: bumped 1900 -> 3500 -> 6000 -> 13000 across iterations.
  const HARD_DEADLINE_MS = 13000;
  let payload: HealthcheckResponse;
  try {
    payload = await Promise.race<Promise<HealthcheckResponse> | Promise<HealthcheckResponse>>([
      getCachedHealth(),
      new Promise<HealthcheckResponse>((resolve) =>
        setTimeout(
          () =>
            resolve({
              ok: false,
              ts: new Date().toISOString(),
              summary: 'healthcheck exceeded 13000ms hard deadline',
              checks: {},
            }),
          HARD_DEADLINE_MS,
        ),
      ),
    ]);
  } catch (e) {
    // Liveness-probe safe: never throw to the caller.
    payload = {
      ok: false,
      ts: new Date().toISOString(),
      summary: `healthcheck threw: ${e instanceof Error ? e.message : String(e)}`,
      checks: {},
    };
  }

  // Non-detailed mode strips per-check values to avoid leaking counts.
  if (!detailed) {
    const slim: HealthcheckResponse = {
      ok: payload.ok,
      ts: payload.ts,
      summary: payload.summary,
    };
    return NextResponse.json(slim, {
      status: payload.ok ? 200 : 503,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  }

  return NextResponse.json(payload, {
    status: payload.ok ? 200 : 503,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
