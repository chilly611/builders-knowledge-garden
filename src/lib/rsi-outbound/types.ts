// Builder's Knowledge Garden — RSI OUTBOUND heartbeat (Stage 4a) · shared types
// ---------------------------------------------------------------------------
// The OUTBOUND heartbeat is Loop 1 of the RSI architecture ("Code & Data Drift
// Detection", see docs/strategy/rsi-narrative.md): a daily job that reaches OUT
// to a configured registry of external sources (model codes, standards, safety
// regs, regulatory news, data feeds), detects which sources have drifted since
// the last run, and ENQUEUES candidate knowledge-graph updates for founder
// review. It never auto-applies a change to the knowledge graph — that is the
// Manual RSI Protocol guardrail (BKG-MULTI-LANE-STRATEGY-BRIEF.md).
//
// Tables touched (no schema changes — both pre-exist):
//   - heartbeat_reports   : one row per run (the run summary)
//   - improvement_ledger  : one row per enqueued review candidate
// Read-only: knowledge_entities (to size the blast radius of a detected drift).

export type SourceKind =
  | 'code' // adopted/model building codes (ICC family, CA Title 24, …)
  | 'standard' // referenced standards (ACI, AISC, ASCE, ASHRAE, ASTM, AWC, …)
  | 'safety_regulation' // OSHA / EPA / DOT / MSHA
  | 'news' // regulatory news & bulletins (Federal Register, agency feeds)
  | 'data_feed'; // structured data feeds (price indices, permit/spending data)

export type CheckMethod = 'head' | 'get';

/** One external source in the drift-detection registry (see sources.ts). */
export interface OutboundSource {
  /** Stable registry id, e.g. 'icc-ibc'. Used as the diff key across runs. */
  id: string;
  name: string;
  kind: SourceKind;
  publisher: string;
  /** Canonical landing / feed URL polled for a drift signature. */
  url: string;
  /** knowledge_entities.entity_type values this source informs (impact scope). */
  entityTypes: string[];
  /** knowledge_entities.slug prefixes this source maps to (review targeting). */
  slugPrefixes: string[];
  enabled: boolean;
  /**
   * On the first-ever run there is no prior signature to diff against. When
   * true, the source is still enqueued as a baseline review candidate so the
   * founder can confirm the current edition. Reserve for high-signal sources.
   */
  seedCandidateOnBaseline: boolean;
  checkMethod: CheckMethod;
  notes?: string;
}

/** A lightweight fingerprint of a source at a point in time. */
export interface SourceSignature {
  status: number | null; // HTTP status (null on network error)
  etag: string | null;
  lastModified: string | null;
  contentLength: number | null;
  fetchedAt: string; // ISO timestamp
  ok: boolean; // the fetch completed (even if non-2xx)
  error?: string; // network / timeout message when !ok
}

export type Classification = 'unchanged' | 'changed' | 'new' | 'error';

export interface SourceResult {
  id: string;
  name: string;
  kind: SourceKind;
  publisher: string;
  url: string;
  classification: Classification;
  changeReason: string | null;
  confidence: number; // 0..1 drift confidence
  signature: SourceSignature;
  prevSignature: SourceSignature | null;
  affectedPublishedEntities: number | null;
}

/** Shape inserted into improvement_ledger (one review candidate). */
export interface LedgerCandidate {
  id: string;
  loop: string;
  action_type: string;
  description: string;
  impact_metric: string | null;
  impact_before: number | null;
  impact_after: number | null;
  cost: Record<string, unknown>;
  confidence: number | null;
  metadata: Record<string, unknown>;
}

/** Shape inserted into heartbeat_reports (one run summary). */
export interface HeartbeatReportRow {
  id: string;
  location: string;
  project_types: string[];
  alert_level: 'green' | 'yellow' | 'red';
  summary: string;
  report_data: Record<string, unknown>;
  generated_by: string;
}

export interface RunCounts {
  scanned: number;
  changed: number;
  unchanged: number;
  new: number;
  errors: number;
  candidatesEnqueued: number;
}

export interface HeartbeatRunResult {
  ok: boolean;
  runId: string;
  heartbeatReportId: string;
  mode: 'live' | 'dry_run';
  trigger: 'cron' | 'manual' | 'dryrun';
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  alertLevel: 'green' | 'yellow' | 'red';
  counts: RunCounts;
  sources: SourceResult[];
  candidates: LedgerCandidate[];
  persisted: boolean;
  skipped?: boolean;
  skippedReason?: string;
  /** The exact row that was (or would be) written to heartbeat_reports. */
  heartbeatRow: HeartbeatReportRow;
}

export interface RunOptions {
  /**
   * Dry run: no external network calls (synthetic deterministic signatures),
   * never auto-applies. Still exercises the full classify → candidate → write
   * pipeline. Used by the verification script and `?dryRun=1`.
   */
  dryRun?: boolean;
  trigger?: 'cron' | 'manual' | 'dryrun';
  /** Override the registry (tests). Defaults to the enabled OUTBOUND_SOURCES. */
  sources?: OutboundSource[];
  /**
   * Persist the run to heartbeat_reports + improvement_ledger. Defaults to
   * true. The verification script sets this from isSupabaseConfigured() so an
   * offline dry run simply returns the payloads it would have written.
   */
  persist?: boolean;
}
