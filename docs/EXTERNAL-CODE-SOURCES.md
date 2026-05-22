# External Code Sources — ICC, NFPA, and the Citation-Only Reality

_Status: 2026-05-22 · Owner: code-sources adapter team_

## Source URL coverage (knowledge_entities)

Updated 2026-05-22 via two pattern-based SQL backfills (KB-BACKFILL +
KB-BACKFILL-V2).

| Snapshot | total published | `source_urls` set | `last_verified` set |
|---|---|---|---|
| Pre-Round-1 | 2,256 | 15 (0.7%) | 13 |
| Post-Round-1 (KB-BACKFILL) | 2,256 | 938 (41.6%) | 938 (41.6%) |
| Post-Round-5 (KB-BACKFILL-V2, 2026-05-22) | 2,256 | **2,256 (100.0%)** | **2,256 (100.0%)** |

Coverage by entity_type after Round 5 backfill:

| entity_type | total | with_url | notes |
|---|---|---|---|
| building_code | 569 | 569 (100%) | IBC/IRC/IFC/IMC/IPC/IECC → ICC content URL; CA Title 24 family → ICC California; NFPA & state-specific → publisher landing |
| material | 486 | 486 (100%) | **R5** — concrete/cement → cement.org; lumber/wood → awc.org; steel/rebar → aisc.org; insulation → insulationinstitute.org; gypsum/drywall → gypsum.org; roofing → nrca.net; masonry/stone → masonrystandards.org; paint/coatings/sealants → paint.org; plumbing pipe/fittings → iapmo.org; electrical wire/conduit → nema.org; HVAC equipment → ashrae.org; fire-rated → nfpa.org; flooring/tile → tcnatile.com; doors/windows/glass → aamanet.org; PPE → osha.gov; geotextiles → geosyntheticssociety.org |
| safety_regulation | 325 | 325 (100%) | OSHA 1910/1926, EPA/DOT/MSHA, 50 states × 3 codes |
| construction_method | 214 | 214 (100%) | **R5** — concrete methods → concrete.org; wood framing/carpentry → awc.org; MEP → NFPA/IAPMO/ASHRAE; masonry → masonrystandards.org; roofing → nrca.net; safety/demo/excavation → osha.gov 1926; structural → asce.org; technology/BIM → buildingsmart.org; envelope/cladding → buildingenclosureonline.com |
| jurisdiction | 131 | 131 (100%) | **R5** — major US AHJs curated to actual building/development dept URLs (LADBS, SF DBI, NYC DOB, etc.); other US jurisdictions → ICC state-index URL; international jurisdictions → national or city government landing |
| sustainability | 74 | 74 (100%) | **R5** — LEED → usgbc.org; WELL → wellcertified.com; LBC → living-future.org; Passive House → phius.org; energy → energystar.gov; water → epa.gov/watersense; embodied carbon → carbonleadershipforum.org; IAQ → epa.gov/indoor-air-quality |
| inspection | 70 | 70 (100%) | **R5** — ICC certification index for building/structural/envelope; NFPA for fire; IAPMO for plumbing; ASHRAE for HVAC; NEC for electrical |
| legal | 61 | 61 (100%) | **R5** — AIA contracts → aiacontracts.org; ConsensusDocs / EJCDC publisher pages; Miller Act → law.cornell.edu USC 40 ch 31; mechanics liens → law.cornell.edu/wex; insurance → iii.org; prevailing wage → dol.gov; catch-all → law.cornell.edu/wex/contract |
| certification | 58 | 58 (100%) | **R5** — ICC → iccsafe.org/professional-development; NFPA → nfpa.org/professional-development; NICET → nicet.org; LEED → usgbc.org/credentials; PE/SE → ncees.org; AIA → aia.org licensure; state GC → CSLB / TDLR / FL DBPR; AWS → aws.org; PMP → pmi.org |
| project_delivery | 31 | 31 (100%) | **R5** — AIA contracts; ConsensusDocs; EJCDC; DBIA for design-build / IPD / CM / P3 / alliance |
| architectural_style | 30 | 30 (100%) | **R5** — aia.org (general architecture reference; deeper per-style sources are a follow-up) |
| trade | 28 | 28 (100%) | **R5** — bls.gov Occupational Outlook Handbook (construction & extraction) — canonical taxonomic source |
| building_type | 26 | 26 (100%) | **R5** — IBC use groups → codes.iccsafe.org; healthcare → ashe.org; data center → uptimeinstitute.com |
| method | 25 | 25 (100%) | **R5** — same publisher map as construction_method, defaulting to OSHA 1926 |
| standard | 24 | 24 (100%) | ACI/AISC/ASCE/ASHRAE/ASTM/NFPA/TMS/AWC |
| permit_requirement | 22 | 22 (100%) | **R5** — jurisdiction-specific permits → AHJ landing (LADBS, NYC DOB, Austin DS, Miami-Dade); generic permit types → iccsafe.org |
| sequence_rule | 20 | 20 (100%) | **R5** — cmaanet.org (Construction Management Association of America) |
| inspection_protocol | 18 | 18 (100%) | **R5** — iccsafe.org |
| equipment | 16 | 16 (100%) | **R5** — osha.gov 1926 (cranes/excavators/scaffolding all OSHA-regulated) |
| climate_zone | 12 | 12 (100%) | **R5** — codes.iccsafe.org IECC2021 (defines ASHRAE-aligned climate zones) |
| zoning_district | 8 | 8 (100%) | **R5** — planning.org Planning & Law division |
| code_section, code | 8 | 8 (100%) | Existing curated URLs (untouched by backfill) |

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

### Round 5 backfill (KB-BACKFILL-V2, 2026-05-22)

Round 5 closed the remaining 1,318 gap rows from the original KB-BACKFILL.
Same execution model: pure SQL `UPDATE` statements via the Supabase MCP
`execute_sql` (no schema migrations, only `source_urls` + `last_verified`
were touched, and only for rows where `source_urls = '{}'`).

The pattern map above was extended with publisher landings for each
non-code entity type. The Round 5 patterns lean on:

- **Trade-association publishers** (ACI, AISC, ASCE, AWC, ASHRAE, NRCA,
  TMS, IAPMO, NEMA, PCI, AAMA, TCNA, Gypsum Association, Insulation
  Institute) for materials and construction methods.
- **AHJ landing pages** for the top 40 US jurisdictions (LADBS, SF DBI,
  NYC DOB, Phoenix PDD, Seattle SDCI, etc.); other US jurisdictions
  default to their ICC state-index URL; international jurisdictions
  resolve to the national or city government landing.
- **Standards-body certification indexes** (USGBC / NFPA / ICC / NICET /
  AWS / NCEES / AIA / PMI) for `certification` rows.
- **Legal canonical sources** (Cornell Law, AIA Contracts, ConsensusDocs,
  EJCDC, DOL, III) for `legal` rows.
- **BLS Occupational Outlook Handbook** for `trade` rows — the
  authoritative US occupation taxonomy.

All Round 5 URLs are publisher root or section landings, not deep
section anchors. Deep-section coverage is still a job for the licensed
`icc-digital-codes` / `nfpa` / `upcodes` adapters once contracts land.

### AI-assisted residue (optional)

The pattern-based passes reached 100% coverage on the existing 2,256
published rows. For future drift (new entities added with slugs that
don't fit the patterns), the residue tool is:

```
npm run kb:ai-backfill
```

It uses Claude Haiku to suggest 1-3 canonical URLs per row from a
curated trusted-publisher list (the same list above), HEAD-validates
each suggestion with a 5-second timeout, and only writes the
validated subset. Gated on `ANTHROPIC_API_KEY` — if the env var is
missing, the script exits 0 with a log message so CI/builds never
break. Cost estimate (Haiku, 2026): ≈ $0.0001 per row, ≈ $0.13 for
the original 1,318-row gap.

Useful overrides:

- `AI_BACKFILL_DRY_RUN=1` — log suggestions without writing
- `AI_BACKFILL_LIMIT=50` — process at most 50 rows per run
- `AI_BACKFILL_VALIDATE_URLS=0` — skip HEAD validation (faster, riskier)
- `ANTHROPIC_MODEL=claude-sonnet-4-5` — switch to Sonnet if Haiku
  returns too many off-topic URLs (≈10× the cost)

The script implementation is at `src/scripts/ai-backfill-kb-urls.ts`.

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
   ≥50% of compliance queries hit a URLed RAG row (after KB-BACKFILL-V2
   on 2026-05-22: **2,256 / 2,256 = 100%** of published rows now carry a
   `source_urls` value; pre-Round-1: 15 / 916 = 1.6%; post-Round-1: 938 /
   2256 = 41.6%). Round 5 URLs are publisher landing pages (not deep
   section anchors) — they're enough to drive the trust-badge "verified
   source" count but the RAG adapter still needs the licensed publisher
   APIs for section-level body text.
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

## Hybrid RAG: vector + FTS + section bonus

_Added 2026-05-22 (vector RPC + HNSW index, migration `20260522c`)._
_Extended 2026-05-23 (hybrid RPC + section-bonus rerank, migration `20260523`)._

The `rag` adapter now uses a **hybrid retrieval path** that combines
three signals:

| Signal | Source | Range | Weight (α/β/γ) | Strong when… |
|---|---|---|---|---|
| **vector** | pgvector cosine similarity (HNSW-indexed) on OpenAI embeddings | [0, 1] | α = 0.6 | the query is semantically expressed ("kitchen counter outlets near sink") |
| **fts** | Postgres `ts_rank_cd` on `search_text`, normalized to [0,1] per query | [0, 1] | β = 0.3 | the query carries distinctive tokens (publisher names, exotic terms) |
| **section_bonus** | TS-side: 1.0 for exact section in slug/title, 0.5 for numeric prefix match | {0, 0.5, 1.0} | γ = 0.1 | the query carries a section number ("NEC 210.52(C)(5)") |

`combined_score = 0.6·vector + 0.3·fts + 0.1·section_bonus`

The α/β split is computed server-side by the
`hybrid_match_knowledge_entities` RPC. The γ bonus is applied in
TypeScript (`hybridRerank` in `src/lib/code-sources/rag.ts`) so we can
tune section-matching heuristics without redeploying SQL.

### Why this exists

Pure vector retrieval is fuzzy: embeddings rank "NEC Article 210 —
Branch Circuits Overview" above "NEC 210.52(C)(5) — Island Countertop
Receptacles" when the query is "NEC 210.52(C)(5) receptacle outlet
spacing", because the semantic neighborhood is dense. FTS on
`ts_rank_cd` catches the literal "210.52" token but loses to fuzzy
phrasing. Section-bonus catches the case where the embedding model
also stripped section-number precision but the slug/title still has it.

Combining all three gives:
- Section-aware queries → top result is the right section (γ tips it).
- Natural-language queries → embeddings still drive (α dominates).
- Distinctive-token queries → ts_rank_cd catches matches the embedding
  blurred (β backstops).

### Fallback chain

```
queryRag(query)
  │
  ├─ if OPENAI_API_KEY && corpusHasAnyVectors():
  │     ├─ embedQuery(q)            → 1536-dim vector
  │     ├─ rpc("hybrid_match_knowledge_entities", vector, query_text, ...)
  │     │     vector top-20 ∪ FTS top-20, normalized scores
  │     ├─ hybridRerank()           → apply γ·section_bonus, sort desc
  │     └─ if ranked.length > 0: return rowToResult(top-5)
  │
  │     [fallback if hybrid RPC missing — older deploys]
  │     ├─ rpc("match_knowledge_entities", vector, limit, entity_types)
  │     └─ if vrows.length > 0: return rowToResult(vrows)
  │
  ├─ try building_codes table (SCHEMA-ALPHA, currently absent)
  │
  └─ FTS over knowledge_entities.search_text (plainto_tsquery)
        └─ fallback: ilike OR on top 4 keywords
```

Every leg applies the same `verified: true IFF source_urls non-empty AND
contentText >= 100 chars` gate. The hybrid path does **not** weaken the
verification gate — it only changes ranking.

### Section-number extractor

The TS adapter parses likely section numbers from the structured query
(`query.section`, `query.keywords`, `query.edition`) using:

```
/\b[A-Z]?\d{2,4}(?:\.\d+)*(?:\([A-Za-z]\))*(?:\(\d+\))*/g
```

Captures: `210`, `210.52`, `210.52(C)`, `210.52(C)(5)`, `1107.6.1`,
`R602.10.6.2`. Two-digit minimum prevents single-digit false positives.

Each candidate row's slug + title is normalized (every non-alphanumeric
run collapsed to `-`) before substring-matching, so `nec-210-52-c-5`
matches a section of `210.52(C)(5)`.

### Tuning notes

If contractor probe runs show:
- **Wrong section returned for section-anchored queries** → bump γ to 0.2
  and drop α to 0.5.
- **Natural-language queries regress** → drop γ to 0.05; the bonus only
  helps when sections were extracted.
- **Distinctive-token queries miss** (e.g. brand names, NFPA standard
  numbers like "NFPA 13D") → bump β to 0.4 / α to 0.5.

Weights live in `src/lib/code-sources/rag.ts` as `ALPHA_VECTOR`,
`BETA_FTS`, `GAMMA_SECTION` constants.

### Backward compatibility

- **No API key** → vector branch short-circuits; FTS path serves traffic.
- **No embeddings backfilled yet** → `corpusHasAnyVectors()` returns
  false; FTS path serves traffic.
- **Hybrid RPC missing** (older deploy, migration not yet applied) →
  adapter falls through to the pure-vector RPC, then to FTS. No regression.

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
  contains a section number ("NEC 210.52(C)(5)"), pure vector loses to
  FTS. **Resolved 2026-05-23** by the hybrid rerank above
  (`hybrid_match_knowledge_entities` + γ·section_bonus). See the
  "Hybrid RAG" section above for tuning knobs.
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
- **Hybrid RPC `search_path` security**: `hybrid_match_knowledge_entities`
  runs SECURITY DEFINER. We pin `search_path = public` in the function
  body to prevent privilege-escalation via a hijacked search_path. Mirror
  this on any future RPC that touches `knowledge_entities`.
- **Hybrid RPC nullability**: the function unions vector top-N and FTS
  top-N. Rows present in one set and absent from the other have the
  missing score COALESCEd to 0 — they are still re-ranked, just with no
  contribution from the missing leg. Display columns are pulled from a
  final JOIN onto `knowledge_entities` so we never surface a row with a
  null slug / title from the union side.
- **Weighting drift**: α/β/γ live in `rag.ts` as TypeScript constants.
  The SQL function takes `alpha_vector` and `beta_fts` as parameters with
  defaults that match the TS constants — keep these in sync if you tune
  either side, otherwise the server-side combined_score and the TS-side
  combined_score will disagree on the α/β split.

## Risk callouts

- **Don't ship a fake API key.** `readApiKey()` rejects placeholders
  matching `your|placeholder|set me|todo|<.*>` to prevent accidentally
  flipping live mode without a real contract. If your key starts with
  any of those strings, the adapter quietly stays in preview mode.
- **Caching (per-instance, default):** `src/lib/code-sources/cache.ts`
  wraps every paywalled adapter (`icc.ts`, `nfpa.ts`, `upcodes.ts`) and
  the `rag.ts` adapter in `withCache(source, query, fetcher)`. Keys are
  deterministic over `(discipline, section, edition, jurisdiction,
  sorted-keywords)`. TTL is 1h for paywall sources, 30m for RAG.
  Citation-only fallbacks (every result `confidenceTier: 'summary'`)
  are deliberately NOT cached so a paywall transient doesn't pin a bad
  answer for an hour.

## Multi-region cache (Vercel KV / Upstash Redis)

The default cache backend is module-scoped — fine for single-instance
deploys, but on Vercel each lambda gets its own Map. Once any paywall
key (UpCodes / ICC / NFPA) is live, every cold lambda invocation pays
full price per region. To deduplicate across regions, wire a shared
Redis backend.

### Option A: Vercel KV (one click)

1. In the Vercel dashboard: Storage → Create → KV. Pick the region
   closest to the rest of your infra.
2. Vercel auto-populates two env vars on every deployment in this
   project: `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
3. Redeploy. `cache.ts` detects the env vars at module load and
   switches `withCache` to the Upstash REST-based backend. Existing
   adapter call sites need no change.

### Option B: Upstash Redis (provider-agnostic)

1. Sign up at upstash.com, create a global Redis database.
2. Set env vars (works in any host — Vercel, Fly, Render, bare Node):
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
3. `cache.ts` reads either env var pair (Vercel's `KV_REST_API_*` OR
   Upstash's native names) — both resolve to the same Upstash REST
   endpoint because `@vercel/kv` is itself just a wrapper.

### Cost ceiling

Upstash free tier: 10,000 commands/day ≈ 333/hour. At a baseline
load of 100 unique queries/hour with the 80% hit ratio we see in
preview probes:

- 20 cache writes (misses) × 1 SET command  = 20
- 80 cache reads (hits)   × 1 GET command  = 80
- 100 GETs for the miss path (every call starts with a GET) = 100
- Total ≈ 120 commands/hour. Headroom 213/hour for invalidation
  scans, size queries, and burst traffic. Stays under the free tier
  by a comfortable margin.

Paid tier starts at ~$0.20/100k commands and includes per-region
replication if cross-region latency becomes the bottleneck.

### Behavior when env vars are absent

`cache.ts` silently falls back to the in-memory backend (Round 5
behavior). No tests change, no deploys break — just per-instance
cache, same as before.

### Health visibility

`GET /api/v1/healthcheck?detailed=1` returns `checks.rag_cache.value`
including `backend: 'kv' | 'in-memory'`. Use it to confirm at a
glance that the multi-region path is actually wired up after the
Vercel KV provisioning step.

### Risk callouts

- **Latency vs in-memory**: Upstash REST adds ~10–30ms per get/set
  vs <1ms for the Map backend. Negligible compared to a paywall
  round-trip (~500ms–2s), but it's not free. If hot-path RAG queries
  start regressing on p95, the fix is a two-layer cache (in-memory
  in front of KV, like a CDN with origin shielding).
- **`KEYS` is O(N)**: `invalidateCache(source)` and the per-bucket
  `size()` use Redis `KEYS prefix:*`. Safe at our cardinality (a
  few thousand keys/bucket worst case) but DON'T use `invalidateCache()`
  with no argument under load — it scans the entire keyspace. If we
  ever exceed ~10k keys, switch to `SCAN`.
- **Eviction**: Upstash evicts under memory pressure (allkeys-lru by
  default). At free-tier 256MB and our average payload of ~2KB per
  cached query, we can hold ~120k entries before pressure kicks in
  — far above the CodeQuery cardinality.
- **Stats are still per-instance**: hits/misses/bypasses counters
  live in the lambda's memory, not in Redis. The hit_ratio on the
  healthcheck reflects ONE instance's view. Centralizing telemetry
  is a future round; the cost-control goal of this round (shared
  cache state) is met regardless.
- **Compliance:** licensing terms typically forbid LLM training on
  retrieved text. Citation surfaces in our UI are fine; persisting
  fetched rule text into long-term storage may not be. Re-read the
  contract before designing a fetch-cache table.
