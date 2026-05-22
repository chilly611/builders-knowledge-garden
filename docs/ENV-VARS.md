# Environment Variables — Code Sources

_Status: 2026-05-22 · Owner: code-sources adapter team_

This document enumerates the environment variables that affect the behavior
of the code-source adapter layer (`src/lib/code-sources/*`). All are optional;
when unset, the system degrades to citation-only / local-only mode without
breaking. None are required for builds — the app boots and serves traffic
without any of them set.

## Publisher API keys

All publisher adapters share the same contract: **no key → preview mode**
(citation-only deep-link, `verified: false`). When a key is set, the
adapter switches to live mode and attempts a Zod-validated fetch.

### `ICC_API_KEY` (optional)

Set when you have an ICC DigitalCodes API contract. Pricing is bespoke
(typically mid-5 to low-6 figures annual). Contact licensing@iccsafe.org.

- **Effect when set:** `icc.ts` issues authenticated GET requests against
  `ICC_API_BASE_URL` and validates the JSON response via
  `IccSectionResponseSchema`.
- **Effect when unset:** adapter returns citation-only payload with
  `verified: false`.

### `NFPA_API_KEY` (optional)

Set when you have an NFPA Link enterprise contract. Similar pricing range
to ICC; NFPA 70 (NEC) is typically the most expensive single standard.
Contact licensing@nfpa.org.

- **Effect when set:** `nfpa.ts` issues authenticated GET requests against
  `NFPA_API_BASE_URL` and validates via `NfpaSectionResponseSchema`.
- **Effect when unset:** citation-only.

### `UPCODES_API_KEY` (optional, recommended starting point)

Public API with documentation at https://up.codes/about/api. Pricing is
listed publicly; free preview tier returns truncated body text. **Start
here** if you want to flip any ICC-family adapter to verified mode without
escalating to ICC enterprise sales.

- **Effect when set:** `upcodes.ts` issues authenticated GET requests
  against `UPCODES_API_BASE_URL` and validates via
  `UpCodesSectionResponseSchema`.
- **Effect when unset:** citation-only.

## Publisher API base URLs (override for testing or contracted endpoints)

All default to the documented / presumed production base. Override when the
contracted endpoint differs, or when pointing at a stub / record-replay
fixture in CI.

### `ICC_API_BASE_URL`

Default: `https://api.iccsafe.org/v1`. Override e.g. when ICC contracts
specify a tenant-scoped subdomain.

### `NFPA_API_BASE_URL`

Default: `https://api.nfpa.org/v1`. Override e.g. when NFPA assigns a
versioned production endpoint.

### `UPCODES_API_BASE_URL`

Default: `https://api.up.codes/v1`. UpCodes versions their API; override
to pin a specific major version.

## Placeholder-key rejection

`readApiKey()` in `http-fetcher.ts` rejects values that match
`^(your|placeholder|set\s*me|todo|<.*>)` (case-insensitive) and any value
shorter than 8 chars. This prevents `ICC_API_KEY=your-key-here` from
accidentally flipping live mode and burning quota on a 401.

If your real key happens to start with one of those prefixes, contact the
publisher for a re-keyed credential — do not patch the rejection list.

## RAG / vector-related env vars

These affect the `rag` adapter only, not the publisher adapters above.
Documented in detail in `docs/EXTERNAL-CODE-SOURCES.md` under "Vector RAG".

### `OPENAI_API_KEY` (optional)

When set, the `rag` adapter uses `text-embedding-3-small` for query-time
embeddings and the `match_knowledge_entities` RPC. When unset, RAG falls
back to FTS over `knowledge_entities.search_text`.

### `VOYAGE_API_KEY` (optional, alternative)

Mutually exclusive with `OPENAI_API_KEY` for embeddings. Requires a column
migration to `vector(1024)`; the backfill script errors on dim mismatch.

### `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`

Required by the embedding backfill script (`npm run embeddings`). The
service-role key is server-only — never expose via `NEXT_PUBLIC_*`.

### `EMBEDDING_BATCH_SIZE` (optional)

Default 100. Lower if rate-limited; higher if your OpenAI tier supports it.

## Telemetry behavior

When `NODE_ENV !== "test"`, every live-mode failure path emits a
`console.warn` once with a short telemetry string:

- `ICC live fetch failed: timeout (status=n/a)`
- `NFPA response failed schema validation: text: Invalid input`
- `UpCodes response parsed but had no body/text/content`

Wire these to your log aggregator (Sentry / Datadog) to track per-publisher
success rates and dominant failure modes. The `fetchPublisher` result
already returns `{ mode, ok, reason, status }` — keep that shape stable
across publishers so dashboards can stay generic.

## Quick reference

| Env var | Adapter | Default | Required? |
|---|---|---|---|
| `ICC_API_KEY` | icc | unset (preview) | no |
| `ICC_API_BASE_URL` | icc | `https://api.iccsafe.org/v1` | no |
| `NFPA_API_KEY` | nfpa | unset (preview) | no |
| `NFPA_API_BASE_URL` | nfpa | `https://api.nfpa.org/v1` | no |
| `UPCODES_API_KEY` | upcodes | unset (preview) | no |
| `UPCODES_API_BASE_URL` | upcodes | `https://api.up.codes/v1` | no |
| `OPENAI_API_KEY` | rag | unset (FTS only) | no |
| `VOYAGE_API_KEY` | rag (alt) | unset | no |
| `NEXT_PUBLIC_SUPABASE_URL` | embeddings script | unset | only for backfill |
| `SUPABASE_SERVICE_ROLE_KEY` | embeddings script | unset | only for backfill |
| `EMBEDDING_BATCH_SIZE` | embeddings script | 100 | no |

## Risk callouts

- **Don't ship a fake key in CI.** Set keys in `.env.local` (gitignored)
  or your hosting provider's secret manager. Never commit a real key.
- **`UPCODES_API_KEY` and `ICC_API_KEY` set at once:** both adapters fire
  in parallel via `queryAllSources`. That's intentional — they cover
  overlapping content with different licensing terms. UI dedupe is
  downstream's job.
- **Rate limits:** none of the adapters cache yet. Once contracts land
  add an LRU keyed by `(source, code, edition, section)` with a 1h TTL.
  Paywall providers charge per call.
- **Contract terms vs. LLM training:** publisher licensing typically
  prohibits training models on retrieved text. Citation UI is fine;
  persistent storage of fetched rule text into a training set is not.
  Re-read the contract before designing a fetch-cache table.
