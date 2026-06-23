# 2FA Recovery Runbook — Supabase dashboard lockout

**Status:** the Supabase dashboard is 2FA-locked; the org is operated CLI/MCP-only. This blocks dashboard-
only actions (PITR toggle, billing, branching UI). **Only the founder can do this — start it TODAY**, as
support turnaround can exceed the 06-27 pilot window.

## Path 1 — you have your recovery/backup codes (fastest)
1. At the 2FA prompt, choose **"Use a recovery code"** and enter one unused code.
2. Once in: Account → **Security / Two-Factor** → remove the lost authenticator → **re-enroll** a new one
   (Authy/1Password/Google Authenticator).
3. **Save the new recovery codes** in the team password manager **and** print a copy. (This is what failed
   last time — don't skip it.)

## Path 2 — codes lost → Supabase support
1. Email **support@supabase.io** (or Dashboard "Can't access your account?" flow) from the **org owner
   email** on file. Subject: "Lost 2FA access — org `shfeuqefwcypdufddbzv` (XRWorker's Org)."
2. Expect identity verification (owner email, project refs, billing confirmation). Have ready: org slug
   `shfeuqefwcypdufddbzv`, a project ref (e.g. `vlezoyalutexenbnzzui`), last 4 of the billing card.
3. After reset, immediately re-enroll + save recovery codes (Path 1 step 3).

## Interim — what works without the dashboard
- **Supabase Management API + MCP** with a personal access token: SQL, migrations, project info, most
  backup/PITR provisioning (see [pitr.md](./pitr.md) Option 2).
- **Vercel** is CLI-only via `$VERCEL_TOKEN` (its dashboard is separately locked out — same "start support
  today" applies if you want UI back).

## Done when
- You can log into `supabase.com/dashboard` with the new authenticator.
- New recovery codes are stored in the password manager **and** printed.
- You can open Project → Database → Backups (needed to confirm PITR in [pitr.md](./pitr.md)).
