#!/usr/bin/env bash
# Smoke test for mcp-bridge.js — pipes 3 MCP requests through the bridge and
# checks that each round-trips against the prod BKG MCP server.
# Usage: bash scripts/mcp-bridge.smoke.sh

set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRIDGE="$SCRIPT_DIR/mcp-bridge.js"
export BKG_API_URL="${BKG_API_URL:-https://builders.theknowledgegardens.com/api/v1/mcp}"

pass=0
fail=0

run_case() {
  local label="$1"
  local req="$2"
  local needle="$3"
  local out
  out=$(printf '%s\n' "$req" | node "$BRIDGE" 2>/dev/null)
  if printf '%s' "$out" | grep -q "$needle"; then
    echo "PASS  $label"
    pass=$((pass + 1))
  else
    echo "FAIL  $label"
    echo "  request:  $req"
    echo "  response: $out"
    fail=$((fail + 1))
  fi
}

echo "Smoke test against: $BKG_API_URL"
echo "Bridge: $BRIDGE"
echo

run_case "initialize" \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
  '"protocolVersion"'

run_case "tools/list returns tools" \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  '"lookup_code"'

run_case "tools/call list_building_types" \
  '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_building_types","arguments":{}}}' \
  '"content"'

echo
echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ] || exit 1
