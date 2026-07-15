# Agent-to-Agent Commerce Readiness — Robot Knowledge Garden

_Design note · CODE-4 "Seed the Robot Knowledge Garden" · 2026-06-11_

## Why this note exists

We just stood up the first agent-legible layer over the deployed gardens: each garden
is a read-only **MCP endpoint** returning interpreted, cited answers, gated by an API key
with a free eval tier, and **metered** on every call. That metering is not bookkeeping for
its own sake — it is the seam where agent-to-agent payment rails plug in. This note records
which rails exist, where ours connects, and what's already done vs. deferred. The posture is
deliberately **"metered, not enforced"**: we instrument and price now, charge later, so the
moat compounds (usage data + discoverability) at near-zero cost.

## What's already built (the substrate)

| Capability | Where | Status |
|---|---|---|
| Per-garden MCP endpoints | `/api/mcp/:garden` (Streamable HTTP) | ✅ live |
| Agent-discoverable directory | `/api/gardens`, `/.well-known/knowledge-gardens.json`, `/llms.txt` | ✅ live |
| API-key gating + free eval tier | `src/lib/mcp/auth.ts` | ✅ live |
| Usage ledger (per call) | `mcp_usage` table + `src/lib/mcp/metering.ts` | ✅ live |
| Price/metering discovery headers | `X-RKG-Unit-Price-USD`, `X-RKG-Payment-Rails`, `X-RKG-Tier` | ✅ live |
| Billable `units` per call | `mcp_usage.units` (default 1; heavier tools can charge more) | ✅ schema ready |
| Payment **enforcement** (402 / mandates) | — | ⏳ deferred (this note) |

Crucially, **the tool contract does not change when payment turns on.** A paying agent and
an eval agent call the same `tools/call`; only the gate in front of it changes.

## The rails landscape (early 2026)

Four credible agent-payment rails are converging. They are not mutually exclusive — they
operate at different layers (settlement network vs. protocol vs. credential).

### 1. Coinbase x402 — _best fit for per-query API billing_
Revives the dormant **HTTP 402 Payment Required** status as a real payment loop: a server
answers a request with `402` + machine-readable payment requirements (amount, asset, pay-to,
facilitator); the client pays (typically **USDC** on an L2 such as Base) and retries with a
payment proof header; the server verifies and serves. It is HTTP-native, requires no account
or human in the loop, and is built for exactly our shape — small, frequent, per-call API
charges. **Anthropic is a member of the x402 Foundation** (with Coinbase, Cloudflare, and
others), and MCP-over-HTTP is a natural carrier for it. This is our **primary** rail.

### 2. Google AP2 (Agent Payments Protocol) — _mandates for higher-value / delegated buys_
An open protocol for payments **initiated by agents on a user's behalf**, anchored on
cryptographically signed **mandates** — an _intent mandate_ ("you may buy X under these
limits") and a _cart mandate_ (the specific approved purchase). It is payment-method agnostic
(cards, bank transfers, and stablecoins via the **A2A-x402 extension**), giving a verifiable,
auditable chain of authorization. Best fit when an agent buys a **bundle** on behalf of a
human/business (e.g. "permit checklist + contractor match"), where we need proof the agent
was authorized for that spend.

### 3. Visa Intelligent Commerce — _card-rail settlement for agent buyers_
Visa's program issues **agent-specific tokenized credentials** so an AI agent can transact on
a real Visa account under cardholder-set controls (limits, merchant rules), with Visa handling
tokenization and dispute/fraud rails. Relevant when the buyer is a **consumer-facing assistant
with a funded card** rather than a headless service agent.

### 4. Mastercard Agent Pay — _agentic tokens on the Mastercard network_
Mastercard's agentic-commerce program extends its tokenization (building on prior agentic-token
work) so agents can pay across the Mastercard network with programmable controls and
network-level trust. Same buyer profile as Visa IC; we stay rail-agnostic so a buyer's existing
network is honored.

## How RKG connects to each rail

```
agent → GET /api/mcp/:garden            (discovers tools + price headers)
      → POST tools/call                 (eval tier: served free, metered)
      → POST tools/call (over quota)     →  402 Payment Required {price, asset, pay-to}   [x402]
      → pays (USDC) + retries w/ proof   →  verified → served → mcp_usage.units billed
```

- **x402 (per-query):** when a caller is over the free quota (or calls a premium tool), return
  `402` with payment requirements derived from `RKG_PRICING.metered.indicative_unit_price_usd ×
  units`. The price is already advertised in `X-RKG-Unit-Price-USD`; `mcp_usage` already records
  `units`. Implementation = a payment-verify middleware in front of `tools/call` + a facilitator
  client. **No tool code changes.**
- **AP2 (delegated / bundled):** accept a signed cart mandate on a new
  `/api/mcp/:garden` premium path or a `purchase` meta-tool; verify the mandate; settle the
  underlying charge via card or x402; log the mandate id alongside `mcp_usage`.
- **Visa IC / Mastercard Agent Pay:** card-rail settlement adapters behind the same metered
  gate; selected by the credential the buyer presents. These are settlement back-ends for the
  same 402/mandate front-end, not a separate integration surface for the agent.

The design principle: **one metered gate, pluggable settlement.** x402 first (machine-native,
zero onboarding), mandates and card rails as buyer profiles demand them.

## What we are NOT doing yet (and why)

- **No charging.** Enforcement is off so discovery and trial stay frictionless while we learn
  whether agents call us at all. Turning it on is a middleware + facilitator config, not a
  rebuild.
- **No custody / wallet.** x402 settles to a facilitator; we hold no keys in this layer.
- **No KYC/AML surface.** Deferred until real settlement; stablecoin facilitators carry most of it.

## Open questions before enforcement

1. **Pricing model** — flat per-call, or `units`-weighted by tool cost (e.g. an interpreted
   checklist > a single citation lookup)? Schema supports weighting; policy is undecided.
2. **Idempotency & retries** — a paid `tools/call` that times out must not double-charge; needs
   an idempotency key in the payment proof ↔ `mcp_usage` join.
3. **Refunds / failed answers** — when a tool returns `coverage.covered=false`, is it billable?
   Proposal: **uncovered answers are free** (we charge for cited answers, not for "no").
4. **Free-tier abuse** — in-memory IP limits are per-instance; durable, key-scoped quotas move
   into `mcp_usage` when billing turns on.

## Day-90 RKG checkpoint — what the ledger lets us answer

The `mcp_usage` table is the instrument for the day-90 question — _did any agent actually call
us?_ It answers, per garden / tool / tier / caller:

- total calls, unique callers, eval-vs-metered split, success rate, latency;
- which **tools** get pulled (demand signal for what to deepen next);
- which **callers** are non-trivial (candidates to convert to the metered tier);
- whether discovery (`/api/gardens`, `/.well-known`, `/llms.txt`) converts to calls.

If the answer at day 90 is "yes, agents call us," enforcement + a real rail (x402 first) is the
next increment — and the moat (cited knowledge + usage data + discoverability) is already seeded.
```sql
-- day-90 snapshot
select garden, tool, tier, count(*) calls, count(distinct key_id) callers,
       round(avg(latency_ms)) avg_ms, sum((not ok)::int) errors
from public.mcp_usage
group by garden, tool, tier
order by calls desc;
```
