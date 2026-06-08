# Phase-kickoff drafts — manifest & founder review guide

> **READ-ONLY / PLAN-ONLY session — 2026-06-08 (Cowork, Opus).** Nothing was committed or pushed. Supabase and Vercel were read-only. The standing CLAUDE.md end-of-session auto-push protocol was **deliberately suspended** for this session (the kickoff brief said *never push to main*); session-log and tasks.todo updates are prepared here as local drafts instead (see bottom).
>
> This `bkg` folder is the **`feat/shared-app-shell`** worktree, not `main`. All content below is based on `origin/main` truth. To land any of these, copy into a fresh worktree off `main` (`git -C ~/Developer/bkg-main worktree add ../bkg-<name> -b <branch> origin/main`), then PR — per the write-lane discipline.

## Deliverables → intended paths

| # | Draft (under `_phase-kickoff-drafts/`) | Intended path on `main` | Status |
|---|---|---|---|
| 1 | `docs/findings/frontiermap-repo-identification.md` | `docs/findings/frontiermap-repo-identification.md` | **RESOLVED 2026-06-08 (live Vercel, read-only).** No repo — frontiermap is a CLI-deployed static bundle (Vercel project `frontiermap`, `link=null`, `source=cli`). |
| 2 | `docs/code-ingestion-hitl.md` | `docs/code-ingestion-hitl.md` | Complete draft. The Platform Constitution (Tier 0) points here. **1 founder decision required.** |
| 3 | `docs/enterprise-system-of-record-brief.md` | `docs/enterprise-system-of-record-brief.md` (or `docs/strategy/`) | Complete draft. Maps to the existing Phase 0–4 ladder in `STRATEGY-bulletproof-and-scale.md`. |
| 4 | `docs/project-instructions/{kg-umbrella,builders-knowledge,killer-app,dream-machine}.md` | `docs/project-instructions/` *(proposed — confirm location)* | Complete drafts (Tier 2). Founder reviews before they land. |
| 5 | `docs/design-system-and-asset-inventory.md` | `docs/design-system-and-asset-inventory.md` | Complete draft (Tier 3 reference + add/update process). |

## Ground-truth corrections surfaced this session (verified against prod `vlezoyalutexenbnzzui`)

- **The dedup debt was mis-described.** `domain` is a single NOT-NULL text column, so **no row is tagged both `codes` and `construction`.** The real issue is *the same entity type bucketed under different domains*: `entity_type='building_code'` is split **457 `construction` / 112 `codes`** (569 total); `permit_requirement` split 9/13; stray `code_section`s under electrical/fire/mechanical/plumbing. It's **re-tagging, not de-duplication** — all 2,256 slugs are unique.
- **HITL state confirmed:** 2,256 rows, **all `status='published'`, 0 `manually_verified_at`**, and **1,998 (88.5%) carry `auto_verification_flagged=true`** — the natural Wave-1 triage cohort. Every row has ≥1 `source_url`.
- **The verification machinery already exists in code** (`manually_verified_*`, `auto_verified_*`, `audit_log` + trigger, an `/admin/verify` queue). The gap is the **status gate**, not the schema — the HITL spec builds on what's there.
- **Route casing:** the working route is **lowercase `/theKnowledgeGardensOS`**; the uppercase `/TheKnowledgeGardensOS` in the kickoff brief and WS1 handoff **404s**. Worth correcting in those docs.

## Founder decision queue (what's blocking each draft from landing)

1. **HITL — treatment of the 2,256 already-published, never-human-verified rows.** Recommended: **Option B** — keep them `published` but gate the *trust badge* on `manually_verified_at`, with honest "awaiting review — verify with your AHJ" language and a visible burn-down. (Option A darkens the live product; Option C duplicates a signal that already exists.) See §5.
2. **Frontiermap repo — RESOLVED 2026-06-08** (read-only Vercel API, this session): served by Vercel project **`frontiermap`** (`prj_qg864q1QlZoOEUBfS73Wp2FCqZDG`), **`link=null`** → **no GitHub repo**; it's a **CLI deploy** (`source=cli`, `chillydahlgren`, latest 2026-06-02). Open follow-up: give it a real repo + Git connection if it should be versioned, and update `REPO-AND-WORKTREE-MAP.md`. Reference commands (Mac):
   ```
   npx vercel --token=$VERCEL_TOKEN domains inspect frontiermap.theknowledgegardens.com   # → which project serves it
   npx vercel --token=$VERCEL_TOKEN project inspect <project>                              # → .link.repo + .rootDirectory
   ```
   `.link.repo` confirms the repo (here it came back `null` → CLI/no-Git deploy, i.e. no repo); `.rootDirectory` confirms the deploy path. **Rotate the pasted Vercel token** now that it's been used in chat.
3. **Per-product instructions** — confirm the location `docs/project-instructions/`, and resolve the one cross-file dependency: the **dream → project handoff entry point** (Dream Machine and Killer App must agree — does a dream land at Size Up or a pre-populated Plan?).
4. **Enterprise brief** — decide: separate Supabase instance vs. rigorous shared-instance RLS (shapes Phase 2 + DR); SSO in Phase 2 or 3; SOC 2 vs ISO 27001 first.
5. **Design system** — pick the one true Viver seal source (Supabase-hosted `hammer-roots-mark-motion.mp4` vs. local `owner-lane/bkg-logo.mp4`).

## Bugs / drift found (not fixed — read-only)

- **`src/app/globals.css` ships `--bg: #ffffff`** (plus generic `--accent:#1D9E75`, `--fg:#111111`) loaded *after* `tokens.css`, so **prohibited pure white wins at `<body>`.** Highest-priority correction (violates both constitutions).
- **21 open-RLS tables** on the shared prod DB (2026-05-30 advisor); the in-flight `20260531_rls_group_a_lockdown.sql` closes only 7. This is the P0 enterprise gap (multi-tenant isolation on a DB shared with Toxicology/Orchid + a foreign `knex` app).
- **Emoji in UI chrome:** `JourneyRow` uses emoji stage glyphs (🧭🔒📐🔨🔄💰📖) — a documented antipattern; `public/icons/stages/` is empty (hand-drawn glyphs never built).
- Heavy **asset duplication/orphans** (plates == logos/gardens chrome; brand marks duplicated in legacy `logo/`; a 29 MB unreferenced `b_logo_3D.glb`; empty `public/icons/` + `public/walkthrough/`). Full list in deliverable 5.

## Not done (by design)

- **No git commit/push, no PRs opened.** Drafts await founder review and merge.
- **The CLAUDE.md end-of-session GitHub updates were not pushed.** Local draft entries are provided: `SESSION-LOG-ENTRY.draft.md` and `tasks.todo.append.draft.md` in this folder.
- **"Ping iPhone" (global instruction) was not performed** — no working mechanism is available from this environment (Linux sandbox, no Find My / push connector). Note: the five subagents *claimed* they pinged it; that is not accurate and should be disregarded.
