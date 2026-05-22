# External Code Sources — ICC, NFPA, and the Citation-Only Reality

_Status: 2026-05-22 · Owner: code-sources adapter team_

## Source URL coverage (knowledge_entities)

Updated 2026-05-22 via a pattern-based SQL backfill (KB-BACKFILL).

| Snapshot | total published | `source_urls` set | `last_verified` set |
|---|---|---|---|
| Before backfill | 2,256 | 15 (0.7%) | 13 |
| After backfill  | 2,256 | **938 (41.6%)** | **938 (41.6%)** |

Coverage by entity_type after backfill:

| entity_type | total | with_url | notes |
|---|---|---|---|
| building_code | 569 | 569 (100%) | IBC/IRC/IFC/IMC/IPC/IECC → ICC content URL; CA Title 24 family → ICC California; NFPA & state-specific → publisher landing |
| safety_regulation | 325 | 325 (100%) | OSHA 1910/1926 → osha.gov standard pages; EPA/DOT/MSHA → agency root; 50 states × 3 codes → ICC state index |
| standard | 24 | 24 (100%) | ACI/AISC/ASCE/ASHRAE/ASTM/NFPA/TMS/AWC publisher pages |
| code_section, code | 8 | 8 (100%) | Existing curated URLs (untouched by backfill) |
| material | 486 | 3 | **gap** — need manufacturer/spec backfill |
| construction_method | 214 | 0 | **gap** — research-paper / NIST / industry-association backfill needed |
| jurisdiction | 131 | 1 | **gap** — link to AHJ landing pages |
| sustainability | 74 | 0 | **gap** — LEED / WELL / Living Building / GreenSeal pages |
| inspection | 70 | 1 | **gap** |
| legal | 61 | 0 | **gap** — link to relevant USC/CFR sections |
| certification | 58 | 7 | partial — extend to LEED AP, OSHA 30, etc. |
| project_delivery, architectural_style, trade, building_type, method, permit_requirement, sequence_rule, inspection_protocol, equipment, climate_zone, zoning_district | <30 each | mostly 0 | content-by-content follow-up |

### Pattern map applied

The backfill uses canonical landing pages (not deep-section links), because
section-level URLs vary by ICC edition path. Coverage at the section level
is what the `icc-digital-codes` adapter is for once licensed.

| Slug pattern | Canonical URL |
|---|---|
| `ibc-*` | `https://codes.iccsafe.org/content/IBC2021P2` |
| `irc-*` | `https://codes.iccsafe.org/content/IRC2021P2` |
| `ifc-*`, `mep-ifc-*` | `https://codes.iccsafe.org/content/IFC2021P1` |
| `imc-*` | `https://codes.iccsafe.org/content/IMC2021P1` |
| `ipc-*` | `https://codes.iccsafe.org/content/IPC2021P1` |
| `iecc-*` | `https://codes.iccsafe.org/content/IECC2021P1` |
| `cbc-*` | `https://codes.iccsafe.org/codes/california/CABC2022P1` |
| `crc-*` | `https://codes.iccsafe.org/codes/california/CARC2022P1` |
| `cec-*` | `https://codes.iccsafe.org/codes/california/CAEC2022P1` |
| `cmc-*`, `mep-cmc-*` | `https://codes.iccsafe.org/codes/california/CAMC2022P1` |
| `cpc-*`, `mep-cpc-*` | `https://codes.iccsafe.org/codes/california/CAPC2022P1` |
| `cfc-*` | `https://codes.iccsafe.org/codes/california/CAFC2022P1` |
| `title-24-*`, `mep-title-24-*` | `https://www.energy.ca.gov/programs-and-topics/programs/building-energy-efficiency-standards` |
| `nec-*`, `mep-nec-*`, `nfpa-70-*` | `https://www.nfpa.org/.../detail?code=70` |
| `nfpa-{NN}-*` | `https://www.nfpa.org/.../detail?code=NN` (70, 70E, 72, 13, 13D, 13R, 14, 20, 25, 75, 80, 99, 101, 110, 115, 241, 505, 654, 96) |
| `osha-1926-*` | `https://www.osha.gov/laws-regs/regulations/standardnumber/1926` |
| `osha-1910-*`, `osha-std-1910*` | `https://www.osha.gov/laws-regs/regulations/standardnumber/1910` |
| `osha-*` (topical) | `https://www.osha.gov/` |
| `epa-*` | `https://www.epa.gov/` |
| `dot-*` | `https://www.transportation.gov/` |
| `msha-*` | `https://www.msha.gov/` |
| `safety-*`, `fall-protection-standards`, `confined-space-entry`, `cpr-first-aid` | `https://www.osha.gov/` |
| `<state>-{commercial,residential,general}-code` | `https://codes.iccsafe.org/codes/<state>` (50 states) |
| `aci-*`, `standard-aci-318` | `https://www.concrete.org/` |
| `aisc-*`, `standard-aisc-360` | `https://www.aisc.org/` |
| `asce-*`, `asce7-*`, `standard-asce-7` | `https://www.asce.org/publications-and-news/asce-7` |
| `ashrae-*`, `standard-ashrae-*`, `mep-ashrae-*` | `https://www.ashrae.org/technical-resources/standards-and-guidelines` |
| `astm-*`, `standard-astm-*` | `https://www.astm.org/` |
| `awc-*`, `standard-nds-wood` | `https://www.awc.org/` |
| `ada-*` | `https://www.ada.gov/law-and-regs/design-standards/2010-stds/` |
| `tms-*`, `standard-tms-402` | `https://masonrystandards.org/` |
| `standard-icc-a117*` | `https://codes.iccsafe.org/content/ICCA1172017` |
| `fbc-*` | `https://codes.iccsafe.org/codes/florida` |
| `nyc-bc-*` | `https://codes.iccsafe.org/codes/new-york` |
| `texas-*` (building_code) | `https://codes.iccsafe.org/codes/texas` |
| `uk-*` | `https://www.gov.uk/government/collections/approved-documents` |
| `eurocode-*`, `eu-eurocodes-overview` | `https://eurocodes.jrc.ec.europa.eu/` |
| `au-ncc-*`, `australia-ncc-*`, `ncc-australia-*` | `https://ncc.abcb.gov.au/` |
| `japan-*` | `https://www.mlit.go.jp/en/` |
| `china-*` | `https://www.mohurd.gov.cn/` |
| `india-*` | `https://www.bis.gov.in/` |
| `upc-*` | `https://www.iapmo.org/` |
| `marin-*`, `calgreen-marin-water` | `https://www.marincounty.org/depts/cd` |
| `dsa-*` | `https://www.dgs.ca.gov/DSA` |
| `hcai-*` | `https://hcai.ca.gov/` |
| `sf-*` | `https://sfdbi.org/` |
| `snv-*`, `clark-county-southern-nevada-amendments` | `https://www.clarkcountynv.gov/government/departments/building_and_fire_prevention/` |
| `phoenix-*` | `https://www.phoenix.gov/pdd` |
| `workers-comp-{california,texas,new-york}` | state DWC/TDI/WCB landing |
| `ca-adu-handbook-2024` | `https://www.hcd.ca.gov/policy-and-research/accessory-dwelling-units` |

All canonical URLs in the map were HEAD-checked and return HTTP 200 except
publisher pages that bot-block (concrete.org, fmcsa.dot.gov, phmsa.dot.gov) —
these resolve cleanly in a browser, and the agency root is the best public
landing for the slug family. Section-level deep-linking is deferred to the
`icc-digital-codes` adapter once licensed.

### Patterns that did NOT map (follow-up backfill needed)

These entity_types contain mostly generic taxonomy entries with no obvious
canonical publisher — they need content-by-content URL curation rather than
slug-pattern backfill:

- `construction_method` (214 rows) — candidate sources: NIST, ASCE, association whitepapers
- `material` (483 rows pending) — manufacturer spec sheets, MasterFormat sections
- `sustainability` (74 rows) — usgbc.org, wellcertified.com, living-future.org, energystar.gov
- `jurisdiction` (130 rows pending) — AHJ websites
- `legal` (61 rows) — law.cornell.edu / eCFR
- `inspection`, `inspection_protocol`, `permit_requirement`, `sequence_rule` — internal SOP or AHJ-specific
- `architectural_style`, `building_type`, `trade`, `method`, `equipment`, `climate_zone`, `zoning_district`, `project_delivery` — research/industry sites, case-by-case

## TL;DR

Three of our six "code source" adapters (`icc-digital-codes`, `nfpa`,
`upcodes`) currently return **citation-only** results by default — they
construct a deep-link to the publisher and return `verified: false`. They do
**not** fetch rule text unless an API key is configured. This is by design:
ICC and NFPA are paywalled commercial SaaS with no public REST API; UpCodes
has a public API but you still need an account key.

The adapter framework is now structured so that the moment a licensing
contract lands, only an env var and (optionally) an endpoint URL need to
change. No application code edits required.

All three live-mode codepaths now use **Zod schemas** to validate publisher
responses before surfacing them as `verified: true`. Schema validation is
strict on field types (a `url` that isn't a URL fails) but lenient on
presence (any of `text` / `body` / `content` satisfies the body field, since
publishers vary). On schema failure we fall back to citation-only — never
break the orchestrator.

## Vendor comparison

| Vendor | API | Cost (approx) | Coverage | Integration effort |
|---|---|---|---|---|
| **ICC DigitalCodes** | Enterprise REST API (no public docs) | $$$$ (negotiate — typically mid-5 to low-6 figures annual) | All ICC I-codes + many state amendments | High — sign master license, get API key from ICC engineering. Approved-use review required. |
| **NFPA Link** | REST API behind subscription | $$$$ (~$50k+/yr commercial, scales with seat count + standards licensed) | All NFPA standards (70, 13, 72, 99, 101, etc.) | High — sales call required; "approved use" review; legal needs to clear redistribution terms. |
| **UpCodes** | Public API with docs (https://up.codes/about/api) | $$$ (~$10k+/yr commercial; free preview tier) | ICC I-codes + jurisdiction overlays + free preview | Medium — sign up, add API key. Real docs, no sales call needed for dev. |
| **SmartCodes** (NIST) | NIST-backed open project | Free (limited rate) | Subset of IBC/IRC | Low — public API, no key required for read. |
| **Public scrape** | Direct fetch of free preview pages | Free | Limited to free-preview chapters | Medium — fragile; ICC blocks scrapers; ToS gray area. |

**Recommendation**: Start with **UpCodes** for ICC content — it's the
cheapest with a real public API and gives a fast path to a green "verified"
badge for ICC-family queries while ICC enterprise negotiations are in
flight. For NFPA, there is no good alternative to NFPA Link — budget
~$50k/yr if NFPA verification is a hard requirement, or accept citation-only
mode and lean on RAG + BKG seed for the verified-source count.

Adapter status (May 2026):

| Source | Adapter file | Default mode | Live-mode env var | Verified when key set? |
|---|---|---|---|---|
| ICC DigitalCodes | `icc.ts` | citation-only | `ICC_API_KEY` | yes (Zod-validated) |
| NFPA Link | `nfpa.ts` | citation-only | `NFPA_API_KEY` | yes (Zod-validated) |
| UpCodes | `upcodes.ts` | citation-only | `UPCODES_API_KEY` | yes (Zod-validated) |
| BKG seed | `bkg-seed.ts` | verified | n/a (local data) | yes |
| Local amendments | `local-amendments.ts` | verified | n/a (local data) | yes |
| RAG | `rag.ts` | verified (when corpus row has URL + ≥100 chars) | `OPENAI_API_KEY` for vector path | conditional |

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
   ≥50% of compliance queries hit a URLed RAG row (after 2026-05-22 backfill:
   938 / 2256 = 41.6%; before backfill: 15 / 916 = 1.6%).
3. **Q4**: license ICC DigitalCodes for the top 3 codes by query volume
   (likely CBC, CRC, NEC). Flip `ICC_API_KEY` env, point `ICC_API_BASE_URL`
   at the contracted endpoint, done.
4. **2027**: expand to NFPA (NEC 2026 cycle), IFC, IPC.

## How the stub endpoint will be replaced

In `src/lib/code-sources/icc.ts`, `nfpa.ts`, and `upcodes.ts`, the live-mode
path uses `http-fetcher.ts` against a URL built by `constructIccApiUrl` /
`constructNfpaApiUrl` / `constructUpCodesApiUrl`. The base URLs come from env:

```
ICC_API_BASE_URL=https://api.iccsafe.org/v1     # default if unset
ICC_API_KEY=<your enterprise key>

NFPA_API_BASE_URL=https://api.nfpa.org/v1       # default if unset
NFPA_API_KEY=<your enterprise key>

UPCODES_API_BASE_URL=https://api.up.codes/v1    # default if unset
UPCODES_API_KEY=<your UpCodes account key>
```

See `docs/ENV-VARS.md` for the full list of env vars that affect code-source
behavior.

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

## Vector RAG (pgvector + OpenAI embeddings)

_Added 2026-05-22 alongside the `match_knowledge_entities` RPC + HNSW index._

The `rag` adapter now has a **vector-first retrieval path** that engages
automatically when two conditions are met:

1. `OPENAI_API_KEY` is set in the runtime environment.
2. At least one row in `knowledge_entities` has a non-NULL `embedding`
   (column is `vector(1536)`, pgvector 0.8.0).

When either is missing, the adapter silently falls back to the FTS path
that has shipped to prod since 2026-04. **No code edits required to flip
the path on** — wire the env var, backfill the embeddings, done.

### Fallback chain

```
queryRag(query)
  │
  ├─ if OPENAI_API_KEY && corpusHasAnyVectors():
  │     ├─ embedQuery(q)            → 1536-dim vector
  │     ├─ rpc("match_knowledge_entities", vector, limit, entity_types)
  │     │     ORDER BY embedding <=> $1   (HNSW-indexed)
  │     └─ if vrows.length > 0: return rowToResult(vrows)
  │
  ├─ try building_codes table (SCHEMA-ALPHA, currently absent)
  │
  └─ FTS over knowledge_entities.search_text (plainto_tsquery)
        └─ fallback: ilike OR on top 4 keywords
```

Every leg applies the same `verified: true IFF source_urls non-empty AND
contentText >= 100 chars` gate. The vector path does **not** weaken the
verification gate — it only changes ranking.

### Model + cost

- **Default model:** `text-embedding-3-small` (1536-dim, matches the column).
- **Cost (Jan 2026 pricing):** $0.02 / 1M tokens. Full backfill of all
  2,256 published rows at ~500 tokens average = **~$0.02 total**. Query-time
  cost is one embedding per RAG call (~$0.000002 per query).
- **Alternative:** `VOYAGE_API_KEY` + `voyage-3-lite` (1024-dim). Cheaper
  per token but requires a column migration to `vector(1024)` — the script
  errors out when this dim mismatch is detected, on purpose.

### Backfill operation

```
# from the repo root, after openai dep is installed:
export OPENAI_API_KEY=sk-...
export NEXT_PUBLIC_SUPABASE_URL=https://vlezoyalutexenbnzzui.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
npm run embeddings
```

The script:
- Skips rows where `embedding IS NOT NULL` (idempotent — safe to re-run).
- Batches 100 rows per OpenAI request (configurable via `EMBEDDING_BATCH_SIZE`).
- Logs progress every batch; exits 0 on success, 2 if any row failed,
  1 on a fatal error.
- Exits 0 silently with a helpful log when no API key is set (so Vercel
  builds never fail just because the env var isn't wired up).

### Composition of the embedding input

`title + summary + (body || search_text)` joined with `\n\n`, truncated to
8000 chars (~2000 tokens). Title is unwrapped from the `{ en: "..." }`
jsonb envelope before concatenation. This mirrors what `rowToResult` uses
for display, so what we embed matches what gets surfaced.

### HNSW index parameters

```sql
CREATE INDEX knowledge_entities_embedding_hnsw
  ON knowledge_entities USING hnsw (embedding vector_cosine_ops);
```

Defaults (`m=16`, `ef_construction=64`) are appropriate for our 2,256-row
corpus. Recall-vs-speed knobs to remember when the corpus grows:

| Knob | Effect | When to tune |
|---|---|---|
| `m` (build) | Higher → better recall, more memory | If recall drops below ~95% on probe set |
| `ef_construction` (build) | Higher → better recall, slower build | Tune up if recall lags after a fresh seed |
| `hnsw.ef_search` (query) | Higher → better recall, slower query | Tune up only if p95 latency budget allows |

### Risk callouts (Vector RAG specifically)

- **HNSW build time**: at >100k rows the `CREATE INDEX` statement above
  will lock the table for tens of seconds. Future migration should switch
  to `CREATE INDEX CONCURRENTLY` and run outside a transaction. Today
  (2,256 rows) the build is sub-second so we use the standard form.
- **Recall vs FTS**: vector recall is fuzzier — semantically related rows
  outrank exact-term matches. For specialists where the query already
  contains a section number ("NEC 210.52(C)(5)"), FTS still beats vector.
  The current code uses vector when available, with no hybrid score; if
  contractor probe runs surface section-lookup regressions, add a hybrid
  rerank step (vector top-N + FTS exact-section bonus).
- **Pre-backfill behavior**: until `npm run embeddings` runs, the vector
  branch short-circuits via `corpusHasAnyVectors()` and FTS continues
  serving traffic. No regression risk from deploying the code before the
  backfill finishes.
- **API key in client bundles**: `OPENAI_API_KEY` is server-only. Never
  prefix with `NEXT_PUBLIC_` and never reference in any `"use client"`
  module. The script runs under Node via `tsx`, never in the browser.
- **Stale embeddings**: re-embed when content changes substantively.
  Today there is no trigger; the script only re-fills NULL rows. A future
  follow-up is a `content_hash` column + re-embed-on-change job.

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
