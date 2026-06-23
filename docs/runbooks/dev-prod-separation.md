# Dev / Prod Separation Runbook

**Goal:** dev work can never read or write the production database. Two layers enforce it: **env** (dev
points at a different project) and **code** (a boot-time guard refuses a non-prod runtime aimed at prod).

## The problem we're fixing

Today there is no separation: `.env.local` and Vercel all read the same Supabase project
(`vlezoyalutexenbnzzui`), which holds 16 real users and the pilot data. A local `npm run dev` can mutate
prod. That is the footgun this closes.

## The code guard (in this PR, already active)

- `src/lib/db-env-guard.ts` + `src/instrumentation.ts` run once at server boot.
- **Hard rule:** if `VERCEL_ENV !== 'production'` (i.e. local dev, Preview, or test) **and** the Supabase
  URL resolves to a production project ref, the server **throws and refuses to boot**.
- Config:
  - `PROD_SUPABASE_PROJECT_REFS` — comma-separated prod refs (default `vlezoyalutexenbnzzui`). **After the
    dedicated-prod cutover, list BOTH the new prod ref and the old shared ref** so dev can reach neither.
  - `DISABLE_DB_ENV_GUARD=1` — escape hatch for a deliberate, supervised prod session.
  - `STRICT_DB_ENV_GUARD=1` — also fail if a *prod* runtime points at a non-prod project.

## Setting up the dev project (founder)

You have a stale, unused `builders-knowledge-garden` project (`gtmjcslcerakkgftozfy`, 0 users) — repurpose
it as **dev/staging**, or create a fresh `bkg-dev` ($10/mo).

1. **Schema, not customer data.** Load the prod *schema* + the Marin demo seed into dev — never real user
   rows (privacy + safety). Easiest: a schema-only dump.
   ```bash
   pg_dump "$PROD_DB_URL" --schema-only --no-owner --no-acl \
     --exclude-schema='realtime' --exclude-schema='vault' --exclude-schema='pgsodium' \
     --exclude-schema='cron' --exclude-schema='supabase_functions' --exclude-schema='net' \
     -f /tmp/bkg-schema.sql
   psql "$DEV_DB_URL" -f /tmp/bkg-schema.sql
   # then seed only the Marin demo rows (see scripts/ seeders), no real auth.users.
   ```
2. **Point dev at it.** In `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://gtmjcslcerakkgftozfy.supabase.co   # dev ref, NOT prod
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<dev anon key>
   SUPABASE_SERVICE_ROLE_KEY=<dev service role>
   ```
3. **Point Vercel Preview/Development** env at the dev project too (so PR preview deploys never touch prod).
   Keep Vercel **Production** env on the real prod project only.
4. `npm run dev` — if you forget and leave a prod URL in `.env.local`, the guard stops the boot with a
   pointer to this file. That's working as intended.

## Verifying separation

- `npm run dev` with a prod URL in `.env.local` → boot **fails** with `[db-env-guard] BLOCKED`. ✅
- `npm run dev` with the dev URL → boots normally; writes land in dev. ✅
- Open dev app, create a junk project, confirm it does **not** appear in prod. ✅
