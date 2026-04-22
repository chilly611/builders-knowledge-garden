# seed-code-entities.mjs — Entity Schema & Extension Guide

This document describes the structure of code entities seeded into the `knowledge_entities` table and how to expand the seed.

## Entity Schema

Each entity is created via the `entity()` function with this shape:

```javascript
{
  slug: string              // unique identifier (kebab-case, e.g. "nec-2023-210-52c5-eliminated")
  title: { en: string }     // English title of the code section
  summary: { en: string }   // 2–4 sentence summary; sufficient for retrieval and LLM citation
  body: { en: string }      // optional extended body text (empty string if minimal detail needed)
  entity_type: string       // always "building_code" for this seed
  domain: string            // always "construction"
  status: string            // always "published"
  tags: string[]            // searchable tags (e.g. ["electrical", "nec-2023", "gfci", "personnel-protection"])
  metadata: {
    code_body: string       // "NEC", "IBC", "IRC", "CEC", "CBC", "IPC", "IMC", etc.
    code_year: number       // edition year (2017, 2020, 2021, 2022, 2023)
    section: string         // section number (e.g. "210.8", "Article 210", "1613")
    category: string        // human-readable grouping (e.g. "Electrical — GFCI Protection")
    adopted_by: string[]    // jurisdictions that adopt this code
    source_url: string      // link to authoritative code publisher (NFPA, ICC, energy commission)
    confidence_tier: string // "primary" | "summary" | "historical" (see below)
    superseded_by?: string  // (optional) slug of newer section if this is historical
  }
  source_urls: string[]     // computed from metadata.source_url
}
```

### Jurisdiction Tags

Use these standardized `adopted_by` codes:

**California:**
- `"ca-la"` — Los Angeles
- `"ca-sf"` — San Francisco
- `"ca-sd"` — San Diego
- `"ca-oak"` — Oakland
- `"ca-sj"` — San Jose

**Nevada:**
- `"nv-lv"` — Las Vegas / Clark County
- `"nv-hen"` — Henderson
- `"nv-nlas"` — North Las Vegas
- `"nv-reno"` — Reno / Washoe County
- `"nv-washoe"` — Washoe County

**Arizona (for reference; not in initial scope):**
- `"az-phx"` — Phoenix
- `"az-tuc"` — Tucson
- `"az-flag"` — Flagstaff

---

## Confidence Tier

Controls the 3-source verification logic wired by Agent 5:

### `"primary"`
Authoritative code text sections. Direct extraction from adopted edition. Cited with full authority. Examples:
- NEC 210.8 (GFCI protection)
- NEC 210.52(C) (countertop receptacles)
- IBC 1613 (seismic design)
- California Title 24 Part 6 (solar mandate)

### `"summary"`
Editorial summaries or paraphrases of code intent. Sufficient for contractor navigation but not word-for-word citation. Examples:
- NEC Article 210 (overview of branch circuits)
- IBC Section 1607 (live load overview)
- CBC Chapter 1604 (CA risk category amendments)

### `"historical"`
Superseded sections still referenced by older adopting jurisdictions. Explicitly marked with "ELIMINATED" or "SUPERSEDED" in summary. Must include `superseded_by` pointer. Example:
- NEC 2020 Section 210.52(C)(5) — kitchen island receptacle rule (eliminated in 2023)

---

## How to Add New Sections

### 1. Choose Code Body and Section

Identify the code (NEC, IBC, IPC, CEC, etc.), year, and section number.

**Examples:**
- NEC 2023 Section 210.12 (AFCI)
- IBC 2021 Section 1609 (wind loads)
- California Title 24 Part 11 (water fixture flow)

### 2. Write Summary (2–4 sentences)

Make it retrievable AND citable:
- State the rule plainly
- Include thresholds, exemptions, or key details
- Avoid legal boilerplate; be concrete

**Good:**
> "GFCI protection required for personnel in kitchens, bathrooms, garages, outdoors, crawl spaces, basements, bathtubs, showers, near sinks, and laundry areas. Dwelling: all 125V 15A and 20A receptacles in these locations. Protection via GFCI receptacle or breaker."

**Weak:**
> "GFCI is a safety requirement in wet locations per NEC Article 210."

### 3. Choose Tags

Include discipline + code + relevant keywords:

**Electrical section example:**
```
["electrical", "nec-2023", "gfci", "personnel-protection", "kitchen", "bathroom"]
```

**Structural section example:**
```
["structural", "ibc-2021", "seismic", "earthquake", "sdc"]
```

**Plumbing section example:**
```
["plumbing", "ipc-2021", "water-supply", "backflow", "meter"]
```

### 4. Fill Metadata

```javascript
{
  code_body: "NEC",                    // code standard abbreviation
  code_year: 2023,                     // adopted year
  section: "210.52(C)",                // section number as written in code
  category: "Electrical — Countertops",// human-readable category
  adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx", "nv-lv"],
  source_url: "https://...",           // official code publisher URL
  confidence_tier: "primary"           // "primary", "summary", or "historical"
}
```

### 5. Set Confidence Tier

- Use `"primary"` for direct code text with concrete thresholds
- Use `"summary"` for overview articles or editorial paraphrases
- Use `"historical"` only for superseded sections; include `superseded_by: "new-slug"`

---

## Contractor-Query Priority Sections (To Add Next)

These are high-value additions based on real contractor questions:

| Code | Section | Focus | Discipline | Tier |
|------|---------|-------|-----------|------|
| NEC 2023 | 406.14 | Receptacle ratings & connector types | Electrical | primary |
| NEC 2023 | 430.22 | AC motor branch-circuit sizing | Electrical | primary |
| IPC 2021 | 701.3 | Drain sizing (fixture units) | Plumbing | primary |
| IPC 2021 | 708.3 | Trap sealing & venting | Plumbing | primary |
| IMC 2021 | 503 | General ductwork design (CFM sizing) | Mechanical | primary |
| IBC 2021 | 2304 | Prescriptive wood floor joist tables | Structural | primary |
| CBC 2022 | 1632 | Mass timber (CLT) design | Structural | primary |
| CEC 2022 | Article 250 | Grounding amendments (CA-specific) | Electrical | primary |
| CA Title 24 Part 6 | 120.1 | Battery energy storage mandate | Electrical | primary |
| NEC 2023 | 408.4 | Panelboard rating & ampacity | Electrical | primary |

---

## NEC 2020 vs 2023 Key Changes (Add As Historical Sections)

When adopting jurisdictions are on staggered cycles, include both:

| Section | 2020 Rule | 2023 Change | Action |
|---------|-----------|------------|--------|
| 210.52(C)(5) | Island: ≥1 receptacle per 12 ft | ELIMINATED | Add as historical + superseded_by pointer |
| 230.71 | Service disconnect max 6 | CLARIFIED emergency shutdown logic | Add 2023 version as primary + 2020 as historical |
| 690.12 | Rapid shutdown requirements | TIGHTENED accessibility rules | Add 2023 primary + note 2020 differences |

---

## Example: Adding a New Historical Section

When NEC 2023 eliminates a rule that's still in older editions:

```javascript
entity(
  "nec-2020-210-52c5-eliminated",
  "NEC 2020 Section 210.52(C)(5) — Kitchen Island Receptacle (ELIMINATED IN NEC 2023)",
  "HISTORICAL: NEC 2020 required at least one receptacle in kitchen/island/peninsula per 12 linear feet. THIS REQUIREMENT WAS ELIMINATED in NEC 2023. See 210.52(C)(2) for current spacing rules.",
  "building_code",
  ["electrical", "nec-2020", "island", "superseded", "eliminated"],
  {
    code_body: "NEC",
    code_year: 2020,
    section: "210.52(C)(5)",
    category: "Electrical — Island Receptacles (Superseded)",
    adopted_by: ["ca-la", "ca-sf", "ca-sd", "az-phx"],
    source_url: "https://www.nfpa.org/...",
    confidence_tier: "historical",
    superseded_by: "nec-2023-210-52c2"
  },
  "Many older installations reference this rule. For new work under NEC 2023 adoption, always verify the adopted edition with your AHJ."
)
```

---

## Running the Seed

Export Supabase credentials and run:

```bash
export SUPABASE_URL=https://YOUR_PROJECT.supabase.co
export SUPABASE_SERVICE_KEY=YOUR_SERVICE_ROLE_KEY
npm run seed:codes
```

Or directly:

```bash
node scripts/seed-code-entities.mjs
```

The script batches entities in chunks of 10 and logs progress:

```
Seeding 180 code entities (7 structural, 45 electrical, 12 plumbing, 10 mechanical, 16 fire/structural)…
  ✔ 10/180
  ✔ 20/180
  ...
Done. 180 of 180 entities upserted.
```

---

## Testing Retrieval

After seeding, verify entities are queryable:

```sql
select slug, title, summary from knowledge_entities
  where entity_type = 'building_code'
  and (metadata->>'adopted_by')::jsonb ?| array['ca-la','ca-sf','nv-lv']
  and tags @> ARRAY['gfci']
  order by metadata->>'code_year' desc
  limit 20;
```

**Expected contractor query smoke tests:**

1. **"Kitchen island receptacle California"**
   → returns `nec-2023-210-52c2` (current rule) + `nec-2020-210-52c5-eliminated` (historical context)

2. **"Laundry circuit Nevada"**
   → returns `nec-2023-210-11c2` + `nec-2023-210-52f`

3. **"GFCI protection bathroom"**
   → returns `nec-2023-210-8`, `nec-2023-210-52d`

4. **"Solar rapid shutdown California"**
   → returns `nec-2023-690-12`, `ca-title24-part6-solar-mandate`

5. **"Water heater venting"**
   → returns `ipc-2021-section-802`, `irc-2021-section-p2603`

---

## Maintenance Notes

- **Code cycle offsets:** Southern Nevada (SNV) adopts IBC/NEC ~1 edition behind; Northern Nevada uses current edition unamended.
- **California state amendments:** Title 24 Part 2 (Building), Part 3 (Electrical), Part 6 (Energy), Part 11 (CALGreen). Always cross-reference state code + local adoption.
- **Confidence tiers drive retrieval:** Agent 5 weights "primary" sources at 3× confidence; "summary" at 1×; "historical" as supporting context only.
- **Superseded sections:** Keep them seeded with `confidence_tier: "historical"` so the LLM can distinguish old from new and guide contractors to current rules.

---

*Last updated: 2026-04-21*
