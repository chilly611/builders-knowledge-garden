// Builder's Knowledge Garden — RSI OUTBOUND heartbeat (Stage 4a) · ENGINE
// ---------------------------------------------------------------------------
// Loop 1 "Code & Data Drift Detection" (docs/strategy/rsi-narrative.md). Once a
// day this:
//   1. polls every enabled source in the registry (sources.ts) for a drift
//      signature (HTTP validators: ETag / Last-Modified / Content-Length),
//   2. diffs each signature against the previous run (stored in the last
//      heartbeat_reports row of kind 'rsi_outbound_heartbeat'),
//   3. ENQUEUES a review candidate into improvement_ledger for every source
//      that changed (or, on first sighting, every high-signal seed source),
//   4. writes a run summary into heartbeat_reports.
//
// GUARDRAIL (Manual RSI Protocol — BKG-MULTI-LANE-STRATEGY-BRIEF.md): this job
// is ENQUEUE-ONLY. It reads knowledge_entities to size impact but NEVER writes
// it and NEVER applies a change. Approving/applying a candidate is a separate,
// human-in-the-loop step. The write allow-list below enforces that locally.

import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient, isSupabaseConfigured } from '@/lib/supabase';
import {
  enabledSources,
  KG_ENTITY_TYPE_BASELINE,
  REGISTRY_VERSION,
} from './sources';
import type {
  Classification,
  HeartbeatReportRow,
  HeartbeatRunResult,
  LedgerCandidate,
  OutboundSource,
  RunCounts,
  RunOptions,
  SourceResult,
  SourceSignature,
} from './types';

const LOOP_ID = 'loop1_code_data_drift';
const LOOP_NAME = 'Code & Data Drift Detection (Loop 1)';
const STAGE = '4a';
const ACTION_TYPE = 'kg_drift_candidate';
const PROTOCOL = 'MANUAL-RSI-PROTOCOL';
const FETCH_TIMEOUT_MS = 8000;
const USER_AGENT =
  'BKG-RSI-OutboundHeartbeat/1.0 (+https://builders.theknowledgegardens.com)';

// GUARDRAIL: the only two tables this job may ever write.
const ALLOWED_WRITE_TABLES = ['heartbeat_reports', 'improvement_ledger'] as const;
type AllowedWriteTable = (typeof ALLOWED_WRITE_TABLES)[number];

// ── small utils ────────────────────────────────────────────────────────────

function nowIso(): string {
  return new Date().toISOString();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function numOrNull(v: string | null): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Deterministic 32-bit FNV-1a — powers offline dry-run signatures. */
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// ── signatures ───────────────────────────────────────────────────────────

/** Live drift fingerprint for a source (HEAD, or GET-range for bot-blockers). */
async function fetchSignature(source: OutboundSource): Promise<SourceSignature> {
  const fetchedAt = nowIso();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const method = source.checkMethod === 'get' ? 'GET' : 'HEAD';
    const headers: Record<string, string> = { 'user-agent': USER_AGENT };
    if (method === 'GET') headers['range'] = 'bytes=0-0';
    const res = await fetch(source.url, {
      method,
      headers,
      redirect: 'follow',
      signal: controller.signal,
    });
    return {
      status: res.status,
      etag: res.headers.get('etag'),
      lastModified: res.headers.get('last-modified'),
      contentLength: numOrNull(res.headers.get('content-length')),
      fetchedAt,
      ok: true,
    };
  } catch (e) {
    return {
      status: null,
      etag: null,
      lastModified: null,
      contentLength: null,
      fetchedAt,
      ok: false,
      error: errMsg(e),
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Deterministic synthetic signature (dry run — no network). */
function syntheticSignature(source: OutboundSource, variant: 'prev' | 'curr'): SourceSignature {
  const seed = fnv1a(`${source.id}:${variant}`);
  return {
    status: 200,
    etag: `"dry-${source.id}-${seed.toString(16)}"`,
    lastModified: null,
    contentLength: 10_000 + (seed % 90_000),
    fetchedAt: nowIso(),
    ok: true,
  };
}

/**
 * Dry-run prev/curr pair. Sources flagged `seedCandidateOnBaseline` are made to
 * "drift" (curr ≠ prev) so the dry run deterministically exercises the changed
 * → candidate → write path; all others come back unchanged.
 */
function dryRunSignatures(source: OutboundSource): { prev: SourceSignature; curr: SourceSignature } {
  const prev = syntheticSignature(source, 'prev');
  const curr = source.seedCandidateOnBaseline
    ? syntheticSignature(source, 'curr')
    : { ...prev, fetchedAt: nowIso() };
  return { prev, curr };
}

// ── classification ─────────────────────────────────────────────────────────

function classify(
  prev: SourceSignature | null,
  curr: SourceSignature,
  source: OutboundSource,
): { classification: Classification; changeReason: string | null; confidence: number } {
  if (!curr.ok || curr.status === null) {
    return { classification: 'error', changeReason: curr.error ?? 'unreachable', confidence: 0 };
  }
  if (curr.status >= 400) {
    return { classification: 'error', changeReason: `HTTP ${curr.status}`, confidence: 0 };
  }
  if (!prev) {
    return source.seedCandidateOnBaseline
      ? {
          classification: 'new',
          changeReason: 'baseline established (high-signal source seeded for confirmation)',
          confidence: 0.4,
        }
      : { classification: 'new', changeReason: 'baseline established', confidence: 0 };
  }
  if (curr.etag && prev.etag) {
    return curr.etag !== prev.etag
      ? {
          classification: 'changed',
          changeReason: `ETag changed (${prev.etag} → ${curr.etag})`,
          confidence: 0.7,
        }
      : { classification: 'unchanged', changeReason: null, confidence: 0 };
  }
  if (curr.lastModified && prev.lastModified) {
    return curr.lastModified !== prev.lastModified
      ? {
          classification: 'changed',
          changeReason: `Last-Modified changed (${prev.lastModified} → ${curr.lastModified})`,
          confidence: 0.6,
        }
      : { classification: 'unchanged', changeReason: null, confidence: 0 };
  }
  if (curr.contentLength != null && prev.contentLength != null) {
    return curr.contentLength !== prev.contentLength
      ? {
          classification: 'changed',
          changeReason: `Content-Length changed (${prev.contentLength} → ${curr.contentLength} bytes)`,
          confidence: 0.45,
        }
      : { classification: 'unchanged', changeReason: null, confidence: 0 };
  }
  // No comparable validator headers — cannot assert drift this run.
  return { classification: 'unchanged', changeReason: null, confidence: 0 };
}

function candidateWorthy(c: Classification, source: OutboundSource): boolean {
  if (c === 'changed') return true;
  if (c === 'new' && source.seedCandidateOnBaseline) return true;
  return false;
}

// ── knowledge-graph impact sizing (READ ONLY) ───────────────────────────────

/** Count published knowledge_entities a source informs. Never writes. */
async function countAffected(
  client: SupabaseClient | null,
  source: OutboundSource,
): Promise<{ value: number | null; basis: 'live' | 'baseline' | 'none' }> {
  if (!source.entityTypes.length) return { value: null, basis: 'none' };
  if (client) {
    try {
      const { count, error } = await client
        .from('knowledge_entities') // READ ONLY — guardrail: never written here
        .select('id', { count: 'exact', head: true })
        .in('entity_type', source.entityTypes)
        .eq('status', 'published');
      if (!error && typeof count === 'number') return { value: count, basis: 'live' };
    } catch {
      /* fall through to baseline */
    }
  }
  const est = source.entityTypes.reduce((sum, t) => sum + (KG_ENTITY_TYPE_BASELINE[t] ?? 0), 0);
  return { value: est, basis: 'baseline' };
}

// ── candidate + report assembly ──────────────────────────────────────────

function buildCandidate(
  source: OutboundSource,
  result: SourceResult,
  basis: 'live' | 'baseline' | 'none',
  runId: string,
  heartbeatId: string,
  dryRun: boolean,
): LedgerCandidate {
  const affected = result.affectedPublishedEntities;
  const verb = result.classification === 'new' ? 'Baseline review' : 'Drift detected';
  const impactPhrase =
    affected != null
      ? `${affected} published knowledge_entities cite this source family`
      : 'impact scope unknown';
  const description = (
    `${verb}: ${source.name} (${source.publisher}). ${result.changeReason ?? ''} — ` +
    `${impactPhrase} (entity_types: ${source.entityTypes.join(', ') || 'n/a'}; ` +
    `slugs: ${source.slugPrefixes.join(', ') || 'n/a'}). ` +
    `Enqueued for founder review — NOT auto-applied.`
  )
    .replace(/\s+/g, ' ')
    .trim();

  return {
    id: randomUUID(),
    loop: LOOP_ID,
    action_type: ACTION_TYPE,
    description,
    impact_metric: 'affected_published_entities',
    impact_before: affected,
    impact_after: null, // unknown until a reviewed update is applied
    cost: {},
    confidence: round2(result.confidence),
    metadata: {
      status: 'pending_review',
      review_state: 'pending',
      auto_apply: false,
      requires: 'founder_review',
      protocol: PROTOCOL,
      loop: LOOP_ID,
      loop_name: LOOP_NAME,
      stage: STAGE,
      direction: 'outbound',
      classification: result.classification,
      change_reason: result.changeReason,
      dry_run: dryRun,
      run_id: runId,
      heartbeat_report_id: heartbeatId,
      detected_at: result.signature.fetchedAt,
      source: {
        id: source.id,
        name: source.name,
        kind: source.kind,
        publisher: source.publisher,
        url: source.url,
      },
      signal: { prev: result.prevSignature, curr: result.signature },
      target: {
        entity_types: source.entityTypes,
        slug_prefixes: source.slugPrefixes,
        affected_published_entities: affected,
        impact_basis: basis,
      },
      proposed_review_actions: [
        'Confirm whether the edition/section the affected knowledge_entities reference is still current.',
        'If superseded, draft entity_update / amendment_add deltas via the INBOUND RSI delta flow (src/lib/rsi/deltas.ts).',
        'Re-verify source_urls + last_verified on affected rows after review.',
      ],
    },
  };
}

function computeAlertLevel(counts: RunCounts): 'green' | 'yellow' | 'red' {
  if (counts.changed >= 3 || counts.errors >= 3) return 'red';
  if (counts.candidatesEnqueued > 0 || counts.errors > 0) return 'yellow';
  return 'green';
}

function buildSummary(counts: RunCounts, mode: 'live' | 'dry_run'): string {
  return (
    `RSI OUTBOUND heartbeat (Stage ${STAGE} · ${LOOP_NAME})${mode === 'dry_run' ? ' [DRY RUN]' : ''}: ` +
    `scanned ${counts.scanned} sources — ${counts.changed} changed, ${counts.new} new/baseline, ` +
    `${counts.unchanged} unchanged, ${counts.errors} unreachable. ` +
    `${counts.candidatesEnqueued} candidate${counts.candidatesEnqueued === 1 ? '' : 's'} ` +
    `enqueued to improvement_ledger for founder review (none auto-applied).`
  );
}

// ── guarded writes ─────────────────────────────────────────────────────────

async function enqueueInsert(
  client: SupabaseClient,
  table: AllowedWriteTable,
  rows: Record<string, unknown>[],
): Promise<void> {
  // GUARDRAIL: enqueue-only. Refuse anything outside the allow-list so this job
  // can never be repurposed to touch the knowledge graph.
  if (!ALLOWED_WRITE_TABLES.includes(table)) {
    throw new Error(`[rsi-outbound] refusing to write disallowed table: ${table}`);
  }
  const { error } = await client.from(table).insert(rows);
  if (error) throw new Error(`${table} insert failed: ${error.message}`);
}

// ── orchestrator ─────────────────────────────────────────────────────────

export async function runOutboundHeartbeat(opts: RunOptions = {}): Promise<HeartbeatRunResult> {
  const dryRun = opts.dryRun === true;
  const trigger = opts.trigger ?? (dryRun ? 'dryrun' : 'manual');
  const mode: 'live' | 'dry_run' = dryRun ? 'dry_run' : 'live';
  const wantPersist = opts.persist !== false;
  const sources = opts.sources ?? enabledSources();

  const runId = randomUUID();
  const heartbeatId = randomUUID();
  const startedAt = nowIso();
  const startMs = Date.now();

  const client: SupabaseClient | null = isSupabaseConfigured() ? getServiceClient() : null;

  // Prior signatures: from the last OUTBOUND run (live), or synthesized (dry).
  const priorMap = dryRun ? null : await loadPriorSignatures(client);

  const results: SourceResult[] = [];
  const candidates: LedgerCandidate[] = [];
  const candidateRefs: Array<{ ledger_id: string; source_id: string; action_type: string; confidence: number | null }> = [];

  for (const source of sources) {
    let prev: SourceSignature | null;
    let curr: SourceSignature;
    if (dryRun) {
      const sig = dryRunSignatures(source);
      prev = sig.prev;
      curr = sig.curr;
    } else {
      prev = priorMap?.[source.id] ?? null;
      curr = await fetchSignature(source);
    }

    const { classification, changeReason, confidence } = classify(prev, curr, source);
    const affected = await countAffected(client, source);

    const result: SourceResult = {
      id: source.id,
      name: source.name,
      kind: source.kind,
      publisher: source.publisher,
      url: source.url,
      classification,
      changeReason,
      confidence: round2(confidence),
      signature: curr,
      prevSignature: prev,
      affectedPublishedEntities: affected.value,
    };
    results.push(result);

    if (candidateWorthy(classification, source)) {
      const candidate = buildCandidate(source, result, affected.basis, runId, heartbeatId, dryRun);
      candidates.push(candidate);
      candidateRefs.push({
        ledger_id: candidate.id,
        source_id: source.id,
        action_type: candidate.action_type,
        confidence: candidate.confidence,
      });
    }
  }

  const counts: RunCounts = {
    scanned: results.length,
    changed: results.filter((r) => r.classification === 'changed').length,
    unchanged: results.filter((r) => r.classification === 'unchanged').length,
    new: results.filter((r) => r.classification === 'new').length,
    errors: results.filter((r) => r.classification === 'error').length,
    candidatesEnqueued: candidates.length,
  };

  const finishedAt = nowIso();
  const durationMs = Date.now() - startMs;
  const alertLevel = computeAlertLevel(counts);

  const reportData: Record<string, unknown> = {
    kind: 'rsi_outbound_heartbeat',
    direction: 'outbound',
    stage: STAGE,
    loop: LOOP_ID,
    loop_name: LOOP_NAME,
    registry_version: REGISTRY_VERSION,
    run_id: runId,
    mode,
    trigger,
    started_at: startedAt,
    finished_at: finishedAt,
    duration_ms: durationMs,
    guardrail: {
      auto_apply: false,
      enqueue_only: true,
      protocol: PROTOCOL,
      knowledge_graph_writes: 0,
      allowed_write_tables: ALLOWED_WRITE_TABLES,
    },
    counts,
    sources: results.map((r) => ({
      id: r.id,
      name: r.name,
      kind: r.kind,
      publisher: r.publisher,
      url: r.url,
      classification: r.classification,
      change_reason: r.changeReason,
      confidence: r.confidence,
      affected_published_entities: r.affectedPublishedEntities,
      signature: r.signature, // stored so the next run can diff against it
    })),
    candidates: candidateRefs,
  };

  const heartbeatRow: HeartbeatReportRow = {
    id: heartbeatId,
    location: 'United States',
    project_types: [],
    alert_level: alertLevel,
    summary: buildSummary(counts, mode),
    report_data: reportData,
    generated_by: `rsi-outbound-heartbeat:${trigger}`,
  };

  let persisted = false;
  if (wantPersist && client) {
    if (candidates.length) {
      await enqueueInsert(
        client,
        'improvement_ledger',
        candidates.map((c) => ({ ...c }) as Record<string, unknown>),
      );
    }
    await enqueueInsert(client, 'heartbeat_reports', [heartbeatRow as unknown as Record<string, unknown>]);
    persisted = true;
  }

  return {
    ok: true,
    runId,
    heartbeatReportId: heartbeatId,
    mode,
    trigger,
    startedAt,
    finishedAt,
    durationMs,
    alertLevel,
    counts,
    sources: results,
    candidates,
    persisted,
    skipped: !persisted && wantPersist,
    skippedReason: !persisted && wantPersist ? 'supabase_not_configured' : undefined,
    heartbeatRow,
  };
}

/** Most recent OUTBOUND run's per-source signatures, keyed by source id. */
async function loadPriorSignatures(
  client: SupabaseClient | null,
): Promise<Record<string, SourceSignature> | null> {
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('heartbeat_reports')
      .select('report_data')
      .eq('report_data->>kind', 'rsi_outbound_heartbeat')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    const rd = (data.report_data ?? {}) as {
      sources?: Array<{ id?: string; signature?: SourceSignature }>;
    };
    const map: Record<string, SourceSignature> = {};
    for (const s of rd.sources ?? []) {
      if (s?.id && s.signature) map[s.id] = s.signature;
    }
    return map;
  } catch {
    return null;
  }
}
