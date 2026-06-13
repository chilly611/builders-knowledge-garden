> **CANONICAL SPEC — Tier 1. Landed at `docs/code-ingestion-hitl.md` (LOOP 2 Slice B, 2026-06-12) — the path the Platform Constitution's Tier 0 ingestion directive and the CLAUDE.md file map point to.** Accepted by the founder as the spec to build from. The Section 9 open questions remain OPEN and gate the dependent rollout steps (badge gating, the 474-row re-bucket, the backfill) — they are NOT yet decided. Building proceeds step-by-step per Section 8; each step is its own reversible, founder-merged PR. Nothing in this doc mutates shared production.

# Knowledge ingestion — the human-in-the-loop gate

*Tier 1 · canonical spec · built step-by-step per Section 8; Section 9 questions still open*

**Cross-references:** `PLATFORM-CONSTITUTION.md` (Tier 0 ingestion directive; locked decisions #2, #8, #10) · `REPO-AND-WORKTREE-MAP.md` (this is the `feat/shared-app-shell` worktree, not `main`) · `docs/SCHEMA.md` (the `audit_log` partitioning + `knowledge_entities` consolidation notes) · the enterprise scalability brief (audit + RBAC posture for the data-licensing lane) · `docs/design-constitution.md` (the ten goals, the seven primitives) · `docs/UPCODES-VERIFICATION.md` (the attestation auth model and risk callouts).

**What already exists, and what this spec adds.** The platform is not starting from zero. A verification layer already shipped: `manually_verified_*` columns (the green-tick gold standard), `auto_verified_*` columns plus `auto_verification_flagged` (the yellow-tick AI cross-check), an `audit_trigger_fn` writing every row change to a partitioned `audit_log`, an owner-only `/api/v1/knowledge-entities/:id/attest` endpoint, and a working reviewer queue at `/admin/verify`. What was never built is the *gate before publication* — a status state machine that forces new knowledge to land unpublished, sit in a queue, and get promoted on the record. This document specifies that gate, and folds the existing verification machinery into it rather than replacing it. Everything proposed here is reversible and PR-only; nothing in this draft is applied.

---

## 1 · Problem statement and current state

The Platform Constitution, Tier 0, says: *"Code/knowledge ingestion lands as `status='review'` → an approval queue → promoted to `status='published'` with an audit trail. (Current gap: prior ingestion published without review.)"* That gate was written down and never enforced. Every row in the shared knowledge graph went straight to `published`.

Ground truth, verified 2026-06-08 against Supabase project `vlezoyalutexenbnzzui` (`knowledge-gardens-prod`, the database shared across gardens):

| Measure | Value | What it means |
|---|---|---|
| `knowledge_entities` rows | **2,256** | every one has a unique `slug` (2,256 distinct) — there are no duplicate rows |
| Rows with `status='published'` | **2,256 (100%)** | the entire corpus is live |
| Rows with `manually_verified_at` set | **0** | not one row has been confirmed by a human against an authoritative source |
| Rows with `auto_verification_flagged = true` | **1,998 (88.5%)** | the AI cross-check ran and either disagreed or was not confident on the large majority |
| Rows with at least one `source_url` | **2,256 (100%)** | every row cites at least one source — but a citation is a pointer, not a verification |
| Rows with `last_verified` populated | **2,256 (100%)** | populated by the automated pass, not by a human |
| `jurisdictions` rows | **44** | the jurisdiction reference set the corpus hangs off |

**The trust risk, stated plainly.** This corpus answers compliance questions — building codes, safety regulations, permit requirements — and it does so through the AI specialists and the public knowledge pages, with source citations and freshness stamps attached. To a contractor, a citation plus a freshness stamp reads as *"someone checked this."* No one did. The constitution's own locked decision #10 is that compliance answers come *only* from authoritative, structured, cited data, and that the platform stays honest about coverage ("verify with your AHJ"). Serving 2,256 rows as authoritative when zero have been human-verified is a direct, measurable violation of that decision. The 88.5% auto-flag rate is not noise to suppress — it is the system telling us, correctly, that most of this corpus needs a human to look at it.

This is also a commercial exposure, not only a product one. Locked decision #2 makes the signed-in loop the shipping gate, and the platform's data-licensing lane (Building Intelligence — the specialist library sold via MCP and REST) sells *the database itself* as ground truth to other companies' AI agents. An enterprise buyer evaluating that product will ask, on day one, "how do you verify what you serve, and can you show me the audit trail?" Today the honest answer is "we ran an automated pass and published everything." This spec exists to change that answer.

**Scope boundary.** Verification (is this row *true* against the source?) already has machinery. This document is about the *workflow gate* (does new knowledge earn its way to `published`, and is the path auditable?) and about reconciling the 2,256 rows that skipped the gate. The two interlock — the gate's "approve" transition is exactly a human attestation — but they are distinct problems, and conflating them is part of how the gap happened.

---

## 2 · Target lifecycle and status state machine

The lifecycle runs on the existing `status` column (`text`). No new status machinery in a separate table is required to express the core flow; statuses are values of `knowledge_entities.status`, and the transitions write existing columns. New structures are proposed only for the audit log (Section 3) and the workflow-event semantics that the generic column-diff `audit_log` cannot express on its own.

### Statuses

| Status | Meaning | Served to users / specialists? | Trust badge |
|---|---|---|---|
| `draft` | Captured but not ready for review — partial, being authored or enriched | No | — |
| `review` | Complete and submitted to the approval queue; awaiting a human decision | No (or behind an internal preview only) | — |
| `needs_changes` | A reviewer sent it back with a note; author edits and re-submits | No | — |
| `rejected` | A reviewer declined it; terminal unless explicitly reopened to `draft` | No | — |
| `published` | Live in the graph | Yes | Trust badge gated on `manually_verified_at` (Section 5) |
| `superseded` | Replaced by a newer version; kept for lineage and history | No (the successor serves instead) | inherits from successor |
| `archived` | Intentionally retired; not deleted, kept for the record | No | — |

Note the relationship to today's data: the entire corpus sits at `published`, but `published` is *not* the same as *human-verified*. That distinction — published-but-unverified versus published-and-verified — is the hinge of Section 5 and the single most important decision in this document.

### The state machine

```
                 submit                 approve
   draft ───────────────▶ review ───────────────▶ published
     ▲                      │  │                       │
     │  reopen              │  │ request changes        │ supersede
     │                      │  ▼                        ▼
     └──────── needs_changes ◀┘                    superseded
     │                      │
     │            reject    │                     ( published ──archive──▶ archived )
     └──── draft ◀──reopen── rejected
```

### Transitions, triggers, and column side-effects

Every side-effect below maps onto a column that already exists on `knowledge_entities`. The `audit_trigger_fn` already attached to the table captures the before/after diff of each of these writes automatically (Section 3).

| Transition | Who triggers it | `status` after | Other column side-effects (existing columns) |
|---|---|---|---|
| **create** | ingestion pipeline, or an author | `draft` (or `review` if submitted directly — see Section 8 default) | `created_by`, `created_at`, `version = 1` |
| **submit** | author / pipeline | `review` | `updated_at`; (no verification columns touched yet) |
| **request changes** | reviewer | `needs_changes` | `updated_at`; reviewer note → audit event (Section 3) |
| **resubmit** | author | `review` | `updated_at` |
| **approve** | reviewer (owner / admin role) | `published` | `published_at = now()`, **`manually_verified_at = now()`, `manually_verified_by = actor`, `manually_verified_source = <licensed source checked>`**; `last_verified = now()` |
| **reject** | reviewer | `rejected` | `updated_at`; reason → audit event |
| **reopen** | reviewer / admin | `draft` | `updated_at` |
| **supersede** | author / reviewer publishing a replacement | predecessor → `superseded` | on predecessor: **`superseded_by = <new id>`**; on successor: `version = predecessor.version + 1`, normal approve side-effects |
| **archive** | admin | `archived` | `updated_at`; reason → audit event |

The load-bearing line is **approve**. Approving is not just a status flip — it *is* a human attestation, so it sets the `manually_verified_*` trio. This is exactly what the existing `/api/v1/knowledge-entities/:id/attest` route does today, minus the status change. The gate and the attestation become the same act: a reviewer cannot publish without, by the same click, going on record that they checked the source. That single design choice is what closes the Tier 0 gap at the root, so it can never reopen the way it did the first time.

**Where existing columns fall short, and what's proposed instead.** The `status` column cannot, by itself, record *who* changed it, *from* what, *to* what, *why*, and *against which evidence* — and it certainly cannot do so append-only. `metadata` (jsonb) could hold a hand-rolled history array, but that is mutable, unindexed, and exactly the kind of thing that rots. So the only genuinely new structure this spec proposes is a dedicated, append-only **review-event log** (Section 3). Everything else rides on columns that already exist.

---

## 3 · Audit trail — an append-only workflow-event log

### Why a second log, given `audit_log` already exists

The platform already has `public.audit_log`: a partitioned (monthly, seven-year IRS retention), RLS-locked table fed by `audit_trigger_fn`, capturing the full before/after JSONB diff of every row change on the twelve-plus tables it's attached to — including `knowledge_entities` since the attestation migration. That log answers *"what columns changed on this row, when, by which `auth.uid()`."* It is the right tool for forensic, column-level replay, and it must stay.

What it does *not* capture is workflow *semantics*: "this was a request-changes with the note *jurisdiction looks like 2019 CBC, confirm it's 2022*," or "this was a rejection because the cited URL 404s." Those are the events an enterprise auditor — and the reviewer themselves a week later — actually want to read. Reconstructing intent from a column diff is possible but lossy. So this spec proposes a thin, purpose-built, append-only companion: `knowledge_review_events`. It is semantic where `audit_log` is structural; the two are complementary, not redundant.

### PROPOSED (illustrative — not executed) DDL

```sql
-- PROPOSED · illustrative · DO NOT EXECUTE
-- A semantic, append-only record of every workflow decision on a
-- knowledge_entities row. Complements (does not replace) public.audit_log,
-- which keeps the column-level before/after diff via audit_trigger_fn.

CREATE TABLE public.knowledge_review_events (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id     uuid        NOT NULL REFERENCES public.knowledge_entities(id),
  actor_id      uuid        REFERENCES auth.users(id),   -- NULL only for machine actors
  actor_kind    text        NOT NULL DEFAULT 'human',    -- 'human' | 'machine'
  action        text        NOT NULL,                    -- submit|approve|reject|request_changes|supersede|reopen|archive|edit
  from_status   text,                                    -- status before the action (NULL on create)
  to_status     text,                                    -- status after the action
  note          text,                                    -- reviewer's plain-language reason / instruction
  source        text,                                    -- licensed source checked on approve (e.g. upcodes-essentials)
  evidence_url  text,                                    -- the exact source page the reviewer opened, if applicable
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Append-only posture (illustrative): no UPDATE, no DELETE. Corrections are
-- expressed as new events (e.g. a later 'reopen'), never by editing history.
-- RLS to mirror audit_log: service_role / postgres write + read; no anon/auth
-- SELECT. Indexes: (entity_id, created_at) for a row's timeline; (actor_id)
-- for "everything reviewer X decided"; (action, created_at) for queue metrics.
```

`from_status`/`to_status` make every row in this table a verb in the Section 2 state machine, so the table *is* the machine's history. `note` and `evidence_url` are the fields the generic `audit_log` cannot hold. On `approve`, `source` + `evidence_url` capture exactly which licensed source the reviewer checked — the durable, human-readable counterpart to the `manually_verified_source` column.

### Enterprise-audit fit

This is the artifact the data-licensing lane needs to show a buyer. The scalability brief's audit posture wants: who decided, when, on what basis, and is the record tamper-evident. `knowledge_review_events` answers "who/when/why" in plain language; `audit_log` answers "what exactly changed" at the column level and is already on a seven-year retention clock. Together they give a defensible two-layer trail — semantic intent over forensic diff — without inventing a bespoke compliance system. An auditor reads the event log; an engineer reconstructs the row from the diff log. Both come for free once the approve/reject/request-changes endpoints write to the event table (and the column trigger keeps firing as it already does).

### RSI event emission

Constitution decision: all features emit events for the RSI loops. Every workflow transition emits an event onto the existing RSI bus in addition to the durable `knowledge_review_events` row — `{ loop: "knowledge_review", entity_id, action, from_status, to_status, actor_kind, auto_confidence_at_decision, latency_from_review_to_decision }`. This feeds two loops directly: it measures the gate itself (how fast does review-to-publish move, where does the queue stall), and it is labelled training signal for the auto-verifier — every time a human overturns or confirms an AI flag, that is a graded example of where the cross-check was wrong or right. The RSI Heartbeat is the platform's stated moat; the review gate is one of its richest sources of human-graded data, and it should be wired to emit from day one rather than retrofitted.

---

## 4 · Dedup and mis-bucketing cleanup

### Correcting the record

The original brief described "codes tagged under both codes and construction." That phrasing implies multi-valued tagging. It is not what the data shows. `domain` is a single-valued `text NOT NULL` column, and every `slug` is unique — there are no duplicate rows to merge. The real defect is **mis-bucketing**: one `entity_type` is scattered across several `domain` values, so the same kind of thing lives in different buckets depending on which ingestion run created it. This is a re-tagging problem, not a de-duplication problem. Calling it "dedup" sets the wrong expectation; no rows are removed.

### The evidence

| `entity_type` | How it's split across `domain` | Total |
|---|---|---|
| `building_code` | 457 under `construction` + 112 under `codes` | 569 |
| `permit_requirement` | 9 under `construction` + 13 under `permits` | 22 |
| `code_section` | scattered: 4 `electrical`, 1 `fire`, 1 `mechanical`, 1 `plumbing` | 7 |
| `code` | 1 under `mechanical` | 1 |

The cleanest tell is `building_code`: 569 rows that are unmistakably codes, but only 112 are bucketed under `codes`. The other 457 sit under the generic `construction` bucket — which is also where the bulk of the corpus lives (1,954 of 2,256), so "construction" has effectively become the default dumping ground.

### Proposed canonical `entity_type → domain` map

A row's `domain` should be a deterministic function of its `entity_type`. Proposed canonical mapping for the affected types:

| `entity_type` | Canonical `domain` |
|---|---|
| `building_code` | `codes` |
| `code` | `codes` |
| `code_section` | `codes` |
| `permit_requirement` | `permits` |

(The map is extended to cover every `entity_type` when implemented; the four above are the ones with demonstrated drift. Types like `material` → `materials`, `safety_regulation` → `safety` are already largely consistent and need only be locked, not migrated.)

### Rows touched by the re-bucketing

| Move | Rows | Reversible? |
|---|---|---|
| `building_code`: `construction` → `codes` | **457** | yes — old value captured per row |
| `permit_requirement`: `construction` → `permits` | **9** | yes |
| `code_section`: `electrical`/`fire`/`mechanical`/`plumbing` → `codes` | **7** | yes |
| `code`: `mechanical` → `codes` | **1** | yes |
| **Total re-bucketed** | **474** | yes |

The other 112 `building_code` rows and 13 `permit_requirement` rows are already correct and are not touched.

### A reversible, status-gated migration

The migration is PR-only and founder-merged. Reversibility and gating are the two non-negotiables:

1. **Capture before mutating.** Before any `UPDATE`, write each affected row's `id` and current `domain` into `metadata.domain_premigration` (or a side table). This makes the down-migration a mechanical restore, and it leaves a record even if the down-migration is never run.
2. **Status-gated, not blind.** Re-bucketing is a content correction, so it routes through the same gate as any other change: the migration moves affected rows to `review` with a system-authored note ("domain re-bucketed building_code → codes by migration <id>; confirm jurisdiction unchanged"), or — founder's call — applies the `domain` change in place while leaving `status` and all verification columns untouched, since `domain` is a routing label and not a substantive claim about the code. Recommendation: **change `domain` in place, do not touch verification state**, because re-tagging a bucket does not change whether the underlying code text was human-checked. The reviewer's attention is the scarce resource (Section 5); spending it re-confirming 474 rows whose *content* didn't change would be waste. The migration emits a `knowledge_review_events` row per touched entity (`action='edit'`, note describing the re-bucket) so the change is on the record either way.
3. **One transaction, asserted.** Wrap the update in a transaction with a row-count assertion (`expected 474`); abort if the count drifts from the verified number, the same discipline used in the `audit_log` partition migration.

### A forward guard

Re-bucketing once is pointless if the next ingestion run re-introduces the drift. Two complementary guards, in order of strength:

- **Application validation (ship first).** The ingestion path and the create/edit endpoints derive `domain` from `entity_type` via the canonical map, rather than accepting a free-text `domain`. The drift becomes impossible to express through the supported write path. This is the API-first guard and the one that should land with the first PR.
- **Database `CHECK`/trigger (defense in depth).** A `BEFORE INSERT OR UPDATE` trigger that consults a small `entity_type_domain_map` table and either rejects or coerces a mismatched `domain`. A pure `CHECK` constraint can't reference another table, so this is a trigger; it's the backstop for any write path that bypasses the application (a manual SQL fix, a future pipeline). It is proposed but lower priority than the application guard, and like everything here it is PR-only.

---

## 5 · Backfill and triage of the 2,256 published / 0-verified rows

This is the operational heart of the spec: how the existing corpus earns human verification without going dark, and in what order.

### The critical decision — do not "dark" the live product

There are three ways to treat 2,256 already-published, never-human-verified rows:

| Option | What it does | Cost | Risk |
|---|---|---|---|
| **A — Demote to `review`** | Move all 2,256 back to `review`; nothing serves until re-approved | The product goes dark for weeks while the queue burns down | Highest — breaks the live experience, contradicts the constitution's "honest about coverage" by replacing partial coverage with none |
| **B — Keep `published`, gate the trust badge on `manually_verified_at`** | Rows stay live, but the trust badge / "verified" treatment only renders where `manually_verified_at` is set | Low — mostly UI and copy | Lowest — honest, reversible, uses machinery that already exists |
| **C — Add a separate `is_verified` flag** | New boolean alongside `status`, badge reads the flag | Medium — new column, new write paths, a second source of truth to keep in sync | Medium — `manually_verified_at` already *is* this signal; a parallel flag invites drift |

**Recommendation: Option B.** It is the only option that satisfies all of: keep the product live, stay honest about coverage, reuse what's built, and remain fully reversible. Crucially, the signal it gates on already exists and is already trustworthy — `manually_verified_at` is the green-tick gold standard, `countVerifiedSources()` already treats a manual attestation as a distinct verified source, and the TrustStrip / Three-Source Rule already render trust from source count. Option B is therefore mostly a *copy and badging* change, not a data change: where a row is published but `manually_verified_at IS NULL`, the surface shows honest, quieter language — "AI-assembled, awaiting human review; verify with your AHJ" — instead of a confident verified badge. Where a human has attested, the full verified treatment appears. Option C duplicates a signal we already have; Option A burns the product to fix the paperwork.

The trade-off to name out loud: under Option B, unverified content keeps being served. That is acceptable *only* because (a) it is served with honest, downgraded trust language rather than a false verified badge, and (b) it is paired with the burn-down below so "unverified" is a shrinking state with a visible trajectory, not a permanent resting state. If the founder judges that any unverified compliance content served as anything other than clearly-provisional is unacceptable, the fallback is a hybrid: Option B globally, plus demote-to-`review` for the narrow, highest-stakes slice (e.g. life-safety egress and electrical) so that the riskiest rows are dark until checked while the rest stay live and honestly labelled.

### What "verified" requires — the reviewer's bar

A row is human-verified when a reviewer, holding a seat at an authoritative source, has:

1. **Re-opened every `source_url`** on the row and confirmed each resolves and actually says what the row claims (catching dead links and drifted citations).
2. **Cross-checked the substance** against the authoritative/licensed source (UpCodes Essentials, ICC Digital Codes, the physical codebook) — the row's title and summary match the code as published.
3. **Confirmed jurisdiction and code-year currency** — the row's `jurisdiction_ids` and the code edition/year are current for that AHJ, not a superseded cycle.
4. **Resolved any AI flag** — read the `auto_verification_notes` discrepancy and either confirmed the row is right (the AI was over-eager) or sent it back.

Only then do they approve, which stamps `manually_verified_at/by/source` and emits the events. This is the bar the existing `/admin/verify` page already structures (open-in-UpCodes, confirm, Verify ✓); the backfill is running that page at volume, with prioritization.

#### Reviewer checklist (the literal checklist on the review-detail view)

- [ ] Every source URL opens and supports the claim
- [ ] Title + summary match the authoritative source
- [ ] Jurisdiction is correct for this content
- [ ] Code edition / year is the current cycle for that jurisdiction
- [ ] Any AI-flagged discrepancy is resolved
- [ ] Domain bucket is correct for the entity type (ties to Section 4)

### Prioritized waves

Reviewer attention is the scarce resource, so the order is risk-first, not row-id order.

**Wave 1 — the 1,998 `auto_verification_flagged = true` rows.** These are where the AI already suspects a problem; they carry the most risk per row and the most RSI signal. Sub-sort within Wave 1 by, in order:
1. **`auto_verification_confidence` ascending** — lowest confidence first (most likely wrong).
2. **Compliance-criticality** — codes / permits / safety before materials / design / aesthetics. A wrong egress requirement hurts someone; a wrong material description embarrasses us.
3. **Jurisdiction** — California residential and light-commercial first, matching the constitution's locked lean (decision #10) and where the first paying contractors are.

**Wave 2 — published, not flagged, but never human-verified (the remaining ≈258 that the AI cleared, plus any never auto-checked).** Lower risk because the AI didn't object, but "AI didn't object" is a yellow tick, not a green one. Same sub-sort: criticality, then jurisdiction. The existing "Auto-verified (spot-check)" tab already frames these as a sampling target; Wave 2 promotes a sample to full review and lets calibration data decide whether the rest need full review or a lighter spot-check.

**Wave 3 — long tail / out-of-lane.** Everything outside the CA residential/light-commercial lean and outside compliance-critical types. Lowest urgency; honest provisional labelling (Option B) carries them until a reviewer arrives.

### Throughput, batch size, SLA, burn-down

These are planning assumptions for the founder to sanity-check, not commitments:

- **Per-row throughput.** The `/admin/verify` page already assumes **~30 seconds/row** for its ETA widget. For genuinely careful review (open sources, confirm jurisdiction and edition) a more honest planning figure is **2–4 minutes/row** for flagged compliance rows, faster for clean low-risk rows. Plan on a blended **~3 min/row** for Wave 1.
- **Batch size.** **25 rows per session** (the page's existing page size) is a sensible focused batch — roughly 75 minutes of attention at the blended rate, short of fatigue.
- **SLA — two clocks.** (1) *New ingestion:* a row submitted to `review` gets a decision within **5 business days** (this is the going-forward promise once Section 8 lands). (2) *Backlog:* Wave 1's 1,998 flagged rows cleared within a **defined window** — at one reviewer, ~3 min/row, 2 focused hours/day, that is ~40 rows/day ≈ **50 working days**; with a second reviewer or batched sessions, proportionally less. The founder sets the target date; the metric makes the trajectory visible.
- **Burn-down metric.** The single number to put on a wall: **human-verified % of published compliance-critical rows**, trending weekly, with **flagged-backlog count** (the 1,998, counting down) beside it. The `/admin/verify` header already computes "X of Y verified (Z%)" and a remaining-count ETA — the burn-down is that widget, scoped to compliance-critical rows and tracked over time rather than only in the moment.

---

## 6 · Approval-queue UX spec (no code)

This composes from the seven constitutional primitives where natural, speaks plain language, exposes itself to machines (Goal 8), and is honest about coverage. It is the next iteration of the `/admin/verify` page that exists today — not a rebuild. The page already has the tab structure, filters, source links, keyboard shortcuts, and the Verify/Skip/Reject-auto actions; what this section adds is the *gate* framing (a `review` inbox, not only an unverified-published queue), the request-changes/reject decisions, the diff-vs-source view, and the herbarium design language. Where this spec's palette differs from the page's current inline hex (it uses the prohibited `#E8443A` red and pure-white cards today), the design-system tokens win on the next pass.

### Queue list

A single scannable table, one row per entity, plain-language column headers with the engineering label available as a quieter secondary:

| Column (plain) | Pro label | Notes |
|---|---|---|
| What it is | `entity_type` | e.g. "Building code," "Permit requirement" |
| Title | `title` | the human-readable claim |
| Where it applies | `jurisdiction` | resolved name, not the raw uuid |
| Stage | `status` | review / needs-changes / etc. |
| AI's read | `auto_verification_flagged` + confidence | "AI flagged · 62%" or "AI cleared · 91%" |
| Sources | `source_urls` count | one-click out to each |

**Filters** (all present or near-present today): `status`, `domain`, `entity_type`, `jurisdiction`, flagged/not, confidence band, source. Default sort matches Wave 1: flagged first, confidence ascending.

### Review-detail view

- The **entity rendered as a user would see it** — title, summary, body — so the reviewer judges what the contractor will actually read, not raw JSON.
- **One-click source links** — every `source_url` opens in a new tab; the existing "Search in UpCodes" and "Ask Copilot" affordances stay.
- The **reviewer checklist** from Section 5, as actual checkboxes, with approve disabled until the substantive boxes are ticked (Invitation, not instruction — the checklist *invites* the careful path rather than scolding).
- **Jurisdiction and code-year** shown prominently, because currency is the easiest thing to get wrong.
- **Diff-vs-source** — where an authoritative comparison is available (the AI cross-check already stores `auto_verification_notes.discrepancies` and a rationale), render it side-by-side: what the row says, what the source says, what the AI flagged. This is the reviewer's fastest path to a decision and already partly built.

### Reviewer actions

- **Approve** → publishes + attests (the load-bearing transition from Section 2). One keystroke (`V` today).
- **Request changes** → `needs_changes` with a required plain-language note (new; today the page only has Verify/Skip/Reject-auto).
- **Reject** → `rejected` with a required reason (new).
- **Inline edit** → fix a typo or a stale citation in place; an edit by a reviewer is itself a `knowledge_review_events` row and re-enters `review` so a second look (or the same reviewer's explicit approve) confirms it.
- **Bulk actions** — select a filtered batch (e.g. "all `building_code` in `us-ca` the AI cleared at >90%") and approve as a set, with the checklist applied once to the batch and an explicit, logged acknowledgement that it was a bulk decision. Bulk approve is powerful and is therefore admin-gated and always recorded as bulk in the event log.
- **Keyboard-first** — the page is already keyboard-driven (`V` verify, `S` skip, `J/K` navigate, `U` UpCodes, `C` Copilot); the new actions get keys (`X` reject, `E` request changes) so the whole flow stays hands-on-keyboard. This is also Goal 6 (most-constrained-user-first) working in our favour — a keyboard-only reviewer is fully served.

### Primitive composition and platform language

- **Invitation Card** — the empty queue and each pending item read as an invitation ("3 codes are waiting for your eyes") not a backlog scold.
- **Time Machine** — reject, request-changes, and inline edits are undoable; the `knowledge_review_events` log *is* the time-travel history for an entity, and "take this row back to before I rejected it" is a `reopen`. Nothing a reviewer does is unrecoverable, which is the whole point of the primitive.
- **Ask Anything** — contextual help on the review screen ("what counts as verified?") surfaces the Section 5 bar without a manual.
- **Pro Toggle / Progressive Reveal** — plain labels by default with the engineering term one toggle away; advanced bulk controls reveal only once the reviewer has done single-row reviews, so a first-time reviewer isn't handed a bulk-approve button.
- **Machine-legible exposure (Goal 8)** — every queue item and every action exposes structured data: `{ type: "review_item", entity_id, human_label, status, auto_confidence, actions: ["approve","reject","request_changes"] }`, so an agent reviewer (the Machine lane) is a first-class participant in the same queue, not a bolt-on.
- **Honest coverage** — the queue never implies the corpus is fully verified; it shows the verified-percent and the remaining count in plain sight, the same honesty the public surfaces owe the contractor.

### Roles — reviewer vs admin (ties to RBAC)

| Capability | Reviewer | Admin (owner) |
|---|---|---|
| View the queue | yes | yes |
| Approve / reject / request-changes a single row | yes | yes |
| Inline edit | yes | yes |
| **Bulk approve** | no | yes |
| **Archive / supersede** | no | yes |
| **Reopen a rejected row** | no | yes |
| Manage the `entity_type → domain` map | no | yes |

This mirrors the auth model already in code: today the owner allowlist (`chillyd@`, `charlie@`, `bou@`) plus `app_metadata.role === 'admin'` gates attestation, both client- and server-side. The reviewer role is the natural widening of that — a seat that can verify and decide on single rows without the destructive bulk/archive powers. It slots into the platform RBAC the scalability brief calls for; the allowlist is the bootstrap, the role is the durable form.

---

## 7 · API-first surface

Per the constitution, every feature is an endpoint before it is a UI, and every endpoint emits events. The transitions in Section 2 are the API; the queue in Section 6 is one client of it (an agent in the Machine lane is another). These extend the existing `/api/v1/knowledge-entities/*` surface, which already has `attest` (POST/DELETE) and `auto-verify`.

| Endpoint | Transition | Side-effects / events |
|---|---|---|
| `POST /api/v1/knowledge-entities/ingest` | create → `review` | inserts at `status='review'` (Section 8 default), `created_by`; emits `knowledge_review_events` (`action='submit'`) + RSI event |
| `GET /api/v1/knowledge-entities/review-queue` | — | lists `review` / `needs_changes` rows; filters: `status`, `domain`, `entity_type`, `jurisdiction`, `flagged`, `confidence`, `source`; the read behind the Section 6 list |
| `POST /api/v1/knowledge-entities/:id/approve` | → `published` | sets `published_at` + `manually_verified_*` (this *is* attestation — folds in today's `attest`); writes audit event; RSI event |
| `POST /api/v1/knowledge-entities/:id/reject` | → `rejected` | requires `reason`; writes audit event; RSI event |
| `POST /api/v1/knowledge-entities/:id/request-changes` | → `needs_changes` | requires `note`; writes audit event; RSI event |
| `GET /api/v1/knowledge-entities/:id/history` | — | returns the `knowledge_review_events` timeline for the entity (the Time Machine's data source, and the auditor's read) |

Auth on every mutating endpoint reuses the existing model: the caller's JWT (never the service role), owner/admin allowlist or `role` claim for now, the reviewer role when RBAC lands — so `auth.uid()` always populates both the `audit_log` diff and the `knowledge_review_events.actor_id`. Approve/reject/request-changes each emit on the RSI bus (`loop: "knowledge_review"`) so the gate is instrumented from its first call, not retrofitted.

---

## 8 · Rollout plan

Ordered, each step a single reversible PR, founder-merged, with acceptance criteria and a metric. Nothing here is applied by this draft. Steps are sequenced so the product never goes dark and each PR is independently revertible.

| # | Step | What it changes | Acceptance criteria | Metric moved |
|---|---|---|---|---|
| 1 | **Default new ingestion to `review`** | the ingest path inserts at `status='review'`, never `published`; approve is the only door to `published` | a freshly ingested row is not served until approved; no path publishes without setting `manually_verified_*` | new-ingestion human-verified % = 100% by construction |
| 2 | **Add `knowledge_review_events`** | the append-only workflow log (Section 3 DDL), RLS-locked like `audit_log` | every approve/reject/request-changes writes one row; `GET /history` returns a coherent timeline | audit coverage: % of transitions with a semantic event (target 100%) |
| 3 | **Trust-badge gating (Option B)** | public + specialist surfaces show verified treatment only where `manually_verified_at` is set; honest provisional language otherwise | no published-but-unverified row renders a confident verified badge; provisional copy passes the brand/honesty test | trust honesty: 0 false-verified badges |
| 4 | **Domain ↔ entity_type guard + re-bucket migration** | application validation first, then the trigger backstop; the reversible 474-row re-bucket (Section 4) | new writes can't create drift; the 474 rows land in `codes`/`permits`; down-migration restores prior `domain` from the captured values | % of compliance rows correctly bucketed (target 100%) |
| 5 | **Queue upgrade (Section 6)** | `/admin/verify` gains the `review` inbox, request-changes/reject, diff-vs-source, herbarium tokens, machine-legible payloads | a reviewer can take a row from `review` to `published` or `rejected` end-to-end, keyboard-only | median time-to-verify (review → decision) |
| 6 | **Run backfill Wave 1** | work the 1,998 flagged rows in the Section 5 order | Wave 1 burned down to the founder's target date; spot-check confirms reviewer calibration | flagged-backlog count → 0; human-verified % of compliance rows ↑ |

**Headline metrics for the whole effort:**
- **Human-verified %** of published compliance-critical rows (starts at 0%).
- **Flagged-backlog burn-down** — the 1,998, counting down weekly.
- **Median time-to-verify** — `review` → decision, for both new ingestion and backlog.
- **% of codes correctly bucketed** — should reach and hold 100% after step 4.

---

## 9 · Open questions for the founder

1. **Treatment of the 2,256 (the decision that gates everything else).** Confirm **Option B** — keep `published`, gate the trust badge on `manually_verified_at`, carry unverified content with honest provisional language — versus Option A (demote to `review`, product goes dark) or the hybrid (Option B globally + demote-to-`review` for the narrowest life-safety slice). Recommendation is B, or the hybrid if any unverified compliance content served as more than clearly-provisional is unacceptable to you.
2. **Re-bucketing's effect on verification state.** When the 474 rows are re-bucketed (Section 4), do we change `domain` in place and leave verification state untouched (recommended — re-tagging a bucket isn't a substantive content change), or route them through `review` (more conservative, but spends scarce reviewer attention on rows whose content didn't change)?
3. **Backlog SLA target date.** At one reviewer and ~3 min/row, Wave 1 is ~50 working days. Is that the plan, do we add a second reviewer (the new role in Section 6), or do we accept a longer honest burn-down with the trajectory shown publicly?
4. **Reviewer seats.** Who, besides you, gets the reviewer role — and do reviewer seats require their own licensed-source access (UpCodes Essentials / ICC Digital Codes), given approve = attest and attest currently presumes a licensed seat?
5. **Auto-cleared rows (the ~258 in Wave 2).** Is a yellow tick (AI cross-checked, no discrepancy) ever sufficient to render *some* trust treatment short of the green verified badge, or does nothing get any trust badge until a human has attested?
6. **`needs_changes` ownership.** Ingestion is currently pipeline-driven, so when a reviewer requests changes, who is the "author" that acts on the note — the pipeline re-runs, or a human edits? This determines whether `needs_changes` is a real working state or collapses into reject-and-reingest.
7. **Two logs, or fold in?** Confirm the two-log design (semantic `knowledge_review_events` alongside the structural `audit_log`) is what the scalability/enterprise-audit story wants, versus enriching `audit_log` alone. Recommendation is two logs — they answer different questions — but it's a durable architecture choice worth your explicit sign-off.
