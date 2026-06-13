-- ============================================================================
-- knowledge_review_events — append-only semantic workflow-event log
-- LOOP 2 / Slice B (HITL gate), per docs/code-ingestion-hitl.md §3.
--
-- ‼️  NOT APPLIED BY THE AGENT.  This migration file is drafted for FOUNDER
--     review and is applied by the founder in a supervised window against the
--     shared prod instance (knowledge-gardens-prod / vlezoyalutexenbnzzui) —
--     the same pattern as 20260611_ccp_member_write_rls.sql. No agent runs
--     SQL against shared prod. Until this is applied, the Slice B approve/
--     reject/request-changes endpoints (a later PR) will 500 on write — they
--     are gated to ship together with / after this migration.
--
-- Complements (does NOT replace) public.audit_log: audit_log keeps the
-- column-level before/after diff via audit_trigger_fn (structural, forensic);
-- this table records workflow SEMANTICS — who decided, what action, why, and
-- against which evidence (the fields a column-diff cannot express). §3.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.knowledge_review_events (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id     uuid        NOT NULL REFERENCES public.knowledge_entities(id),
  actor_id      uuid        REFERENCES auth.users(id),   -- NULL only for machine actors
  actor_kind    text        NOT NULL DEFAULT 'human',    -- 'human' | 'machine'
  action        text        NOT NULL,                    -- submit|approve|reject|request_changes|resubmit|supersede|reopen|archive|edit
  from_status   text,                                    -- status before the action (NULL on create)
  to_status     text,                                    -- status after the action
  note          text,                                    -- reviewer's plain-language reason / instruction
  source        text,                                    -- licensed source checked on approve (e.g. upcodes-essentials)
  evidence_url  text,                                    -- the exact source page the reviewer opened, if applicable
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT knowledge_review_events_actor_kind_chk
    CHECK (actor_kind IN ('human', 'machine')),
  CONSTRAINT knowledge_review_events_action_chk
    CHECK (action IN (
      'create','submit','resubmit','request_changes','approve',
      'reject','reopen','supersede','archive','edit'
    ))
);

-- Indexes (§3): a row's timeline; everything one reviewer decided; queue metrics.
CREATE INDEX IF NOT EXISTS idx_kre_entity_created
  ON public.knowledge_review_events (entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kre_actor
  ON public.knowledge_review_events (actor_id);
CREATE INDEX IF NOT EXISTS idx_kre_action_created
  ON public.knowledge_review_events (action, created_at DESC);

-- Append-only posture (§3): corrections are expressed as NEW events (a later
-- 'reopen'), never by editing history. We enforce this at the DB so neither a
-- bug nor a compromised JWT can rewrite the audit trail.
ALTER TABLE public.knowledge_review_events ENABLE ROW LEVEL SECURITY;

-- RLS mirrors audit_log: service_role / postgres read+write only; no anon/auth
-- SELECT, INSERT, UPDATE, or DELETE. The API writes these rows server-side
-- with the service client AFTER it has authorized the actor via JWT (the
-- approve/reject endpoints resolve auth.uid() the same way attest does, then
-- record the event with the resolved actor_id). End users never touch this
-- table directly.
DROP POLICY IF EXISTS kre_service_all ON public.knowledge_review_events;
CREATE POLICY kre_service_all
  ON public.knowledge_review_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Belt-and-braces append-only: forbid UPDATE/DELETE even for the table owner
-- via a trigger. (RLS already denies non-service roles; this stops an
-- accidental service-role UPDATE/DELETE from silently rewriting history.)
CREATE OR REPLACE FUNCTION public.knowledge_review_events_append_only()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'knowledge_review_events is append-only (attempted %)', TG_OP;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_kre_no_update ON public.knowledge_review_events;
CREATE TRIGGER trg_kre_no_update
  BEFORE UPDATE OR DELETE ON public.knowledge_review_events
  FOR EACH ROW EXECUTE FUNCTION public.knowledge_review_events_append_only();

COMMENT ON TABLE public.knowledge_review_events IS
  'Append-only semantic log of every HITL workflow decision on a knowledge_entities row (LOOP 2 Slice B, docs/code-ingestion-hitl.md §3). Complements audit_log (structural diff) with intent: who/what/why/evidence. No UPDATE/DELETE.';

-- ── DOWN (manual, founder-run if reverting) ────────────────────────────────
-- DROP TRIGGER IF EXISTS trg_kre_no_update ON public.knowledge_review_events;
-- DROP FUNCTION IF EXISTS public.knowledge_review_events_append_only();
-- DROP TABLE IF EXISTS public.knowledge_review_events;
