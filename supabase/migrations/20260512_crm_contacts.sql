-- ============================================================================
-- CRM Contacts (greenfield) — Brief 1: "Who's asking?" voice & photo capture
-- ============================================================================
-- Created: 2026-05-12
-- Description: Replaces the in-memory MOCK_CONTACTS array in src/app/api/v1/crm/route.ts
--              with a real Supabase table. Adds JSON-LD payload, source-of-truth
--              audio/photo URLs, lane, lifecycle_stage, confidence, and the
--              time_machine_handle column required by binding decision #2.
--
-- Notes:
--   - RLS is DISABLED for now. Re-enable when Clerk auth is wired into /killerapp.
--     Pattern to follow: see project_attachments (RLS owner_user_id = auth.uid()).
--   - All idempotent (create-if-not-exists, DO $$ ... EXCEPTION WHEN duplicate_object).
--   - Existing column shape comes from src/app/api/v1/crm/route.ts CRMContact interface.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- crm_contacts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid,                                                    -- for future RLS scoping (nullable for now)
  project_id            text,                                                    -- ties to localStorage `bkg-active-project`
  first_name            text          NOT NULL,
  last_name             text,
  company               text,
  email                 text,
  phone                 text,
  contact_type          text          NOT NULL DEFAULT 'lead'
                                      CHECK (contact_type IN ('lead','prospect','client','past_client','vendor','partner')),
  stage                 text          NOT NULL DEFAULT 'new'
                                      CHECK (stage IN ('new','contacted','qualified','proposal','negotiation','won','lost','dormant')),
  temperature           text          NOT NULL DEFAULT 'warm'
                                      CHECK (temperature IN ('hot','warm','cool','cold')),
  lane                  text          CHECK (lane IN ('gc','diy','specialty','worker','supplier','equipment','service','agent','homeowner')),
  lifecycle_stage       text          DEFAULT 'lead'
                                      CHECK (lifecycle_stage IN ('lead','size_up','lock','plan','build','adapt','collect','reflect','repeat')),
  project_type          text,
  project_location      text,
  estimated_value       numeric,
  lead_score            int           DEFAULT 30,
  notes                 text,
  tags                  text[]        DEFAULT '{}'::text[],
  -- Canonical bkg_contact JSON-LD record (schema.org Person/Organization + bkg: namespace fields)
  jsonld                jsonb,
  source                text          NOT NULL
                                      CHECK (source IN ('voice','photo','manual','dream_builder')),
  source_audio_url      text,                                                    -- Supabase Storage URL
  source_photo_url      text,                                                    -- Supabase Storage URL
  source_transcript     text,                                                    -- raw voice transcript if source='voice'
  confidence            numeric,                                                 -- 0..1 confidence of inferred fields
  time_machine_handle   text          NOT NULL DEFAULT gen_random_uuid()::text,  -- binding decision #2
  previous_state        jsonb,                                                   -- for undo
  created_at            timestamptz   DEFAULT now(),
  updated_at            timestamptz   DEFAULT now(),
  last_contact_at       timestamptz,
  next_followup         timestamptz,
  stage_changed_at      timestamptz,
  archived              boolean       DEFAULT false
);

-- ---------------------------------------------------------------------------
-- crm_contact_activities (mirrors MOCK_CONTACTS[].activities shape)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_contact_activities (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id            uuid          NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  activity_type         text          NOT NULL,
  title                 text          NOT NULL,
  body                  text,
  outcome               text,
  scheduled_at          timestamptz,
  completed_at          timestamptz,
  created_at            timestamptz   DEFAULT now(),
  time_machine_handle   text          NOT NULL DEFAULT gen_random_uuid()::text
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_crm_contacts_org_lifecycle
  ON public.crm_contacts(org_id, lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_project_id
  ON public.crm_contacts(project_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_last_contact_at
  ON public.crm_contacts(last_contact_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_stage
  ON public.crm_contacts(stage)
  WHERE archived = false;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_time_machine_handle
  ON public.crm_contacts(time_machine_handle);

CREATE INDEX IF NOT EXISTS idx_crm_contact_activities_contact_id
  ON public.crm_contact_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_contact_activities_created_at
  ON public.crm_contact_activities(created_at DESC);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crm_contacts_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_crm_contacts_updated_at'
  ) THEN
    CREATE TRIGGER trg_crm_contacts_updated_at
      BEFORE UPDATE ON public.crm_contacts
      FOR EACH ROW EXECUTE FUNCTION public.crm_contacts_set_updated_at();
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- ---------------------------------------------------------------------------
-- RLS — disabled for now, re-enable when Clerk lands.
-- When re-enabling, pattern to follow (see project_attachments migration):
--
--   ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY owner_select_contacts ON public.crm_contacts
--     FOR SELECT USING (org_id IN (SELECT org_id FROM kg_org_members WHERE user_id = auth.uid()));
--   ... + owner_insert / owner_update / owner_delete
--
-- Same for crm_contact_activities (join on contact_id → contacts.org_id).
-- ---------------------------------------------------------------------------
ALTER TABLE public.crm_contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contact_activities DISABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Storage bucket: crm-photos
-- ---------------------------------------------------------------------------
-- v1: PUBLIC bucket for simplicity. Photos attached to contacts get a public URL.
-- v2 TODO: flip to non-public + signed URLs (1hr TTL) when crm-photos starts
--          carrying PII-bearing content (faces, plate numbers, full house facades).
--          Mirror the project-evidence pattern (4 RLS policies, folder-scoped).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'crm-photos',
  'crm-photos',
  true,
  10485760,   -- 10 MB per photo (phones produce ~5-8MB JPEGs)
  ARRAY['image/jpeg','image/png','image/heic','image/webp']
)
ON CONFLICT (id) DO NOTHING;
