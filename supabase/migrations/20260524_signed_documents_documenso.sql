-- 2026-05-24 — Documenso wiring for signed_documents.
--
-- Adds the four columns the Documenso adapter (src/lib/documenso.ts)
-- needs to track a remote envelope alongside our local signed_documents
-- row:
--
--   documenso_document_id    — integer ID returned by POST /documents.
--                              Unique per remote envelope; we look up
--                              rows by it from the webhook handler.
--   documenso_signing_urls   — { email: signingUrl } map. Lets us
--                              fall back to direct deep-link delivery
--                              if Documenso's built-in email send is
--                              ever disabled (e.g., self-hosted dev
--                              instance without SMTP).
--   documenso_last_status    — last DRAFT|PENDING|COMPLETED|REJECTED|
--                              CANCELLED string observed from the API.
--                              Distinct from local `status` (which is
--                              'pending'|'signed'|'rejected'|'void')
--                              so we can tell remote vs. local source
--                              of truth apart.
--   documenso_last_synced_at — when we last fetched status from
--                              app.documenso.com. Drives the lazy-sync
--                              TTL (>5min stale → re-fetch).
--
-- Partial index keeps the webhook lookup cheap without bloating the
-- index for the typed/drawn signature rows that never touch Documenso.

ALTER TABLE public.signed_documents ADD COLUMN IF NOT EXISTS documenso_document_id integer;
ALTER TABLE public.signed_documents ADD COLUMN IF NOT EXISTS documenso_signing_urls jsonb;
ALTER TABLE public.signed_documents ADD COLUMN IF NOT EXISTS documenso_last_status text;
ALTER TABLE public.signed_documents ADD COLUMN IF NOT EXISTS documenso_last_synced_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_signed_documents_documenso ON public.signed_documents(documenso_document_id) WHERE documenso_document_id IS NOT NULL;
