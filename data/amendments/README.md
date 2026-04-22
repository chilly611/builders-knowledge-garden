# Local Building Code Amendments

This directory contains jurisdiction-specific amendments, deviations, and stricter interpretations of model codes (NEC, IRC, IBC, etc.). These are the tertiary source layer that gives Builder's Knowledge Garden an edge over generic LLM responses.

## Structure

Amendment files are named by jurisdiction:
- `ca-title24-part*.json` — California state-level Title 24 amendments
- `ca-{city}.json` — California municipal/county amendments (SF, LA, SD, Oakland, San Jose, etc.)
- `nv-{region}.json` — Nevada regional amendments (southern, washoe)

## Schema

Each amendment file follows this structure:

```json
{
  "jurisdiction": "ca-sf",
  "jurisdictionName": "San Francisco",
  "parent": "california",
  "adoptedEdition": "CA Title 24 2022",
  "effectiveDate": "2023-01-01",
  "sourceUrl": "https://sfdbi.org/...",
  "amendments": [
    {
      "id": "ca-sf-nec-210-8-amendment",
      "discipline": "electrical",
      "baseEdition": "NEC 2023",
      "baseSection": "210.8",
      "title": "SF additional GFCI requirements in commercial kitchens",
      "text": "San Francisco Electrical Code amends NEC 210.8 to require GFCI protection on all 120V receptacles within 10 feet of a commercial cooking surface, extending the NEC 6-foot rule...",
      "citation": "SF Electrical Code §210.8 Amendment (2023)",
      "confidenceTier": "primary",
      "keywords": ["gfci", "kitchen", "commercial", "receptacle"]
    }
  ]
}
```

### Field Descriptions

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `jurisdiction` | string | yes | kebab-case code: `ca-sf`, `nv-clark`, etc. |
| `jurisdictionName` | string | yes | Human-readable name (e.g., "San Francisco") |
| `parent` | string | yes | Parent jurisdiction: `california`, `nevada` |
| `adoptedEdition` | string | yes | Model code edition adopted (e.g., "CA Title 24 2022") |
| `effectiveDate` | string | yes | ISO date when amendment became effective |
| `sourceUrl` | string | yes | Direct link to official amendment source or AHJ website |
| `amendments` | array | yes | Array of amendment objects |

### Amendment Object Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | yes | Unique ID: `{jurisdiction}-{discipline}-{section}-amendment` |
| `discipline` | string | yes | One of: `electrical`, `structural`, `plumbing`, `mechanical`, `fire` |
| `baseEdition` | string | yes | Model code edition being amended (e.g., "NEC 2023") |
| `baseSection` | string | yes | Section number being amended (e.g., "210.8" or "R313") |
| `title` | string | yes | Concise title of the amendment |
| `text` | string | yes | Full text of the amendment or summary with "(summary — verify with AHJ)" if uncertain |
| `citation` | string | yes | How to cite this in inspection/design (e.g., "SF Electrical Code §210.8 Amendment (2023)") |
| `confidenceTier` | string | yes | One of: `primary` (verified official source), `summary`, `historical` |
| `keywords` | array | yes | Search terms for discovery (e.g., ["gfci", "kitchen", "commercial"]) |

## Adding a New Amendment

1. Identify the jurisdiction code (e.g., `ca-sf`, `nv-clark`)
2. If creating a new jurisdiction file, copy this template and fill in metadata
3. For each amendment:
   - Assign a unique `id` following the pattern
   - Reference the section number being amended
   - Write the `text` based on official AHJ documents
   - If unsure of exact wording, append "(summary — verify with AHJ)" to the text
   - Include relevant keywords for discovery
4. Test with `queryLocalAmendments({ discipline: "electrical", jurisdiction: "ca-sf", keywords: ["gfci"] })`

## Data Quality Notes

- Do not fabricate code numbers. If uncertain, write as summary with verification notice.
- Amendments should represent real, currently-enforced rules (not historical).
- Each amendment must be traceable to an official AHJ document or published code.
- For state-level amendments (CA Title 24), source from official California Building Standards Commission.
- For local amendments, reference municipal code, building department guidance, or published notices.
