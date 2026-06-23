# Pilot Data-Safety Checklist — for 2026-06-27

**Goal:** make BKG data safe to run a real contractor's project on. Today is **2026-06-23** (4 days out).

## What this branch already delivers (built + verified — no prod touched)

- ✅ **Backup tooling** → Cloudflare R2: `scripts/backup/pg-backup.sh`, `pg-restore.sh`, `_common.sh`.
- ✅ **Restore self-test PASSED** (PostgreSQL 17.10, sha256-verified round-trip preserving the Marin
  $1.65M reconciliation) — `scripts/backup/selftest.sh`.
- ✅ **Nightly backup + nightly restore-verification** workflow: `.github/workflows/nightly-backup.yml`.
- ✅ **Dev/prod code guard**: `src/lib/db-env-guard.ts` + `src/instrumentation.ts` — a non-prod runtime
  pointed at prod refuses to boot.
- ✅ **Gated deploy pipeline**: `.github/workflows/ci.yml` + `deploy.yml` (PR→preview, main→protected prod).
- ✅ **Runbooks** for restore, PITR, dev/prod split, prod migration, deploy, 2FA.

## What only you can do — in this order

> Steps **1–5 make the pilot safe** and are low-risk. Step **6** (dedicated-prod migration) is the bigger,
> riskier move; it is gated on a green dry-run and should **not** block the pilot.

### ① TODAY — unblock the dashboard → [2fa-recovery.md](./2fa-recovery.md)
Recovery turnaround can exceed 4 days. Start the 2FA reset now, in parallel with everything else. PITR's
clean path and Vercel/Supabase UI all depend on it.

### ② Get backups LIVE (the #1 pilot-safety item) → [restore.md](./restore.md)
1. Create a Cloudflare **R2 bucket** (`bkg-backups`) + an API token (S3-compatible).
2. Add GitHub Actions secrets: `PROD_SUPABASE_DB_URL` (direct 5432 conn string of prod), `BACKUP_DEST`
   (`s3://bkg-backups/prod`), `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.
3. **Run `Nightly DB Backup` manually** (Actions → workflow_dispatch). Confirm: a `bkg-prod-*.dump` lands
   in R2 **and** the `verify-restore` job goes green. → off-box, restorable backups exist. ✅

### ③ Enable PITR on prod → [pitr.md](./pitr.md)
~$100/mo. Note: bills on the shared project until step 6; plan to move it to the new project at cutover.

### ④ Isolate dev from prod → [dev-prod-separation.md](./dev-prod-separation.md)
Stand up a dev project (repurpose the empty `gtmjcslcerakkgftozfy` or a fresh `bkg-dev`), load **schema +
Marin demo only** (no real user rows), point `.env.local` + Vercel **Preview** at it. The guard then fences
dev from prod automatically.

### ⑤ Turn on deploy gating → [deploy-pipeline.md](./deploy-pipeline.md)
Set `VERCEL_*` + `STAGING_*` secrets, create the `production` environment with a required reviewer, enable
`main` branch protection, and **disconnect Vercel native Git auto-deploy** (or pick it as the sole path).

### ⑥ Dedicated-prod migration → [prod-migration.md](./prod-migration.md)
Stand up `bkg-prod` ($10/mo), build the FK-closed BKG table allowlist, **dry-run** the slice into it, and
verify the loop on a Preview deploy. Cut over (a reversible Vercel env flip) **only after the dry-run is
green** — recommended as a supervised window, ideally just after the pilot. The shared project is only read
during this, so rollback is a config flip.

## The honest status line
After steps ①–⑤, the pilot runs on data that is **backed up off-box (verified-restorable), PITR-protected,
fenced from dev, and deployed through a gate** — even while it still physically shares a project with the
other gardens. Step ⑥ removes that last shared-tenancy risk and is the only item safe to land after 06-27.
