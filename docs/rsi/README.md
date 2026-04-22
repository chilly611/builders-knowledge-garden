# BKG Recursive Self-Improvement (RSI) Loop

## Overview

The RSI scaffold implements a closed-loop feedback system for Builder's Knowledge Garden specialists. User feedback (thumbs up/down, corrections, outcome signals) automatically triggers synthesis of proposed improvements to prompts, entities, and amendments.

**Flow:**
1. **Feedback capture** → User signals outcome on specialist result
2. **Outcome logging** → Feedback stored in `rsi_feedback` table
3. **Heartbeat trigger** → Cron job runs every 6 hours
4. **Synthesis** → LLM clusters feedback, proposes deltas
5. **Review** → Human reviews proposed changes
6. **Apply** → Approved delta is applied to codebase (files, database, config)

## Key Tables

### `rsi_feedback`
Stores user signals on specialist run outcomes.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `specialist_run_id` | UUID | References `specialist_runs.id` |
| `user_id` | TEXT | Current user ID (optional) |
| `signal` | TEXT | `thumbs_up`, `thumbs_down`, `correction`, `outcome_success`, `outcome_failure`, `ahj_contradiction` |
| `note` | TEXT | Human correction or context |
| `context` | JSONB | Arbitrary metadata (jurisdiction, trade, etc.) |
| `created_at` | TIMESTAMPTZ | Insertion timestamp |

### `rsi_deltas`
Stores proposed, approved, and applied improvements.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `status` | TEXT | `proposed` → `approved` → `applied` (or `rejected`) |
| `kind` | TEXT | `prompt_patch`, `entity_add`, `entity_update`, `amendment_add`, `specialist_tool_tweak` |
| `target` | TEXT | File path or entity ID being changed |
| `rationale` | TEXT | Why this delta is needed |
| `diff_preview` | TEXT | Human-readable summary |
| `patch` | JSONB | Machine-applicable change payload |
| `source_feedback_ids` | UUID[] | Feedback IDs that triggered this delta |
| `status` | TEXT | `proposed` (default), `approved`, `applied`, `rejected` |
| `reviewer` | TEXT | Human reviewer ID |
| `review_notes` | TEXT | Approval/rejection reasoning |
| `created_at` | TIMESTAMPTZ | Proposal timestamp |
| `applied_at` | TIMESTAMPTZ | When the delta was applied |

## Delta Kinds

### `prompt_patch`
Modifies a specialist system prompt file (e.g., `docs/ai-prompts/compliance-electrical.production.md`).

**Target format:** `docs/ai-prompts/{specialist}.production.md`

**Patch format:**
```json
{
  "section": "Hard Rules",
  "line": "When multiSource: false",
  "old_text": "Return confidence: 'medium'",
  "new_text": "Return confidence: 'high' if ICC is primary source, 'medium' otherwise"
}
```

### `entity_add`
Adds a new code section or rule to the BKG seed database (inserts into `code_entities`).

**Target format:** `bkg-seed:{code_body}:{section}` or just entity ID

**Patch format:**
```json
{
  "code_body": "NEC",
  "title": "210.52(C)(6)",
  "summary": "Countertop outlet spacing rule",
  "domain": "Electrical",
  "jurisdiction": "National",
  "edition": "2023",
  "supersedes": "210.52(C)(5)"
}
```

### `entity_update`
Corrects or clarifies an existing entity in the BKG database.

**Target format:** `bkg-seed:{entity_id}` or entity UUID

**Patch format:** Same as entity_add but applies to existing record.

### `amendment_add`
Adds a missed local or state amendment to the amendments data directory.

**Target format:** `data/amendments/{jurisdiction}.json`

**Patch format:**
```json
{
  "jurisdiction": "ca-sf",
  "rule_id": "sf-2022-gas-ban",
  "title": "San Francisco Natural Gas Ban",
  "effective_date": "2022-01-01",
  "description": "SF Building Code bans natural gas in new buildings...",
  "applies_to": ["residential", "commercial"],
  "overrides": ["nec-gas-allowed"],
  "source": "SF Building Department Bulletin 2021-23"
}
```

### `specialist_tool_tweak`
Modifies resource broker vendor rankings or specialist tool configuration.

**Target format:** `resource-broker:{config_path}` (e.g., `resource-broker:vendor-config:fasteners`)

**Patch format:**
```json
{
  "exclude_vendors": ["84-lumber"],
  "fastener_ranking": [
    { "vendor": "fastenal", "priority": 1 },
    { "vendor": "home-depot-pro", "priority": 2 }
  ]
}
```

## API Endpoints

### `POST /api/v1/rsi/feedback`
Record user feedback on a specialist run.

**Request:**
```json
{
  "specialistRunId": "uuid",
  "signal": "thumbs_up|thumbs_down|correction|outcome_success|outcome_failure|ahj_contradiction",
  "note": "Optional correction text",
  "context": { "jurisdiction": "ca-sf" }
}
```

**Response:**
```json
{
  "ok": true,
  "id": "feedback-uuid"
}
```

### `POST /api/v1/rsi/heartbeat`
Trigger RSI synthesis (cron-only).

**Headers:**
```
x-cron-secret: [CRON_SECRET value]
```

**Response:**
```json
{
  "ok": true,
  "proposed": 3,
  "durationMs": 1234
}
```

## Client Components

### `OutcomeFeedback`
React component for inline feedback UI.

**Props:**
```typescript
{ specialistRunId: string }
```

**Usage:**
```tsx
import OutcomeFeedback from '@/components/OutcomeFeedback';

export default function SpecialistResult() {
  return (
    <div>
      <p>{result.narrative}</p>
      <OutcomeFeedback specialistRunId={runId} />
    </div>
  );
}
```

**Features:**
- Three affordances: 👍 good, 👎 not helpful, ✏️ correction
- Correction button expands textarea
- Drafting brass + robin's egg design tokens
- Silent logging (failures don't break UX)

## Synthesis Pipeline

### Clustering
Feedback is grouped by:
1. **Specialist** (e.g., `compliance-electrical`)
2. **Signal type** (e.g., `thumbs_down`)
3. **Keyword bag** (extracted from notes + context)

### Synthesis
For each cluster, the LLM is called with:
- Specialist ID
- Signal type + count
- Sample specialist runs from the cluster
- Input/output snapshots

The LLM proposes **exactly one delta** per cluster, citing feedback IDs.

### Proposal → Approval → Application
1. Delta is inserted with `status: 'proposed'`
2. Human reviewer examines `diff_preview` and `patch`
3. Reviewer calls `approveDelta(deltaId, reviewerName)`
4. Application system calls `applyDelta(deltaId)`
5. Delta updates to `status: 'applied'` and `applied_at` timestamp

## Cron Schedule

**Every 6 hours** (0, 6, 12, 18 UTC):
```json
{ "path": "/api/v1/rsi/heartbeat", "schedule": "0 */6 * * *" }
```

## Example Workflow: San Francisco Gas Ban

**Day 1 — Contractor feedback:**
1. Contractor runs compliance-structural specialist: "What are gas rules in SF?"
2. Specialist returns: "No SF-specific restrictions on gas."
3. Contractor clicks 👎 and notes: "SF banned natural gas in 2022, but this says nothing about it"
4. Feedback recorded: `{ signal: 'thumbs_down', note: '...', context: { jurisdiction: 'ca-sf' } }`

**Day 1 18:00 UTC — Heartbeat #1:**
1. Synthesis clusters feedback: `compliance-structural + thumbs_down + ['sf', 'gas', 'ban']`
2. LLM proposes: `kind: 'amendment_add', target: 'data/amendments/ca-sf.json'`
3. Delta inserted: `status: 'proposed'`

**Day 2 — Review:**
1. Reviewer examines delta, sees `diff_preview: "Add SF 2022 natural gas ban"`
2. Approves: `approveDelta(deltaId, 'reviewer@bkg.co')`
3. Application system writes `data/amendments/ca-sf.json`
4. Delta marked: `status: 'applied', applied_at: now()`

**Day 3 — Next run:**
1. New contractor runs compliance-structural with same query
2. Specialist now references SF amendment
3. Returns: "SF banned natural gas in new buildings as of 2022" with `confidence: high`
4. Contractor clicks 👍
5. Loop closes: feedback → synthesis → approval → application

## Testing

Run tests:
```bash
npm test -- src/lib/rsi
```

Test coverage:
- `feedback.test.ts`: Insertion, retrieval, failure modes
- `deltas.test.ts`: Proposal, approval, application dispatch
- `synth.test.ts`: Clustering, LLM integration, delta generation

## Silent Failure Philosophy

All RSI components degrade gracefully:
- Database unavailable? Feedback returns empty ID, UX unaffected
- Synthesis fails? Heartbeat returns 500, cron retries next window
- Missing approval? Delta stays in `proposed` state
- File write fails? Delta marked `applied` anyway (idempotent)

**Principle:** RSI is an improvement system, not critical path. Failures log but never disrupt user workflows.

## Future Enhancements

1. **Reviewer dashboard**: UI to browse/approve/reject deltas
2. **Deduplication**: Detect duplicate delta proposals across runs
3. **Confidence scoring**: Rank deltas by impact and readiness
4. **Automated entity seeding**: Generate BKG seed from external code sources
5. **A/B testing**: Compare specialist output before/after delta
6. **Audit trail**: Full history of delta proposals, reviews, and applications
