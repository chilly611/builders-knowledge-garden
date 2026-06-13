# Runbook — flip UpCodes to verified live code text (`UPCODES_API_KEY`)

*LOOP 2 / Slice A deliverable (2026-06-12). Founder env action — the agent
does not set shared-prod secrets. No code change is needed to flip; the adapter
already runs in two modes and switches on the presence of the key.*

## What the flip does

The code-sources adapter (`src/lib/code-sources/upcodes.ts`) is already wired
for both modes and switches automatically on `UPCODES_API_KEY`:

| | No key (today — **preview**) | Key set (**live**) |
|---|---|---|
| `verified` | `false` | `true` (real publisher text retrieved) |
| `confidenceTier` | `summary` | `primary` |
| Result `text` | "Citation only — click through to UpCodes…" | the actual section body (full, or first-paragraph on the free tier) |
| Counts toward `countVerifiedSources()` | No | Yes (+1 verified source → can bump the SourceCountBadge from 1→2) |
| On any fetch/parse failure | n/a | **falls back to citation-only** (never fabricates) |

So flipping the key turns ICC I-code sections (NEC/IBC/IPC/IMC/IFC) from
"here's a link, go read it yourself" into verified, in-product code text —
the cheapest path to a trustworthy compliance answer.

## The cost ruling (founder, 2026-06-12)

**UpCodes now, ICC/NFPA enterprise when revenue justifies it.** UpCodes
publishes a public REST API with public pricing (~$10k+/yr commercial tier;
free preview tier returns metadata + first paragraph). ICC DigitalCodes and
NFPA Link require mid-five-to-six-figure enterprise contracts and a sales
motion. The `icc.ts` / `nfpa.ts` adapters are already wired the same two-mode
way and stay in citation-only until that revenue exists.

## Steps (founder)

1. **Get the key** — UpCodes API plan at https://up.codes/about/api. The free
   preview tier already returns enough to set the key and see `verified: true`
   on sections with a non-empty preview body; the commercial tier unlocks full
   body text + higher rate limits.
2. **Set it in Vercel** (shared-prod env — supervised): Project
   `builders-knowledge-garden` → Settings → Environment Variables →
   `UPCODES_API_KEY` = the key. Add for Production (and Preview if you want PR
   deploys to verify too). *Optional:* `UPCODES_API_BASE_URL` only if the
   contracted base path differs from the documented `https://api.up.codes/v1`.
3. **Redeploy** so the env var is picked up.
4. **Verify the flip:**
   - `GET /api/v1/healthcheck?detailed=1` → the code-sources / UpCodes check
     should report the key present.
   - Run a known section (e.g. NEC 210.52 receptacle spacing) through the
     compliance/specialist surface → the UpCodes result should now read
     `verified: true`, `confidenceTier: "primary"`, and carry real body text
     rather than the "Citation only — click through" placeholder.
5. **Rate/cost watch:** the adapter caches via `withCache("upcodes", …)` and
   retries with backoff (3 tries). If you hit the free-tier ceiling, that's the
   signal to move to the commercial tier — not to widen the call volume.

## Guardrails respected

- No secret is set by the agent; this is a founder env action on shared prod.
- No code change required — the two-mode adapter + citation-only fallback
  already ship. If UpCodes returns nothing or malformed data, the result
  degrades to citation-only (`verified: false`); it never fabricates code text.
- Honesty: a `verified: true` UpCodes result still flows through the same
  trust surfaces (`countVerifiedSources` / SourceCountBadge) — it is one
  corroborating source, not an automatic green light on its own.
