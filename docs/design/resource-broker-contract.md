# ResourceBroker — shared interface contract (v1)

Both humans and AI specialists call the same broker. This contract is the single source of truth. Agents W5.A (broker module) and W5.B (supply-ordering client) both work against this surface so they can run in parallel without stomping each other.

## Concept

Users and agents often need to find something in the real world — a 3/4" SDS-max bit, a lift that fits through a 34" door, a framing sub with insurance in Sonoma, a day laborer near Napa by 7am tomorrow. The broker is a single call that searches online + local sources, returns structured results, and logs the query for RSI.

## TypeScript types

```ts
// src/lib/resource-broker/types.ts

export type ResourceKind = 'tool' | 'equipment' | 'supply' | 'subcontractor' | 'laborer' | 'service';

export interface ResourceQuery {
  query: string;                       // free-text; the thing the user/agent wants
  kinds: ResourceKind[];               // which buckets to search
  where?: {
    lat?: number;
    lng?: number;
    address?: string;                  // "Napa, CA" or "95472"
    radiusMiles?: number;              // default 25
  };
  context?: {
    workflowId?: string;               // e.g. 'q11-supply-ordering'
    stepId?: string;                   // e.g. 's3-2'
    projectId?: string;
    budgetCeiling?: number;            // dollars
    neededBy?: string;                 // ISO date
  };
  limit?: number;                      // default 12
}

export interface ResourceResult {
  id: string;                          // stable id (hash of source + url)
  kind: ResourceKind;
  title: string;
  vendor?: string;                     // Home Depot, Craigslist, Angi, etc.
  source: 'home_depot' | 'lowes' | 'craigslist' | 'angi' | 'thumbtack' | 'yelp' | 'google_maps' | 'brave_search' | 'other';
  url: string;
  priceUsd?: number;                   // unit price if known
  priceDisplay?: string;               // "$249 / day" | "$75/hr" | etc.
  distance?: { miles: number; text: string };
  availability?: string;               // "in stock" | "available today" | "ships 2-3 days"
  rating?: { stars: number; count: number };
  imageUrl?: string;
  snippet?: string;                    // 1-2 sentence preview
  tags?: string[];                     // ['licensed','bonded','insured']
  _raw?: unknown;                      // original response for debugging
}

export interface ResourceResponse {
  query: ResourceQuery;
  results: ResourceResult[];
  totalFound: number;
  latencyMs: number;
  sources: string[];                   // which sources actually returned data
  warnings: string[];                  // eg "craigslist rate-limited, showing cached"
  runId: string;                       // for event-log correlation
}

export async function search(q: ResourceQuery): Promise<ResourceResponse>;
```

## Search strategy

1. **Normalize the query** — expand "3/4 sds-max bit" to include variants, brand synonyms.
2. **Parallel fan-out** — hit the relevant sources simultaneously based on `kinds`:
   - `tool` / `supply` → Home Depot, Lowes, Google search
   - `equipment` → United Rentals, Sunbelt, Craigslist equipment
   - `subcontractor` → Angi, Thumbtack, Google Business, Yelp
   - `laborer` → Craigslist gigs, Thumbtack, local-search
   - `service` → Yelp, Google Business
3. **Live web search fallback** — Brave Search API or equivalent generic search when specialized sources return <3 results.
4. **Merge + dedupe** — one result per (vendor, title) pair.
5. **Score + sort** — composite of: distance (if `where`), price (if `budgetCeiling`), rating, availability.

## Implementation notes for W5.A

- Live search preferred per founder decision; fall back to hardcoded-demo-data file at `src/lib/resource-broker/demo-fixtures.ts` if external calls fail (so the demo never dies).
- All requests logged to Supabase `broker_queries` table — this is part of the RSI event log.
- Every specialist prompt gains a `searchResources(query, kinds, where)` tool-use definition so AI agents in workflows can call the broker natively.
- Return value is stable JSON shape so both the React UI (W5.B) and AI agents can consume it without special-case code.

## Implementation notes for W5.B

- Render `ResourceResult[]` as a grid of result cards: image (if any) + title + vendor + price + distance + CTA ("Add to cart" / "Request quote" / "Contact").
- Empty state uses blueprint-elevation SVG + "Dispatching search..." text; animates in stroke-draw style.
- Error state uses `--redline` stroke overlay and a markup-style correction glyph.
- Every card has a "why this?" popover that shows what the AI saw in the query to surface this result — this is a trust signal for pros.
- Robin's egg ring on any result that matches user's saved vendors (verification/affirm).
- Deep orange only on the CTA button at the end of a full selection ritual (celebration), never on per-card CTAs.

## Event-log integration (W5.F)

Every `search()` call emits an event to Supabase `specialist_runs` table with `specialist_id = 'resource-broker-v1'`. Captures the query, response, and any user edits/selections made after. This is the RSI fuel.
