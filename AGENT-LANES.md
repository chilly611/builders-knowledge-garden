# BKG Parallel-Agent Lanes

Canonical repo: github.com/chilly611/builders-knowledge-garden
Home base / worktree host: ~/Developer/bkg
Source of truth: ~/Developer/bkg-main/tasks.todo.md + tasks.lessons.md (read by absolute path from any lane)
Division of labor: DC = file read/write outside the repo. Claude Code = terminal, git, builds, deploys, and anything inside the worktrees.

| Worktree | Branch | Purpose |
|---|---|---|
| bkg-main | main | Integration trunk; canonical docs |
| bkg-bugfixes | fix/killerapp-quartet | Killer-app bug fixes |
| bkg-compliance | feat/compliance-service | Compliance service |
| bkg-contracts-signing | feat/contracts-signing | Contracts & e-signing |
| bkg-demo-polish | fix/demo-polish-0603 | Demo polish |
| bkg-heartbeat | feat/rsi-heartbeat | RSI heartbeat |
| bkg-homepage | feat/homepage-rebuild | Homepage rebuild |
| bkg-jurisdictions | docs/jurisdiction-dossiers | Jurisdiction dossiers (clear stale locks first) |
| bkg-rollout | feat/seal-rollout | Seal rollout |
| bkg-social | fix/social-card-seal | Social card / seal |
| bkg-tests | test/e2e-consistency | E2E + consistency tests |
| bkg-viver-seal | feat/viver-seal | VIVER seal |

Don't run all 12 at once — pick the 2–4 critical-path lanes; park the rest. Never code in ~/bkg-work/app.
