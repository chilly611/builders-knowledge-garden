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
