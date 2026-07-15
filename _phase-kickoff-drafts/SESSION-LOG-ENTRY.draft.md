<!-- DRAFT session-log entry — NOT pushed. Append to docs/session-log.md from a bkg-main worktree if/when you accept these drafts. Follows the CLAUDE.md format. -->

## 2026-06-08 — [Cowork] Session: Knowledge Gardens phase kickoff — parallel research + drafting
**Agent:** Cowork (Opus) — read-only / plan-only; nothing committed or pushed; ran from the `feat/shared-app-shell` worktree, based on `origin/main`.

**What was built:** (drafts under `_phase-kickoff-drafts/`, for founder review — see `MANIFEST.md`)
- `docs/findings/frontiermap-repo-identification.md` — frontiermap.theknowledgegardens.com identified as a static HTML site on Vercel (high confidence); serving repo is private/unresolvable from read-only probes — exact Mac confirm commands provided. Route casing corrected (`/theKnowledgeGardensOS` lowercase serves; uppercase 404s).
- `docs/code-ingestion-hitl.md` — HITL knowledge-gate spec: `draft→review→published` state machine where approve = human attestation; append-only `knowledge_review_events`; dedup re-bucketing plan (474 rows); backfill/triage of the 2,256 published/0-verified rows (Wave 1 = 1,998 auto-flagged). Builds on existing `manually_verified_*` / `/admin/verify` / `audit_log` machinery.
- `docs/enterprise-system-of-record-brief.md` — 11 ranked enterprise requirements for large GCs mapped to the existing Phase 2–4 ladder; P0 = multi-tenant isolation (21 open-RLS tables on shared prod).
- `docs/project-instructions/{kg-umbrella,builders-knowledge,killer-app,dream-machine}.md` — four Tier 2 per-product instruction files mirroring the constitution structure.
- `docs/design-system-and-asset-inventory.md` — herbarium tokens, fonts, Viver seal/emblem set (in `src/components/app-shell/Seal.tsx`, Supabase-hosted asset), images & animations; plus an add/update process. Reconciles/supersedes parts of `asset-manifest.md`.

**Key decisions / corrections:**
- Corrected the kickoff "ground truth": dedup debt is cross-domain **mis-bucketing**, not dual-tagging (domain is single-valued); `building_code` 569 split 457 construction / 112 codes.
- HITL recommendation: keep the 2,256 rows `published` but gate the trust badge on `manually_verified_at` (Option B) rather than darkening the product.
- Enterprise phases mapped onto the existing `STRATEGY-bulletproof-and-scale.md` ladder rather than inventing a new one.

**Issues/bugs found:**
- `src/app/globals.css` `--bg:#ffffff` overrides `tokens.css` → prohibited pure white at `<body>`.
- 21 open-RLS tables on shared prod; `20260531_rls_group_a_lockdown.sql` closes only 7.
- Emoji stage glyphs in `JourneyRow` (antipattern); `public/icons/stages/` empty.
- Asset duplication/orphans (plates vs logos/gardens; 29 MB unreferenced `b_logo_3D.glb`).
