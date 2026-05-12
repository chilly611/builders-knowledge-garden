-- ============================================================================
-- CRM Messages (Brief 2 foundation) — "Quick reply" inbound conversation queue
-- ============================================================================
-- Created: 2026-05-12
-- Applied to Supabase project `vlezoyalutexenbnzzui` (knowledge-gardens-prod)
-- via MCP apply_migration tool. This file is the source of truth in the repo.
--
-- Description: SMS/voicemail/email inbox + outbound drafts queue. Every
--   inbound becomes an AI-drafted reply with 90s undo. Time Machine:
--   `time_machine_handle` on every row.
--
-- Notes:
--   - `ai_run_id` has NO FK constraint because `specialist_runs` is not
--     yet in this DB (W7.R migration was authored but never applied).
--     Tracked as a v1.1 follow-up.
--   - RLS disabled for now. Pattern to follow when Clerk lands: see
--     project_attachments migration.
--   - Twilio integration deferred. The schema is provider-agnostic
--     (external_from/to/message_id are opaque strings).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crm_messages (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                      uuid,
  contact_id                  uuid          REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  project_id                  text,
  direction                   text          NOT NULL CHECK (direction IN ('inbound','outbound')),
  channel                     text          NOT NULL CHECK (channel IN ('sms','voicemail','email','call_transcript','manual')),
  body                        text          NOT NULL,
  external_from               text,
  external_to                 text,
  external_message_id         text,
  ai_drafted                  boolean       DEFAULT false,
  ai_tone                     text          CHECK (ai_tone IN ('warm','professional','brief','custom')),
  ai_reasoning_trace          jsonb,
  ai_run_id                   uuid,
  proposal_amount_inferred    numeric,
  sentiment                   text          CHECK (sentiment IN ('positive','neutral','concerned','negative','urgent')),
  intent_tags                 text[]        DEFAULT '{}'::text[],
  status                      text          NOT NULL DEFAULT 'received'
                                            CHECK (status IN ('received','drafted','queued','sent','delivered','failed','undone','read')),
  queued_until                timestamptz,
  sent_at                     timestamptz,
  delivered_at                timestamptz,
  read_at                     timestamptz,
  failed_reason               text,
  time_machine_handle         text          NOT NULL DEFAULT gen_random_uuid()::text,
  previous_state              jsonb,
  created_at                  timestamptz   DEFAULT now(),
  updated_at                  timestamptz   DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_voice_fingerprint (
  user_id                     text          PRIMARY KEY,
  sample_size                 int           DEFAULT 0,
  tone_vector                 jsonb,
  example_phrases             text[]        DEFAULT '{}'::text[],
  refreshed_at                timestamptz   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_messages_contact_id        ON public.crm_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_messages_status_created    ON public.crm_messages(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_messages_inbox             ON public.crm_messages(direction, status, read_at)
                                                              WHERE direction = 'inbound' AND status != 'read';
CREATE INDEX IF NOT EXISTS idx_crm_messages_queued_until      ON public.crm_messages(queued_until)
                                                              WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_crm_messages_external_from     ON public.crm_messages(external_from)
                                                              WHERE external_from IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_messages_external_message_id
                                                              ON public.crm_messages(external_message_id)
                                                              WHERE external_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_messages_time_machine_handle
                                                              ON public.crm_messages(time_machine_handle);

CREATE OR REPLACE FUNCTION public.crm_messages_set_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_crm_messages_updated_at') THEN
    CREATE TRIGGER trg_crm_messages_updated_at
      BEFORE UPDATE ON public.crm_messages
      FOR EACH ROW EXECUTE FUNCTION public.crm_messages_set_updated_at();
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.crm_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_voice_fingerprint DISABLE ROW LEVEL SECURITY;
