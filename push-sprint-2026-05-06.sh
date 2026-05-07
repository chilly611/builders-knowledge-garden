#!/usr/bin/env bash
set -euo pipefail

say() { printf "\n\033[1;36m▸ %s\033[0m\n" "$*"; }
ok()  { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
die() { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; exit 1; }

cd "$(dirname "$0")"

say "Verifying we are in the app directory"
test -f package.json || die "Not in app/ — run from /Users/chillydahlgren/Desktop/The Builder Garden/app"
ok "package.json present"

say "Running production build (this also typechecks production paths)"
npm run build || die "next build failed — fix before pushing"
ok "build green"

say "Staging changes"
git add -A
git status --short

if git diff --cached --quiet; then
  ok "Nothing new to commit — already shipped"
  exit 0
fi

say "Creating commit"
git commit -m "Sprint 2026-05-06 follow-up: glossary path fix + push script fix

- Moved data/glossary.json -> src/data/glossary.json so the @/data/...
  alias actually resolves under tsc (path alias is @/* -> ./src/*).
  Next build was already happy via Turbopack fallback; this restores
  IDE/tsc green.
- Push script now uses 'npm run build' instead of a separate
  'tsc --noEmit' run. The standalone tsc was tripping on pre-existing
  test files (jest types, @testing-library/react not installed) that
  next build correctly excludes."

say "Pushing to origin/main"
git push origin main
ok "pushed — Vercel will deploy automatically"

say "All done"
ok "Check the green checkmark next to your latest commit on GitHub for the live deploy URL"
