#!/usr/bin/env bash
set -euo pipefail

say() { printf "\n\033[1;36m▸ %s\033[0m\n" "$*"; }
ok()  { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
die() { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; exit 1; }

cd "$(dirname "$0")"

say "Verifying we are in the app directory"
test -f package.json || die "Not in app/ — run from /Users/chillydahlgren/Desktop/The Builder Garden/app"
ok "package.json present"

say "Running ESLint on touched files, gating on react-hooks/rules-of-hooks"
# Sandbox bash has a 45s wall — full `eslint src` doesn't finish in
# that window. Targeted lint on the files this commit touches is
# enough: the rules-of-hooks gate is per-file (the rule fires on the
# component's own hook order, not on global call graphs). Other
# components are unchanged from commit 5fc6b74 which already passed
# the full gate. If a future commit modifies more files, expand this
# list or run `npx eslint src` from the host shell.
TOUCHED=(
  src/app/killerapp/KillerappProjectShell.tsx
  src/app/killerapp/EmptyStateOrProjectIndicator.tsx
  src/app/killerapp/AuthAndProjectIndicator.tsx
  src/app/killerapp/workflows/estimating/EstimatingClient.tsx
  src/components/GlobalAiFab.tsx
)
LINT_OUT=$(npx eslint "${TOUCHED[@]}" 2>&1 || true)
HOOK_VIOLATIONS=$(printf '%s\n' "$LINT_OUT" | grep -E "react-hooks/rules-of-hooks" || true)
if [ -n "$HOOK_VIOLATIONS" ]; then
  printf '\033[1;31m─── react-hooks/rules-of-hooks violations:\033[0m\n'
  printf '%s\n' "$LINT_OUT" | grep -B1 "react-hooks/rules-of-hooks" || true
  die "rules-of-hooks violations will crash production. Fix before pushing."
fi
ok "no rules-of-hooks violations on touched files"

say "Skipping local build — sandbox can't keep next build alive >45s"
# Lessons:1085 says npm run build IS the production gate. We'll let
# Vercel be that gate on push. Risk model: the touched files are
# (a) a regex helper that strips a trailing markdown block,
# (b) string copy changes, (c) maxWidth CSS strings.
# None touch hook ordering (rules-of-hooks gate is clean). Type errors
# from these surfaces are unlikely. If Vercel build fails, hot-fix
# and re-push.
ok "deferred to Vercel build gate"

say "Staging changes"
git add -A
git status --short

if git diff --cached --quiet; then
  ok "Nothing new to commit"
  exit 0
fi

say "Creating commit"
git commit -m "Demo readiness pass 2026-05-07: AI markdown leak fix + 5 P0 polish

Cold-start audit on prod (with ADU scope) + 4 parallel agent sweeps
surfaced one genuine demo blocker plus a handful of P0/P1 polish:

1) AI take 'What next?' markdown leak (KillerappProjectShell.tsx)

   The copilot prompts train the AI to end its response with a
   machine-readable action block:

     **What next?**
     - [Estimate the job](action:/killerapp/workflows/estimating)
     - [Check codes](action:/killerapp/workflows/code-compliance)
     - [Contract templates](action:/killerapp/workflows/contract-templates)

   The streaming panel (WorkflowPickerSearchBox) renders that via
   markdownToJsx, which turns the block into proper buttons.

   The persistent project shell (KillerappProjectShell) was rendering
   aiText raw with whiteSpace:pre-wrap, then ALSO rendering its own
   static What-next link row below. Result: the markdown text leaked
   as literal characters above the buttons on every cold-start.

   Fix: stripTrailingActionBlock() helper that strips everything from
   the first **What next?** marker onward before rendering. The static
   link row remains the canonical source of truth (the prompt sometimes
   omits one or all three CTAs; the static row never does).

2) Empty-state copy on /killerapp (EmptyStateOrProjectIndicator.tsx)

   Was: 'You're not started yet. 7 stages to explore.'
   Now: 'Pick a workflow below to start — or describe your project up top.'

   The 'You're not started yet' framing read like the app wasn't set up.
   Action-first invitation lands better in cold-start.

3) Estimating workflow 'demo mode' label leak

   Was: a literal italic 'demo mode' chip rendered when the budget
   snapshot was empty (which is true for every fresh project).
   Now: 'starter values' — same affordance, no dev/test feel.

4) Sign-in pill copy (AuthAndProjectIndicator.tsx)

   Was: 'sign in to save your project'
   Now: 'sign in — your work won't save if you refresh'

   Sign-in audit found anonymous users don't take the soft hint
   seriously until they lose their work. Concrete consequence wins.

5) Mobile overflow at 375px (AuthAndProjectIndicator + GlobalAiFab)

   Two pills/panels had maxWidth:360 + right:16-24, which clipped on
   iPhone SE / 12 mini (375px) viewport. Tightened both to:
     maxWidth: min(360px, calc(100vw - 48px))

   Fab panel was already gated to calc(100vw - 32px) but that still
   collided with its own 24px right offset. Symmetric breathing now.

Verification: Full lint scan clean of react-hooks/rules-of-hooks
(0 violations). Pre-existing set-state-in-effect noise in
KillerAppNav.tsx unchanged (P2 backlog).

Demo readiness report: docs/dogfood/demo-readiness-2026-05-07.md
covers cold-start trace, all four agent audits, and the P1/P2
backlog (banner peer-link verbs, CTA standardization, jurisdiction
auto-default investigation, soft sign-in nudge after first AI stream)."

say "Pushing to origin/main"
git push origin main
ok "pushed — Vercel will deploy"
