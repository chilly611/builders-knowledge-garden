# Replace the NOW section at the top of tasks.todo.md with this block.

## NOW — 2026-06-02 (ordered by demo-criticality)

- [ ] **1. ONE canonical demo project, everywhere.** Founder + project-instructions canon = **Marin 4,000 sf / $1.65M** (UUID `55730cd3…`). Fix every field of that row to seed canon (`raw_input`, `budget_amount` → 1,650,000, sqft → 4,000), trace the "$914K / 4,950 sf" chip to its source field and align it, archive the 2 duplicate farmhouse rows, and pull **Willow Creek ADU** + the **`demo-san-diego-adu`** query param out of the demo path so the shell, the CTA, and the stage pages all show the same project.
  *Blocked only on: approve the demo blurb wording (or say "draft from the canonical seed voice").*
- [ ] **2. `/john` route — it's a 404 and it's the demo path.** Decide: build it (and define what it contains), or re-route tomorrow's demo to the verified path `/killerapp → /killerapp/projects/[Marin]`. (First: confirm whether a `/john` implementation ever existed in any branch/worktree/transcript — Cowork is checking overnight.)
- [ ] **3. Stage-page context-routing (#14).** Stage pages are Marin-bound + self-contradictory (Reflect "complete" vs Build mid-flight; Lock prefills Harwell/$1.65M; code lookup pinned to SF). Wire **building-type + jurisdiction + lane + active-project** into every stage tool and query. *Architectural — plan first (Cowork drafting `docs/plans/context-routing-plan.md` overnight).*
- [ ] **4. Founder decisions (unblock the homepage PR + downstream):** lanes 8 vs 9 · fonts (Cormorant+Space Mono vs EB Garamond+JetBrains Mono) · pricing numbers · retire "AI COO" platform-wide? · lead GC vs Owner · "system of record" boldness.
- [ ] **5. Domain permanence.** Point `builders.theknowledgegardens.com` back at the **git-wired team project**; add the DNS TXT record (`_vercel… → vc-domain-verify=…,c0d1665cac`) wherever `theknowledgegardens.com` DNS lives; identify what keeps deploying the personal `app` project.
- [ ] **6. Merge `feat/homepage-rebuild`** (after #4) → rebase onto current main, swap homepage seal to the shared `<Seal>` (now #13 is merged), and fix the **token-cascade** so surfaces stop rendering white/green (`globals.css` :root overrides `tokens.css`).
- [ ] **7. Bug cleanup (decision-free):** React #418 hydration on `/killerapp` · anon AI-take infinite "Running the numbers…" (401) → graceful state · single-source % complete (62 vs 55) · `src/lib/rag.ts:154` "40,000+ entities" → live count.
- [ ] **8. Rotate** `VERCEL_TOKEN` + GitHub PAT (pasted in-session, now in transcripts).
- [ ] **9. Founder rule-#7 loop** (signed-in): sign in → open project → run a workflow → save → leave → return → resume; magic-button text + photo → project-aware + logs to the project record + survives reload.

### Set running overnight (PR-only / read-only — review in the morning)
- **Code:** decision-free bug sweep (#7 items) — one worktree off current main, PR only, no merge, no shared-state writes.
- **Cowork (read-only/no writes):** deploy + domain forensics (what's deploying the personal `app` project, what moved the domain, env-change history, whether `/john` ever existed) **+** write `docs/plans/context-routing-plan.md` (#3). Investigate and document only.
