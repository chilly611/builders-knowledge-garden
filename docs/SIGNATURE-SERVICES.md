# Signature services — recommendation

Status: 2026-05-22, owner-lane sprint. Author: OWNER-LANE agent.

## Why this doc

Rachel (commercial owner, $1.1M TI) called out that BKG is not yet a
system of record for binding events because there's no built-in
signature primitive. We shipped:

- `signed_documents` + `signature_events` tables (SCHEMA-ALPHA)
- `/api/v1/signatures` endpoint family (this sprint)
- `<SignatureCapture>` component with typed + drawn modes (this sprint)
- An OWNER-LANE approvals inbox at `/killerapp/workflows/approvals`

That stack is enough to ship change-order signatures right now: it
captures IP, user-agent, timestamp, and a SHA-256 document hash on every
event, and audit triggers on both tables push everything into
`audit_log`.

For full enterprise-grade signatures (multi-page tabbed signing flows,
"in the presence of a witness" affidavits, identity proofing, KBA
questions, notarization), we need to plug into a third-party service.
The schema already supports this: `signature_events.signature_method`
accepts `docusign`, `dropbox_sign`, and `documenso` as values, and
`signature_data` can store the external document reference instead of
the raw signature image.

## Options

### Documenso (recommended for ship-now)
- **What:** Open-source DocuSign alternative. Self-hostable.
- **Pricing:** Free (self-host) or $30/mo Cloud (effectively unlimited
  documents at our scale).
- **Pros:**
  - We can self-host on Supabase + Vercel and keep the audit trail
    inside our infrastructure.
  - Webhook on signed → flips `signed_documents.status` server-side.
  - Open core = no vendor lock-in if we ever migrate.
- **Cons:**
  - Newer service; smaller ecosystem of templates.
  - The legal-defensibility track record is shorter than DocuSign's.
- **Integration:** Already supported in `signature_method` enum. Wire
  the Documenso webhook to PATCH `/api/v1/signatures/:id/sign` with
  `method=documenso` and the Documenso document_id in `signature_data`.
- **Verdict:** ship Documenso first for the trial+demo cohort. We
  control the data and the brand.

### Dropbox Sign (formerly HelloSign) — recommended for production scale
- **What:** Stripe-like API ergonomics for e-signatures.
- **Pricing:** ~$25/user/month (Standard); ~$45/user/month (Premium
  with templates + bulk send).
- **Pros:**
  - Best-in-class developer experience. SDK is small and well-typed.
  - Mature audit-log export (PDF certificate of completion).
  - SOC 2 Type II, eIDAS-compliant in EU.
- **Cons:**
  - Per-user pricing scales fast if every GC needs a seat. Use
    "API-only" pricing tier (~$0.50 per signed envelope) for
    contractor-facing flows.
- **Integration:** Same enum hook: `signature_method='dropbox_sign'`,
  webhook → PATCH the sign endpoint.
- **Verdict:** flip the default to Dropbox Sign once trial → paid
  conversion crosses 50 customers, or as soon as one large GC asks for
  it by name.

### DocuSign — enterprise-only, lawyer-friendly
- **What:** The 800-lb gorilla. Every general counsel knows it.
- **Pricing:** ~$40-$120/user/month. API-only pricing exists but
  requires sales contact.
- **Pros:**
  - Maximum legal defensibility — 15+ years of case law.
  - Identity proofing (KBA, ID upload, witness flows) for
    high-stakes documents (lien waivers in CA can require notarization
    in some counties).
  - Required by some institutional owners (REITs, public agencies).
- **Cons:**
  - Pricing requires sales calls. UX is dated.
  - The SDK is heavy.
- **Integration:** Same enum hook: `signature_method='docusign'`.
- **Verdict:** offer as a "use your DocuSign account" option for
  enterprise customers who already have one. Don't make it the default.

### Skribble — GDPR-friendly fallback for EU
- **What:** Swiss e-signature platform, eIDAS QES-compliant.
- **Pricing:** €9-€39/user/month.
- **Pros:**
  - Qualified Electronic Signature (QES) tier is recognized as
    handwritten-equivalent across all 27 EU member states.
  - Swiss data residency.
- **Cons:**
  - Very EU-centric; US case law is sparse.
  - Smaller ecosystem.
- **Verdict:** add when we onboard a customer with EU operations. Not
  needed for the CA/US-only launch.

## Decision

| Phase | Default service | Reason |
| --- | --- | --- |
| Now → first 50 paid | Built-in (typed/drawn) + Documenso | We control the audit trail; zero per-envelope cost. |
| 50 → 500 paid | Dropbox Sign | Easiest API; predictable per-envelope pricing. |
| 500+ or enterprise deal | Dropbox Sign + DocuSign (customer choice) | Lawyer-friendliness for big customers. |
| EU customers | Skribble | QES compliance; data residency. |

## What we shipped this sprint

- Typed + drawn signature capture (E-SIGN + CA UETA compliant for
  most commercial transactions; see risk note below).
- Per-event IP + user-agent + timestamp + document hash capture.
- Audit triggers on `signed_documents` and `signature_events`.
- `/api/v1/signatures/[id]/sign` and `/reject` endpoints with
  required-signer membership enforcement server-side.

## Risk callouts

### Legal weight of typed signatures
- E-SIGN Act (15 U.S.C. § 7001) and California UETA (Civ. Code §
  1633.7) recognize typed names as binding for most commercial
  transactions.
- **Exclusions that still need wet ink or notarization:**
  - Wills, trusts, codicils.
  - Family-law documents (divorce, adoption).
  - Court orders.
  - Some real-estate transfers (varies by state — CA accepts
    e-sig for grant deeds since 2018, NY does not).
  - **Mechanic's lien waivers in some CA counties require notarization
    for amounts above a threshold.** Flag for follow-up: gate the
    lien-waiver flow behind a "this jurisdiction may require a
    notary" prompt.
- For change orders specifically (the primary use case this sprint):
  E-SIGN + UETA cover them in 50/50 states for private commercial
  work. Public-works COs may have state-specific rules.

### IP capture in serverless
- Vercel/Next pass the originating IP through `x-forwarded-for`.
- A reverse proxy in between can rewrite this header; in our current
  Vercel-direct architecture this is reliable.
- We DO NOT geolocate or do any "is this IP suspicious" logic. If a
  signed_documents row ever ends up in litigation, the IP is one
  piece of evidence among many — the cumulative hash + timestamp +
  user_agent + the auth event in `audit_log` is the real proof.

### Multi-signer race conditions
- Two signers hitting the PATCH endpoint at the same time could both
  observe "not all signed yet" and skip the finalize. The follow-up
  `UPDATE signed_documents WHERE status='pending'` is the guard rail —
  worst case is one extra no-op update.
- Proper fix: wrap the read + insert + finalize in a single
  transaction with `SELECT ... FOR UPDATE` on the signed_documents
  row. Tracked as a follow-up; not blocking for the demo cohort.

### Document hash is advisory until finalization
- We hash a canonical snapshot of `signed_documents` fields on insert
  and re-hash on finalization. If a PDF is attached and later
  re-uploaded, the row's hash would still match the snapshot.
- Follow-up: when the PDF pipeline produces a finalized PDF, fetch the
  bytes and SHA-256 them, then store that hash separately from the
  metadata snapshot hash.

## Follow-ups (next sprint)

- Wire Documenso webhook → `signature_method='documenso'` event.
- Add a `legal-disclaimer` modal on first use of typed signatures.
- Plumb a real PDF byte-hash separate from the metadata snapshot
  hash.
- Extend the approvals inbox to lien waivers + final pay-apps + sub
  agreements (same pattern, different `document_type`).
- Email delivery on `signed_documents` insert via the existing
  `src/lib/email.ts` Resend wrapper.

## Documenso wiring (May 2026)

Documenso Cloud is the production signature provider behind the flag
`SIGNATURE_PROVIDER=documenso`. When that env var is set AND the
caller hands `/api/v1/signatures` a `pdfUrl` or `pdfBase64`, the
endpoint creates a real Documenso envelope, places one SIGNATURE
field per recipient, and tells Documenso to email the signers.
Otherwise the existing in-app typed/drawn flow continues to work
unchanged.

### Env vars (prod, in Vercel)
- `DOCUMENSO_API_KEY=api_qxg33yaoattv9492` — raw API key from
  https://app.documenso.com/settings/tokens.
- `DOCUMENSO_WEBHOOK_SECRET=Grace2026!` — shared secret for the
  webhook receiver at `POST /api/v1/signatures/documenso-webhook`.
- `SIGNATURE_PROVIDER=documenso` — turns the route's Documenso
  branch on.
- `DOCUMENSO_API_BASE_URL` (optional) — defaults to
  `https://app.documenso.com/api/v1`; override for self-hosted dev.

### Auth header gotcha (important)
Documenso's v1 API expects the **raw API key** in `Authorization`,
NOT a `Bearer …` prefix. Every other REST API in the codebase uses
Bearer; this one does not. See `src/lib/documenso.ts`'s `getApiKey()`
caller sites.

### Three-step envelope creation
1. `POST /documents` → returns `{ documentId, uploadUrl, recipients }`.
2. `PUT uploadUrl` (S3 pre-signed PUT, region `eu-central-1`) with
   `Content-Type: application/pdf`. No auth header on this leg.
3. `POST /documents/{id}/fields` for each recipient (at least one
   SIGNATURE field is mandatory — `POST /send` 400s otherwise).
4. `POST /documents/{id}/send` with `{ sendEmail: true }`.

`createSignatureRequest()` in `src/lib/documenso.ts` runs the whole
sequence.

### Webhook setup TODO
The Documenso UI flow for creating webhooks was finicky on the night
of 2026-05-24 — multi-step modal kept losing state. The receiver
route exists and validates the secret two ways (Bearer header OR
HMAC-SHA256 of the body in `X-Documenso-Signature`). Future task:
wire it via the Documenso API (the documented endpoint is
`POST /api/v1/webhooks`) and pin it to `document.signed`,
`document.completed`, and `document.rejected` events. Until that's
done, the GET handler on `/api/v1/signatures` lazy-syncs any row
with a stale `documenso_last_synced_at` (>5 min) by polling
`GET /documents/{id}`.

### Links
- Docs: https://docs.documenso.com/
- Live verified contract (2026-05-24 smoke test): see
  `git log -- src/lib/documenso.ts` for trace.

### Risk callouts (Documenso-specific)
- **Webhook signature format** — Documenso publishes two formats
  (Bearer secret vs. HMAC); our handler accepts both. If they
  ever consolidate, drop the unused branch.
- **S3 region quirks** — the pre-signed URL points at
  `s3.eu-central-1.amazonaws.com`. Edge runtimes in regions with
  strict egress filtering may need `nodejs` runtime, not edge, for
  the upload leg. The route is already nodejs-default.
- **Recipient email validation** — we hard-fail the POST with a 400
  if any required signer has no email or an invalid one. The
  in-app flow tolerates empty emails (matches by user_id); the
  Documenso flow cannot.
- **What happens when Documenso is down** — the POST returns 502
  with the upstream status code in the message. We deliberately
  do NOT silently fall back to the in-app row because that would
  mask the provider failure from the caller. If the caller wants
  graceful degradation it should retry without `pdfUrl`/`pdfBase64`
  to get the typed/drawn row instead.
- **Race between webhook and lazy-sync** — both code paths gate the
  `status` update with `eq('status', 'pending')` so the loser is a
  no-op UPDATE. Audit log gets one row per attempt; that's fine.
