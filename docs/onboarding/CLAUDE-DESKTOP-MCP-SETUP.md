# Claude Desktop ↔ BKG MCP setup

Connects Claude Desktop to the Builder's Knowledge Garden MCP server so any chat with Claude can query construction codes, materials, safety, estimates, and CRM data live from `https://builders.theknowledgegardens.com/api/v1/mcp`.

There are two install paths:

1. **Happy path: `.mcpb` extension** — one download, one double-click. See `https://builders.theknowledgegardens.com/install-mcp`.
2. **Fallback: manual config** — for older Claude Desktop builds, corporate-managed Macs that block extension installs, or when you want to edit the source. Documented below.

---

## Fallback: manual config

### 1. Clone the repo (if you haven't already)

```bash
cd ~/Desktop
git clone https://github.com/chilly611/builders-knowledge-garden.git
```

### 2. Locate the bridge script's absolute path

```bash
cd ~/Desktop/builders-knowledge-garden
echo "$PWD/scripts/mcp-bridge.js"
```

Copy that path — you'll paste it into the config in step 3.

### 3. Edit `claude_desktop_config.json`

Open `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows). If the file doesn't exist, create it.

Merge this block into the top-level object (if `mcpServers` already exists, add the `builders-knowledge-garden` key to it):

```json
{
  "mcpServers": {
    "builders-knowledge-garden": {
      "command": "node",
      "args": ["PASTE_ABSOLUTE_PATH_FROM_STEP_2_HERE"],
      "env": {
        "BKG_API_URL": "https://builders.theknowledgegardens.com/api/v1/mcp"
      }
    }
  }
}
```

Replace `PASTE_ABSOLUTE_PATH_FROM_STEP_2_HERE` with the path you copied. It must be absolute — `~` and relative paths do not work.

### 4. Restart Claude Desktop

Fully quit (Cmd-Q) and reopen. MCP servers only load at startup.

### 5. Verify

In a new chat, the tools icon (wrench) should show `builders-knowledge-garden` with 12 tools listed. Ask:

> What are the Marin County energy code requirements I need to plan for?

Claude should invoke the `search_knowledge` tool and return Title 24 §110.10 (solar), CRC R301 (wind/seismic), CalGreen, and other Marin-tagged entries.

---

## Local development (optional)

To point the bridge at a local `pnpm dev` server instead of prod, change the env in the config:

```json
"env": { "BKG_API_URL": "http://localhost:3000/api/v1/mcp" }
```

Restart Claude Desktop. `pnpm dev` must be running.

---

## Manual smoke test (no Claude Desktop needed)

To verify the bridge works without Claude Desktop in the loop:

```bash
cd ~/Desktop/builders-knowledge-garden
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  | node scripts/mcp-bridge.js
```

Expect two JSON-RPC frames on stdout. The second has a `result.tools` array of 12 tools.

Then call a tool:

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_knowledge","arguments":{"query":"Marin energy code","limit":5}}}' \
  | node scripts/mcp-bridge.js
```

Expect a `result.content[0].text` payload with Marin code entries.

---

## Failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| Wrench icon doesn't appear in Claude Desktop | Config JSON malformed | `python3 -m json.tool < ~/Library/Application\ Support/Claude/claude_desktop_config.json` to validate |
| Wrench icon appears but BKG isn't listed | `args[0]` path is wrong or not absolute | Re-run step 2 of the manual setup; paste the exact `$PWD/...` output |
| Tools listed but tool call hangs forever | No network to prod | Curl `https://builders.theknowledgegardens.com/api/v1/mcp` and confirm a 200 |
| Tool call returns "BKG MCP error 5xx" | Prod is down | Check Vercel; narrate around the closer in the live demo per `DEMO-MAY20-PLAN.md` |
| `.mcpb` won't install (Happy Path 1) | Claude Desktop too old | Update Claude Desktop, or use the manual config fallback above |

---

## What's inside the bridge

`scripts/mcp-bridge.js` is a ~70-line Node script that translates JSON-RPC-over-stdio (what Claude Desktop speaks) ↔ the BKG REST shape (what `/api/v1/mcp` speaks). It handles `initialize`, `tools/list`, and `tools/call`. No dependencies. Node 22 stdlib only.

`mcp-bridge/manifest.json` is the MCPB v0.3 manifest that Claude Desktop reads when installing the `.mcpb` bundle.

The same script powers both install paths — the only difference is who launches it (Claude Desktop's extension loader vs. an entry in `claude_desktop_config.json`).
