-- RKG (Robot Knowledge Garden) — usage metering ledger + optional API keys.
--
-- Additive + low-risk. Both tables have RLS ENABLED with NO public policies, so
-- only the service role (server-side metering writes) can read/write them — the
-- anon key used by the toxicology/orchid sites cannot touch them. Reversible:
--   DROP TABLE IF EXISTS public.mcp_usage, public.mcp_api_keys;
--
-- Powers the day-90 RKG checkpoint question: "did any agent actually call us?"
-- The app degrades gracefully if these tables are absent (see src/lib/mcp/metering.ts).

-- ── Usage ledger: one row per tools/call ────────────────────────────────────
create table if not exists public.mcp_usage (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  garden      text   not null,          -- 'bkg' | 'tkg' | ...
  tool        text   not null,          -- e.g. 'lookup_jurisdiction_requirements'
  tier        text   not null,          -- 'eval' | 'metered'
  key_id      text,                     -- 'key:<label>' (metered) or 'ip:<addr>' (eval)
  label       text,                     -- human label for the caller
  ip          text,
  ok          boolean not null default true,
  latency_ms  integer,
  units       integer not null default 1 -- billable units (per-query billing later)
);

create index if not exists mcp_usage_created_at_idx on public.mcp_usage (created_at desc);
create index if not exists mcp_usage_garden_created_idx on public.mcp_usage (garden, created_at desc);
create index if not exists mcp_usage_key_idx on public.mcp_usage (key_id);

alter table public.mcp_usage enable row level security;
-- No policies => only the service role (which bypasses RLS) can access it.

comment on table public.mcp_usage is
  'RKG MCP tool-call ledger. Service-role only. Drives usage analytics + the day-90 "did any agent call us?" checkpoint and future per-query billing.';

-- ── Optional DB-backed API keys (env keys work today; this is for scale) ─────
create table if not exists public.mcp_api_keys (
  id                  uuid primary key default gen_random_uuid(),
  label               text not null,
  key_hash            text not null,            -- bcrypt hash of the presented key
  tier                text not null default 'metered',
  active              boolean not null default true,
  rate_limit_per_hour integer not null default 1000,
  garden_scope        text[],                   -- null = all gardens
  created_at          timestamptz not null default now(),
  last_used_at        timestamptz
);

alter table public.mcp_api_keys enable row level security;
-- No policies => only the service role can manage keys.

comment on table public.mcp_api_keys is
  'RKG API keys (bcrypt-hashed). Service-role only. Not yet wired into auth.ts (env RKG_API_KEYS is the current source); reserved for DB-backed key management.';
