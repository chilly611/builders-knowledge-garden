# BKG MCP Bridge (Claude Desktop -> BKG HTTP MCP)

A tiny Node stdio bridge that lets Claude Desktop talk to the Builder's Knowledge
Garden HTTP MCP server (`/api/v1/mcp`). No deps, no transpile — pure Node built-ins.

## What it does

Claude Desktop speaks **MCP over stdio (JSON-RPC 2.0)**. BKG exposes a **single
HTTP POST endpoint** (`{ tool, parameters }`). This bridge sits in between:

- Reads JSON-RPC requests from stdin, one per line.
- For `initialize` -> returns server info & capabilities.
- For `tools/list` -> calls `GET /api/v1/mcp`, reshapes BKG's tool definitions
  into MCP's `{ name, description, inputSchema }` shape.
- For `tools/call` -> calls `POST /api/v1/mcp` with `{ tool: name, parameters: args }`,
  wraps the result as MCP `content: [{ type: "text", text: <JSON> }]`.
- Logs to stderr (Claude Desktop captures it for debugging).

## 5-step Claude Desktop setup (macOS)

1. **Copy the script:**
   ```bash
   sudo cp "/Users/chillydahlgren/Desktop/The Builder Garden/app/scripts/mcp-bridge.js" /usr/local/bin/bkg-mcp
   sudo chmod +x /usr/local/bin/bkg-mcp
   ```

2. **Open the Claude Desktop config:**
   ```bash
   open -e "$HOME/Library/Application Support/Claude/claude_desktop_config.json"
   ```
   (Create the file if it doesn't exist.)

3. **Paste this snippet** (merge with existing `mcpServers` if present):
   ```json
   {
     "mcpServers": {
       "builders-knowledge-garden": {
         "command": "node",
         "args": ["/usr/local/bin/bkg-mcp"],
         "env": {
           "BKG_API_URL": "https://builders.theknowledgegardens.com/api/v1/mcp",
           "BKG_API_KEY": ""
         }
       }
     }
   }
   ```
   Leave `BKG_API_KEY` empty for now — see **Auth model** below.

4. **Restart Claude Desktop** (full quit, cmd-Q, then reopen). The hammer icon
   in the input bar should now show `builders-knowledge-garden` with 12 tools.

5. **Smoke test in chat:** "What are the building code requirements for a
   single-family home in Marin County?" Claude should call `lookup_code` and
   come back with codes. If it doesn't auto-invoke, you can also say "use the
   builders-knowledge-garden MCP to lookup the code."

## Auth model (READ THIS)

The auth situation as of 2026-05-18:

- `src/lib/mcp-auth.ts` exists and is wired to read from a Supabase table called
  `agent_identities` (with bcrypt-hashed `api_key_hash`), check the Bearer token,
  log to `agent_audit_logs`, and rate-limit. Tokens are expected to look like
  `bkg_agent_<32-char>` (42 chars total).
- **HOWEVER:** `src/app/api/v1/mcp/route.ts` (the actual production endpoint)
  does **NOT import or call `mcp-auth.ts`**. The POST handler is **wide open** —
  no Bearer check, no rate limit, no audit log.
- And the `agent_identities` table does not exist in Supabase (verified 2026-05-19).

**For Tuesday's demo:** leave `BKG_API_KEY` empty. The bridge will skip the
`Authorization` header and the prod endpoint will accept the call. If you want
to be belt-and-suspenders, set any non-empty string — the server ignores it.

**Post-demo cleanup options:**
- Wire `validateAgentRequest()` into `route.ts` and create the `agent_identities`
  table (see `mcp-auth.ts` for the columns: `id, name, owner_user_id,
  autonomy_mode, permissions, active, api_key_hash`), OR
- Delete `mcp-auth.ts` if the public-endpoint model is intentional.

## Troubleshooting

**Test the bridge directly from a terminal:**
```bash
# initialize
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | node /usr/local/bin/bkg-mcp

# list tools
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | node /usr/local/bin/bkg-mcp

# call a tool
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_building_types","arguments":{}}}' | node /usr/local/bin/bkg-mcp
```

Or run the smoke test: `bash scripts/mcp-bridge.smoke.sh`.

**Logs:** Claude Desktop captures stderr. Look at:
```
~/Library/Logs/Claude/mcp-server-builders-knowledge-garden.log
~/Library/Logs/Claude/mcp.log
```

**Common issues:**
- "command not found: node" -> install Node (`brew install node` or use the
  full path to node in the `command` field).
- Tool not showing up -> fully quit Claude Desktop (cmd-Q), not just close window.
- 404 from server -> check `BKG_API_URL` points to `/api/v1/mcp` exactly.
- Empty `tools/list` -> check the prod server with `curl https://builders.theknowledgegardens.com/api/v1/mcp` — should return JSON with a `tools` array.

## Environment variables

| Var | Default | Purpose |
|---|---|---|
| `BKG_API_URL` | `https://builders.theknowledgegardens.com/api/v1/mcp` | BKG MCP endpoint |
| `BKG_API_KEY` | `""` | Bearer token (currently unused server-side) |
