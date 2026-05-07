#!/usr/bin/env bash
set -euo pipefail

say() { printf "\n\033[1;36m▸ %s\033[0m\n" "$*"; }
ok()  { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
die() { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; exit 1; }

cd "$(dirname "$0")"

say "Verifying we are in the app directory"
test -f package.json || die "Not in app/ — run from /Users/chillydahlgren/Desktop/The Builder Garden/app"
ok "package.json present"

say "Linting (errors only — react-hooks/rules-of-hooks must pass)"
npx eslint src --quiet || die "ESLint errors — fix before pushing. The push script now gates on hook errors after the 2026-05-06 outage."
ok "lint clean"

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
git commit -m "Cleanup: trim duplicate page titles + ESLint hooks gate

Two follow-ups from the post-outage smoke test:

1) Page titles were rendering as 'Workflows — BKG — BKG' because the
   root layout's title.template wraps any page-level title.title with
   ' — Builder\\'s Knowledge Garden', and 20 pages were exporting the
   suffix manually. Trimmed top-level metadata.title in all 20 pages.
   Kept openGraph.title and twitter.title intact (those are consumed
   by social platforms, not Next templating).

2) Made react-hooks/rules-of-hooks explicit in eslint.config.mjs and
   wired 'npx eslint src --quiet' into this push script. The bug that
   took out /killerapp/* could have been caught by a single lint run,
   but next build no longer runs ESLint by default (Next 15+ removed
   the integration). The push script now lints before building, so the
   same pattern can never make it past local without surfacing.

   Also excluded **/__tests__/** and *.test.tsx from lint — those
   reference jest/testing-library packages we never installed and
   would block the gate with noise unrelated to the rule we care
   about.

3) The 'two h1s' on /killerapp turned out to be a non-issue: Next.js
   streaming SSR streams a hidden fallback containing the same
   markup, and it stays in the DOM as <div hidden display:none>.
   Not visible to users, removed from a11y tree. No fix needed."

say "Pushing to origin/main"
git push origin main
ok "pushed — Vercel will deploy"
