# Deploy + Domain Forensics — 2026-06-02

_Status: read-only investigation — **live-confirmed via read-only Vercel API on 2026-06-02 (see §0.5).** No Vercel mutations, no env changes, no deploys, no domain moves. This is a report + a recommended (un-executed) morning action._
_Author: Cowork (Opus), read-only pass._

---

## 0. Method & access boundary (read this first)

What I could read from inside the sandbox:
- **Git** (full history, all branches/worktrees, commit timestamps & authors).
- **Repo config** (`vercel.json`, `.env.example`) and **all docs / session-log**.
- The repo's own narrative of prior Vercel ops (`docs/session-log.md`, `docs/strategy/*`).

What I could **not** read (and why):
- **The live Vercel API.** `VERCEL_TOKEN` is *"already set in the user's shell environment"* (`docs/strategy/cowork-brief-v3-killerapp-rehaul.md:89`) — i.e. on the Mac, **not** in this sandbox. There is no `.env`/`.env.local` here and the token is not in the sandbox environment. So the three live-API items below (current domain→project attachment, the `app` project's Git connection, current env-var scoping) are marked **CONFIRM-PENDING** with the exact read-only call to run.
- A **Vercel MCP connector** has been surfaced in chat (read tools: `list_projects`, `get_project`, `list_deployments`, `get_deployment`, `list_teams`). Connecting it (or pasting the token output) lets me fill the CONFIRM-PENDING sections without any mutation.

Projects in play (corrected by the live check below): a **single team** `team_4qRqC7dVa1IrrGvTpcptHf4o` holds all Vercel projects. The BKG app is the project literally named **`app`** (`prj_1WUohosoE53PfQVOyyoDxsCIVK09`). **There is no `builders-knowledge-garden` project** — the "team project vs personal app" framing in the original brief was a misconception.

---

## 0.5 LIVE CONFIRMATION — read-only Vercel API, 2026-06-02

All previously-CONFIRM-PENDING items were resolved via read-only `GET`s (token in the founder's shell, run on the Mac). Headlines:

- **One team, one BKG project.** All projects under `team_4qRqC7dVa1IrrGvTpcptHf4o`; the BKG app = `app` (`prj_1WUoho…`). No separate `builders-knowledge-garden` project exists.
- **`app` is THE production project**, git-connected to `chilly611/builders-knowledge-garden`, auto-deploying **every push** — `main` → production, feature branches → preview. (It even built a preview of this docs branch, `ac121e1`, at 15:02 on 06-02.) The **23:43 06-01 production deploy was `main` @ `e270541`** (Viver app-shell). This is normal CD, **not** a rogue/duplicate deployer. `main` has since advanced to **`f2fc9cf`** (deployed 06-02 11:41).
- **Domain is correct.** `builders.theknowledgegardens.com` is attached to `app`, `verified=true`, `redirect=none`, serving production (plus the default `app-five-kohl-37.vercel.app`). **No domain move occurred and none is needed.**
- **Env incident — ROOT CAUSE.** On `app`, the core auth keys are scoped to **`production` ONLY** and are **absent from `preview` + `development`**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`. That is precisely the "preview sign-in — env store found empty" symptom: `app` builds a preview for every feature-branch push, and those previews have no Supabase credentials. The 06-01 restore returned the keys to **production** but not preview/dev — which is why the live site works while preview sign-in broke.
- **Also absent** (present in `.env.example`, not on the project): `SUPABASE_URL` (non-public; code reads `NEXT_PUBLIC_SUPABASE_URL`, so likely fine), `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` (confirm Clerk is fully replaced by Supabase auth), `BRAVE_SEARCH_API_KEY`. `REPLICATE_API_TOKEN` is missing from `development` only. (Many extra real vars exist beyond `.env.example`: DOCUMENSO, KV/REDIS, POSTHOG, SENTRY×4, RESEND×2, OPENAI, STRIPE_PRICE/LINK×, SIGNATURE_PROVIDER, NEXT_PUBLIC_APP_URL — all scoped to all three envs.)

### Revised recommended morning action — DO NOT auto-execute (env changes are out of scope per the fence)
Production is healthy; **there is no rogue project or domain to fix.** The one real issue is **preview/development env scoping** on `app`:
1. Add the 4 keys above to **Preview** (and Development): Vercel → `app` → Settings → Environment Variables → edit each → tick Preview + Development. First decide whether preview should reuse the prod Supabase project (`knowledge-gardens-prod`) or a separate preview instance. This restores preview sign-in.
2. Confirm whether **Clerk** is still used; if it was fully replaced by Supabase auth, delete the stale `.env.example` lines; if still used, both Clerk keys are missing everywhere.
3. **Rotate the Vercel token** that was pasted into chat during this investigation (Vercel → Account Settings → Tokens → delete + re-mint).

> The original "what keeps deploying `app`" worry resolves to: **`app` is the legitimate prod project on normal all-branch CD** — not a misconfiguration. The actual incident was the env-store wipe whose restore missed the preview/dev scopes.

---

## 1. What happened on the night of 06-01 (CONFIRMED from git)

All commits below are authored by `Chilly Dahlgren` (the shared git identity all agents use). Times are local (-0700).

| Time (06-01) | Commit | What it records |
|---|---|---|
| 22:18:45 | `1f4d846` | homepage rebuild verified (prod build + rendered audit) |
| **22:37:33** | `715f6b9` | **"rebuild preview — project env vars restored (URL + anon; service key pending)"** |
| **22:50:39** | `4822039` | **"preview sign-in fix — env store found empty, baseline restored (names only)"** |
| **22:57:42** | `ea7946f` | **"rebuild preview — SUPABASE_SERVICE_ROLE_KEY restored to env store"** |
| **23:01:30** | `a3350f5` | **"service key restored — env store complete, prod-deploy freeze lifted"** |
| **23:36:57** | `4fa7839` | "Viver seal in social cards + favicons" — **this is current `main`** |
| 23:41:51 | `e270541` (ref update) | `feat/viver-seal` pushed |
| 23:46:24 | `41a00ed` | `feat/seal-rollout` pushed |
| 06-02 00:20:44 | — | `main`, `fix/social-card-seal`, `fix/killerapp-quartet` refs all updated to `4fa7839` |

**Env-var story (confirmed):** the project **env store was found empty** (~22:50) and rebuilt **in stages** — public URL + anon key first (22:37), `SUPABASE_SERVICE_ROLE_KEY` last (22:57), declared complete with the "prod-deploy freeze lifted" at 23:01. The commits are docs/chore markers; the actual env writes happened through the Vercel API/dashboard (not visible in git). Prior context: `docs/session-log.md:627` documents an earlier session that created 4 env vars (TWILIO_ACCOUNT_SID / AUTH_TOKEN / PHONE_NUMBER + CRON_SECRET) on top of 16 existing, in production+preview+development.

---

## 2. The ~23:43 06-01 deploy of the personal `app` project

**Best-evidence reconstruction (CONFIRMED trigger candidates, HYPOTHESIS on the mechanism):**
- The only pushes in the 23:36–23:46 window are `4fa7839` (→ `main`, committed 23:36:57) and `feat/viver-seal`/`feat/seal-rollout` (23:41/23:46). A deploy landing **~23:43** is the normal 3–7 min build lag after the **`4fa7839` push to `main`** (most likely), or the `feat/viver-seal` push at 23:41.
- **What keeps deploying `app`:** `vercel.json` does **no** project pinning or domain config (only `rewrites` + `crons`), so all deployment routing is Vercel's **Git integration** (project-level settings). The most probable root cause: **both** Vercel projects — the team `builders-knowledge-garden` **and** the personal `app` (`prj_1WUoho…`) — are connected to the **same GitHub repo** (`chilly611/builders-knowledge-garden`). With both connected, **every push double-deploys** (one build per project), which is exactly the "what keeps deploying `app`" symptom.

**CONFIRM-PENDING — run these read-only calls (GET only):**
```
# Recent deployments on the personal app project (find the 23:43 build + its SHA + source)
GET https://api.vercel.com/v6/deployments?projectId=prj_1WUohosoE53PfQVOyyoDxsCIVK09&limit=20
# Its Git connection (is the repo connected? which branches deploy?)
GET https://api.vercel.com/v9/projects/prj_1WUohosoE53PfQVOyyoDxsCIVK09   → .link  (type/repo/productionBranch)
# Same for the team project (resolve its id first)
GET https://api.vercel.com/v9/projects/builders-knowledge-garden?teamId=<team>
GET https://api.vercel.com/v6/deployments?projectId=<team-project-id>&limit=20
# (Vercel MCP equivalent: list_teams → list_projects → list_deployments → get_deployment / get_project)
```
For each deployment the API returns `created` (timestamp), `meta.githubCommitSha`, `meta.githubCommitRef` (branch), and `source` (`git` vs `cli`) — that pins exactly what deployed `app` at 23:43 and whether the trigger was a git push or a CLI `vercel` invocation.

---

## 3. Domain → project attachment for `builders.theknowledgegardens.com`

**CONFIRMED from repo:** the production site is served at `https://builders.theknowledgegardens.com` (dozens of verified references in `docs/session-log.md`, e.g. `:1137`, `:1915`, `:2201`, `:3481`). The apex/brand intent is the **team** project.

**CONFIRM-PENDING (the question the fence forbids me to *change* — only report):** which project the domain is currently aliased to **right now**. If the personal `app` project grabbed the domain during tonight's churn, prod is being served by `app` instead of the team project.
```
# Read current domain → project attachment (GET only):
GET https://api.vercel.com/v9/projects/<project-id>/domains            # per project
GET https://api.vercel.com/v5/domains/builders.theknowledgegardens.com # domain record + projectId
# Vercel MCP: get_project on each → inspect attached domains/aliases
```

---

## 4. Env-var scoping on the team project

**CONFIRMED — the expected variable set** (`.env.example`, names only):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `REPLICATE_API_TOKEN`, `BRAVE_SEARCH_API_KEY`, `CRON_SECRET` (16). `docs/session-log.md:627` records a prior 16→20 history (added TWILIO×3 + CRON_SECRET across prod+preview+dev).

**CONFIRMED behavior tonight:** store found empty → restored in stages (URL+anon 22:37 → service key 22:57 → complete 23:01). **CONFIRM-PENDING:** the *current* per-environment scoping (which vars exist in production vs preview vs development on the team project, post-restore).
```
# Read current env-var scoping (GET only — returns keys + target envs, not decrypted values):
GET https://api.vercel.com/v9/projects/<team-project-id>/env
```
Watch for: any key missing from `production`, or present only in `preview`/`development` (the "found empty" event suggests a scope/target mismatch or a wipe on one environment).

---

## 5. The `/john` route — did it ever exist?

**CONFIRMED: there is no `/john` route, and there never was.** Read-only checks across **every** branch tip and the `4fa7839` tree:
- No literal `"/john"` in any `src/**`, `public/**`, `*.ts(x)`, or `*.json` on any branch (empty result).
- No `src/app/john/` directory on `main` (the top-level route list has no `john`).

Every "john" hit is the **person John Bou** — a general-contractor demo persona / real contractor partner, and (per `docs/meetings/...:d0275a9`) **Michael Bou's brother** (Michael "Mike B" Bou joined the team). Artifacts:
- `docs/dogfood/personas/01-gc-john.md`, `docs/dogfood/post-fix-personas/01-gc-john-v2.md` — the "GC John" persona.
- `docs/dogfood/demo-playbook-john-2026-05-08.md`, `john walkthrough May 28 files/{04-john-walkthrough-script.md,05-john-demo-brief.md,07-…,walkthrough.html,walkthrough-index.html}` — walkthrough scripts + a standalone HTML walkthrough (not an app route).
- `docs/meetings/2026-03-26-bkg-walkthrough-john.md`, `docs/meetings/2026-05-22-platform-review-john-mike.md` — meeting transcripts.
- Commit `0c20373` (05-12): "Brief 1 5-min walkthrough script for John Bou + contractor partner."

**What it was "meant to be":** the closest thing to a `/john` artifact is a **personalized demo walkthrough for John Bou** (HTML walkthrough files + a demo-playbook persona). If a `/john` *route* (a personalized demo landing) was ever intended, it was **never implemented** — only the walkthrough docs/HTML and the GC-John dogfood persona exist. No spec for a route was found in code, docs, or the searched session transcripts.

---

## 6. Recommended morning action — **DO NOT EXECUTE; confirm first**

1. **First, confirm (read-only) the three CONFIRM-PENDING items** in §2–§4 via the Vercel MCP or `VERCEL_TOKEN` GETs. Do not change anything until the current state is on paper.
2. **If both projects are git-connected to the repo (likely):** the fix is to **stop the personal `app` project from auto-deploying** — in Vercel, disconnect `app`'s Git integration (Project → Settings → Git → Disconnect) **or** pause/ignore its builds — so only the team `builders-knowledge-garden` deploys. _This is the recommended action; per the fence it is **not** executed here._
3. **Confirm the domain stays on the team project.** If `builders.theknowledgegardens.com` is currently aliased to `app`, plan to move it back to the team project — again, **report-and-plan only tonight**; the fence forbids moving/attaching/detaching the domain.
4. **Verify env-var scoping** on the team project: every key in §4 present in **production + preview + development**. If the "found empty" event was an environment-target wipe, re-scope the missing targets (founder action, not tonight).
5. **Security hygiene (separately flagged):** `docs/session-log.md:1776` notes a GitHub PAT was embedded in the repo's `origin` URL and appeared in a transcript; the standing rule is to rotate it. Unrelated to tonight's deploys but worth doing in the same pass.

> Net: the most probable story is **dual Git integrations** (team + personal `app`) on one repo causing every push to double-deploy, compounded by an env-store wipe/restore on the team project the same evening. Confirm with the read-only calls above before touching anything.
