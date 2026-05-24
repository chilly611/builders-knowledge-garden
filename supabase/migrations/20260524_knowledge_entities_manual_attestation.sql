-- ATTEST-WIRE: human-in-loop verification for knowledge_entities (2026-05-24)
-- =========================================================================
--
-- Adds the three columns that let a reviewer (currently: the owner with an
-- UpCodes Essentials seat) stamp a knowledge_entities row as "I opened this
-- in the licensed source, compared it against what BKG stored, and it
-- matches". The pair flips one row from `verified: 1 source (bkg-seed)` to
-- `verified: 2 sources (bkg-seed + manual-attestation)` in
-- countVerifiedSources() — without forging a fake adapter result.
--
-- Schema:
--   manually_verified_at      timestamptz   NULL until attested
--   manually_verified_by      uuid → auth.users(id)
--   manually_verified_source  text          'upcodes-essentials' by default
--
-- Indexes:
--   idx_knowledge_entities_unverified   — partial on the verify queue
--   idx_knowledge_entities_verified_by  — partial on attested rows
--
-- Trigger:
--   Attaches the existing audit_trigger_fn from 20260522b_ship_round3_schema
--   so every attestation (and DELETE / revoke) lands in audit_log with the
--   full before/after JSONB diff and changed_by = auth.uid().
--
-- Applied via Supabase MCP `apply_migration` 2026-05-24; this file is the
-- on-disk record. Re-applying is a no-op (IF NOT EXISTS everywhere).

ALTER TABLE public.knowledge_entities
  ADD COLUMN IF NOT EXISTS manually_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS manually_verified_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS manually_verified_source text;

COMMENT ON COLUMN public.knowledge_entities.manually_verified_at IS
  'Set when a human reviewer attests they checked this row against an external licensed source (e.g. UpCodes Essentials). Counts toward countVerifiedSources(). NULL = not yet verified.';
COMMENT ON COLUMN public.knowledge_entities.manually_verified_by IS
  'auth.users.id of the reviewer who attested. NULL when manually_verified_at is NULL.';
COMMENT ON COLUMN public.knowledge_entities.manually_verified_source IS
  'Free-text identifier of which source was checked. Examples: upcodes-essentials, icc-digital-codes-premium, physical-codebook-2024.';

-- Partial index on the verify queue: only unverified, published rows.
-- This is the working set the /admin/verify page pages through (~2,256
-- rows today, shrinking as Chilly works through them). Partial keeps the
-- index small and hot; full-table scan would be unbearable once the table
-- grows past ~20k rows.
CREATE INDEX IF NOT EXISTS idx_knowledge_entities_unverified ON public.knowledge_entities (id)
  WHERE manually_verified_at IS NULL AND status = 'published';

-- For "show me everything I (a reviewer) attested to" queries and audit.
CREATE INDEX IF NOT EXISTS idx_knowledge_entities_verified_by ON public.knowledge_entities (manually_verified_by)
  WHERE manually_verified_at IS NOT NULL;

-- Attach the existing audit trigger so every attestation (and revoke)
-- is captured in audit_log with before/after JSONB diffs and changed_by.
-- The trigger function `public.audit_trigger_fn` was defined in
-- 20260522b_ship_round3_schema.sql. The API route MUST NOT bypass this —
-- if a future code path mutates these columns via the service-role client
-- and SECURITY DEFINER, the trigger still fires because it's AFTER ROW.
DROP TRIGGER IF EXISTS audit_knowledge_entities_trg ON public.knowledge_entities;
CREATE TRIGGER audit_knowledge_entities_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.knowledge_entities
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
