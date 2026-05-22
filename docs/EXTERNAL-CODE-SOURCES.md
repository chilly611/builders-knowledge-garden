# External Code Sources — ICC, NFPA, and the Citation-Only Reality

_Status: 2026-05-22 · Owner: code-sources adapter team_

## TL;DR

Two of our five "code source" adapters (`icc-digital-codes`, `nfpa`) currently
return **citation-only** results — they construct a deep-link to the publisher
and return `verified: false`. They do **not** fetch rule text. This is by
design: both publishers are paywalled commercial SaaS with no public REST API.

The adapter framework is now structured so that the moment a licensing
contract lands, only an env var and (optionally) an endpoint URL need to
change. No application code edits required.

## Why ICC and NFPA are paywalled

Both organizations earn most of their revenue from selling access to their
codes. They actively litigate efforts to publish "free" copies (see
ICC v. UpCodes, ongoing). What's available:

| Publisher | Public access | Programmatic access |
|---|---|---|
| **ICC** (DigitalCodes, codes.iccsafe.org) | Free read-only HTML of model codes (no copy, no API) | None public. Enterprise licensing via licensing@iccsafe.org. |
| **NFPA** (Link, nfpa.org/link) | Limited free preview; full read paywalled at ~$15/mo/user | None public. Enterprise licensing via licensing@nfpa.org. |

## Typical integration cost (2026 estimates)

These are ballpark numbers from public statements and partner conversations,
not signed quotes:

- **ICC DigitalCodes** enterprise API: **mid-five to low-six figures annual**.
  Pricing scales with seat count, downstream redistribution model, and which
  codes you license (I-codes are bundled; jurisdiction-adopted variants extra).
- **NFPA Link** enterprise API: **similar order of magnitude**, with NFPA 70
  (NEC) typically the most expensive single standard given its compliance use.
- Both vendors require an "approved use" review and usually want to see the
  surface that displays their content (i.e. they'll want to inspect our
  SourceCountBadge UX before signing).

**Implication:** committing to publisher licenses is a six-figure annual
contract decision, not a developer ticket. The framework below makes that
decision the only blocker — engineering is already done.

## Public-domain alternatives (back-fill until contracts land)

These are legal to ingest into our local corpus and surface as `verified: true`
through the `rag` adapter:

1. **Federal Register / CFR** — building-code-adjacent federal rules
   (29 CFR 1926 OSHA construction, 24 CFR HUD, 36 CFR accessibility, NPS
   historic preservation). Public domain. Bulk download via govinfo.gov.
2. **Older code editions in the public domain** — some pre-1970s editions
   of model codes are out of copyright in practice. Not useful for current
   compliance answers, but useful for legacy / historic projects.
3. **State-published amendments** — many states publish their amendments
   to model codes as public PDFs (CA HCD, NY DOS, TX TDLR). We can ingest
   these. The local-amendment adapter already covers a few; this is the
   path of least resistance for trust-badge wins.
4. **Manufacturer technical bulletins** — when scoped to a section that
   cites the model code, they can be the verified source even when we
   can't quote the code itself (e.g. "Simpson Strong-Tie HDU8-SDS2.5
   installation per IRC R602.10.6.2").

## Recommended sequence

1. **Now**: ship `citation-only` mode for ICC + NFPA, run `rag` over local
   corpus as the third verified source. Target: green badge ("3 sources
   verified") on the queries where the local corpus has URLed entries.
2. **Q3**: ingest CFR + state amendments to back-fill RAG coverage. Goal:
   ≥50% of compliance queries hit a URLed RAG row (today: 15 / 916 = 1.6%).
3. **Q4**: license ICC DigitalCodes for the top 3 codes by query volume
   (likely CBC, CRC, NEC). Flip `ICC_API_KEY` env, point `ICC_API_BASE_URL`
   at the contracted endpoint, done.
4. **2027**: expand to NFPA (NEC 2026 cycle), IFC, IPC.

## How the stub endpoint will be replaced

In `src/lib/code-sources/icc.ts` and `nfpa.ts`, the live-mode path uses
`http-fetcher.ts` against a URL built by `constructIccApiUrl` /
`constructNfpaApiUrl`. The base URLs come from env:

```
ICC_API_BASE_URL=https://api.iccsafe.org/v1     # default if unset
ICC_API_KEY=<your enterprise key>

NFPA_API_BASE_URL=https://api.nfpa.org/v1       # default if unset
NFPA_API_KEY=<your enterprise key>
```

When the contracted endpoint differs from the assumed shape:

1. Update `constructIccApiUrl` / `constructNfpaApiUrl` to match the
   contracted URL pattern.
2. Update the response interface (`IccApiResponse` / `NfpaApiResponse`)
   to match the contracted JSON shape.
3. The verification gate (`verified: true` when `data.text` is non-empty)
   already does the right thing.

That's the entire migration — three edits in two files. The orchestrator,
the badge, the specialist prompts, and the tests do not need to change.

## Telemetry hooks

`fetchPublisher` returns `{ mode, ok, reason, status }`. When live-mode
fails (timeout, 4xx, parse-error) the adapter logs once and falls back
to citation-only. Wire these into Loop 5 once we're live so we can track:

- live-fetch success rate per publisher
- p95 latency per publisher
- distribution of `reason` values (which kind of failures dominate)

## Risk callouts

- **Don't ship a fake API key.** `readApiKey()` rejects placeholders
  matching `your|placeholder|set me|todo|<.*>` to prevent accidentally
  flipping live mode without a real contract. If your key starts with
  any of those strings, the adapter quietly stays in preview mode.
- **Caching:** none yet. Once contracts land we should LRU-cache by
  `(code, edition, section)` for at least 1 hour — paywall providers
  charge per call.
- **Compliance:** licensing terms typically forbid LLM training on
  retrieved text. Citation surfaces in our UI are fine; persisting
  fetched rule text into long-term storage may not be. Re-read the
  contract before designing a fetch-cache table.
