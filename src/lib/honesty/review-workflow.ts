/**
 * Knowledge-review workflow — the HITL gate's status state machine.
 *
 * LOOP 2 / Slice B (2026-06-12), per docs/code-ingestion-hitl.md §2. This is
 * the pure, testable encoding of the lifecycle: the legal transitions, the
 * `knowledge_entities` column side-effects each one writes, and the
 * `knowledge_review_events` row each one records. It is the single source of
 * truth that the Slice B API endpoints (approve/reject/request-changes — a
 * later PR, gated on the knowledge_review_events migration being applied) and
 * the queue UI both consume, so the rules live in ONE place instead of being
 * re-derived per surface.
 *
 * It mutates nothing and touches no I/O — every function is a pure mapping
 * over (action, fromStatus, context). The endpoints take its output and run
 * the actual `.update()` / event `.insert()`.
 *
 * The load-bearing rule (§2): **approve === attestation**. Approving is not a
 * bare status flip — it sets the `manually_verified_*` trio, exactly what
 * /api/v1/knowledge-entities/:id/attest does today minus the status change. A
 * reviewer cannot publish without, by the same act, going on record that they
 * checked the source. That is what closes the Tier-0 "published without
 * review" gap at the root so it can't reopen the way it did the first time.
 */

// ── Statuses (§2) ───────────────────────────────────────────────────────────
export type ReviewStatus =
  | "draft" // captured, not ready for review
  | "review" // submitted to the approval queue, awaiting a human decision
  | "needs_changes" // reviewer sent it back with a note
  | "rejected" // reviewer declined; terminal unless reopened
  | "published" // live in the graph
  | "superseded" // replaced by a newer version; kept for lineage
  | "archived"; // intentionally retired; kept for the record

export const REVIEW_STATUSES: readonly ReviewStatus[] = [
  "draft",
  "review",
  "needs_changes",
  "rejected",
  "published",
  "superseded",
  "archived",
] as const;

/**
 * Statuses that are served to users / specialists / public pages. ONLY
 * `published` (§2). Note that `published` is NOT the same as human-verified —
 * the trust badge is separately gated on `manually_verified_at` (the publish
 * gate from Slice A + §5 Option B). This set answers "may this row appear at
 * all"; the gate answers "with what trust treatment".
 */
export const SERVED_STATUSES: ReadonlySet<ReviewStatus> = new Set(["published"]);

export function isServed(status: ReviewStatus): boolean {
  return SERVED_STATUSES.has(status);
}

// ── Actions (§2) ──────────────────────────────────────────────────────────--
export type ReviewAction =
  | "create"
  | "submit"
  | "resubmit"
  | "request_changes"
  | "approve"
  | "reject"
  | "reopen"
  | "supersede"
  | "archive"
  | "edit";

interface TransitionDef {
  action: ReviewAction;
  /** Statuses this action may be applied FROM. Empty = initial-only (create). */
  from: readonly ReviewStatus[];
  to: ReviewStatus;
  /** Context fields the action requires (the API rejects the call without them). */
  requires: readonly (keyof TransitionContext)[];
}

/**
 * The state machine (§2 diagram + transition table). Each row is a verb; the
 * table IS the machine.
 */
export const TRANSITIONS: readonly TransitionDef[] = [
  // create: initial insert. Default landing status is the caller's choice
  // (§8 step 1 makes ingestion default to 'review'); `to` here is the nominal
  // draft entry — use createStatus() for the configurable default.
  { action: "create", from: [], to: "draft", requires: ["actorId"] },
  { action: "submit", from: ["draft"], to: "review", requires: ["actorId"] },
  { action: "resubmit", from: ["needs_changes"], to: "review", requires: ["actorId"] },
  { action: "request_changes", from: ["review"], to: "needs_changes", requires: ["actorId", "note"] },
  { action: "approve", from: ["review"], to: "published", requires: ["actorId", "source"] },
  { action: "reject", from: ["review"], to: "rejected", requires: ["actorId", "note"] },
  { action: "reopen", from: ["rejected"], to: "draft", requires: ["actorId"] },
  { action: "supersede", from: ["published"], to: "superseded", requires: ["actorId", "successorId"] },
  { action: "archive", from: ["published"], to: "archived", requires: ["actorId", "note"] },
  // edit: a reviewer's inline fix re-enters review so a second look confirms it (§6).
  { action: "edit", from: ["draft", "review", "needs_changes"], to: "review", requires: ["actorId"] },
] as const;

/** Context the API supplies for a transition. `now` is injected for testability. */
export interface TransitionContext {
  actorId: string | null; // auth.uid(); null only for machine actors
  actorKind?: "human" | "machine";
  now?: string; // ISO timestamp; defaults handled by the DB if omitted
  source?: string; // licensed source checked, on approve
  evidenceUrl?: string; // exact source page the reviewer opened
  note?: string; // reviewer's plain-language reason / instruction
  successorId?: string; // the replacement entity id, on supersede
}

function findTransition(action: ReviewAction, from: ReviewStatus): TransitionDef | null {
  return (
    TRANSITIONS.find((t) => t.action === action && t.from.includes(from)) ?? null
  );
}

/** True iff `action` is legal from `from`. */
export function canTransition(action: ReviewAction, from: ReviewStatus): boolean {
  return findTransition(action, from) !== null;
}

/** The resulting status, or null if the transition is illegal. */
export function nextStatus(action: ReviewAction, from: ReviewStatus): ReviewStatus | null {
  return findTransition(action, from)?.to ?? null;
}

/** The actions legal from a given status (drives which buttons the queue shows). */
export function allowedActions(from: ReviewStatus): ReviewAction[] {
  return TRANSITIONS.filter((t) => t.from.includes(from)).map((t) => t.action);
}

/** The initial status for a freshly created/ingested row (§8 step 1: 'review'). */
export function createStatus(submitForReview = true): ReviewStatus {
  return submitForReview ? "review" : "draft";
}

export interface MissingContext {
  ok: false;
  error: string;
  missing: (keyof TransitionContext)[];
}
export interface ValidTransition {
  ok: true;
}

/** Validate that the required context fields for an action are present. */
export function validateContext(
  action: ReviewAction,
  from: ReviewStatus,
  ctx: TransitionContext
): ValidTransition | MissingContext {
  const def = findTransition(action, from);
  if (!def) {
    return { ok: false, error: `illegal transition: ${action} from ${from}`, missing: [] };
  }
  const missing = def.requires.filter((k) => {
    const v = ctx[k];
    return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
  });
  if (missing.length > 0) {
    return { ok: false, error: `missing required field(s) for ${action}: ${missing.join(", ")}`, missing };
  }
  return { ok: true };
}

/**
 * The `knowledge_entities` column side-effects for a transition (§2 table).
 * Returns ONLY the columns to write — the endpoint spreads this into its
 * `.update()`. Columns are the real ones on the table (see the attest route +
 * §2): status, updated_at, published_at, manually_verified_{at,by,source},
 * last_verified, superseded_by, created_by, created_at, version.
 *
 * `approve` carries the attestation trio — this is the load-bearing line.
 */
export function columnEffects(
  action: ReviewAction,
  from: ReviewStatus,
  ctx: TransitionContext
): Record<string, unknown> | null {
  const to = nextStatus(action, from);
  if (!to) return null;
  const now = ctx.now ?? new Date().toISOString();

  const base: Record<string, unknown> = { status: to, updated_at: now };

  switch (action) {
    case "approve":
      // approve === attestation. The same act publishes AND goes on record.
      return {
        ...base,
        published_at: now,
        manually_verified_at: now,
        manually_verified_by: ctx.actorId,
        manually_verified_source: ctx.source,
        last_verified: now,
      };
    case "supersede":
      // predecessor record: point at the successor and retire.
      return { ...base, superseded_by: ctx.successorId };
    default:
      return base;
  }
}

export interface ReviewEventRow {
  entity_id: string;
  actor_id: string | null;
  actor_kind: "human" | "machine";
  action: ReviewAction;
  from_status: ReviewStatus | null;
  to_status: ReviewStatus | null;
  note: string | null;
  source: string | null;
  evidence_url: string | null;
}

/**
 * The `knowledge_review_events` row a transition records (§3). Every workflow
 * decision becomes one append-only semantic event — the auditor's read and
 * the Time Machine's history source.
 */
export function reviewEvent(
  entityId: string,
  action: ReviewAction,
  from: ReviewStatus | null,
  ctx: TransitionContext
): ReviewEventRow {
  const to = from ? nextStatus(action, from) : createStatus();
  return {
    entity_id: entityId,
    actor_id: ctx.actorId,
    actor_kind: ctx.actorKind ?? (ctx.actorId ? "human" : "machine"),
    action,
    from_status: from,
    to_status: to,
    note: ctx.note ?? null,
    source: ctx.source ?? null,
    evidence_url: ctx.evidenceUrl ?? null,
  };
}
