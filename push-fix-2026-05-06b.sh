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
  ok "Nothing new to commit — already shipped"
  exit 0
fi

say "Creating commit"
git commit -m "Fix /killerapp/projects 500 + universal project-id rescue from localStorage

P0 fixes from prod feedback:

1) /killerapp/projects returned 500 'This page couldn't load'
   Build classified the route as Static but silently produced no
   prerender HTML, so Vercel served Next's 500 fallback at runtime.
   Force dynamic rendering — small change, robust outcome.

2) Workflow CTAs bounced users back to /killerapp?toast=needs-project
   even when they had an active project from earlier in the session.
   Root cause: useProjectWorkflowState (and its sister blob hook)
   redirected home as soon as ?project= was missing from the URL,
   without checking localStorage's bkg-active-project key that we
   already write on every project landing.

   Fix: when ?project= is missing, both hooks now first check
   localStorage for a valid UUID and replace the URL with it
   (preserving the workflow path). Only when there's truly no
   active project do we fall back to the toast bounce.

3) /killerapp landing also rescues active project from localStorage.
   When the user lands on bare /killerapp (e.g. clicked the brand,
   came in from a different surface), KillerappProjectShell now
   restores ?project=<id> from localStorage on mount so the stage
   chips, action buttons in AI responses, and home CTAs all see
   project context without a redirect dance.

4) Drop redundant ' — Builder's Knowledge Garden' from dashboard
   page metadata title. Root layout already wraps via title.template,
   so the rendered title was duplicated."

say "Pushing to origin/main"
git push origin main
ok "pushed — Vercel will deploy"

ok "All done"
