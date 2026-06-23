# PITR Runbook — enable Point-in-Time Recovery

**Decision (founder, 2026-06-23):** enable PITR on prod now.

PITR streams WAL continuously so you can restore to any moment in the retention window (default 7 days),
not just last night. RPO drops from ≤24 h (daily backups) to ~2 min.

## Cost & prerequisite

- Add-on on top of Pro: **~$100/mo** for 7-day PITR (longer windows cost more). Confirm current pricing on
  the billing screen before enabling.
- ⚠️ **Billing blast radius:** while prod is the *shared* `vlezoyalutexenbnzzui`, this add-on bills against
  the project that hosts **all** gardens (BKG + Orchid + Toxicology). After the dedicated-prod cutover
  ([prod-migration.md](./prod-migration.md)), PITR rides on the BKG-only project. If you enable it now on
  the shared project, plan to **move it to the new project** at cutover (don't pay twice).

## Enable it

### Option 1 — Dashboard (needs dashboard access; resolve 2FA first)
Project → **Database → Backups → Point in Time → Enable** → choose retention (start at 7 days).

### Option 2 — Management API (works while the dashboard is 2FA-locked)
With a Supabase **personal access token** (Account → Access Tokens):
```bash
export SUPABASE_ACCESS_TOKEN='sbp_...'
export REF='vlezoyalutexenbnzzui'      # or the new dedicated-prod ref after cutover
# PITR is provisioned via the project add-ons endpoint; confirm the body for your tier:
curl -s -X POST "https://api.supabase.com/v1/projects/$REF/database/pitr" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H 'Content-Type: application/json' \
  -d '{"retention_days": 7}'
```
(If the endpoint shape differs on your plan, the dashboard toggle is authoritative — this is why resolving
the 2FA lockout is the first task.)

## Verify

```bash
curl -s "https://api.supabase.com/v1/projects/$REF/database/backups" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" | grep -i pitr
```
- Dashboard → Database → Backups shows a **Point in time** tab with an *earliest restore point* that
  advances over the next hours toward the full window.
- Do a **drill** (in a quiet window): note `now()`, write a throwaway row, then PITR-restore a *scratch*
  copy to a timestamp just before it and confirm the row is absent. Record the result in
  [restore.md](./restore.md) §6.

> PITR complements but does not replace the off-box R2 backup — R2 is what survives a Supabase account or
> billing loss. Keep both.
