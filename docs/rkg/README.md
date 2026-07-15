# Robot Knowledge Garden (RKG) — agent-legible MCP layer

Read-only, cited, metered MCP endpoints over the deployed Knowledge Gardens. This is the
"moat seed": agents discover us, call cited tools, and every call is instrumented.

## Surfaces

| URL | What |
|---|---|
| `GET /api/gardens` | Live machine-readable directory of all gardens (the front door). |
| `GET /.well-known/knowledge-gardens.json` | Static mirror of the directory. |
| `GET /llms.txt`, `GET /gardens/:id/llms.txt` | Agent/human-readable docs. |
| `GET /api/mcp/:garden` | Per-garden discovery: tools, schemas, connect snippet, pricing. |
| `POST /api/mcp/:garden` | MCP JSON-RPC: `initialize`, `tools/list`, `tools/call`, `ping`. |

Gardens today: `bkg` (construction codes/permitting), `tkg` (toxicology).

## The contract (non-negotiable)

1. **Read-only.** No tool mutates corpus state.
2. **Interpreted + cited, never raw dumps.** Every `tools/call` returns
   `{ answer, verdict, citations[], coverage, disclaimer, meta }` (see `src/lib/mcp/citations.ts`).
3. **Honest misses.** Out-of-corpus → `coverage.covered=false`; absence is never a safety/
   compliance assurance.
4. **Metered.** Every call lands in `mcp_usage` (best-effort; never blocks a call).

## Code map (`src/lib/mcp/`)

- `registry.ts` — single source of truth: gardens, tool defs/schemas, pricing, base URL.
- `jsonrpc.ts` — dependency-free MCP-over-HTTP handler.
- `citations.ts` — interpreted+cited answer envelope + Three-Source verdict tiers.
- `auth.ts` — caller resolution (eval vs metered) + in-memory rate limit.
- `metering.ts` — `mcp_usage` ledger writes + x402/AP2 billing headers.
- `gardens/bkg.ts` — wraps `lib/compliance-lookup` (`lookupCodeCitations`).
- `gardens/tkg.ts` — queries the toxicology tables on the shared Supabase.
- `gardens/index.ts` — garden id → executor map.

Routes: `src/app/api/mcp/[garden]/route.ts`, `src/app/api/gardens/route.ts`.

## Env

| Var | Purpose | Default |
|---|---|---|
| `RKG_API_KEYS` | `key:label,key2:label2` → metered tier | _(none → eval only)_ |
| `MCP_API_KEY` | legacy single shared secret (honored as one metered key) | _(none)_ |
| `RKG_PUBLIC_BASE_URL` | absolute base for directory/llms links | `https://builders.theknowledgegardens.com` |

Supabase config (`NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) is the
existing app config; `tkg` reads toxicology tables via the anon client, metering writes via the
service client. The layer degrades gracefully without them.

## Add a garden

1. Add a `GardenDef` (with tool defs) to `GARDENS` in `registry.ts`.
2. Add `gardens/<id>.ts` exporting an executor map; register it in `gardens/index.ts`.
3. Add `public/gardens/<id>/llms.txt` and an entry in `public/.well-known/knowledge-gardens.json`.

`/api/mcp/<id>` and the directory pick it up automatically.

## Quick test

```bash
# discovery
curl -s localhost:3000/api/mcp/bkg | jq '.tools[].name'
# tools/list
curl -s localhost:3000/api/mcp/bkg -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq '.result.tools[].name'
# tools/call (cited answer)
curl -s localhost:3000/api/mcp/tkg -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"is_substance_restricted","arguments":{"substance":"Arsenic"}}}' \
  | jq '.result.structuredContent | {verdict, citations: (.citations|length)}'
```

See `docs/rkg/agent-commerce-readiness.md` for the payment-rail plan (x402, AP2, Visa, Mastercard).
