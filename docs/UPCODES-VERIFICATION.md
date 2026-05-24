# UpCodes-backed manual verification (ATTEST-WIRE)

_Owner-only workflow, 2026-05-24._

## What this is

A human-in-the-loop verification path for `knowledge_entities`. The owner
(currently Chilly, with an UpCodes Essentials seat at $39/mo) opens each
row in UpCodes, confirms the title and summary match the canonical text,
and clicks **Verify ✓**. That stamps the row with `manually_verified_at`,
`manually_verified_by`, and `manually_verified_source = 'upcodes-essentials'`.

The attestation counts as one additional verified source in
`countVerifiedSources()` via the `manual-attestation` pseudo-source. So a
row that previously read "1 source verified" (bkg-seed) honestly becomes
"2 sources verified" (bkg-seed + owner-confirmed-against-UpCodes).

## Why this is honest

- The seat at UpCodes is real and licensed.
- The reviewer is a real human (the owner).
- The audit log captures who attested, when, and against what source.
- Revoking an attestation (DELETE on the API) leaves a recoverable
  trace, so a publishable correction notice can be issued if needed.

This is **not** a fake adapter result — we're not pretending UpCodes
returned content over an API. We're recording that a person with access
to UpCodes confirmed the local row matches.

## Daily workflow

1. Open <https://app.upcodes.com> (Essentials seat).
2. In another tab, open <https://builders.theknowledgegardens.com/admin/verify>.
3. For each row on the queue:
   1. Click **Open in UpCodes ↗** (best-effort deep link via UpCodes
      search) — if the link misses, paste the slug or section number
      into UpCodes's search bar.
   2. Read the actual code section in UpCodes.
   3. Compare against the title and summary shown in the BKG card.
   4. If it matches → click **Verify ✓**. The row disappears from the
      queue, the audit log fires, and the verified counter ticks.
   5. If it does NOT match → click **Skip**, then add the slug to a
      TODO doc for correction (or open an issue tagged
      `bad-knowledge-entity`). Skip is client-side only (stored in
      localStorage with a 24h TTL); it doesn't write to the DB.
4. Filters at the top of the page narrow the queue by entity type,
   jurisdiction, or text search. Use them to batch-review similar rows
   (e.g. "all California amendments" or "all NFPA sections").
5. Targeted pace: ~100 rows/week × 23 weeks = full corpus in ~6 months.

## The math

- ~2,256 unverified published rows at launch.
- ~30 seconds per row (open UpCodes → read → click verify) → ~19 hours
  of total review work.
- At $39/mo for UpCodes Essentials vs ICC Digital Codes Premium at
  ~$195/mo: ~$156/mo of subscription cost avoided.
- At 100 rows/week, ~23 weeks of part-time work; aligned to the 2026
  H2 roadmap target for "every published entity carries ≥2 verified
  sources".

## API surface

### `POST /api/v1/knowledge-entities/[id]/attest`

Stamps the trio. Owner-only.

Request:

```json
{
  "source": "upcodes-essentials",
  "notes": "Confirmed against UpCodes NEC 2023 viewer."
}
```

- `source` (optional, default `upcodes-essentials`) — free-text
  identifier of which licensed source the reviewer checked against.
- `notes` (optional, max 1024 chars) — currently accepted but not
  persisted; the audit_log JSONB diff is the durable record.

Response 200:

```json
{
  "ok": true,
  "entity": {
    "id": "...",
    "slug": "nec-210-52-c-5",
    "title": { "en": "NEC 210.52(C)(5) — Receptacle Outlet Location" },
    "manually_verified_at": "2026-05-24T18:12:34.567Z",
    "manually_verified_by": "<uuid>",
    "manually_verified_source": "upcodes-essentials"
  },
  "attested_by": "chillyd@gmail.com",
  "source": "upcodes-essentials"
}
```

Response 403: caller is not on the owner allowlist.
Response 404: entity id not found.

### `DELETE /api/v1/knowledge-entities/[id]/attest`

Clears the trio. Same auth. Use when an attestation turns out to be
wrong (e.g. the section was renumbered in a newer edition, or the
reviewer mis-read).

## Owner allowlist

Hardcoded in `src/app/api/v1/knowledge-entities/[id]/attest/route.ts`:

```ts
const OWNER_EMAILS = new Set([
  'chillyd@gmail.com',
  'charlie@theknowledgegardens.com',
  'bou@theknowledgegardens.com',
]);
```

Also accepts callers with `app_metadata.role === 'admin'` on the
Supabase auth user — set out-of-band for future ops staff without
editing this file.

## Risk callouts

### UpCodes deep-link accuracy

The **Open in UpCodes** button builds a best-effort search URL of the
form `https://up.codes/s/<term>`. The term is derived from the slug
(`nec-210-52-c-5` → `NEC 210.52.C.5`) or, when the slug doesn't parse,
the title. This will sometimes land on a search results page rather
than the exact section — that's fine, the reviewer just clicks the
right hit. We do not attempt to build viewer URLs
(`https://up.codes/viewer/<code>/<section>`) because the section-path
encoding varies across publications. Future improvement: per-code-body
URL templates.

### Double-attestation race

Two tabs both click Verify at the same moment. The second UPDATE
overwrites `manually_verified_at` with a near-identical `now()` and
re-stamps `manually_verified_by` with the same user. No corruption;
the audit log just gets two rows. Not worth a row-level lock.

### Wrong attestation

Click DELETE on the attest endpoint (or surface a revoke button in the
admin UI — TODO). The audit_log preserves who-attested-when so we can
issue a public correction notice if the bad row was already serving
traffic. The `manually_verified_at` field flips back to NULL and the
row re-enters the verify queue.

### Service-role bypass

The attest route uses the user's JWT (not the service-role client)
specifically so that:

1. `auth.uid()` is non-null inside `audit_trigger_fn`, capturing the
   real reviewer in `audit_log.changed_by`.
2. RLS applies as it would for any authenticated user — no expanded
   blast radius from running as service_role.

Service-role MUST NOT be used for attestation. If a future code path
tries to UPDATE these columns via service_role + SECURITY DEFINER,
add a CHECK constraint to prevent it.

## Healthcheck

`GET /api/v1/healthcheck?detailed=1` includes a `manual_attestation`
sub-check with:

- `total_published` — total published knowledge_entities
- `manually_attested` — count with `manually_verified_at IS NOT NULL`
- `remaining` — work left on the queue
- `attested_pct` — rounded to 1 decimal
- `oldest_unattested_age_days` — sniff for "this row has been in the
  queue forever, maybe it's not actually reviewable"

Severity is `info` — empty queue is success, full queue is "we haven't
started yet", neither is an outage.
