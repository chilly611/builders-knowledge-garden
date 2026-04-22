# RSI Implementation Status & Next Steps

## Completed (Deliverables 1-11)

### 1. Database Migration ✓
**File:** `/supabase/migrations/20260422_rsi_deltas.sql`

**Tables Created:**
- `rsi_feedback`: Captures user signals on specialist runs (6 signal types)
- `rsi_deltas`: Tracks proposed → approved → applied improvements

**Columns:** All specified. RLS policies + indexes in place.

---

### 2. Feedback Module ✓
**File:** `/src/lib/rsi/feedback.ts`

**Exports:**
- `recordFeedback()`: Insert feedback, silent on failure
- `recentFeedback()`: Query recent feedback with limit

**Behavior:** Swallows errors to prevent workflow disruption.

---

### 3. Deltas Module ✓
**File:** `/src/lib/rsi/deltas.ts`

**Exports:**
- `proposeDelta()`: Insert new delta proposal
- `listDeltas()`: Filter by status
- `approveDelta()`: Mark as approved
- `applyDelta()`: Dispatch to kind-specific applier + mark applied

**Note:** Applier stubs logged but not yet implemented (files, entities, amendments not touched).

---

### 4. Synthesis Engine ✓
**File:** `/src/lib/rsi/synth.ts`

**Exports:**
- `synthesizeDeltas(sinceIso)`: Cluster feedback, call LLM, propose deltas

**Logic:**
1. Fetch feedback since timewindow
2. Fetch specialist runs referenced by feedback
3. Group by specialist + signal type
4. For each cluster, call Anthropic API
5. Parse LLM response into delta struct
6. Insert as proposed, return count

---

### 5. RSI Synthesis Prompt ✓
**File:** `/docs/ai-prompts/rsi-synthesis.production.md`

**Content:** Production-grade prompt with role, hard rules, output format, 3 detailed examples (gas ban amendment, vendor exclusion, prompt clarity).

---

### 6. Heartbeat Route ✓
**File:** `/src/app/api/v1/rsi/heartbeat/route.ts`

**Behavior:**
- POST-only, auth via `x-cron-secret` header
- Calls `synthesizeDeltas()` for last 24h
- Returns `{ ok, proposed, durationMs }`
- Logs errors but never crashes

---

### 7. Vercel Cron Config ✓
**File:** `/vercel.json`

**Added:**
```json
{ "path": "/api/v1/rsi/heartbeat", "schedule": "0 */6 * * *" }
```

Runs every 6 hours. Existing heartbeat cron preserved.

---

### 8. Feedback API Route ✓
**File:** `/src/app/api/v1/rsi/feedback/route.ts`

**Behavior:**
- POST `/api/v1/rsi/feedback`
- Body: `{ specialistRunId, signal, note?, context? }`
- Validates signal enum
- Returns 201 on success, 202 if DB fails (UX-friendly)

---

### 9. OutcomeFeedback Component ✓
**File:** `/src/components/OutcomeFeedback.tsx`

**Features:**
- 👍 good, 👎 not helpful, ✏️ correction
- Correction → textarea + submit
- Drafting-brass + robin's egg design tokens
- Success/error states with visual feedback
- Silent failure (UX-friendly)

---

### 10. Tests ✓
**Files:** `/src/lib/rsi/__tests__/{feedback,deltas,synth}.test.ts`

**Coverage:**
- `feedback`: Insert, retrieve, error modes
- `deltas`: Proposal, approval, dispatch
- `synth`: Clustering, LLM integration, graceful failure

(Mocked Supabase + Anthropic; tests run via `npm test`)

---

### 11. RSI Documentation ✓
**File:** `/docs/rsi/README.md`

**Includes:**
- Flow diagram (feedback → synthesis → approval → apply)
- Table schemas with descriptions
- Delta kind explanations + examples
- API endpoint specs
- Client component usage
- Synthesis pipeline walkthrough
- San Francisco gas ban workflow example
- Silent failure philosophy

---

## What's Not Yet Implemented (Blocker for Full Loop)

### A. Delta Appliers (High Priority)
**Location:** `src/lib/rsi/deltas.ts` functions: `applyPromptPatch`, `applyEntityAdd`, etc.

**Required:**
- `applyPromptPatch`: Read → merge patch → write to `docs/ai-prompts/*.md`
- `applyEntityAdd`/`applyEntityUpdate`: INSERT/UPDATE into `code_entities` table
- `applyAmendmentAdd`: Write to `data/amendments/{jurisdiction}.json`
- `applySpecialistToolTweak`: Modify resource broker config

**Impact:** Currently deltas are proposed but never applied. System logs intent only.

### B. Reviewer UI (Medium Priority)
**Suggested path:** `/src/app/dashboard/rsi-deltas/page.tsx` or admin panel

**Required:**
- List proposed deltas (status: 'proposed')
- Show diff_preview + patch JSON
- Approve/reject buttons
- Calls `approveDelta()` + `applyDelta()`

**Nice-to-have:** Diff viewer showing before/after of files/entities.

### C. Database Type Definitions (Low Priority)
**Location:** `src/types/database.ts` (likely exists already)

**Required:** Add `rsi_feedback` and `rsi_deltas` types if using Supabase type generation.

```bash
npx supabase gen types typescript --linked > src/types/database.ts
```

### D. Specialist Runs Table (Prerequisite)
**Status:** Already exists (referenced in existing code).

**Note:** RSI feedback references `specialist_runs.id`. Must exist before tests/app uses feedback.

---

## Running the Loop End-to-End

### 1. Set up environment
```bash
export NEXT_PUBLIC_SUPABASE_URL="..."
export SUPABASE_SERVICE_ROLE_KEY="..."
export ANTHROPIC_API_KEY="..."
export CRON_SECRET="your-secret"
```

### 2. Apply migration
```bash
# Supabase CLI or manual SQL
supabase migration up
```

### 3. Embed feedback component (for testing)
```tsx
<OutcomeFeedback specialistRunId="run-123" />
```

### 4. Trigger synthesis manually
```bash
curl -X POST http://localhost:3000/api/v1/rsi/heartbeat \
  -H "x-cron-secret: your-secret"
```

### 5. Check proposed deltas
```bash
SELECT * FROM rsi_deltas WHERE status = 'proposed';
```

### 6. Approve one
```bash
# Would call approveDelta() from reviewer UI
```

### 7. Apply (once appliers are implemented)
```bash
# Would call applyDelta() from reviewer UI or cron job
```

---

## Architecture Notes

### Isolation from Other Agents
- RSI lives in new directories: `src/lib/rsi/`, `src/app/api/v1/rsi/`, `docs/rsi/`
- Only modification to existing files: `vercel.json` (additive)
- No touching: specialist code, vendors, supply UI, amendment JSONs, voice
- Component lives in `src/components/` (coexists with others)

### Silent Failure Pattern
- All DB operations catch exceptions and return empty/default
- Feedback failures return 202 (Accepted) to client
- Synthesis failures return 500 but never crash cron
- Appliers log but continue (idempotent)

### LLM Integration
- Uses existing Anthropic client pattern
- Calls `claude-sonnet-4-20250514` (matches specialists)
- Structured JSON parsing from response
- No streaming (synthesis is batch, not user-facing)

### Cron Timing
- **Every 6 hours** at 0, 6, 12, 18 UTC
- Processes last 24h of feedback
- Synthesis is intentionally fast (LLM calls happen in parallel per cluster)

---

## Checklists for Future Work

### Before Production
- [ ] Implement all 5 delta appliers
- [ ] Build reviewer dashboard
- [ ] Run full end-to-end workflow with real feedback
- [ ] Load test synthesis with 1000+ feedback items
- [ ] Document secrets/env vars for ops team
- [ ] Set up monitoring on heartbeat endpoint (error rate, latency)

### Testing Before Deployment
- [ ] Run `npm test -- src/lib/rsi`
- [ ] Manual test feedback recording
- [ ] Manual test synthesis with mock data
- [ ] Verify Vercel cron schedule is active
- [ ] Check RLS policies allow service role writes

### Post-Launch Monitoring
- [ ] Track feedback signal distribution (thumbs_up vs correction ratio)
- [ ] Monitor proposal quality (how many get approved vs rejected)
- [ ] Measure time from proposal to application
- [ ] Track delta applier success rate
- [ ] Alert if heartbeat fails 2+ times in a row

---

## Known Limitations

1. **No deduplication:** If same feedback arrives twice, two identical deltas proposed
2. **No ranking:** All proposals same priority (first-in, first-out review)
3. **No audit trail UI:** Deltas logged in DB but no UI to browse history
4. **Appliers are stubs:** Placeholder implementations only
5. **No rollback:** Applied deltas can't be reverted (would need snapshot)
6. **No conflict detection:** Concurrent deltas to same target not prevented
7. **No feedback weighting:** All feedback equally valued (veteran contractor = new user)

---

## Future Enhancement Ideas

1. **Confidence scoring:** Score deltas by feedback count + signal type
2. **Automated testing:** Run specialist with/without delta, compare outputs
3. **Diff viewer:** Visual side-by-side of changes before approval
4. **Bulk operations:** Approve/reject multiple deltas at once
5. **Analytics dashboard:** Charts of feedback trends, delta application rate
6. **Feedback webhooks:** Alert external systems when delta applied
7. **Rollback versioning:** Keep history of amendments/prompts, enable reverts
8. **Feedback attribution:** Public leaderboard of "improvements by contractor"
