# Context Manifest — the Single Source of Truth contract

*Tier 2 · 2026-06-10 · Public-cleared*

## The rule

**GitHub is canonical. Everything else is a mirror.** The context set lives in
`github.com/chilly611/builders-knowledge-garden` on `main`. Supabase Storage and
Google Drive carry read-only copies for team and tool access. If a mirror and
the repo disagree, the repo wins; fix the mirror, never the other way around.
(Operating Discipline #8: repo files are the source of truth; sessions append
and push.)

## The context set

| File | Tier | Purpose |
|---|---|---|
| `docs/PLATFORM-CONSTITUTION.md` | 0 | Locked decisions, values, the HITL gate |
| `docs/PROJECT-INSTRUCTIONS.md` | 2 | BKG operating instructions (template for all gardens) |
| `docs/design-constitution.md` | 1 | Design law: ten goals, seven primitives |
| `docs/visual-first-and-flags.md` | 1 | Visual-First + Legible Judgment practice |
| `docs/first-run-and-onboarding.md` | 1 | First-run doctrine (the seven principles) |
| `docs/session-log.md` | — | Canonical timeline; every session appends |
| `tasks.todo.md` | — | NOW block + backlog |
| `tasks.lessons.md` | — | Hard-won rules, newest-first |
| `docs/CONTEXT-MANIFEST.md` | 2 | This contract |

Confidential context (SCHEMA, strategy, dossiers, transcripts) lives in the
PRIVATE repo `knowledge-gardens-docs` and is **never** mirrored to shared
surfaces. Private-by-default; public requires explicit clearance.

## The mirrors

1. **Supabase Storage** — bucket `platform-context` in `knowledge-gardens-prod`
   (shared multi-tenant; bucket is context-only, no app data). Team and agents
   read over HTTPS; writes happen only via the sync script.
2. **Google Drive** — folder **"BKG Context"**. Human-friendly browsing for
   teammates who don't live in the repo. The folder README repeats this
   contract.

## Updating the SSOT

1. Edit the file(s) in a worktree off `origin/main`, PR-only, founder merges
   (one write-lane per repo, claimed in `docs/session-log.md`).
2. After merge, run `node scripts/sync-context.mjs` (needs `SUPABASE_URL` +
   `SUPABASE_SERVICE_ROLE_KEY` in env — Mac only, never in a sandbox).
3. Drive mirror: re-run the Cowork sync or drop the updated files into
   "BKG Context". The script prints the exact file list to refresh.

Mirrors carry a `last-synced` stamp (`context-sync-manifest.json` uploaded
alongside the docs). A mirror older than the repo's latest context commit is
stale by definition — treat it the way we treat AI-synthesized status docs
(Discipline #9): aspirational until verified.
