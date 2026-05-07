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
git commit -m "Convert /killerapp/projects/page.tsx to 'use client' to fix runtime 500

force-dynamic alone wasn't enough — the route still returned 200 with
Next's streaming-SSR error fallback embedded ('This page couldn't load').
Something during server render of the wrapping Server Component +
Suspense + ProjectsDashboardClient combo was throwing.

Convert the page wrapper to 'use client' to bypass server render.
The parent /killerapp/layout.tsx is already 'use client', so we lose
no SSR benefit. Suspense isn't needed because ProjectsDashboardClient
doesn't use useSearchParams — auth state lives in the Supabase client
SDK.

(metadata export drops with 'use client'; root layout's title.template
fills in the default title. Acceptable until we can isolate the SSR bug
and split metadata back out into a parent route.)"

say "Pushing to origin/main"
git push origin main
ok "pushed — Vercel will deploy"
ok "After deploy, hit https://builders.theknowledgegardens.com/killerapp/projects to verify"
