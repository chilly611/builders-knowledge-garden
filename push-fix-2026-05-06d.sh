#!/usr/bin/env bash
set -euo pipefail

say() { printf "\n\033[1;36m▸ %s\033[0m\n" "$*"; }
ok()  { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
die() { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; exit 1; }

cd "$(dirname "$0")"

say "Verifying we are in the app directory"
test -f package.json || die "Not in app/ — run from /Users/chillydahlgren/Desktop/The Builder Garden/app"
ok "package.json present"

say "Running production build"
npm run build || die "next build failed — fix before pushing"
ok "build green"

say "Staging changes"
git add -A
git status --short

if git diff --cached --quiet; then
  ok "Nothing new to commit"
  exit 0
fi

say "Creating commit"
git commit -m "P0 fix: hooks-after-early-return crash took out every /killerapp/* route

Agent E's INP sprint placed useMemo() calls AFTER existing early-return
guards in four components. Result: SSR runs the early-return path with
N hooks; client hydration runs the full path with N+1 hooks; React
detects the hook-count mismatch on mount and throws 'Rendered more
hooks than during the previous render,' which Next's streaming error
boundary catches and replaces the segment with its built-in 500 UI.

Two of the four components (KillerAppNav, GlobalAiFab) live in the
shared /killerapp layout chain, so the bug cascaded to every page
under /killerapp/* — including legacy-command-center, /killerapp,
/killerapp/projects, and every workflow route.

Fix: move every useMemo above the early return. Hooks first, returns
second. (Files: KillerAppNav.tsx, GlobalAiFab.tsx, KillerappProjectShell.tsx,
AuthAndProjectIndicator.tsx.)

Also: convert /killerapp/projects/page.tsx to 'use client' (was
already shipped in last commit; bumping it through a fresh build for
safety). The dashboard's earlier 500 was a downstream effect of the
same hooks bug, since the shared layout chain was throwing for every
page.

Lesson appended to tasks.lessons.md: 'Hooks first, returns second
— always. There is no exception.'"

say "Pushing to origin/main"
git push origin main
ok "pushed — Vercel will deploy"
ok "After deploy lands, re-test:"
ok "  • https://builders.theknowledgegardens.com/killerapp"
ok "  • https://builders.theknowledgegardens.com/killerapp/projects"
ok "  • https://builders.theknowledgegardens.com/killerapp/workflows/code-compliance"
