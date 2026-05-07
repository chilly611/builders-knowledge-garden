#!/usr/bin/env bash
set -euo pipefail

say() { printf "\n\033[1;36m▸ %s\033[0m\n" "$*"; }
ok()  { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
die() { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; exit 1; }

cd "$(dirname "$0")"

say "Verifying we are in the app directory"
test -f package.json || die "Not in app/ — run from /Users/chillydahlgren/Desktop/The Builder Garden/app"
ok "package.json present"

say "Running ESLint, gating ONLY on react-hooks/rules-of-hooks"
# Background: full ESLint surfaces ~450 pre-existing errors (any types,
# unescaped entities, set-state-in-effect, etc.) — most are noise. The
# rule that took out prod was react-hooks/rules-of-hooks. Gate on that
# specifically so deploys can ship while we burn down the rest.
LINT_OUT=$(npx eslint src 2>&1 || true)
HOOK_VIOLATIONS=$(printf '%s\n' "$LINT_OUT" | grep -E "react-hooks/rules-of-hooks" || true)
if [ -n "$HOOK_VIOLATIONS" ]; then
  printf '\033[1;31m─── react-hooks/rules-of-hooks violations:\033[0m\n'
  printf '%s\n' "$LINT_OUT" | grep -B1 "react-hooks/rules-of-hooks" || true
  die "rules-of-hooks violations will crash production. Fix before pushing."
fi
ok "no rules-of-hooks violations"

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
git commit -m "Cleanup commit: title trims + ESLint hooks gate + 5 hooks-after-early-return fixes

Three follow-ups from the post-outage smoke + a tighter lint gate:

1) Trimmed duplicate '— Builder\\'s Knowledge Garden' from 20 page
   metadata.title fields. Root layout's title.template adds it once.
   (openGraph + twitter titles kept intact — those bypass the template
   and feed social platforms with the full brand string.)

2) ESLint config now explicitly gates react-hooks/rules-of-hooks at
   error and react-hooks/exhaustive-deps at warn. The push script
   greps the eslint output for rules-of-hooks violations and fails
   only on those — most other pre-existing errors are noise that
   would block deploys without preventing real bugs. We can burn
   the noise backlog down separately.

3) Fixed 5 newly-discovered rules-of-hooks violations the gate found:
   - components/cockpit/ProjectCockpit.tsx (lives in /killerapp
     layout chain — same blast radius as the bug we just fixed)
   - design-system/components/NavigatorMiniStrip.tsx
   - design-system/components/RSIBadge.tsx
   - design-system/components/StageContextPill.tsx
   - design-system/components/VoiceCommandNav.tsx

   In each, hooks (useState/useMemo/useEffect/useCallback/useRef +
   custom useSpeechRecognition) were called AFTER an early return.
   Moved the hooks above the return. No business-logic changes.

The 'two h1s' on /killerapp earlier was a non-issue (Next streams a
hidden fallback with the same markup; not visible, removed from
a11y tree)."

say "Pushing to origin/main"
git push origin main
ok "pushed — Vercel will deploy"
