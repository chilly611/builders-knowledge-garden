-- ─────────────────────────────────────────────────────────────────────
-- Stage 5 — tamper-evident signing chain (2026-06-01)
-- ─────────────────────────────────────────────────────────────────────
--
-- The engineering half of the contracts legal gate. Adds the linked-hash
-- "signing chain" to the EXISTING signature_events table — the only schema
-- change the gate allows. signed_documents and signature_events are otherwise
-- reused as-is (signed_documents.document_hash already exists and now holds the
-- SHA-256 of the exact document bytes, per its original comment).
--
-- Chain semantics (see src/lib/signing-chain.ts — the canonical implementation):
--   document anchor   = signed_documents.document_hash = SHA-256(document bytes)
--   event[0].prev     = document anchor
--   event[i].prev     = event[i-1].event_hash
--   event[i].hash     = SHA-256( canonical(event content) || event[i].prev )
--   event[i].sequence = i  (0-based, contiguous per document)
--
-- Hashing is done in the application layer (Node crypto), NOT in SQL, so there
-- is a single canonicalization implementation to keep in sync. These columns
-- only STORE the chain; they are populated by appendSignatureEvent().
--
-- Columns are nullable so the existing (currently unchained) writers keep
-- working until the founder routes the live sign path through the engine;
-- legacy rows simply have null chain fields and are reported as unchained by
-- the verifier.
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.signature_events
  ADD COLUMN IF NOT EXISTS sequence_number integer,
  ADD COLUMN IF NOT EXISTS prev_event_hash  text,
  ADD COLUMN IF NOT EXISTS event_hash       text;

COMMENT ON COLUMN public.signature_events.sequence_number IS
  'Stage 5 signing chain: 0-based contiguous position of this event within its document''s chain. Null = legacy/unchained event.';
COMMENT ON COLUMN public.signature_events.prev_event_hash IS
  'Stage 5 signing chain: hash this event links to — the document_hash anchor for sequence 0, else the previous event''s event_hash.';
COMMENT ON COLUMN public.signature_events.event_hash IS
  'Stage 5 signing chain: SHA-256 over this event''s canonical content concatenated with prev_event_hash. Recomputed on verify.';

-- Fork guard: at most one event per (document, position). A concurrent second
-- signer racing the same sequence number fails this constraint and must retry,
-- which prevents a forked/ambiguous chain. Partial so null-sequence legacy rows
-- are exempt.
CREATE UNIQUE INDEX IF NOT EXISTS uq_signature_events_doc_seq
  ON public.signature_events (signed_document_id, sequence_number)
  WHERE sequence_number IS NOT NULL;

-- Fast chain-tip lookup for appendSignatureEvent (highest sequence per doc).
CREATE INDEX IF NOT EXISTS idx_signature_events_chain_tip
  ON public.signature_events (signed_document_id, sequence_number DESC)
  WHERE sequence_number IS NOT NULL;
