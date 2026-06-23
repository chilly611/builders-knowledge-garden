# Deploy Pipeline Runbook — no more direct-to-prod

**Goal:** prod is never deployed from a laptop. Every change goes PR → CI green → Preview (staging) →
merge to `main` → gated production deploy.

## What's in this PR

- `.github/workflows/ci.yml` — lint + test + build on every PR and on `main`. This is the **required
  status check**.
- `.github/workflows/deploy.yml`
  - **PR** → `vercel deploy` (Preview) = your **staging** URL to verify before merge.
  - **push to `main`** → `vercel deploy --prod`, but only through the GitHub **`production` environment**,
    which carries a protection rule (required reviewer / wait timer).

## One-time setup (founder)

### 1. Secrets — repo Settings → Secrets and variables → Actions
| Secret | Value |
|---|---|
| `VERCEL_TOKEN` | a Vercel access token (do not commit; rotate periodically) |
| `VERCEL_ORG_ID` | `team_JQzNMFY8gRKOV45SN17A4zwG` |
| `VERCEL_PROJECT_ID` | `prj_iFD4B6Z7igXmSGEruPaR8Wet53Pm` |
| `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_ANON_KEY` | the dev/staging project (for CI build) |

### 2. The `production` environment — repo Settings → Environments → **New: `production`**
- Add **Required reviewers** (yourself) → every prod deploy now waits for a one-click approval. This is the
  "protected prod deploy."
- Optionally a wait timer.

### 3. Branch protection on `main` — Settings → Branches (or `gh`):
```bash
gh api --method PUT repos/chilly611/builders-knowledge-garden/branches/main/protection \
  -H "Accept: application/vnd.github+json" --input - <<'JSON'
{
  "required_status_checks": { "strict": true, "contexts": ["build"] },
  "enforce_admins": true,
  "required_pull_request_reviews": { "required_approving_review_count": 1 },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```
(Run from a machine with `gh` authenticated — this environment has no GitHub API credential.)

### 4. ⚠️ Disconnect Vercel's native Git auto-deploy
If the Vercel project is connected to this GitHub repo, Vercel will **also** auto-deploy on every push and
double up with this workflow (and bypass the `production` gate). Either:
- **Disconnect** Git in the Vercel project (Settings → Git) and let this workflow own deploys, **or**
- keep Vercel Git deploys and instead rely on **branch protection** alone for the prod gate — but then the
  `deploy.yml` production job is redundant; pick one path, don't run both.

## Break-glass (only if CI/GitHub is down)
The legacy CLI path still works from `~/Developer/bkg` with `.vercel` linked to the team project:
`npx vercel --prod --token=$VERCEL_TOKEN --yes`. Use only in an emergency; note it in `session-log.md`.

## Verify
- Open a throwaway PR → CI runs, a Preview URL appears in the PR checks / job summary. ✅
- Merge it → the `production` job **waits for your approval**, then deploys. ✅
- Try to push directly to `main` → **rejected** by branch protection. ✅
