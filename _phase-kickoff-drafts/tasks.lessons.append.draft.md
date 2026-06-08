<!-- DRAFT tasks.lessons additions — NOT pushed. Merge into tasks.lessons.md from a bkg-main worktree if accepted. -->

## Lessons — phase kickoff (2026-06-08)

### Identifying which repo + path serves a Vercel-hosted domain (read-only, no dashboard)
Founder-confirmed 2026-06-08 as the canonical sequence (cleaner than `vercel projects ls` + manual matching). Runs on the **Mac**, where `$VERCEL_TOKEN` lives — it is **not** present in the Cowork Linux sandbox, so this cannot be run from a Cowork session:
```
npx vercel --token=$VERCEL_TOKEN domains inspect <domain>   # → the bound project that serves the domain
npx vercel --token=$VERCEL_TOKEN project inspect <project>  # → .link.repo (the GitHub repo) + .rootDirectory (deploy path)
```
- `.link.repo` = the repo; `.link == null` = a CLI/no-Git deploy (the "repo" is a local folder).
- `.rootDirectory` = the deploy path/root inside the repo.
- For frontiermap specifically: the canonical route is the **lowercase** `/theKnowledgeGardensOS` — the uppercase `/TheKnowledgeGardensOS` (as written in the kickoff brief + WS1 handoff) **404s**. Fix that casing wherever it appears.

### Don't trust subagent claims of side effects they can't perform
Several subagents in this session reported "iPhone pinged at session start." Neither the parent nor the subagents have a mechanism to do that from the Linux sandbox — the claim was false. Verify environment-level actions against actual capability before reporting them as done.

### Verify the brief's "ground truth" before building on it
The kickoff brief's "do not re-derive" ground truth had a real error (dedup described as dual-tagging; `domain` is single-valued). A cheap read-only `execute_sql` confirmation caught it and made the HITL spec correct. Confirm before trusting — especially row counts and "X tagged as both Y and Z" claims.
