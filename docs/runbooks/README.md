# BKG Operations Runbooks

Data-safety & deploy runbooks, created 2026-06-23 for the **06-27 pilot** (branch `chore/data-safety-pilot`).

**Start here:** [`pilot-data-safety-checklist.md`](./pilot-data-safety-checklist.md) — the ordered action
plan (what's done vs. what you must do, sequenced against the deadline).

| Runbook | Covers |
|---|---|
| [pilot-data-safety-checklist.md](./pilot-data-safety-checklist.md) | The master checklist + sequencing + the entanglement finding. |
| [restore.md](./restore.md) | **The restore procedure** — R2 logical backup, Supabase daily, PITR. RTO/RPO. Verified. |
| [dev-prod-separation.md](./dev-prod-separation.md) | Dev can't touch prod — the env split + the boot-time guard. |
| [pitr.md](./pitr.md) | Enable Point-in-Time Recovery on prod + verify. |
| [prod-migration.md](./prod-migration.md) | Carve BKG out of the shared project into a dedicated prod (dry-run-gated). |
| [deploy-pipeline.md](./deploy-pipeline.md) | Staging + protected prod deploys; branch protection; no direct-to-prod. |
| [2fa-recovery.md](./2fa-recovery.md) | Resolve the Supabase dashboard 2FA lockout. |

Tooling lives in [`scripts/backup/`](../../scripts/backup/) and [`.github/workflows/`](../../.github/workflows/).

### The one thing to know
The current prod (`vlezoyalutexenbnzzui`) is **shared** by BKG + Orchid + Toxicology in one schema with one
`auth.users`. So the **pilot is made safe by backups + PITR + dev-isolation + deploy-gating** (fast, low
risk) — *not* by the dedicated-prod migration, which is the bigger, riskier move and is gated on a green
dry-run. Don't let the migration block the pilot.
