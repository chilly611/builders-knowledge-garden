# A9 — MCP Server Audit

## Surface

`/api/v1/mcp` exposes **12 tools**:

1. `lookup_code` — Search building codes by jurisdiction + building type
2. `search_knowledge` — Full-text search across 40K+ knowledge entities
3. `get_material` — Material specs, compliance, costs by type + jurisdiction
4. `get_safety` — Hazards, PPE, regulations for construction tasks
5. `estimate_cost` — Estimates by CSI MasterFormat division
6. `get_permits` — Required permits + timelines by jurisdiction + type
7. `generate_schedule` — Constraint-aware schedules with critical path
8. `get_team` — Recommended team composition + roles for building type
9. `list_building_types` — All 12 supported types (SFR, datacenter, hospital, school, etc.)
10. `list_jurisdictions` — 142+ jurisdictions (post-2026-05-18 expansion)
11. `crm_list_contacts` — Pipeline contacts with stage + temperature filters
12. `crm_pipeline_stats` — Deal count by stage + total value

## Auth model

Bearer token via `Authorization` header. Format: `Bearer bkg_agent_<key>` (42 chars).

Implementation in `app/src/lib/mcp-auth.ts`:
- Tokens bcrypt-hashed in `agent_identities` table
- Constant-time comparison (timing-attack safe)
- Missing/invalid token → 401
- Rate limit: 1,000 calls/hour default
- Exceeding limit → 429 + reset timestamp

**Token generation UI:** not yet exposed. Currently must be created directly in Supabase via the agent registration flow (`auth-server.ts`). For Wednesday: pre-seed a demo key into `agent_identities.api_key_hash`.

## Transport: HTTP only

POST to `https://builders.theknowledgegardens.com/api/v1/mcp` with JSON body:
```json
{ "tool": "search_knowledge", "parameters": { "query": "Marin energy code" } }
```

**Critical: Claude Desktop's native pattern is stdio (`command:` in `~/Library/Application Support/Claude/claude_desktop_config.json`), not HTTP.** Three options for Act 4:

1. **stdio-to-HTTP bridge.** Build a ~30-LOC Node script that reads MCP requests from stdin, POSTs to the prod endpoint, writes results to stdout. Then Claude Desktop config:
   ```json
   {
     "mcpServers": {
       "bkg": {
         "command": "/usr/local/bin/bkg-mcp",
         "env": {
           "BKG_API_URL": "https://builders.theknowledgegardens.com/api/v1/mcp",
           "BKG_API_KEY": "bkg_agent_xxxxxxxxxxxxxxxxxxxxx"
         }
       }
     }
   }
   ```
2. **Direct HTTP `url:` field.** Non-standard for Claude Desktop; requires custom client.
3. **Pre-baked screenshot.** Fall back narration: "Claude itself is getting this knowledge next week — here's what it returns."

## Latency

- With Supabase configured: ~150-300 ms for `search_knowledge` (FTS on now ~580 knowledge_entities rows post-2026-05-18 expansion, ordered by `updated_at`, limit 10).
- Fallback (no Supabase): <10 ms (returns hardcoded mock results).
- Streaming: marked "future" in `route.ts:7`. Not implemented; POST returns full result synchronously.

**Recent seed (2026-05-18 PM):** 11 Marin-tagged codes + 16 cross-jurisdiction codes (data center, skyscraper, hospital, school, residential reno, accessibility, desert). Immediately searchable via `search_knowledge` with query "Marin energy code requirements".

**Caching hints:** none at route level. For sub-200 ms at scale, add Vercel edge cache (Cache-Control on GET, keyed by agent + query).

## Connect Claude Desktop — shortest path

1. **Build the stdio bridge.** ~30 LOC Node script (Michael's Tuesday morning task):
   ```js
   #!/usr/bin/env node
   // reads MCP JSON from stdin, POSTs to BKG_API_URL with Bearer BKG_API_KEY, writes response to stdout
   ```
2. Save to `/usr/local/bin/bkg-mcp` (chmod +x)
3. Generate a demo API key: insert a row into `agent_identities` with `api_key_hash = bcrypt('bkg_agent_demo_xxx')`
4. Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac) with the bridge config
5. Restart Claude Desktop
6. Ask "What are the Marin County energy code requirements?" — should return `title-24-pt6-marin-energy` + `title-24-110-10-marin-solar` from the seeded `knowledge_entities` rows

## Readiness checklist

- [x] GET /api/v1/mcp discoverable; returns full schema
- [x] POST execution working with mock fallback
- [x] Auth layer enforced
- [x] Knowledge entities seeded + searchable for Marin/SF/Phoenix/LV
- [x] Latency acceptable for demo (assuming Supabase env vars present)
- [ ] stdio bridge built and tested on Chilly's demo MacBook (Tuesday)
- [ ] Demo API key seeded into `agent_identities` (Tuesday)

**Critical unknown:** Is `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` configured on the production Vercel deployment? If not, all searches return mocks. Verify before Wednesday.
