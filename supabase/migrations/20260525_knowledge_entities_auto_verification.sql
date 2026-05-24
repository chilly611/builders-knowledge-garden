-- AUTO-VERIFY (Option C, 2026-05-25)
-- ==========================================================================
--
-- Adds the auto-verification trio + flag column to knowledge_entities. This
-- is the AI cross-check pre-pass that runs before human attestation:
--
--   ai-pre-pass (Claude Haiku cross-checks each row against its training
--                knowledge of NEC/IBC/ASHRAE/CBC/etc.)
--      |
--      v
--   confidence >= 0.85 AND no discrepancies
--      -> auto_verified_at stamped, auto_verification_flagged = false
--      -> SourceCountBadge shows yellow tick "auto-verified by Claude"
--      |
--      v
--   confidence 0.5-0.85 OR any discrepancy found
--      -> auto_verified_at still stamped (we ran the check, that's the truth)
--      -> auto_verification_flagged = true
--      -> /admin/verify "Flagged" tab surfaces these first with the diff
--      |
--      v
--   confidence < 0.5 OR error
--      -> no stamp; the row stays in the "All unverified" queue
--
-- Manual attestation (manually_verified_*) remains the gold standard:
--   green tick = human read the canonical source and confirmed it
--   yellow tick = Claude cross-checked against its training and flagged no
--                 discrepancies (defensible but NOT a human review)
--
-- Schema:
--   auto_verified_at              timestamptz   NULL until pre-pass ran
--   auto_verified_by              text          NOT a uuid — this is a
--                                               machine actor (e.g.
--                                               'claude-haiku-4-5'). We do
--                                               NOT pretend a human did it.
--   auto_verified_source          text          'claude-cross-check' | future:
--                                               'gpt-cross-check', 'upcodes-html-scrape'
--   auto_verification_confidence  numeric(3,2)  0.00..1.00 — model's
--                                               self-reported confidence
--   auto_verification_notes       jsonb         { discrepancies: [...],
--                                                 model_response: "...",
--                                                 prompt_hash: "..." }
--   auto_verification_flagged     boolean       true when a human MUST review
--                                               (discrepancy or low confidence)
--
-- Indexes:
--   idx_knowledge_entities_auto_flagged    — partial on the "needs human" queue
--   idx_knowledge_entities_auto_clean      — partial on the auto-cleared rows
--
-- Trigger:
--   The existing audit_trigger_fn (attached to knowledge_entities by the
--   manual attestation migration) automatically captures auto-verify updates
--   too — every batch run produces an audit_log row per stamped row. Useful
--   when we want to ask "when did Claude check this, with what prompt?".
--
-- Cost guardrails:
--   - confidence is a numeric, not jsonb, so we can index/filter it cheaply.
--   - notes is jsonb so we can append the model response without schema churn.
--   - We do NOT store the full Claude API request — the prompt is templated
--     in code and hashed; auditors can re-derive it.

ALTER TABLE public.knowledge_entities
  ADD COLUMN IF NOT EXISTS auto_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_verified_by text,
  ADD COLUMN IF NOT EXISTS auto_verified_source text,
  ADD COLUMN IF NOT EXISTS auto_verification_confidence numeric(3, 2),
  ADD COLUMN IF NOT EXISTS auto_verification_notes jsonb,
  ADD COLUMN IF NOT EXISTS auto_verification_flagged boolean NOT NULL DEFAULT false;

-- Sanity bounds on confidence. We allow NULL (not yet checked).
ALTER TABLE public.knowledge_entities
  DROP CONSTRAINT IF EXISTS knowledge_entities_auto_confidence_range;
ALTER TABLE public.knowledge_entities
  ADD CONSTRAINT knowledge_entities_auto_confidence_range
  CHECK (
    auto_verification_confidence IS NULL
    OR (auto_verification_confidence >= 0.00 AND auto_verification_confidence <= 1.00)
  );

COMMENT ON COLUMN public.knowledge_entities.auto_verified_at IS
  'Set when the AI pre-pass (Claude cross-check) ran against this row. NULL = not yet checked. Distinct from manually_verified_at — auto is yellow tick, manual is green.';
COMMENT ON COLUMN public.knowledge_entities.auto_verified_by IS
  'Machine actor that ran the cross-check (e.g. claude-haiku-4-5). NOT a uuid — this is deliberately not pretending to be a human reviewer.';
COMMENT ON COLUMN public.knowledge_entities.auto_verified_source IS
  'How the check was performed. Examples: claude-cross-check (model self-checks against training), upcodes-html-scrape (compared against UpCodes search HTML).';
COMMENT ON COLUMN public.knowledge_entities.auto_verification_confidence IS
  'Model self-reported confidence in [0,1]. Threshold for "clean" is 0.85; below that we flag.';
COMMENT ON COLUMN public.knowledge_entities.auto_verification_notes IS
  'JSONB with { discrepancies, model_response, prompt_hash, ran_at }. Inspect in /admin/verify Flagged tab.';
COMMENT ON COLUMN public.knowledge_entities.auto_verification_flagged IS
  'true when this row needs human review (low confidence OR any discrepancy found). The /admin/verify "Flagged" tab pages through these first.';

-- Hot partial: rows the human reviewer should look at FIRST.
-- These are rows where the AI ran and found something wrong (discrepancy)
-- or was uncertain (low confidence). Smaller than the full unverified set.
CREATE INDEX IF NOT EXISTS idx_knowledge_entities_auto_flagged
  ON public.knowledge_entities (id)
  WHERE auto_verification_flagged = true
    AND manually_verified_at IS NULL
    AND status = 'published';

-- Spot-check queue: rows the AI cleared. We sample these to validate the
-- cross-checker is well-calibrated. Should be the bulk of the corpus
-- after the batch run.
CREATE INDEX IF NOT EXISTS idx_knowledge_entities_auto_clean
  ON public.knowledge_entities (id)
  WHERE auto_verified_at IS NOT NULL
    AND auto_verification_flagged = false
    AND manually_verified_at IS NULL
    AND status = 'published';

-- The audit trigger from the manual attestation migration already covers
-- this table; no need to recreate. Updates to auto_verified_* columns will
-- automatically land in audit_log with the full before/after JSONB diff.
