#!/usr/bin/env node
// BKG MCP stdio<->HTTP bridge. Claude Desktop speaks JSON-RPC 2.0 over stdin/stdout.
// We translate tools/call into BKG's POST /api/v1/mcp { tool, parameters } shape.
// Node built-ins only: no deps. Run: `node mcp-bridge.js`.

const readline = require('readline');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const API_URL = process.env.BKG_API_URL || 'https://builders.theknowledgegardens.com/api/v1/mcp';
const API_KEY = process.env.BKG_API_KEY || '';

const log = (...a) => process.stderr.write('[bkg-mcp] ' + a.join(' ') + '\n');
const send = (msg) => process.stdout.write(JSON.stringify(msg) + '\n');

function httpRequest(method, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(API_URL);
    const lib = u.protocol === 'https:' ? https : http;
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (API_KEY) headers['Authorization'] = `Bearer ${API_KEY}`;
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    if (payload) headers['Content-Length'] = payload.length;
    const req = lib.request({ method, hostname: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80), path: u.pathname + u.search, headers }, (res) => {
      let chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        try { resolve({ status: res.statusCode, json: JSON.parse(text) }); }
        catch { resolve({ status: res.statusCode, json: { raw: text } }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function listTools() {
  const res = await httpRequest('GET', null);
  const tools = (res.json && res.json.tools) || [];
  return tools.map(t => ({ name: t.name, description: t.description, inputSchema: t.parameters || { type: 'object', properties: {} } }));
}

async function callTool(name, args) {
  const res = await httpRequest('POST', { tool: name, parameters: args || {} });
  if (res.status >= 400) {
    return { content: [{ type: 'text', text: `Error (${res.status}): ${JSON.stringify(res.json)}` }], isError: true };
  }
  const payload = (res.json && res.json.result !== undefined) ? res.json.result : res.json;
  return { content: [{ type: 'text', text: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2) }] };
}

async function handle(req) {
  const { id, method, params } = req;
  try {
    if (method === 'initialize') {
      return { jsonrpc: '2.0', id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'bkg-mcp-bridge', version: '0.1.0' } } };
    }
    if (method === 'notifications/initialized' || method === 'initialized') return null; // notification, no response
    if (method === 'tools/list') return { jsonrpc: '2.0', id, result: { tools: await listTools() } };
    if (method === 'tools/call') return { jsonrpc: '2.0', id, result: await callTool(params.name, params.arguments) };
    if (method === 'ping') return { jsonrpc: '2.0', id, result: {} };
    return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
  } catch (err) {
    log('handler error:', err.message);
    return { jsonrpc: '2.0', id, error: { code: -32603, message: err.message } };
  }
}

log('starting; API_URL=' + API_URL + '; auth=' + (API_KEY ? 'bearer' : 'none'));
const rl = readline.createInterface({ input: process.stdin });
let pending = 0; let closed = false;
const maybeExit = () => { if (closed && pending === 0) process.exit(0); };
rl.on('line', (line) => {
  const s = line.trim();
  if (!s) return;
  let req;
  try { req = JSON.parse(s); } catch (e) { log('bad JSON:', e.message); return; }
  pending++;
  handle(req).then((resp) => { if (resp) send(resp); }).catch((e) => log('unhandled:', e.message)).finally(() => { pending--; maybeExit(); });
});
rl.on('close', () => { closed = true; maybeExit(); });
