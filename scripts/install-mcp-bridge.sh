#!/usr/bin/env bash
# BKG MCP Bridge installer for Claude Desktop on macOS.
#
# Cowork can't write directly to ~/Library/Application Support/Claude/ (system
# directory — application-internal), so this script does the install on
# Chilly's behalf when he runs it in Terminal.
#
# Usage (one command, no sudo needed):
#   bash "/Users/chillydahlgren/Desktop/The Builder Garden/app/scripts/install-mcp-bridge.sh"
#
# What it does:
#   1. Locates `node` (Homebrew /opt/homebrew/bin/node, /usr/local/bin/node, or PATH).
#   2. Ensures ~/Library/Application Support/Claude/ exists.
#   3. Reads any existing claude_desktop_config.json, merges in the
#      builders-knowledge-garden MCP server entry (preserving other MCP
#      servers if any), writes it back atomically.
#   4. Points the entry directly at the bridge script in the workspace folder
#      so future git pulls auto-update the bridge — NO copy to /usr/local/bin
#      needed, NO sudo.
#   5. Runs the smoke test against prod to confirm the bridge talks.
#   6. Prints next steps (cmd-Q + reopen Claude Desktop, suggested test prompt).
#
# Idempotent: safe to re-run. Doesn't overwrite other MCP servers.

set -euo pipefail

BRIDGE_DIR="/Users/chillydahlgren/Desktop/The Builder Garden/app/scripts"
BRIDGE_SCRIPT="${BRIDGE_DIR}/mcp-bridge.js"
SMOKE_SCRIPT="${BRIDGE_DIR}/mcp-bridge.smoke.sh"
CLAUDE_CONFIG_DIR="${HOME}/Library/Application Support/Claude"
CLAUDE_CONFIG="${CLAUDE_CONFIG_DIR}/claude_desktop_config.json"

C_RESET=$'\033[0m'
C_BOLD=$'\033[1m'
C_GREEN=$'\033[32m'
C_YELLOW=$'\033[33m'
C_RED=$'\033[31m'
C_DIM=$'\033[2m'

ok()   { printf "%s✓%s %s\n" "${C_GREEN}" "${C_RESET}" "$*"; }
warn() { printf "%s⚠%s %s\n" "${C_YELLOW}" "${C_RESET}" "$*"; }
err()  { printf "%s✗%s %s\n" "${C_RED}" "${C_RESET}" "$*" 1>&2; }
hdr()  { printf "\n%s%s%s\n" "${C_BOLD}" "$*" "${C_RESET}"; }

hdr "BKG MCP Bridge installer"

# ───────────────────────────────────────────────────────────────────────────
# 1. Sanity check the bridge script
# ───────────────────────────────────────────────────────────────────────────
if [[ ! -f "${BRIDGE_SCRIPT}" ]]; then
  err "Bridge script not found at: ${BRIDGE_SCRIPT}"
  err "Did you 'git pull origin main' in the app folder first?"
  exit 1
fi
ok "Bridge script found: ${BRIDGE_SCRIPT}"

# ───────────────────────────────────────────────────────────────────────────
# 2. Locate node
# ───────────────────────────────────────────────────────────────────────────
NODE_BIN=""
for candidate in /opt/homebrew/bin/node /usr/local/bin/node "$(command -v node 2>/dev/null || true)"; do
  if [[ -n "${candidate}" && -x "${candidate}" ]]; then
    NODE_BIN="${candidate}"
    break
  fi
done

if [[ -z "${NODE_BIN}" ]]; then
  err "Could not find 'node' on this Mac."
  err "Install Node (brew install node OR https://nodejs.org), then re-run."
  exit 1
fi
NODE_VERSION="$("${NODE_BIN}" --version)"
ok "Node found: ${NODE_BIN} (${NODE_VERSION})"

# ───────────────────────────────────────────────────────────────────────────
# 3. Ensure Claude config dir exists
# ───────────────────────────────────────────────────────────────────────────
if [[ ! -d "${CLAUDE_CONFIG_DIR}" ]]; then
  mkdir -p "${CLAUDE_CONFIG_DIR}"
  ok "Created Claude config dir: ${CLAUDE_CONFIG_DIR}"
else
  ok "Claude config dir exists: ${CLAUDE_CONFIG_DIR}"
fi

# ───────────────────────────────────────────────────────────────────────────
# 4. Backup any existing config, then merge
# ───────────────────────────────────────────────────────────────────────────
if [[ -f "${CLAUDE_CONFIG}" ]]; then
  BACKUP="${CLAUDE_CONFIG}.bak.$(date +%s)"
  cp "${CLAUDE_CONFIG}" "${BACKUP}"
  ok "Backed up existing config to: ${BACKUP}"
fi

# Merge via Node — preserves any existing mcpServers entries.
"${NODE_BIN}" <<EOF
const fs = require('fs');
const path = "${CLAUDE_CONFIG}";

let cfg = {};
if (fs.existsSync(path)) {
  try {
    cfg = JSON.parse(fs.readFileSync(path, 'utf-8'));
  } catch (e) {
    console.error("[installer] existing config is not valid JSON — starting fresh. Backup saved.");
    cfg = {};
  }
}

cfg.mcpServers = cfg.mcpServers || {};
cfg.mcpServers['builders-knowledge-garden'] = {
  command: "${NODE_BIN}",
  args: ["${BRIDGE_SCRIPT}"],
  env: {
    BKG_API_URL: "https://builders.theknowledgegardens.com/api/v1/mcp",
    BKG_API_KEY: ""
  }
};

fs.writeFileSync(path, JSON.stringify(cfg, null, 2) + "\n");
console.log("[installer] wrote merged config");
EOF
ok "Wrote merged config: ${CLAUDE_CONFIG}"
echo "  ${C_DIM}entry name: builders-knowledge-garden${C_RESET}"
echo "  ${C_DIM}command:    ${NODE_BIN}${C_RESET}"
echo "  ${C_DIM}args:       ${BRIDGE_SCRIPT}${C_RESET}"

# ───────────────────────────────────────────────────────────────────────────
# 5. Smoke test the bridge against prod
# ───────────────────────────────────────────────────────────────────────────
hdr "Smoke test"
if [[ -x "${SMOKE_SCRIPT}" ]]; then
  if BKG_API_URL="https://builders.theknowledgegardens.com/api/v1/mcp" BKG_API_KEY="" bash "${SMOKE_SCRIPT}" >/tmp/bkg-mcp-smoke.log 2>&1; then
    ok "Smoke test PASS (full log: /tmp/bkg-mcp-smoke.log)"
  else
    warn "Smoke test FAILED — log:"
    tail -25 /tmp/bkg-mcp-smoke.log
    warn "The bridge is configured, but its self-test didn't return what it expected."
    warn "You can still try in Claude Desktop — the smoke test is just a sanity probe."
  fi
else
  warn "Smoke test script not found or not executable: ${SMOKE_SCRIPT}"
  warn "Run 'chmod +x ${SMOKE_SCRIPT}' if you want to test it directly."
fi

# ───────────────────────────────────────────────────────────────────────────
# 6. Next steps
# ───────────────────────────────────────────────────────────────────────────
hdr "Next steps"
echo "1. ${C_BOLD}Quit Claude Desktop${C_RESET} fully — cmd-Q (closing the window isn't enough)."
echo "2. ${C_BOLD}Reopen Claude Desktop${C_RESET}."
echo "3. In a new chat, click the ${C_BOLD}🔨 hammer icon${C_RESET} in the input bar."
echo "   You should see ${C_BOLD}builders-knowledge-garden${C_RESET} listed with 12 tools."
echo "4. Test it: ask Claude:"
echo "     ${C_DIM}\"What are the building code requirements for a single-family home in Marin County?\"${C_RESET}"
echo "   Claude should call ${C_BOLD}lookup_code${C_RESET} and return seeded Marin codes."
echo
echo "If anything looks off, tail the Claude Desktop log:"
echo "   ${C_DIM}tail -f \"\$HOME/Library/Logs/Claude/mcp-server-builders-knowledge-garden.log\"${C_RESET}"
echo
ok "Install complete."
