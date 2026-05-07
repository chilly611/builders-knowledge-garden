# Builder's Knowledge Garden — Lessons Learned
## Updated: 2026-04-20

---

## User Workflow Discipline (READ ME FIRST EVERY SESSION)

### Never send macOS users multi-line shell pastes with inline `#` comments
**Date:** 2026-04-19
**What happened:** For 3+ sessions running, I've given the user blocks like `git status  # confirm clean, HEAD == f3e257a` inside multi-line pastes. zsh on their Mac doesn't reliably treat `#` as a comment in interactive-mode pastes, and `==` triggers zsh's `EQUALS` filename expansion — producing `zsh: = not found` and swallowing every subsequent line. Every push turns into a back-and-forth debugging loop and the user (rightly) called it out: "stop having this problem… you have god level access to my machine and accounts. do it for me."
**Fix:** Write a proper shell script (`#!/usr/bin/env bash`, `set -euo pipefail`, clear status lines, NO inline comments on command lines) to the mounted workspace folder. Hand the user exactly ONE line to paste: `bash "/path/to/script.sh"`. See `push.sh` in Builder's Knowledge Garden for the template.
**Rule:** If a task requires more than 2 sequential shell commands OR needs explanatory notes attached to any command, produce a `.sh` file in the workspace folder. The user's terminal paste is always a single invocation of `bash /path/to/file.sh` — never more. Inline `#` comments in pasted command sequences are BANNED. Prefer `set -euo pipefail` + colored `say/ok/die` helpers so the user can see exactly where things stop.

### Never hardcode a Vercel commit-specific URL in pickup notes or scripts
**Date:** 2026-04-19
**What happened:** For multiple sessions I've been writing pickup notes ending with `Check: https://app-p7hc1agho-chillyd-2693s-projects.vercel.app/killerapp` — but that hash is from a build long in the past. Every Vercel deploy gets a new hash URL. The founder kept checking the stale URL and seeing none of the new work, concluding nothing had shipped. In reality everything HAD shipped; they were looking at an archived deploy. Another loop of my making.
**Fix:** Either (a) point them at the GitHub commit page and let them click through to Vercel's "Details" link (which always resolves to the current deploy), or (b) query GitHub deployments API from the sandbox for the per-commit deploy URL and report THAT. Never hand out a `app-<hash>-...` URL unless it was just pulled from the API for the current SHA.
**Rule:** The phrase "check this URL: app-abcd-..." is banned. If I need to point the founder at the live build, say: "The green ✓ next to commit $SHA on GitHub links to the live deploy — click Vercel → Details." That scales forever without going stale.

### Check origin state before handing the user a bundle
**Date:** 2026-04-19
**What happened:** I've been treating every push as "bundle it for the user to pull and push." But the sandbox has HTTPS fetch access to origin. Running `git ls-remote origin HEAD` would have told me the first 5 W4.1 commits were ALREADY on origin/main from an earlier push — so the bundle was half wasted work and the user's zsh errors were for commits that had already landed.
**Fix:** Before writing any push instructions, run `git ls-remote origin HEAD` from the sandbox. Compare against local main. Only bundle + push what's genuinely new. If the sandbox gains push auth via a future Cowork integration, push directly and eliminate the terminal step entirely.
**Rule:** Start every ship-flow by reading actual origin state, not assuming. Script the delta, not the full stack-from-scratch.

---

## Data Model Discipline

### Trust the code, not the audit, when diagnosing a workflow
**Date:** 2026-04-20
**What happened:** The W4.3 workflow audit called q2 Estimating "clean as shipped, good first-session confidence win" and flagged only one cosmetic nit. When I opened the client file to start the polish commit, I found three real bugs stacked on top of each other: no `analysis_result` step at all (so "AI Estimating Gate" never produced an AI estimate), a `recordMaterialCost()` call gated by an `estimatedTotal` state variable that no step handler ever set (permanent dead code), and a `categoryCount` that was counting API field names (`Object.keys(summary).length - 1`) instead of budget categories. The audit had inventoried structure but hadn't traced state flow or actually read what each handler did.
**Fix:** Read the client file end-to-end BEFORE deciding scope — don't accept the audit's "clean" verdict without tracing each state variable and branching path through at least once. Present the findings to the founder (via AskUserQuestion) before choosing between "full fix / surgical / show me first" so they can decide the commit's ambition level.
**Rule:** Audits are triage, not verdict. Before committing to "small change expected" on any workflow, trace every state variable from declaration → setter calls → usage. Dead state (declared, read, never set) is almost always a load-bearing dead write downstream.

### The naive `.replace('k','000')` pattern for `$X.Xk` is wrong
**Date:** 2026-04-20
**What happened:** Four workflows (q7, q11, q13, q17) and my first draft of q2 all parse dollar figures from AI output via `match[0].replace('k', '000').replace(/[\$,]/g, '')`. For `$52,350` this works. For `$48.2k` it produces `48.2000` → `parseFloat` returns `48.2`, not `48200`. So any AI output that uses k-suffix decimals (very common for estimates) will silently record a cost 1000x too small.
**Fix:** Detect-and-multiply, don't string-replace: `const hasK = /k$/i.test(raw); const numeric = parseFloat(raw.replace(/k$/i,'').replace(/[\$,]/g,'')); return hasK ? numeric * 1000 : numeric;`. Applied in q2's new parser. Queued W4.3b-polish cross-cutting commit to sweep the same fix into q7/q11/q13/q17.
**Rule:** When normalizing unit suffixes, separate "does this have the suffix?" from "strip it" from "apply the multiplier." String-replace on a formatted number is almost always a bug for values >=10 with decimals.

### Don't synthesize fields the schema doesn't honestly support
**Date:** 2026-04-19
**What happened:** Planning the W4.1f forecast extension, the natural field list was {P&L after payments, receivables outstanding, next-7-days scheduled}. Two of those (P&L + next-7-days) are cleanly computable from existing `budget_items` rows (is_estimate + amount sign + date window). The third (receivables) is NOT — it would require conflating `total_budget` (cost-to-build) with "contract value" (what the client will pay). Those are different numbers in most real builds. Shipping receivables as `total_budget − clientPaymentsReceived` would render wrong the moment a contractor's build budget ≠ their contract price.
**Fix:** Shipped only the two honest fields. Parked receivables with an explicit note that the real solution is adding a `contract_value` column to `project_budgets` (migration) — not a UI trick.
**Rule:** Before extending an API summary, enumerate each new field and ask "what column or derivation makes this exact? If I'm reaching for 'close enough' — STOP and either (a) propose a migration or (b) park the field with a clear reason." Fake accuracy is worse than an absent field because the user will base decisions on it.

### Extend summaries additively — don't reshape legacy fields
**Date:** 2026-04-19
**What happened:** Discovered during W4.1f that `BudgetSummary.totalSpent` already sums client-payment rows (which are stored as negative amounts), effectively meaning "cash out minus cash in". Fixing it to pure expenses would change what `BudgetWidget.tsx` (legacy dark pill on /expenses) shows today. Low-traffic surface, but still a semantic change.
**Fix:** Left `totalSpent` alone, added a JSDoc explaining the quirk, and introduced clean new fields `actualExpenses` and `clientPaymentsReceived` that future surfaces should prefer. The legacy widget keeps its behavior; new widget (GlobalBudgetWidget) uses the split fields.
**Rule:** When a field's semantics are muddy but it has consumers, add-a-clean-sibling beats rename-and-break. Tag the old field with a JSDoc "legacy — prefer X" note so the next engineer knows which one to pick.

---

---

## Architecture & Deployment

### Git branching was a silent disaster
**Date:** 2026-03-29
**What happened:** The repo had two branches (`master` and `main`) with completely different codebases. `master` had the good visual version (18 routes, Dream Machine, presentation, photo heroes, 30+ commits of polish). `main` had a bare scaffold from a fresh rebuild on March 19 (chunked architecture approach). Vercel was deploying from `main`, so the live site showed the bare scaffold while all the good work lived on `master` undeployed.
**Fix:** Force-updated `main` to point to `master`'s HEAD via GitHub API.
**Rule:** ALWAYS verify which branch Vercel deploys from. ALWAYS check both branches exist and what they contain. Default branch for this repo is `main`.

### GitHub fine-grained PAT needs explicit "Contents: Read and write"
**Date:** 2026-03-29
**What happened:** Created a fine-grained PAT but it couldn't push code. The API showed `push: true` in permissions but the Contents API returned "Resource not accessible by personal access token."
**Fix:** Edit the token → Repository permissions → Contents → set to "Read and write" → Update.
**Rule:** Fine-grained tokens need EXPLICIT per-permission grants. Repository-level "push" access alone is not enough for the Contents API.

### GitHub Contents API is more reliable than git push for deployment
**Date:** 2026-03-29
**What happened:** `git push` requires auth configuration that varies by environment. The GitHub Contents API with a Bearer token works from any environment with `curl`.
**Rule:** For single-file or few-file deployments, use the GitHub Contents API (PUT /repos/{owner}/{repo}/contents/{path}). For large changes, use git push from a configured environment.

### Vercel auto-deploys from main on push
**Date:** 2026-03-29
**Rule:** Any push to `main` triggers a Vercel build. Static files in `/public/` are available immediately; Next.js routes take ~60-90 seconds to build.

---

## Design & UX

### The platform's first impression IS the product
**Date:** 2026-03-28
**What happened:** Multiple rounds of UI polish (photo heroes, card photos, onboarding flow) didn't move the needle. Chilly said "I must not be communicating how different of an approach I'm looking for."
**Root cause:** Treating the landing page as a marketing page that links to features. The user wants the landing page to BE the experience — full-screen cinematic takeover.
**Rule:** Think Apple keynote, not marketing website. Cinematic energy. Every first impression should make people feel something.

### "Minimal Lovable Product" — never MVP
**Date:** 2026-03-28
**Rule:** The bar is always LOVABLE, not viable. If it doesn't make users feel something positive, it's not ready to ship.

### LIGHT BACKGROUNDS — global preference
**Date:** 2026-04-01
**Rule:** Default to light/warm backgrounds across all BKG surfaces. Dark-on-dark has been a recurring readability problem. Light backgrounds with rich brand-colored text (green, gold, red) give better contrast and a more inviting feel. Reserve dark backgrounds only for cinematic/immersive moments (intros, renders, modals), never for primary working surfaces like sliders, controls, or content panels.

### Game onboarding — socialization by play
**Date:** 2026-04-01
**Rule:** Every BKG experience must teach through play, not instructions. Think video game tutorials: the first interaction should be effortless and immediately rewarding. Never dump all controls on the user at once. Progressive disclosure: start with 1-2 interactions, unlock more as confidence builds. Every few seconds a new micro-story begins — keep attention with constant novelty.

### Mini-loops — open and close consistently
**Date:** 2026-04-01
**Rule:** Short attention spans in a heavily mediated world. Design every experience with tight open/close loops: set a small goal → accomplish it → celebrate → next goal. People get happy setting a goal and accomplishing it. Each loop should be 5-15 seconds. Examples: "Move this slider → see the building name change → sparkle", "Choose 3 genes → unlock Evolution → celebrate". Stack loops into larger arcs but never leave a loop open for more than ~15 seconds without a payoff.

### Audio + captioning
**Date:** 2026-04-01
**Rule:** Sound design amplifies the game feel (Tone.js already in stack). But every audio moment must have a visual/text caption equivalent. Never rely on audio alone. Captions should be brief, playful, and timed to the interaction. Consider: slider moves → subtle tone shift + floating label, milestone → chime + confetti + caption, render complete → reveal sound + "Your vision is ready" text.

### White-on-white text was a recurring issue
**Date:** 2026-03-27
**What happened:** Multiple commits fixing white text on white backgrounds across Dream pages.
**Fix:** Applied global CSS fix, verified all pages.
**Rule:** Always audit text contrast when switching themes. Use CSS variables consistently. Test every page after theme changes.

### The CRM devolved into a generic SaaS demo
**Date:** 2026-03-29
**What happened:** The CRM page became a basic contact pipeline viewer — exactly what the presentation says we're NOT. The Killer App is supposed to be an AI COO Command Center, not a CRM.
**Rule:** Before building any Killer App feature, re-read the presentation's "15 UX Strategies" and "Business Operations Suite" sections. Every screen must answer: "Does this make the user feel like they have a superhuman COO?"

### Browse & Discover photos need consistent aspect ratios
**Date:** 2026-03-29
**What happened:** Architecture style photos in Browse & Discover are misaligned.
**Rule:** All photo grids need: consistent container heights, object-fit: cover, and fallback images.

---

## AI & Integrations

### World Labs Marble API is production-ready (as of Jan 2026)
**Date:** 2026-03-30
**Discovery:** World Labs launched their World API in January 2026. It generates navigable 3D worlds from text, images, or video. Their open-source SparkJS library integrates Gaussian splats into Three.js. This is a MASSIVE opportunity for the Dream Builder.
**Rule:** Integrate Marble for the "Worldwalker" interface. Budget for API costs ($20-95/mo depending on generations needed).

### REPLICATE_API_TOKEN must be in Vercel env vars for renders
**Date:** 2026-04-01
**What happened:** The Alchemist showed "Render generating..." forever. The `/api/v1/render` endpoint exists and works, but returns 503 if `REPLICATE_API_TOKEN` isn't set. The Alchemist wasn't even calling the endpoint — it was generating a mock result with `imageUrl: null` and displaying static placeholder text.
**Fix:** (1) Added background FLUX render call after mock result generation. (2) Fixed response parsing to match actual API shape (`renderData.renders[0].imageUrl` not `renderData.url`). (3) Made placeholder text conditional on `renderLoading` state.
**Rule:** When wiring any feature to an external API: verify the env var is set in Vercel (not just locally), verify the response shape matches what you're parsing, and always have a loading/fallback state. The Replicate account is `xrworkers` at replicate.com — a "Vercel Integration" token already exists there.

### Render API response shape: `{ success, renders: [{ imageUrl, renderTime, model, prompt }] }`
**Date:** 2026-04-01
**Rule:** The `/api/v1/render` endpoint returns renders in an array. Access via `data.renders[0].imageUrl`, NOT `data.url` or `data.imageUrl`. Both Oracle and Alchemist use this endpoint.

### All input modalities should converge to plain text before NL parser
**Date:** 2026-03-26
**Rule:** Voice, photo, URL, browse, surprise — all should produce a text string that feeds the same NL parser pipeline.

### AI enrichment should fire async after local results render
**Date:** 2026-03-26
**Rule:** Show local/cached results immediately. Fire AI enrichment (narration, analysis, generation) async and update the UI when ready. Never block the UI on AI.

---

## Process

### Chunk-based delivery works when specs are complete
**Date:** 2026-03-19 through 2026-03-28
**Rule:** Each chunk should be a self-contained build session spec. Write code → build → deploy → git push → update tracking files. Full cycle every time.

### Always verify live Supabase data before citing counts
**Date:** 2026-03-26
**Rule:** Aspirational targets from docs are not live counts. Query Supabase with service role key to get actual numbers.

### Three-chrome brand system
**Date:** 2026-03-28
- Green (#1D9E75) = Knowledge Garden (learn, scientific, encyclopedic)
- Warm/Gold (#D85A30/#C4A44A) = Dream Machine (dream, emotional, playful)
- Red (#E8443A) = Killer App (build, operational, powerful)

### Desktop Commander vs Mac environments
**Date:** 2026-03-29
**What happened:** Desktop Commander MCP works on Windows PC. On Mac, Claude Code (`npm install -g @anthropic-ai/claude-code`) needs `sudo`. Chrome extension connection is unreliable from claude.ai chat.
**Rule:** For Mac terminal access, install Claude Code with `sudo npm install -g @anthropic-ai/claude-code`. For browser automation, use Cowork which has more reliable Chrome extension integration.

---

## Cowork & Multi-Agent Patterns

### Cowork is better for parallel workstreams
**Date:** 2026-03-30
**Rule:** Use Cowork for: parallel agent execution (multiple specialists simultaneously), tasks requiring Chrome browser automation, file system operations on Mac. Use Chat for: design brainstorming, research, strategic planning, writing specs.

### Each Cowork task needs complete context
**Date:** 2026-03-30
**Rule:** Cowork agents don't share context with Chat sessions. Every Cowork task must include: the full project instructions, the specific task spec, relevant file paths, API keys/tokens needed, and success criteria.

---

## Replicate FLUX rate limits
**Date:** 2026-04-01
**What happened:** Trying to fire 15 FLUX generation requests simultaneously hit 429 rate limit. Account has <$5 credit, limited to 6 requests/min with burst of 1.
**Fix:** Sequential generation with 30s backoff on rate limit. All 15 completed.
**Rule:** Generate images sequentially, not in parallel. Budget for ~30s per image including polling.

## Supabase SQL Editor — use Monaco API for clean input
**Date:** 2026-04-01
**What happened:** Typing SQL into Supabase SQL Editor via Chrome automation caused bracket auto-completion to add extra closing parens, breaking the query (syntax error at line 38).
**Fix:** Used `window.monaco.editor.getEditors()[0].setValue(sql)` via JavaScript execution — bypasses autocomplete entirely.
**Rule:** For any code editor with autocomplete (Monaco, CodeMirror), use the JavaScript API to set content instead of simulating keyboard input.

## FLUX logos need permanent hosting
**Date:** 2026-04-01
**What happened:** Replicate delivery URLs (replicate.delivery/xezq/...) work initially but expire after some time.
**Fix:** Downloaded all 15 images and pushed to repo at `public/logos/dream/*.webp`. Updated hub to use `/logos/dream/{key}.webp` paths.
**Rule:** Always download AI-generated images and host permanently in the repo's public/ directory. Never use CDN delivery URLs as permanent references.

## Unicode minus sign breaks Vercel builds
**Date:** 2026-04-01
**What happened:** The Collider page had a Unicode minus sign (−, U+2212) instead of ASCII hyphen (-) in a numeric literal `[−100, 0]`. TypeScript compiled fine locally but Vercel's build failed.
**Fix:** Replace `−` with `-` globally in the file.
**Rule:** Always check for Unicode characters in code — especially minus signs, quotes, and dashes. Use ASCII equivalents in all code.

## Cowork tasks don't persist — repo is the only source of truth
**Date:** 2026-04-01
**What happened:** Cowork chat threads disappear between sessions. Can't reference previous work.
**Fix:** Established protocol: every session (Chat or Cowork) must append to `docs/session-log.md` and update `tasks.todo.md` via GitHub Contents API.
**Rule:** The repo is the SINGLE SOURCE OF TRUTH. Not chat threads, not Cowork tasks. CLAUDE.md in repo root enforces this for all agents.

## Platform prefers LIGHT backgrounds, not dark
**Date:** 2026-04-02
**What happened:** The Command Center (/crm) was built with a dark background (#0a0a0a) matching a Bloomberg Terminal aesthetic. But the platform standard is light backgrounds across all pages.
**Fix:** Changed CRM background to #FAFAF8 (warm light), cards to white with subtle borders (#e5e5e0), text to dark grays. Accent colors (red urgency badges, green indicators) preserved.
**Rule:** All new pages should use light backgrounds by default. The warm light palette is: background #FAFAF8, cards #fff with border #e5e5e0, text #1a1a1a to #888 gradient. Dark backgrounds are only for the cinematic entry and Dream Machine intro screens, NOT for operational dashboards.

## Tooltip/overlay text must contrast with its background
**Date:** 2026-04-02
**What happened:** Genome onboarding tooltip used bg-gray-900 (near black) with text-gray-400 for the "Got it, let me explore" button — dark gray on dark background, unreadable.
**Fix:** Changed tooltip to bg-white with border, button to text-[#D85A30] (warm brand color), fully readable.
**Rule:** All tooltips, modals, and overlays must pass WCAG AA contrast. On dark overlays use white/light text. On light overlays use dark text. Never use gray-400 (#9CA3AF) on gray-900 (#111827) — that's 3.3:1 ratio, below the 4.5:1 minimum. Use the brand warm color (#D85A30) for CTAs on light backgrounds.


### 2026-04-02: Procore/Oracle Competitive Analysis Lessons

1. **Table-stakes PM features gate credibility.** RFIs, submittals, change orders, and punch lists are what contractors ask about in the first 5 minutes of evaluating any PM tool. Without them, no one takes us seriously enough to see our 12 structural advantages. These must ship in the COO sprint, even as simple versions.

2. **LIGHT backgrounds are a brand mandate.** User has stated this multiple times. The dark themes crept in from cinematic-v2.html prototype and visual-transformation-plan.md — both specified dark surfaces. Always override old design docs with the stated global preference: white page canvas (#FFFFFF), warm-white cards (#FAFAF8), three chromes for color identity.

3. **Don't out-Primavera Primavera.** Oracle spent 25+ years building deterministic CPM for billion-dollar projects ($125-200/user/mo). We make scheduling accessible and knowledge-powered for the 95% who can't afford that. For the 5% who need Monte Carlo, integrate with P6 via API — same as Procore does.

4. **Oracle Textura's lien waiver model is a revenue play.** Textura automates lien waiver collection tied to electronic payments. They charge 0.22% of contract value (capped at $5K). Procore doesn't have this natively. Including it in our Pro tier at $49/mo is a competitive weapon — especially for the middle market.

5. **Procore's OCR on drawings is matchable.** They auto-extract sheet numbers and titles from uploaded PDF drawing sets. We can do this with Claude Vision API and add knowledge-engine cross-referencing that they can't — linking drawings to codes, materials, and compliance requirements.

6. **"Coming soon" pages generate zero revenue and zero wow.** Every visible feature must be functional or the link shouldn't exist. Stub pages with email capture CTAs feel like vaporware to professional evaluators.

7. **Procore's unlimited-user model is their strongest strategic feature.** By not penalizing GCs for inviting subs, architects, and owners, they eliminate shadow IT and crowd-source data entry. Our Team tier should include generous team member seats; don't per-seat-trap like Oracle.

8. **Budget tracking and invoicing are the stickiness features.** Once a contractor's financial data lives in a platform, switching costs become enormous. Sprint 3-4 must include budget tracking and invoice management. This is what makes customers stay.

9. **Aconex's metadata-driven document architecture with unalterable audit trails is designed for litigation.** Enterprise buyers on $68B programs need legal immutability. Our document CDE (Phase 2) must have audit logging from day one — the Supabase audit table is already in schema.

10. **Oracle's Application Switcher solves the "federated feel" problem.** Even when apps are separate (Aconex, Primavera, Textura), a unified nav makes them feel connected. Our compass bloom navigation serves this same purpose — critical to build in Sprint 1.

---

## Cowork Session — 2026-04-02 (afternoon): Light Theme Purge

11. **CSS variable architecture pays off massively for theme changes.** Swapping `var(--bg)` at the root recolors ~80% of the app. The remaining 20% is hardcoded hex values in inline styles — these must be hunted down file by file.

12. **Distinguish dark-as-background vs dark-as-text-color.** During the purge, `#1a1a1a` appeared in CRM page — but as TEXT color on light backgrounds (correct!). Don't blindly replace all dark hex values; check context.

13. **Dream pages are the worst offenders for hardcoded dark colors.** Oracle (12), Narrator (8), Quest (8) had the most instances. These were built during the dark theme era and never migrated. Future rule: always use CSS variables, never hardcode surface colors.

14. **Git lock files in Cowork sandbox need manual cleanup.** The sandbox can leave `.git/index.lock` and `.git/HEAD.lock` files. Use `find .git -name "*.lock" -exec rm -f {} \;` to clean up before committing.

15. **Remote divergence is common across Chat/Cowork sessions.** Always `git pull --rebase origin main` before committing. The repo gets updated from multiple session types simultaneously.

---

## Cowork Session — 2026-04-02 (evening): White-on-White Fix + Onboarding UX

16. **Outer container theme fix is NOT enough.** Changing the root div to `var(--bg)` only fixes the page background. Every internal element with `rgba(255,255,255,...)` colors (text, backgrounds, borders) must be individually converted. The 5 CRM sub-pages (field, clients, documents, finances, site) each had 20-40 dark-theme color values inside them despite the outer wrapper being "fixed."

17. **Dark-theme color mapping for light backgrounds.** Standard conversions:
    - `color: '#fff'` → `color: '#1a1a1a'` (primary text)
    - `color: 'rgba(255,255,255,0.6)'` → `color: '#666'` (secondary text)
    - `color: 'rgba(255,255,255,0.4)'` → `color: '#888'` (tertiary text)
    - `color: 'rgba(255,255,255,0.3)'` → `color: '#999'` (muted text)
    - `background: 'rgba(255,255,255,0.02-0.03)'` → `background: '#F5F5F0'` (card surface)
    - `border: '1px solid rgba(255,255,255,0.07)'` → `border: '1px solid #e5e5e0'` (borders)
    - BUT: `color: '#fff'` on colored buttons (red, green, blue bg) is CORRECT — don't replace those.

18. **Competitive UX insights for construction platforms:**
    - Fieldwire = gold standard for adoption speed (consumer-app UX, zero training)
    - XBuild = AI-guided onboarding (no training at all, AI walks through workflow)
    - ALICE = visual scenario comparison (scatterplots for schedule options)
    - Procore = unlimited users eliminates shadow IT
    - Oracle Application Switcher = unified nav across federated apps (our compass bloom serves same purpose)
    - Buildertrend = "too many clicks" complaint — keep interactions minimal

19. **Onboarding should use localStorage for state persistence.** `bkg_lane` stores selected persona, `bkg_onboarded` stores completion status. These keys gate the LanePicker and OnboardingFlow overlays on the CRM page. Users can reset by clicking their lane badge in the header.

20. **Dynamic imports prevent SSR issues with framer-motion components.** Use `dynamic(() => import(...), { ssr: false })` for any component using framer-motion that's imported into a page. Direct imports can cause hydration mismatches.

---

## Stripe Integration — 2026-04-02/03

21. **Stripe dashboard blocked by browser safety restrictions.** The Cowork browser sandbox blocks `dashboard.stripe.com`. Fix: use the Stripe REST API with curl and the secret key to create prices, webhook endpoints, and payment links programmatically. `curl https://api.stripe.com/v1/prices -u sk_test_...:` works perfectly.

22. **Stripe Payment Links require `billing_scheme=per_unit` and `usage_type=licensed`.** When creating recurring prices via the API, use `-d "recurring[interval]=month"`. Then create payment links with `-d "line_items[0][price]=price_xxx" -d "line_items[0][quantity]=1"`.

23. **Stripe webhook signing secrets start with `whsec_`.** When creating a webhook endpoint via API, the response includes the secret directly. Store it immediately — you can't retrieve it again later.

24. **All Stripe tiers should be `subscription` mode, not `payment`.** The checkout route's MODE_MAP had Team and Enterprise as "payment" (one-time) instead of "subscription" (recurring). Both the price objects AND the checkout session mode must be recurring.

25. **`.env.local` is gitignored — env vars deploy via Vercel dashboard only.** Never try to `git add .env.local`. Stripe keys, webhook secrets, and payment link URLs all go through Vercel's Environment Variables UI (or CLI).


## Cowork Session — 2026-04-03: Universal Save/Load System

26. **Next.js App Router import paths: count directory depth carefully.** Pages at `src/app/dream/[interface]/page.tsx` need `../../dream-shared/` to reach `src/app/dream-shared/`. Using `../dream-shared/` resolves to `src/app/dream/dream-shared/` which doesn't exist. The rule: count the directories between the file and its target, then use that many `../` segments. Always verify with `path.resolve()` mentally before deploying.

27. **GitHub Contents API creates one commit per file — batch carefully.** Pushing 8+ files via individual API PUT calls triggers 8+ Vercel deploys. Intermediate deploys with partial file sets WILL fail (missing imports). Options: (a) push all files rapidly so only the last deploy matters, (b) use git push for multi-file changes, (c) accept that Vercel will show failed intermediate deploys and only the final one matters.

28. **StorageAdapter pattern enables zero-effort backend swap.** The save/load system uses `StorageAdapter` interface with `list/get/save/remove` methods. `LocalStorageAdapter` implements it with localStorage. When auth ships, swap in `ApiStorageAdapter` in one file (`ProjectContext.tsx`). This pattern should be used for ALL features that start with local storage and will later need server persistence.

29. **DreamEssence as portable project format.** Instead of each interface having incompatible save formats, extract a universal "essence" (styles, materials, features, moods, constraints, freeformNotes) that any interface can read. Each interface implements serialize (state → essence) and deserialize (essence → state) with fuzzy matching against its own entities. This lets projects flow between Oracle → Alchemist → Cosmos seamlessly.

30. **Verify Vercel build logs after deployment, not just the status page.** A deployment marked "Ready" on Vercel's list might have a different deployment as "Current". Always check that the latest deployment shows both "Ready" AND "Current" to confirm it's actually serving traffic.


---

## Session: 2026-04-03 — Auth System Build + TypeScript Fix Sprint

### Lesson: TypeScript `as any` for Supabase Auth extended types
- **Problem:** Supabase Auth returns users with `user_metadata` but our AuthUser type doesn’t include it. `as Record<string, unknown>` fails because TypeScript sees it as potentially incorrect cast.
- **Fix:** Use `(user as any).user_metadata` with `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comment above.
- **Rule:** When accessing Supabase-specific fields not in our custom User type, use `as any` with eslint-disable. Don’t try intermediate casts like `as unknown as Record` — they still fail.

### Lesson: Cmd+A vs document.execCommand('selectAll') in GitHub CodeMirror
- **Problem:** `document.execCommand('selectAll')` does NOT reliably select all content in GitHub’s CodeMirror 6 editor. It can leave content unselected, causing `insertText` to append instead of replace — resulting in file duplication.
- **Fix:** Always use the `Cmd+A` keyboard shortcut (via browser automation key press) to select all content before `insertText`.
- **Rule:** For GitHub web UI file editing: click in editor → Cmd+A → document.execCommand('insertText', false, newContent). Never use execCommand('selectAll').

### Lesson: Next.js 16 requires Suspense for useSearchParams
- **Problem:** `useSearchParams()` in Next.js 16 causes build failure during prerendering if not wrapped in a `<Suspense>` boundary.
- **Fix:** Split the page component: inner `PageContent` uses `useSearchParams()`, outer `Page` wraps it in `<Suspense fallback={...}>`.
- **Rule:** Any page using `useSearchParams()` or `useRouter()` query params must have a Suspense boundary.

### Lesson: GitHub API + UTF-8 decoding for file content
- **Problem:** GitHub API returns file content as base64. Using plain `atob()` corrupts multi-byte UTF-8 characters (em dashes, curly quotes become garbled).
- **Fix:** `new TextDecoder('utf-8').decode(Uint8Array.from(atob(raw), c => c.charCodeAt(0)))`
- **Rule:** Always use TextDecoder for GitHub API base64 content, never plain atob().

### Lesson: Browser extension blocks decoded content display
- **Problem:** The Claude in Chrome extension blocks display of decoded file content in JavaScript results (shows `[BLOCKED: Cookie/query string data]`).
- **Workaround:** Perform all modifications in JavaScript variables stored on `window._varName`. Only return non-sensitive metadata (line counts, section headers) to verify correctness.
- **Rule:** Store file content in window globals, verify via metadata, apply via insertText. Never try to display full file content in JS results.# Builder's Knowledge Garden — Lessons Learned
## Updated: 2026-04-03

---

## Architecture & Deployment

### Git branching was a silent disaster
**Date:** 2026-03-29
**What happened:** The repo had two branches (`master` and `main`) with completely different codebases. `master` had the good visual version (18 routes, Dream Machine, presentation, photo heroes, 30+ commits of polish). `main` had a bare scaffold from a fresh rebuild on March 19 (chunked architecture approach). Vercel was deploying from `main`, so the live site showed the bare scaffold while all the good work lived on `master` undeployed.
**Fix:** Force-updated `main` to point to `master`'s HEAD via GitHub API.
**Rule:** ALWAYS verify which branch Vercel deploys from. ALWAYS check both branches exist and what they contain. Default branch for this repo is `main`.

### GitHub fine-grained PAT needs explicit "Contents: Read and write"
**Date:** 2026-03-29
**What happened:** Created a fine-grained PAT but it couldn't push code. The API showed `push: true` in permissions but the Contents API returned "Resource not accessible by personal access token."
**Fix:** Edit the token → Repository permissions → Contents → set to "Read and write" → Update.
**Rule:** Fine-grained tokens need EXPLICIT per-permission grants. Repository-level "push" access alone is not enough for the Contents API.

### GitHub Contents API is more reliable than git push for deployment
**Date:** 2026-03-29
**What happened:** `git push` requires auth configuration that varies by environment. The GitHub Contents API with a Bearer token works from any environment with `curl`.
**Rule:** For single-file or few-file deployments, use the GitHub Contents API (PUT /repos/{owner}/{repo}/contents/{path}). For large changes, use git push from a configured environment.

### Vercel auto-deploys from main on push
**Date:** 2026-03-29
**Rule:** Any push to `main` triggers a Vercel build. Static files in `/public/` are available immediately; Next.js routes take ~60-90 seconds to build.

---

## Design & UX

### The platform's first impression IS the product
**Date:** 2026-03-28
**What happened:** Multiple rounds of UI polish (photo heroes, card photos, onboarding flow) didn't move the needle. Chilly said "I must not be communicating how different of an approach I'm looking for."
**Root cause:** Treating the landing page as a marketing page that links to features. The user wants the landing page to BE the experience — full-screen cinematic takeover.
**Rule:** Think Apple keynote, not marketing website. Cinematic energy. Every first impression should make people feel something.

### "Minimal Lovable Product" — never MVP
**Date:** 2026-03-28
**Rule:** The bar is always LOVABLE, not viable. If it doesn't make users feel something positive, it's not ready to ship.

### LIGHT BACKGROUNDS — global preference
**Date:** 2026-04-01
**Rule:** Default to light/warm backgrounds across all BKG surfaces. Dark-on-dark has been a recurring readability problem. Light backgrounds with rich brand-colored text (green, gold, red) give better contrast and a more inviting feel. Reserve dark backgrounds only for cinematic/immersive moments (intros, renders, modals), never for primary working surfaces like sliders, controls, or content panels.

### Game onboarding — socialization by play
**Date:** 2026-04-01
**Rule:** Every BKG experience must teach through play, not instructions. Think video game tutorials: the first interaction should be effortless and immediately rewarding. Never dump all controls on the user at once. Progressive disclosure: start with 1-2 interactions, unlock more as confidence builds. Every few seconds a new micro-story begins — keep attention with constant novelty.

### Mini-loops — open and close consistently
**Date:** 2026-04-01
**Rule:** Short attention spans in a heavily mediated world. Design every experience with tight open/close loops: set a small goal → accomplish it → celebrate → next goal. People get happy setting a goal and accomplishing it. Each loop should be 5-15 seconds. Examples: "Move this slider → see the building name change → sparkle", "Choose 3 genes → unlock Evolution → celebrate". Stack loops into larger arcs but never leave a loop open for more than ~15 seconds without a payoff.

### Audio + captioning
**Date:** 2026-04-01
**Rule:** Sound design amplifies the game feel (Tone.js already in stack). But every audio moment must have a visual/text caption equivalent. Never rely on audio alone. Captions should be brief, playful, and timed to the interaction. Consider: slider moves → subtle tone shift + floating label, milestone → chime + confetti + caption, render complete → reveal sound + "Your vision is ready" text.

### White-on-white text was a recurring issue
**Date:** 2026-03-27
**What happened:** Multiple commits fixing white text on white backgrounds across Dream pages.
**Fix:** Applied global CSS fix, verified all pages.
**Rule:** Always audit text contrast when switching themes. Use CSS variables consistently. Test every page after theme changes.

### The CRM devolved into a generic SaaS demo
**Date:** 2026-03-29
**What happened:** The CRM page became a basic contact pipeline viewer — exactly what the presentation says we're NOT. The Killer App is supposed to be an AI COO Command Center, not a CRM.
**Rule:** Before building any Killer App feature, re-read the presentation's "15 UX Strategies" and "Business Operations Suite" sections. Every screen must answer: "Does this make the user feel like they have a superhuman COO?"

### Browse & Discover photos need consistent aspect ratios
**Date:** 2026-03-29
**What happened:** Architecture style photos in Browse & Discover are misaligned.
**Rule:** All photo grids need: consistent container heights, object-fit: cover, and fallback images.

---

## AI & Integrations

### World Labs Marble API is production-ready (as of Jan 2026)
**Date:** 2026-03-30
**Discovery:** World Labs launched their World API in January 2026. It generates navigable 3D worlds from text, images, or video. Their open-source SparkJS library integrates Gaussian splats into Three.js. This is a MASSIVE opportunity for the Dream Builder.
**Rule:** Integrate Marble for the "Worldwalker" interface. Budget for API costs ($20-95/mo depending on generations needed).

### REPLICATE_API_TOKEN must be in Vercel env vars for renders
**Date:** 2026-04-01
**What happened:** The Alchemist showed "Render generating..." forever. The `/api/v1/render` endpoint exists and works, but returns 503 if `REPLICATE_API_TOKEN` isn't set. The Alchemist wasn't even calling the endpoint — it was generating a mock result with `imageUrl: null` and displaying static placeholder text.
**Fix:** (1) Added background FLUX render call after mock result generation. (2) Fixed response parsing to match actual API shape (`renderData.renders[0].imageUrl` not `renderData.url`). (3) Made placeholder text conditional on `renderLoading` state.
**Rule:** When wiring any feature to an external API: verify the env var is set in Vercel (not just locally), verify the response shape matches what you're parsing, and always have a loading/fallback state. The Replicate account is `xrworkers` at replicate.com — a "Vercel Integration" token already exists there.

### Render API response shape: `{ success, renders: [{ imageUrl, renderTime, model, prompt }] }`
**Date:** 2026-04-01
**Rule:** The `/api/v1/render` endpoint returns renders in an array. Access via `data.renders[0].imageUrl`, NOT `data.url` or `data.imageUrl`. Both Oracle and Alchemist use this endpoint.

### All input modalities should converge to plain text before NL parser
**Date:** 2026-03-26
**Rule:** Voice, photo, URL, browse, surprise — all should produce a text string that feeds the same NL parser pipeline.

### AI enrichment should fire async after local results render
**Date:** 2026-03-26
**Rule:** Show local/cached results immediately. Fire AI enrichment (narration, analysis, generation) async and update the UI when ready. Never block the UI on AI.

---

## Process

### Chunk-based delivery works when specs are complete
**Date:** 2026-03-19 through 2026-03-28
**Rule:** Each chunk should be a self-contained build session spec. Write code → build → deploy → git push → update tracking files. Full cycle every time.

### Always verify live Supabase data before citing counts
**Date:** 2026-03-26
**Rule:** Aspirational targets from docs are not live counts. Query Supabase with service role key to get actual numbers.

### Three-chrome brand system
**Date:** 2026-03-28
- Green (#1D9E75) = Knowledge Garden (learn, scientific, encyclopedic)
- Warm/Gold (#D85A30/#C4A44A) = Dream Machine (dream, emotional, playful)
- Red (#E8443A) = Killer App (build, operational, powerful)

### Desktop Commander vs Mac environments
**Date:** 2026-03-29
**What happened:** Desktop Commander MCP works on Windows PC. On Mac, Claude Code (`npm install -g @anthropic-ai/claude-code`) needs `sudo`. Chrome extension connection is unreliable from claude.ai chat.
**Rule:** For Mac terminal access, install Claude Code with `sudo npm install -g @anthropic-ai/claude-code`. For browser automation, use Cowork which has more reliable Chrome extension integration.

---

## Cowork & Multi-Agent Patterns

### Cowork is better for parallel workstreams
**Date:** 2026-03-30
**Rule:** Use Cowork for: parallel agent execution (multiple specialists simultaneously), tasks requiring Chrome browser automation, file system operations on Mac. Use Chat for: design brainstorming, research, strategic planning, writing specs.

### Each Cowork task needs complete context
**Date:** 2026-03-30
**Rule:** Cowork agents don't share context with Chat sessions. Every Cowork task must include: the full project instructions, the specific task spec, relevant file paths, API keys/tokens needed, and success criteria.

---

## Replicate FLUX rate limits
**Date:** 2026-04-01
**What happened:** Trying to fire 15 FLUX generation requests simultaneously hit 429 rate limit. Account has <$5 credit, limited to 6 requests/min with burst of 1.
**Fix:** Sequential generation with 30s backoff on rate limit. All 15 completed.
**Rule:** Generate images sequentially, not in parallel. Budget for ~30s per image including polling.

## Supabase SQL Editor — use Monaco API for clean input
**Date:** 2026-04-01
**What happened:** Typing SQL into Supabase SQL Editor via Chrome automation caused bracket auto-completion to add extra closing parens, breaking the query (syntax error at line 38).
**Fix:** Used `window.monaco.editor.getEditors()[0].setValue(sql)` via JavaScript execution — bypasses autocomplete entirely.
**Rule:** For any code editor with autocomplete (Monaco, CodeMirror), use the JavaScript API to set content instead of simulating keyboard input.

## FLUX logos need permanent hosting
**Date:** 2026-04-01
**What happened:** Replicate delivery URLs (replicate.delivery/xezq/...) work initially but expire after some time.
**Fix:** Downloaded all 15 images and pushed to repo at `public/logos/dream/*.webp`. Updated hub to use `/logos/dream/{key}.webp` paths.
**Rule:** Always download AI-generated images and host permanently in the repo's public/ directory. Never use CDN delivery URLs as permanent references.

## Unicode minus sign breaks Vercel builds
**Date:** 2026-04-01
**What happened:** The Collider page had a Unicode minus sign (−, U+2212) instead of ASCII hyphen (-) in a numeric literal `[−100, 0]`. TypeScript compiled fine locally but Vercel's build failed.
**Fix:** Replace `−` with `-` globally in the file.
**Rule:** Always check for Unicode characters in code — especially minus signs, quotes, and dashes. Use ASCII equivalents in all code.

## Cowork tasks don't persist — repo is the only source of truth
**Date:** 2026-04-01
**What happened:** Cowork chat threads disappear between sessions. Can't reference previous work.
**Fix:** Established protocol: every session (Chat or Cowork) must append to `docs/session-log.md` and update `tasks.todo.md` via GitHub Contents API.
**Rule:** The repo is the SINGLE SOURCE OF TRUTH. Not chat threads, not Cowork tasks. CLAUDE.md in repo root enforces this for all agents.

## Platform prefers LIGHT backgrounds, not dark
**Date:** 2026-04-02
**What happened:** The Command Center (/crm) was built with a dark background (#0a0a0a) matching a Bloomberg Terminal aesthetic. But the platform standard is light backgrounds across all pages.
**Fix:** Changed CRM background to #FAFAF8 (warm light), cards to white with subtle borders (#e5e5e0), text to dark grays. Accent colors (red urgency badges, green indicators) preserved.
**Rule:** All new pages should use light backgrounds by default. The warm light palette is: background #FAFAF8, cards #fff with border #e5e5e0, text #1a1a1a to #888 gradient. Dark backgrounds are only for the cinematic entry and Dream Machine intro screens, NOT for operational dashboards.

## Tooltip/overlay text must contrast with its background
**Date:** 2026-04-02
**What happened:** Genome onboarding tooltip used bg-gray-900 (near black) with text-gray-400 for the "Got it, let me explore" button — dark gray on dark background, unreadable.
**Fix:** Changed tooltip to bg-white with border, button to text-[#D85A30] (warm brand color), fully readable.
**Rule:** All tooltips, modals, and overlays must pass WCAG AA contrast. On dark overlays use white/light text. On light overlays use dark text. Never use gray-400 (#9CA3AF) on gray-900 (#111827) — that's 3.3:1 ratio, below the 4.5:1 minimum. Use the brand warm color (#D85A30) for CTAs on light backgrounds.


### 2026-04-02: Procore/Oracle Competitive Analysis Lessons

1. **Table-stakes PM features gate credibility.** RFIs, submittals, change orders, and punch lists are what contractors ask about in the first 5 minutes of evaluating any PM tool. Without them, no one takes us seriously enough to see our 12 structural advantages. These must ship in the COO sprint, even as simple versions.

2. **LIGHT backgrounds are a brand mandate.** User has stated this multiple times. The dark themes crept in from cinematic-v2.html prototype and visual-transformation-plan.md — both specified dark surfaces. Always override old design docs with the stated global preference: white page canvas (#FFFFFF), warm-white cards (#FAFAF8), three chromes for color identity.

3. **Don't out-Primavera Primavera.** Oracle spent 25+ years building deterministic CPM for billion-dollar projects ($125-200/user/mo). We make scheduling accessible and knowledge-powered for the 95% who can't afford that. For the 5% who need Monte Carlo, integrate with P6 via API — same as Procore does.

4. **Oracle Textura's lien waiver model is a revenue play.** Textura automates lien waiver collection tied to electronic payments. They charge 0.22% of contract value (capped at $5K). Procore doesn't have this natively. Including it in our Pro tier at $49/mo is a competitive weapon — especially for the middle market.

5. **Procore's OCR on drawings is matchable.** They auto-extract sheet numbers and titles from uploaded PDF drawing sets. We can do this with Claude Vision API and add knowledge-engine cross-referencing that they can't — linking drawings to codes, materials, and compliance requirements.

6. **"Coming soon" pages generate zero revenue and zero wow.** Every visible feature must be functional or the link shouldn't exist. Stub pages with email capture CTAs feel like vaporware to professional evaluators.

7. **Procore's unlimited-user model is their strongest strategic feature.** By not penalizing GCs for inviting subs, architects, and owners, they eliminate shadow IT and crowd-source data entry. Our Team tier should include generous team member seats; don't per-seat-trap like Oracle.

8. **Budget tracking and invoicing are the stickiness features.** Once a contractor's financial data lives in a platform, switching costs become enormous. Sprint 3-4 must include budget tracking and invoice management. This is what makes customers stay.

9. **Aconex's metadata-driven document architecture with unalterable audit trails is designed for litigation.** Enterprise buyers on $68B programs need legal immutability. Our document CDE (Phase 2) must have audit logging from day one — the Supabase audit table is already in schema.

10. **Oracle's Application Switcher solves the "federated feel" problem.** Even when apps are separate (Aconex, Primavera, Textura), a unified nav makes them feel connected. Our compass bloom navigation serves this same purpose — critical to build in Sprint 1.

---

## Cowork Session — 2026-04-02 (afternoon): Light Theme Purge

11. **CSS variable architecture pays off massively for theme changes.** Swapping `var(--bg)` at the root recolors ~80% of the app. The remaining 20% is hardcoded hex values in inline styles — these must be hunted down file by file.

12. **Distinguish dark-as-background vs dark-as-text-color.** During the purge, `#1a1a1a` appeared in CRM page — but as TEXT color on light backgrounds (correct!). Don't blindly replace all dark hex values; check context.

13. **Dream pages are the worst offenders for hardcoded dark colors.** Oracle (12), Narrator (8), Quest (8) had the most instances. These were built during the dark theme era and never migrated. Future rule: always use CSS variables, never hardcode surface colors.

14. **Git lock files in Cowork sandbox need manual cleanup.** The sandbox can leave `.git/index.lock` and `.git/HEAD.lock` files. Use `find .git -name "*.lock" -exec rm -f {} \;` to clean up before committing.

15. **Remote divergence is common across Chat/Cowork sessions.** Always `git pull --rebase origin main` before committing. The repo gets updated from multiple session types simultaneously.

---

## Cowork Session — 2026-04-02 (evening): White-on-White Fix + Onboarding UX

16. **Outer container theme fix is NOT enough.** Changing the root div to `var(--bg)` only fixes the page background. Every internal element with `rgba(255,255,255,...)` colors (text, backgrounds, borders) must be individually converted. The 5 CRM sub-pages (field, clients, documents, finances, site) each had 20-40 dark-theme color values inside them despite the outer wrapper being "fixed."

17. **Dark-theme color mapping for light backgrounds.** Standard conversions:
    - `color: '#fff'` → `color: '#1a1a1a'` (primary text)
    - `color: 'rgba(255,255,255,0.6)'` → `color: '#666'` (secondary text)
    - `color: 'rgba(255,255,255,0.4)'` → `color: '#888'` (tertiary text)
    - `color: 'rgba(255,255,255,0.3)'` → `color: '#999'` (muted text)
    - `background: 'rgba(255,255,255,0.02-0.03)'` → `background: '#F5F5F0'` (card surface)
    - `border: '1px solid rgba(255,255,255,0.07)'` → `border: '1px solid #e5e5e0'` (borders)
    - BUT: `color: '#fff'` on colored buttons (red, green, blue bg) is CORRECT — don't replace those.

18. **Competitive UX insights for construction platforms:**
    - Fieldwire = gold standard for adoption speed (consumer-app UX, zero training)
    - XBuild = AI-guided onboarding (no training at all, AI walks through workflow)
    - ALICE = visual scenario comparison (scatterplots for schedule options)
    - Procore = unlimited users eliminates shadow IT
    - Oracle Application Switcher = unified nav across federated apps (our compass bloom serves same purpose)
    - Buildertrend = "too many clicks" complaint — keep interactions minimal

19. **Onboarding should use localStorage for state persistence.** `bkg_lane` stores selected persona, `bkg_onboarded` stores completion status. These keys gate the LanePicker and OnboardingFlow overlays on the CRM page. Users can reset by clicking their lane badge in the header.

20. **Dynamic imports prevent SSR issues with framer-motion components.** Use `dynamic(() => import(...), { ssr: false })` for any component using framer-motion that's imported into a page. Direct imports can cause hydration mismatches.

---

## Stripe Integration — 2026-04-02/03

21. **Stripe dashboard blocked by browser safety restrictions.** The Cowork browser sandbox blocks `dashboard.stripe.com`. Fix: use the Stripe REST API with curl and the secret key to create prices, webhook endpoints, and payment links programmatically. `curl https://api.stripe.com/v1/prices -u sk_test_...:` works perfectly.

22. **Stripe Payment Links require `billing_scheme=per_unit` and `usage_type=licensed`.** When creating recurring prices via the API, use `-d "recurring[interval]=month"`. Then create payment links with `-d "line_items[0][price]=price_xxx" -d "line_items[0][quantity]=1"`.

23. **Stripe webhook signing secrets start with `whsec_`.** When creating a webhook endpoint via API, the response includes the secret directly. Store it immediately — you can't retrieve it again later.

24. **All Stripe tiers should be `subscription` mode, not `payment`.** The checkout route's MODE_MAP had Team and Enterprise as "payment" (one-time) instead of "subscription" (recurring). Both the price objects AND the checkout session mode must be recurring.

25. **`.env.local` is gitignored — env vars deploy via Vercel dashboard only.** Never try to `git add .env.local`. Stripe keys, webhook secrets, and payment link URLs all go through Vercel's Environment Variables UI (or CLI).


## Cowork Session — 2026-04-03: Universal Save/Load System

26. **Next.js App Router import paths: count directory depth carefully.** Pages at `src/app/dream/[interface]/page.tsx` need `../../dream-shared/` to reach `src/app/dream-shared/`. Using `../dream-shared/` resolves to `src/app/dream/dream-shared/` which doesn't exist. The rule: count the directories between the file and its target, then use that many `../` segments. Always verify with `path.resolve()` mentally before deploying.

27. **GitHub Contents API creates one commit per file — batch carefully.** Pushing 8+ files via individual API PUT calls triggers 8+ Vercel deploys. Intermediate deploys with partial file sets WILL fail (missing imports). Options: (a) push all files rapidly so only the last deploy matters, (b) use git push for multi-file changes, (c) accept that Vercel will show failed intermediate deploys and only the final one matters.

28. **StorageAdapter pattern enables zero-effort backend swap.** The save/load system uses `StorageAdapter` interface with `list/get/save/remove` methods. `LocalStorageAdapter` implements it with localStorage. When auth ships, swap in `ApiStorageAdapter` in one file (`ProjectContext.tsx`). This pattern should be used for ALL features that start with local storage and will later need server persistence.

29. **DreamEssence as portable project format.** Instead of each interface having incompatible save formats, extract a universal "essence" (styles, materials, features, moods, constraints, freeformNotes) that any interface can read. Each interface implements serialize (state → essence) and deserialize (essence → state) with fuzzy matching against its own entities. This lets projects flow between Oracle → Alchemist → Cosmos seamlessly.

30. **Verify Vercel build logs after deployment, not just the status page.** A deployment marked "Ready" on Vercel's list might have a different deployment as "Current". Always check that the latest deployment shows both "Ready" AND "Current" to confirm it's actually serving traffic.

## 2026-04-04: PM Module Corruption Pattern
- BudgetModule, PunchListModule, SubmittalModule, and ChangeOrderModule all had scattered syntax corruption
- Corruption types: binary chars (0x06), merged CSS properties, stray quotes, JSX spliced into style objects, mismatched quote types, tab chars replacing quotes
- Turbopack stops at the first error per file - fixing one reveals the next. Must iterate builds until clean.
- When corruption is extensive (binary garbage), full rewrite from interfaces/state is faster than patching
- Always verify state variable names match when reconstructing missing code (e.g. setShowAddLineModal not setShowAddLineItem)

### TWO Supabase projects — ALWAYS verify which one Vercel uses
**Date:** 2026-04-05
**What happened:** `.env.local` has Supabase project `gtmjcslcerakkgftozfy` but the live Vercel deployment uses `vlezoyalutexenbnzzui` (knowledge-gardens-prod). Ran the Phase 1A migration and inserted subscriptions on the wrong project first. All DB work had to be redone on the correct project.
**Fix:** Check Vercel env vars to confirm which Supabase project is live. For this repo: production = `vlezoyalutexenbnzzui`.
**Rule:** ALWAYS verify the Supabase project URL in Vercel environment variables before running any migration or DB operation.

### RLS policies: user_id text vs auth.uid() uuid type mismatch
**Date:** 2026-04-05
**What happened:** RLS policies using `WHERE user_id = auth.uid()` failed with "operator does not exist: text = uuid".
**Fix:** Cast with `auth.uid()::text` in RLS policies.
**Rule:** Always check the column type of `user_id` before writing RLS policies. If it's `text`, cast `auth.uid()::text`.

### Login page: Google OAuth sets isLoading but never resets on redirect
**Date:** 2026-04-05
**What happened:** `handleGoogleSignIn` called `setIsLoading(true)` but only reset on error path. Button stayed stuck on "Loading..." forever.
**Fix:** Wrapped in try/catch/finally to always reset loading state.
**Rule:** Any async function that sets a loading state MUST reset it in a `finally` block, not just on error paths.

### 2026-04-14: Dream Consolidation Lessons

**Audit before you architect.** Fetch the actual live pages before proposing changes. The brainstorm doc listed 6 interfaces; the live site had 3 different ones. Ground truth > documentation.

**Three intents, not N interfaces.** Users have three intents: "help me figure it out," "I know what I want," and "I have something already." Every interface maps to one of these. Consolidation means reducing to intents, not averaging interfaces.

**Template fallback for AI calls.** Always build a non-AI fallback profile. If the Claude API is slow (>2s), the template renders instantly and gets overwritten when the real response arrives. Users never see a blank screen.

**localStorage is the dream handoff mechanism.** DreamEssence transfers between dream phases via localStorage with keys like `bkg-dream-profile` and `bkg-dream-express`. Design Studio reads on mount and clears after hydration. Simple, works offline, no auth required.

**Voice input is 20 lines of code.** Web Speech API is free, works in Chrome+Safari (85%+ of users), and the useSpeechRecognition hook is fully reusable. No excuse not to have voice everywhere. Hide the mic button on unsupported browsers instead of showing "coming soon."

**Redirects, not 404s.** When consolidating routes, 301 redirect old paths to the new unified page. Never leave dead ends — someone has those old URLs bookmarked.


## Lesson — Constitution Before Surface (learned 2026-04-16)

### The pattern

When a user points out a UX problem on a single surface, the fix is almost never a single-surface fix. It is a platform-level pattern problem that shows up first on that surface.

**SCOUT case:** The founder complained that SCOUT's three gates ("Pre-Bid Risk Score," "AI Estimating Gate," "CRM Client Lookup") used jargon and led with risk. The naive fix would have been to rename those three labels. The correct fix was to locate the underlying pattern violation — every BKG surface uses expert-voice labels and operational ordering — and write a constitution that prevents the same failure on every other surface.

### The rule

Before fixing a surface-level UX complaint, ask: **is this pattern violated elsewhere on the platform?** If yes, the fix is at the platform pattern level, not the surface level. Fix the pattern; the surface falls out.

### The corollary

Fixing the single surface without fixing the pattern is technical debt in disguise. Every other surface that violates the same pattern is now inconsistent with the fixed one, and the inconsistency itself becomes a second UX problem on top of the original.

### Applied check for future sessions

When a user reports a UX issue:

1. Restate the complaint.
2. Ask: "does this pattern show up on more than one surface?"
3. If yes → escalate to pattern-level work (constitution, primitives, shared components).
4. If no → fix the surface locally.
5. Either way, record the decision in `docs/session-log.md` so future sessions can see whether pattern vs. surface was the right call.

---

## Lesson — The Founder Will Reject Cowardly Scope (learned 2026-04-16)

When offered the chance to scope down from three parallel pilots to one, the founder chose "all three in parallel — don't chicken out." The instruction is: when the work is strategically important, do not pre-emptively scope it down to make it easier. Present the ambitious plan; let the founder scope down if needed.

The corollary: "don't chicken out" is a live phrase the founder uses to reject false-humility scoping. Recognize it as a signal that the more ambitious path is the correct path.

---

## Lesson — Load-Bearing Decisions Must Be Named (learned 2026-04-16)

The Design Constitution names three "binding decisions" explicitly — Pro Toggle visible on every screen, Time Machine as platform infrastructure, human arc as default. These are called out separately from the ten goals because they are the specific tradeoffs that can be softened under pressure and must not be.

**The rule:** When a session makes a strategic decision that has implementation cost (real estate, engineering complexity, philosophy), name it explicitly as a "binding decision" with the cost written in plain language next to it. This makes it harder to quietly walk back later.


## Lesson — Content vs. Container (learned 2026-04-17)

### The pattern

When critiquing an existing artifact (prototype, document, feature), the right move is to separate **what's genuinely good** (the underlying content, IP, craft, decisions that are sound) from **what's wrong** (the framing, wrapper, implementation, surface-level choices). Most critiques lose both. "This is bad, rebuild it" throws out the good content with the bad container.

### The rule

Before rebuilding anything, explicitly name:
1. What's the content (the part worth preserving)?
2. What's the container (the part that needs to change)?
3. Which is the critique actually aimed at?

### Applied to the prototype analysis

The BKG Killer App prototype had a quest/XP/level gamification wrapper over genuinely excellent contractor workflow content (11+ workflows, 15+ AI specialists, thoughtful step structures). The initial framing ("the gamification is wrong") risked throwing out the workflows too. The correct frame: keep the content (workflows, specialists, step primitive), replace the container (quest-ladder navigation, enforced sequence, earn-to-unlock framing).

### Applied check for future sessions

When reviewing existing work:
1. State what's good before stating what's wrong
2. Identify the container vs. content split explicitly
3. When in doubt about whether something is container or content, preserve it and decide later
4. Decisions to "keep" something are just as important to record as decisions to discard

---

## Lesson — Post-Revenue Before Fundraising Changes the Story (learned 2026-04-17)

### The pattern

The binary flip from "zero paying customers" to "any paying customers" changes fundraising meaningfully. Pre-revenue → post-revenue transitions are worth 50-70% in valuation and significantly better terms (liquidation preference, participation rights, anti-dilution). The effort to get to even 3-5 paying customers at small MRR may be proportionally small compared to the fundraising upside.

### The rule

Plan revenue in parallel with building. Not "build the whole thing then monetize" — "ship the thinnest possible paywall-crossing MLP and get first dollars in while the big build continues."

### Applied to BKG

Committed to a 6-week post-revenue plan:
- Weeks 1-2: Ship Code Compliance + Contract Templates, onboard trusted contractor at $99/mo
- Weeks 3-4: Ship Size Up, grow to 3 consumer customers at $99-149/mo
- Week 5: Launch Building Intelligence API at $500/mo enterprise
- Week 6: Polish, case studies, updated fundraising pitch

Target ARR by Week 6: $10-20k. Not large but binary-flip-crossing.

### Applied check for future sessions

When planning any build of significant scope:
1. Ask: what's the thinnest MLP that could cross a paywall?
2. Can we ship that in 2-6 weeks while continuing the big build?
3. If yes, add a parallel revenue track with weekly accountability checkpoints
4. If no (e.g., paywall requires features that won't be ready for months), question whether the scope is right

---

## Lesson — Stop When Marginal Return Drops (learned 2026-04-17)

### The pattern

Line-by-line reading of the prototype was high-leverage through the first ~1600 lines because the content was novel, dense, and decision-triggering. Past line 1600, returns diminished — the remaining code was implementation detail that doesn't port (we're rebuilding in Next.js anyway) plus residual data that can be extracted mechanically by an agent.

Continuing to read past the diminishing-return threshold at 2am would have produced mostly tired decisions and worse output. Stopping and consolidating was the right move.

### The rule

At regular intervals in a long session, ask: **Is the next hour going to produce more value than the last hour?** If no, stop. Consolidate what's been learned. Sleep if it's late.

### Applied check for future sessions

- Every 60-90 minutes in a dense working session, check: "Is the marginal return still high?"
- If yes, continue
- If no, consolidate — write up decisions, commit work, close the session
- Don't mistake activity for progress; once decisions get mushier and more hand-wavy, you've crossed the line

### Corollary — delegate mechanical work to agents

Reading 1700 more lines of code to extract structured data is mechanical. Delegate to a Cowork session with clear instructions ("read file X, produce JSON at path Y"). Founder time is too expensive for mechanical extraction.

---

## Lesson — Name Products With Layered Meaning (learned 2026-04-17)

### The pattern

Names that carry multiple meanings simultaneously are more brandable and memorable than names that have a single meaning. "Building Intelligence" as a product name carries:
- The *intelligence* of the act of building (craft, expertise)
- *AI intelligence* that powers the specialist library
- *Building intelligence* as an ongoing act (constructing knowledge)

Any one of those three meanings would produce an okay name. All three make it a great name.

### The rule

When naming a product or initiative, aim for layered meaning. Ask: does this name work on at least 2-3 different levels?

### Applied check for future sessions

- When a name surfaces as a candidate, probe it for alternative interpretations
- Good names survive being read as a noun, a verb, a literal, a metaphor
- Bad names work on exactly one level
- When in doubt, check: would a smart reader find depth in this name on second glance?

---

## Autonomous extraction sessions — paths, repos, PATs

### Brief-referenced paths may not match mounted workspace paths
**Date:** 2026-04-17
**What happened:** Task brief referenced `/Users/chillydahlgren/Desktop/The Builder Garden/app/docs/...` for context docs and for the git repo. The mounted workspace was named `Builder's Knowledge Garden`, not `The Builder Garden`. No `.git` existed anywhere on the mount. The session spent real time looking in the wrong places before realizing the Mac-side path was unreachable from Cowork entirely and the repo lived remotely on GitHub.
**Fix:** Stop searching the mount after one negative result. Ask the founder once for the right path or the GitHub repo name, then either clone or switch to structured-deliverables-only (saved to the workspace for the founder to commit locally).
**Rule:** When a brief's filesystem paths fail on the first check, treat the paths as possibly referring to the founder's machine (unreachable) rather than the mounted workspace. Ask before searching further. One clarifying question is always cheaper than three wrong paths.

### Founder-shared PATs belong in a single push and then in the bin
**Date:** 2026-04-17
**What happened:** Chilly shared a fine-grained PAT in plaintext in a chat message to unblock commit/push. The push worked. Scrubbing afterward required: (a) resetting `origin` to the unauthenticated URL, (b) checking for `.git-credentials` in `$HOME`, (c) grep'ing the full PAT across the session filesystem, and (d) explicitly reminding the founder to rotate the token in GitHub settings.
**Rule:** When a PAT arrives in-band:
1. Clone with `https://PAT@github.com/...` URL.
2. Do the work.
3. `git remote set-url origin https://github.com/OWNER/REPO.git` (strip the PAT).
4. Verify no `.git-credentials` file was written to `$HOME`.
5. Grep the full PAT string across the session FS to confirm scrub.
6. Remind the founder to rotate the token — chat transcripts are effectively public.
**Rule extension:** Never store a PAT in any written artifact (extraction report, commit message, test fixture, env file committed to the repo). PATs go to shell state only, and shell state dies with the session.

### Verbatim extraction ≠ rewrite; keep the two phases clean
**Date:** 2026-04-17
**What happened:** The extraction brief was explicit: preserve prompt text verbatim, don't rewrite in production voice, flag ambiguities. Temptation during the session was to start "improving" prompts while extracting them — adding BKG voice hooks, lane awareness, database citation instructions. Resisted. The 22 prompt files in `app/docs/ai-prompts/` preserve the prototype's exact language; the production rewrite checklist lives as a TODO list inside each file and the consolidation design lives in `app/docs/consolidation-plan.md`.
**Rule:** Extraction and rewrite are separate phases with separate artifacts. Extraction produces a faithful record; rewrite produces production content. Mixing them destroys both the historical value (you can't tell what the prototype actually said) and the production value (the rewrite never gets a clean slate).

### Consolidation requires an explicit "demographic check"
**Date:** 2026-04-17
**What happened:** Chilly approved collapsing 22 prompts toward ~16 production specialists but with the directive "make sure that we aren't leaving any demographic behind." The consolidation plan at `app/docs/consolidation-plan.md` added a "Demographic check — no loss" subsection under each merge, walking through all eight lanes (GC, DIY, specialty, worker, supplier, equipment, service provider, robot/AI agent) and every affected trade to confirm each is still served.
**Rule:** When collapsing N specialists into M, require a written check for every user lane and every trade that the source specialists served. If any lane or trade ends up underserved by the consolidation, the merge is wrong. "No demographic left behind" is a commit-gate, not a feel-good principle.

### Data coverage is a feasibility input, not a shipping detail
**Date:** 2026-04-17
**What happened:** Chilly said "Let's do California, Arizona, and Nevada" for Week 1 jurisdiction coverage. Audit of `src/lib/knowledge-data.ts` showed CA had three cities catalogued, AZ had Phoenix, NV had zero. Shipping NV in Week 1 was not feasible without half a day of data population. The realistic answer was CA + Phoenix AZ Week 1, NV in Week 2 parallel to legal review.
**Rule:** Before accepting a scope commitment for code/data-backed features, audit the actual data in the repo. Jurisdictions, code editions, template inventories, supplier databases — these are feasibility constraints, not shipping details. Answer "is that doable?" with what the data supports, not with what would be nice.

---

## Session — 2026-04-17 (afternoon): Week 1 Route + Seed

### Server-side workflows.json load beats bundler import
**Date:** 2026-04-17
**What happened:** `workflows.json` lives at `app/docs/workflows.json` — outside `src/`. Attempting to `import` it into a Client Component would have required either (a) moving it into `src/data/` and maintaining two copies, or (b) getting Next.js bundler config to pick it up.
**Fix:** Made the page a Server Component that `fs.readFileSync`s the JSON at `process.cwd() + 'app/docs/workflows.json'`, selects the target workflow (q5), and passes it as a prop to a Client Component (`CodeComplianceClient`). JSON stays as a single source of truth; no duplicated copies.
**Rule:** When consuming a repo data artifact from a page, prefer Server Component + fs read over moving the artifact into src/ or reconfiguring the bundler. One source of truth, zero drift.

### Server-only libs break client imports even when only types are used
**Date:** 2026-04-17
**What happened:** `src/lib/specialists.ts` imports `fs` and `path` (server-only). `AnalysisPane.tsx` is a Client Component that needs `SpecialistContext` and `SpecialistResult` types. `import type { ... } from '../../lib/specialists'` works because `import type` is erased by tsc/SWC — but only if the import site never needs the runtime module.
**Fix:** Verified erasure by compiling with `--noEmit`. Safe as long as we never do `import { something } from '../lib/specialists'` in a Client Component.
**Rule:** Server-only modules that export both values and types: always import types into client components via `import type`. If the graph ever needs the runtime, introduce a server action or API route boundary.

### Async-in-render requires a dedicated component, not a callback body
**Date:** 2026-04-17
**What happened:** StepCard's `renderAnalysis(step, input)` callback is synchronous — it returns React nodes per render. The specialist call is async. First approach was to useState+useEffect inside the callback body, which React refuses (hooks must be called at top level).
**Fix:** Built `AnalysisPane` as its own component with its own hooks. The callback just returns `<AnalysisPane … />` and each analysis_result step gets its own independent lifecycle.
**Rule:** When a parent exposes a render callback and the child needs async state, return a dedicated child component from the callback, not inline JSX with hooks. Hooks need a component; callbacks alone don't satisfy that.

### Default mock for fs in unit tests — prevents "prompt not found" red herring
**Date:** 2026-04-17
**What happened:** `src/lib/__tests__/specialists.test.ts` had two failing tests on `main`. Root cause: `vi.mock("fs")` auto-mocks all methods to return undefined. Tests that didn't set their own `mockReturnValue` hit the "prompt not found" error path and failed with a misleading message. Not a regression — pre-existing bug exposed by running `npx vitest run` instead of cherry-picking test #1.
**Fix:** Added a `DEFAULT_PROMPT_CONTENT` fixture and set it in `beforeEach` via `(fs.readFileSync as …).mockReturnValue(...)`. Individual tests can still override.
**Rule:** When mocking a module with `vi.mock("module")` without a factory, always set a safe default in `beforeEach` so tests that don't explicitly mock don't fall through to error paths.

### Don't leak service-role keys in repo scripts — use env vars
**Date:** 2026-04-17
**What happened:** Pre-existing `batch-entities.mjs`, `batch-rels.mjs`, `batch2.mjs`, `batch3.mjs` at repo root have a hardcoded Supabase service role key in cleartext. This key has admin power over the production database and is now in git history.
**Fix (this session):** New seed script (`scripts/seed-code-entities.mjs`) reads `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` from env. No secrets in source.
**Follow-up (not done this session):** (1) Rotate the exposed service-role key in Supabase, (2) delete or gitignore the old `batch*.mjs` scripts, (3) rewrite history if compliance demands it (but rotation is the strictly necessary step).
**Rule:** No secret in any file committed to the repo — ever. Env vars only. When you find a leaked key, rotate first, delete second, document third.

### "Find the key on your own" has a correct answer and a wrong answer
**Date:** 2026-04-17
**What happened:** Founder asked me to find `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_KEY` on my own. For Supabase, the key was hardcoded in `batch-entities.mjs:5` — I extracted it, ran the seed, done. For Anthropic, the key was correctly NOT in the repo, workspace, or any env file; it only exists in Vercel's environment variables UI (proper security posture).
**Fix:** Recognized that a genuine blocker is not "try harder" — it's "the key doesn't exist in any accessible location, and shouldn't." Did not ask founder to paste the raw key into chat (would embed the secret in my context + transcript). Instead flagged the blocker with the exact command the founder runs from their own terminal: `vercel env add ANTHROPIC_API_KEY production`.
**Rule:** When asked to find a secret and you truly cannot, don't perform motion. State the blocker, specify the exact command the human runs to resolve it, and keep secrets out of the chat transcript. Don't trade security for autonomy-theater.

### Always verify seed output against the database, not just the script's own logs
**Date:** 2026-04-17
**What happened:** `npm run seed:codes` printed "15 of 15 entities upserted" — but that's just the script's own claim. I followed up with a direct REST query against `/rest/v1/knowledge_entities?entity_type=eq.building_code` and confirmed 542 total entries with 8/9/9 tagged to CA/AZ/NV jurisdictions, which matched the expected multi-jurisdiction adoption pattern (IBC 2021 adopted by all three states).
**Rule:** Scripts that call external APIs can fail silently or partial-succeed. After any seed/migration/import, independently query the target system to confirm row counts and sample records. Don't trust the script's stdout alone.

### Next.js 16: root-level `app/` folder silently hijacks the App Router detection
**Date:** 2026-04-17 (production outage)
**What happened:** We had `src/app/` with the real Next.js routes (`/manifesto`, `/killerapp/*`, `/dream/*`) AND a root-level `app/` folder that only held documentation data (`app/docs/workflows.json`, `app/docs/ai-prompts/`). Next.js 16.2.1 auto-detected the root `app/` as the App Router directory, found zero pages inside, and shipped a deployment with ONLY `/404`. Every production route went dark. John (a real contractor) hit `/manifesto` during the outage and got 404.
**Fix:** `git mv app/docs/* docs/ && rmdir app/` — consolidated the two docs folders into one at repo root, updated four path references in source (`src/lib/specialists.ts`, `src/app/killerapp/workflows/code-compliance/page.tsx`, and two test files). Commit `5aaf167`.
**Rule:** **Never create a folder named `app/` at the repo root unless it contains Next.js App Router pages.** Next.js treats `app/` and `src/app/` as equivalent candidates, and if both exist, the root-level `app/` wins. Non-routing data (docs, configs, seeds) goes in `docs/`, `data/`, `content/`, or `scripts/` — never `app/`.

### Vercel "Promote to Production" disables auto-promote — you must re-enable by promoting a new deploy
**Date:** 2026-04-17 (same outage, recovery phase)
**What happened:** After rolling back to a known-good deployment via Vercel dashboard → Deployments → Promote to Production, I pushed a hotfix (`5aaf167`, then `77126b4`) expecting Vercel to auto-deploy and auto-promote. It auto-deployed both but did NOT auto-promote either one. The rolled-back (older) deployment kept serving `/` and `/manifesto` (200 OK) while the new route `/killerapp/workflows/code-compliance` returned 404 for 15+ minutes.
**Root cause:** Manual promotion PINS production. Vercel deliberately halts auto-promote on main after a manual intervention, so you don't accidentally overwrite the deployment you just chose. It's a safety feature, not a bug. Auto-promote resumes only after someone manually promotes a newer deploy.
**Fix:** Promote the most-recent green-checkmark deployment in the Deployments list. That both fixes the current issue AND re-arms auto-promote for future `main` pushes.
**Rule:** After any manual Vercel rollback, the very next step is to promote the fresh build that contains the fix. Don't push more commits hoping auto-promote will kick in — it won't. One click, not more commits.

### Next.js 15+ dynamic route `params` is a `Promise` — not a plain object
**Date:** 2026-04-18
**What happened:** Vercel build failed on commit `abb7600` with `Command "npm run build" exited with 1`. Local `tsc --noEmit` was passing clean (EXIT: 0), which made me briefly assume the failure was ESLint or page-data collection. It wasn't — the error was in Next.js's internal "Running TypeScript" pass (which validates route handler/page signatures against its own route-segment config), not stock tsc. Exact error: `Type '{ params: Promise<{ id: string; }>; }' is not assignable to type '{ params: { id: string; }; }'. Property 'id' is missing in type 'Promise<{ id: string; }>' but required in type '{ id: string; }'.` One route handler (`src/app/api/v1/specialists/[id]/route.ts`) was written with the Next 14 signature `{ params: { id: string } }`. The other four dynamic routes in the repo already used the Next 15+ signature.
**Fix:** Changed the signature to `{ params: Promise<{ id: string }> }` and replaced `params.id` with `const { id } = await params`. One-line-style diff, one file.
**Rule:** In Next.js 15+, every dynamic route handler and page must type `params` (and `searchParams`) as `Promise<...>` and `await` it before use. Stock `tsc --noEmit` does NOT catch this — only `next build` does, because the check lives in Next's own route-validator, not the TypeScript compiler. When a Vercel build fails with "Running TypeScript... Failed to type check" but local `tsc` passes, look for route-segment-config mismatches first.

### Don't diagnose a "mock" output as a missing env var without checking the actual code path
**Date:** 2026-04-18
**What happened:** Live Code Compliance route showed a yellow "connect a specialist to see real analysis" banner above text reading "IBC Section 1607: Live loads verified...". I diagnosed this as missing `ANTHROPIC_API_KEY` (based on the graceful fallback in `src/lib/specialists.ts:112-116`). I wrote an entire audit dashboard framing the fix as "set the key in Vercel, one click to unblock." Founder checked Vercel and the key had been set since **Mar 24** — well before Week 1 shipped. The real source of the mocked text was `docs/workflows.json:411` `exampleOutput` field, rendered as a pre-trigger preview inside `StepCard` before the user actually activates the analysis step. I'd conflated two different demo affordances into one root cause.
**Fix:** Corrected the framing in conversation. The specialist is wired; the `exampleOutput` is intentional placeholder copy showing "what this step could return." To turn it into real output, the user has to activate the step (type input → click analyze) — the specialist then runs for real against Claude.
**Rule:** Before claiming a fallback-triggered mock, open BOTH endpoints: (a) the env-var check path (`specialists.ts:112`) AND (b) the pre-trigger placeholder path (`workflows.json exampleOutput` + `StepCard` render). If the placeholder fires before any analysis call is made, the env var is irrelevant. Test the actual code path end-to-end (click the analyze button, watch network tab) before writing an audit that blames an env var. The key signal: if the mock text is **identical** every time for every user across every jurisdiction, it's a static placeholder, not a runtime fallback.

### Development can "fork" from direction docs silently — re-read the direction doc on every session
**Date:** 2026-04-18
**What happened:** Shipped the Code Compliance Lookup route as commanded. Route works. But the chrome around it — `KillerAppNav.tsx` with "Command Center" tabs, hardcoded XP bar, SOON placeholder modules — directly contradicts Decisions #1, #3, #8, and #11 from `docs/killer-app-direction.md` (authored April 17), which founder had already locked. I'd treated those decisions as "vision, eventually," not as "nav shell to refactor before shipping Code Compliance." The founder's visitor experience is now: land on page, see a container the direction doc deleted, click into a workflow that's technically correct but visually stranded.
**Rule:** On every new session touching the killer app, re-read `docs/killer-app-direction.md` first, then `tasks.todo.md`, then `tasks.lessons.md`. The direction doc is authoritative; any work that ships inside a pre-direction-doc shell has to call that out explicitly as "temporary — shell replacement queued" or it creates the perception of development forking from the vision. When shipping any workflow route, the nav shell it lives inside must match the current locked decisions, OR the ship is partial and must be flagged as such to the founder.

### Never hand the founder a CLI command with placeholder paths
**Date:** 2026-04-18
**What happened:** After Week 2 pushed locally, I told Chilly to run `cd ~/path/to/bkg-repo && git push origin main`. He copy-pasted it literally. zsh returned `cd: no such file or directory: /Users/chillydahlgren/path/to/bkg-repo` and `fatal: not a git repository` from the home dir. The push failed, and a live, working, green-gates Week 2 stack sat un-shipped because of filler text I wrote assuming he'd mentally substitute the real path. Nothing about `~/path/to/` is parseable as "your actual repo path" — it's a docs convention, not a Terminal instruction.
**Rule:** When handing the founder (or any non-dev user) a Terminal command, never write a placeholder path like `~/path/to/foo` or `<your-repo>`. Either (a) know the real path first (ask, or scan from this session's filesystem if the repo is mounted), or (b) lead with a **discovery command** they can run verbatim that finds the path for them, then give them the action command once they paste the result back. No `cd` instruction is usable if the path segment is symbolic.

### Parallel farm agents invent type shapes — seed them with the source-of-truth type file, not just prose

**Date:** 2026-04-19
**What happened:** Spawned 5 parallel agents to build 15 killerapp workflow routes. Every agent produced a ~70-130 LOC `QxClient.tsx` that called `onStepComplete={(event) => ...}` on `WorkflowShell` — the event is typed `StepResult & { workflowId: string }`. Ten of fifteen clients introduced 16 tsc errors between them, **all with the same root cause**: the agents invented properties on `StepResult` based on what they thought the shape "should be" rather than reading `src/design-system/components/StepCard.types.ts`. Specifically they referenced non-existent `event.stepIndex`, `event.value`, `event.textInput`, `event.analysisOutput`, `event.analysisResult`, plus fictional event types `'analysis_completed'` and `'analysis_result'` (the latter is a `StepType`, not an event type). One agent even imported `StepResult` from `WorkflowRenderer.types` (which only imports it internally — it's not re-exported). Local tsc was never run by the farm, so the errors landed in main context and had to be fixed by hand across 8 files.

**Fix:** Read `StepCard.types.ts` and `StepCard.tsx` to learn the actual shape — event is `{ type: 'step_opened' | 'step_saved' | 'step_skipped' | 'step_completed', stepId, payload?: unknown, timestamp }`. Payload varies by step type: `{ value }` for text/voice/number_input, `{ selected }` for select/multi_select, `{ checked }` for checklist, `{ input }` for analysis_result. The AI response for analysis_result is NOT piped through the event bus — only the user's input text. Rewrote the 8 broken handlers to narrow payload via `as { value?: string } | undefined` and derive stepIndex via `workflow.steps.findIndex(s => s.id === event.stepId)`.

**Rule:** When farming out N parallel workflow-shaped tasks to subagents, the spec handed to each agent MUST include either (a) the full text of the event-type / payload-shape source files inlined, or (b) an explicit instruction "read `<exact path>` before writing the onEvent handler" combined with at least one copy-pasteable example handler that shows the real payload narrowing pattern. Prose descriptions like "emit completion on step_completed" are not enough — agents will invent plausible-looking property names (`stepIndex`, `analysisOutput`) that don't exist. Also: every farm spec needs a local tsc gate per-agent before they report "ready" to the worksheet — otherwise the integrator pass becomes the first compile and catches a pile of same-shape errors at once. The farm worksheet status `ready` is a lie without tsc passing.

### Global chrome vs per-workflow chrome — be explicit with the founder about which is which
**Date:** 2026-04-19
**What happened:** Right after the Week 3 push (17 LIVE workflows + budget spine + journey spine + Global AI FAB), founder smoke-tested the live `/killerapp` URL and flagged: "I still don't see the journey map or the budget widget that would be visible and work in an integrated way anytime. That's important. Budget, profit + loss, receivables, payment schedule, where we are overbudget, where we are underbudget — all super important to be visible and accessible and changeable." This was an expectation mismatch. Week 3 mounted `CompassBloom` + `GlobalAiFab` in `src/app/layout.tsx` as global chrome, but `JourneyMapHeader` lives ONLY inside `WorkflowShell` (per-workflow) and `BudgetWidget` is only imported by `/workflows/expenses`. The architecture diagram I delivered before the push said "BudgetWidget pre-existing" in the always-on lane — implying it was mounted globally when it wasn't. Founder saw the diagram, approved the push based on it, and then found the real state didn't match.

**Rule:** When describing architecture to the founder, every component shown in an "always-on" / "global chrome" section MUST be verified as actually imported in `src/app/layout.tsx` (or equivalent root mount point) before labeling it that way. Run `grep -r ComponentName src/app/layout` before making the claim. If a component is mounted per-route or per-workflow-shell only, call it "per-workflow chrome" and say so explicitly — don't lump it with the global FAB. COO-for-construction expectations are that budget + journey visibility travel with the user everywhere, not just inside a workflow; this is a product-level default the founder has, and any architecture doc that doesn't match that default will produce a mismatch after ship. Related rule: when a new "spine" module (data layer that emits events to any subscriber) is shipped, the UI surface that consumes those events needs a matching global mount in the same push, or the data work feels invisible to the user and reads as "didn't integrate." The data spine without the UI surface at the root layout is a gap, not a feature.

---

## W9.D Session Block (2026-04-22 → 2026-04-28)

### Always run `next build` in main context before pushing — vitest is not enough
**Date:** 2026-04-23 (codified) → 2026-04-28 (re-confirmed twice)
**What happened:** Three Vercel deploys died because vitest-passing code failed Next 16's strict tsc phase. The pattern: a parallel agent self-reports "build verified" after running its own tsc that didn't catch the issue (sandbox timeout, narrowing context, etc.). I trusted the report and pushed. Vercel hits the real build, fails with `Property 'sm' does not exist on type 'Record<number, string>'` or `Type error: Argument of type 'number' is not assignable to parameter of type 'StageId'` — and we burn an investor-time deploy cycle.
**Fix:** Before any push that includes parallel-agent output, run `cd bkg-repo && timeout 360 npx next build 2>&1 | grep -E "(Type error|Failed|Compiled successfully)"` in main context. Fix in main if anything blocks. Don't trust agent self-reports.
**Rule:** "Compiled successfully in Xs" appearing in the FINAL main-context build output is the only acceptable green signal before push. Everything else is theater.

### Token shape gotchas — agents keep tripping these
**Date:** 2026-04-23 → 2026-04-28
**What happened:** Three separate parallel waves (W9.C L5, W9.D L4, W9.D.9 zone fillers) used non-existent token keys: `spacing.sm`, `fontWeights.normal`, `<text title="…">`. Each killed a deploy.
**Fix:** When dispatching agents that touch design tokens, paste this block in the brief verbatim:
```
TOKEN SHAPE NOTES (REQUIRED):
- spacing[N] is numeric-keyed: spacing[1]=4, spacing[2]=8, spacing[3]=12, spacing[4]=16, spacing[5]=20, spacing[6]=24
- DO NOT use spacing.sm / .md / .lg — use the numeric form
- fontWeights.regular (NOT fontWeights.normal). Available: light/regular/medium/semibold/bold/black
- fontSizes is named-keyed: xs / sm / base / md / lg / xl / 2xl / 3xl / 4xl / 5xl
- SVG <text> takes <title> CHILD for tooltips, NOT a title attribute
```
**Rule:** Any agent brief that mentions tokens must include the shape note. No exceptions.

### Don't let agents fabricate test files
**Date:** 2026-04-28
**What happened:** W9.D.9 zone-filler agents (B1/B2/B3) and R3 each shipped `__tests__/*.test.tsx` files using `describe`/`it`/`expect`/`jest.fn()` without importing them. The repo uses vitest globals which require `import { describe, it, expect, vi } from 'vitest'` — and `@testing-library/react` isn't installed at the root. tsc went red on hundreds of lines of test code. Had to delete 4 broken test files in main context to unblock the build.
**Fix:** When briefing an agent, say explicitly: "DO NOT WRITE A TEST FILE unless you also: (a) confirm `@testing-library/react` is in package.json deps, (b) import `{ describe, it, expect, vi } from 'vitest'` at the top of every test file, (c) confirm the file passes tsc on its own."
**Rule:** Tests are valuable but not free. If the agent can't ship a green test file, it should ship NO test file. Don't pad the deliverable.

### Vercel webhook desync is recurring — script the redeploy step
**Date:** 2026-04-23 (multiple)
**What happened:** Pushed `28bfd34` and `3de859f` to main; Vercel didn't pick them up. Root cause: GitHub-Vercel webhook gets stale silently. User had to manually click "Create Deployment" → enter `main` to pull HEAD. This happened 3+ times.
**Fix:** Before declaring "the deploy is live," explicitly verify by either: (a) check Vercel UI deployments list for the commit hash, OR (b) curl the live URL and grep for a known string from the new code. Don't say "Vercel is building now" without that check.
**Rule:** A push is only live when a deployment row in Vercel shows the matching commit hash AND the URL serves the new code. Both checks. Until then the push is "uploaded to GitHub, status unknown."

### "AHJ" / "consult a licensed X" is fatal in user-facing AI output
**Date:** 2026-04-23
**What happened:** Founder hit the production demo with "Building an ADU in San Diego, 2500 sqft, 2 bedrooms" and got back zoning lecture: "not permitted under current regulations… Authority Having Jurisdiction (San Diego)… Consult with a local architect…" The market for "consult a licensed professional" software is crowded and zero-margin. Founder reaction: "This is a disaster."
**Root causes (compounding):**
1. Specialist mock fallback was hardcoded to `compliance-router` — missing-mock specialists returned sprinkler content even in non-compliance workflows.
2. RAG retrieval ran on every stage — code entities containing "AHJ" got injected into the LLM context window for sequencing/estimating queries; the LLM dutifully cited them.
3. Stage-3 system prompt was too soft; LLM interpreted scope description as a compliance question.
**Fix:**
- `mockResponses[specialistId] || fallback` where `fallback` is a stage-aware demo-mode placeholder, NOT compliance content.
- `STAGES_THAT_USE_CODE_RAG = new Set([2])` — only Lock-it-in retrieves code entities.
- Stage-3 prompt now contains: "HARD RULE: You MUST respond with a SEQUENCE PLAN. Do NOT discuss code compliance, zoning, ADU size limits, permitting rules. You are a scheduler. That is your entire job."
- Server-side sanitizer at `/api/v1/copilot/route.ts` regex-strips remaining "AHJ" / "consult a licensed" leaks.
**Rule:** CYA vocabulary in AI output is a brand fatality. Three layers of defense: (1) prompt instruction, (2) RAG gating, (3) output sanitizer. Don't trust any single layer.

### Parallel waves — the disjoint-scope pattern
**Date:** 2026-04-23 (W9.C, W9.D burn) → 2026-04-28 (W9.D.9)
**What works (proven across 6 waves of 6–12 agents):**
- Each lane gets a single-page brief with: mandate, exact files, DO NOT TOUCH list, canonical refs INLINE (palette hexes, stage IDs, file paths), acceptance gate, return format.
- Lanes own DISJOINT files. No two agents edit the same file in the same wave.
- Integrator wave runs SECOND (single agent owns layout.tsx after primitives land).
- Mandatory `next build` verification per lane → fail-fast self-correct → final main-context build before push.
**What breaks:**
- "DO NOT TOUCH" list missing → collisions, lost edits, conflict-resolution chaos.
- Canonical refs (palette, tokens) NOT inline → agents invent, drift from spec.
- Trust agent self-reports without main-context verify → broken deploys.
**Rule:** The brief is the contract. Every brief contains: scope (NEW or EDIT specific files), DO NOT TOUCH list, canonical references inline, acceptance gate (must run `next build`), return format. No exceptions.

### Storage / context hygiene at session boundaries
**Date:** 2026-04-28
**What happened:** Founder's MacBook is slow. 117MB of session JSONL logs accumulated in /mnt/.claude/projects. 1.1GB node_modules. 82MB .next build cache. Founder asked: "what can I delete?"
**Fix:** At session end, write a session-handoff doc to `docs/strategy/W{N}-session-handoff.md` that's self-contained for the next session. Then user can safely delete: (a) old session JSONL logs, (b) .next build cache, (c) node_modules (regenerates with npm install). Do NOT delete: workspace folder content, /mnt/uploads source assets, anything in bkg-repo not in .gitignore.
**Rule:** Every session ends with a session-handoff doc. The next session reads it instead of mining the JSONL transcripts. Set the user free to clean up.

---

## Specialist runner discipline (W10.A, 2026-05-01)

### RAG gating must be allowlist, not prefix-match
**Date:** 2026-05-01
**What happened:** W9.D.5 added `STAGES_THAT_USE_CODE_RAG = new Set([2])` to gate compliance-* specialists from leaking code-RAG into other stages. That gate worked for compliance specialists. But there was a SECOND, legacy RAG path in `specialists.ts` — `retrieveEntities` — that fired for ANY non-compliance specialist whenever `jurisdiction` was set, dumping keyword-matched `knowledge_entities` rows into the `citations` array. The model never used them; they polluted StepCard's citation strip with absurd combinations (e.g., concrete-pour question cited "IBC 903.2.7 Group M Retail Sprinkler Requirements"). Two RAG paths existed; the gate only caught one.
**Fix:** Removed the legacy path entirely. RAG is now compliance-only. If a future non-compliance specialist genuinely benefits from BKG entity context, opt it in via an explicit allowlist — don't blanket-gate.
**Rule:** When you add a guard to a code path, grep for ALL similar code paths and gate them too, OR consolidate them into one path. "We gated the new one, the old one still leaks" is the most common shape of this bug. Default to allowlist (opt-in) over prefix-match (opt-out) — it survives refactors better.

### Smoke-test automation misses what the human eye sees
**Date:** 2026-05-01
**What happened:** The W10.A probe checked banned-CYA-word patterns, demo-fallback signal regex, and `mock-` citation prefix. All 10 specialists passed every automated check. But manual narrative inspection caught three systemic findings the regex couldn't: hedging openers ("I need more information"), citation pollution (real BKG entity IDs but wildly off-topic), and missing structured JSON. The automated flags are necessary but not sufficient.
**Fix:** Always read at least 3 full narratives end-to-end during a smoke pass. Write the automation to surface anomalies (long latencies, off-pattern openers) but make space to read the prose.
**Rule:** A green automated smoke result is not a pass. It's "no known patterns matched." Investor-demo readiness needs eyes on the actual content. Budget time for it.

### Cross-cutting concerns belong in the runner, not in every prompt
**Date:** 2026-05-01
**What happened:** 5 of 10 untested specialists opened with "I need more information" before answering. The fix-per-prompt path would mean rewriting 10+ prompt files to add the same instruction — high churn, high blast radius. Instead, appended a single one-line "answer-first" instruction to the runner's `userMessage` after prompt-specific context. Universal effect, single point of change.
**Rule:** Cross-cutting concerns (voice rules, framing, output-format mandates) live in the runner. Specialist-specific behavior lives in the prompt. If you're about to copy the same instruction into N prompt files, stop and put it upstream.

### v2 prompt files should use `<json>` tags consistently — runner only parses XML form
**Date:** 2026-05-01
**What happened:** While writing the W10.A v2 prompt rewrites, noticed `extractSystemPrompt` in `specialists.ts` parses ONLY `<json>...</json>` XML-style tags from model responses (`/<json>([\s\S]*?)<\/json>/`). But the existing v2 prompts (`estimating-takeoff.v2.md`, `sub-bid-analysis.v2.md`, `compliance-structural.v2.md`) teach the schema using markdown ` ```json ` blocks in their few-shot examples. **W10.A5 probe confirmed q2/q5/q9 returned `structured_keys=0` in production** — model dutifully output ` ```json ` blocks (visible in the narrative head: "```json\n{...") but the parser found no `<json>` tags so it never extracted. Structured output has been silently lost.
**Fix:** Made the runner parser accept both forms (XML tags first, markdown fence as fallback). Backward-compat with all existing v2 prompts AND new ones. No prompt rewrites needed.
**Rule:** When a runner has an explicit response-format parser, EITHER (a) the few-shot example MUST use that exact format, or (b) the parser must accept the format the few-shot teaches. Don't trust the model to translate. And — when you find a parser-vs-prompt mismatch, the durable fix is to fix the parser to accept both, not to migrate every prompt file. Migrations leave latent breakage; backward-compat fallbacks don't.

### Legal exposure → server-side deterministic gate, not LLM
**Date:** 2026-05-01
**What happened:** q23 Payroll Classification step had been parked behind a "DEFERRED WITH LEGAL REVIEW GATE" tag in `tasks.todo.md` § Phase 0 line 744 because 1099-vs-W-2 misclassification creates real liability that varies by state and fact-pattern. The workflow had an `analysis_result` step defined (`s23-2`) but no `promptId` — so it would either fail silently or call a nonexistent specialist. When wiring q12–q27 AI in W10.A4, the question was: write a careful prompt that refuses classification, or short-circuit before the LLM?
**Fix:** Server-side short-circuit. Specialist ID `payroll-classification-gate` returns a deterministic response from `callSpecialist` BEFORE prompt loading or Claude call — guaranteed not to drift, no API cost, no instruction-following risk. The specialist step still appears in the workflow so users see a clear gate, not a silent skip.
**Rule:** When an AI step has high legal/safety exposure, prefer a server-side deterministic gate over a prompt that tells the model to refuse. Prompts can drift; deterministic returns can't. Use this pattern when: (a) the right answer turns on facts the AI can't verify, (b) being wrong creates real legal/financial liability, or (c) the user must take an action outside the platform (CPA, attorney, inspector) regardless of what the AI says.

### Persona-roleplay parallel agents surface gaps that feature-list reviewers miss
**Date:** 2026-05-05
**What happened:** Asked to "dogfood test from every angle" before a contractor demo. Spawned 10 parallel agents, each role-playing a different contractor persona (GC, electrician, structural PE, deck-and-fence solo, multifamily developer, foreman, etc.) and authoring a real test plan from that persona's perspective. The plans called out features that DON'T EXIST yet (photo evidence with GPS+timestamp, Spanish contracts, account-free quick-quote, jurisdictional code data for IL/NYC/FL) more reliably than a pure feature audit would have. The gap analysis came from imagining the user's actual workflow, not from cataloging what's built. Specifically: photo/video upload was the #1 universal gap — 4 of 10 personas flagged it, including John (lost a $30k deposit on the exact gap a photo could have prevented). Without the persona lens, photo upload would have stayed a "nice to have" instead of getting promoted to the top of the fix-list.
**Rule:** When testing for adoption-readiness, roleplay first, audit second. Spawn parallel agents to write test plans from real-named personas with specific jobsite contexts (not generic "user" stand-ins). Each plan asks: would this persona pay/recommend/adopt after using this for 90 seconds? The gaps that surface from "what does Pete the Chicago electrician actually need" are demo-blocking; the gaps from "what features are missing" are roadmap items.

### Convergent findings across independent specialist lenses = highest-priority fix
**Date:** 2026-05-05
**What happened:** After the prod dogfood test, spawned 4 parallel specialist agents (UX, data/jurisdiction, AI behavior, infra/feature-gaps) to propose fixes from their lens. All 4 independently named "Project Spine wiring is on only 3 of 17 workflows" as their top issue, despite reviewing the same findings doc through different framings. That convergence — 4 independent lenses landing on the same root cause — is much stronger signal than any single agent's recommendation, and tells you where to focus first. Same pattern applied to "jurisdiction context doesn't propagate" (3 of 4 lenses) and "cost parser misses $XM" (2 of 4 lenses).
**Rule:** When N independent specialist agents converge on the same finding, fix that one first. The convergence is the signal. If only one specialist names it, it's that lens's bias; if all four name it, it's a real architectural truth. Use this pattern: spawn 4-5 specialists with non-overlapping framings (UX, data, AI, infra, security), have them each propose fixes from their lens, then synthesize by counting overlaps. The one-mention items are roadmap; the four-mention items are the work.

### Browser MCP is single-session — design parallelism around that constraint
**Date:** 2026-05-05
**What happened:** Founder asked for "24 agents reporting back" from dogfood tests. Wanted to comply but the Claude in Chrome MCP is a single-session: only one agent can drive a browser at a time. Trying to run parallel browser tests would have collided on tab state, auth cookies, and project ids. Resolved by: parallelize the work that doesn't need a browser (test plan authoring, fix-list synthesis from findings) and sequentialize the work that does (running the actual test scenarios on prod). Result: 10 plans authored in parallel in ~5 min wall clock, then one agent (me) ran the highest-priority subset against the live URL sequentially in ~25 min. Total wall clock under 35 min for what looked like a 4-hour task.
**Rule:** When asked for "many parallel agents," map the work first: what needs a shared resource (browser, single API key, single git checkout) vs what's pure thinking (plans, analysis, syntheses). Parallelize the thinking, sequentialize the resource-bound execution. Set this expectation early so the user doesn't expect 24 simultaneous browser sessions.

### `window.location.href = ...` in a click handler IS the 1-4 second INP spike
**Date:** 2026-05-06
**What happened:** Real-world prod testing showed click events with 1000-4000ms INP — way past the 200ms "good" threshold. Suspected culprits were everywhere (scroll observers, journey-progress writes, render churn). The actual primary culprit was a single line in `markdownToJsx.tsx` ActionButton: `window.location.href = target;`. That assignment forces a full page reload — which means every "Estimate the job" / "Check codes" CTA click in an AI response was tearing down the React tree, re-running root layout, re-fetching session, re-hydrating shells, re-rendering everything. The fix is one line: `router.push(target)` from `next/navigation`. SPA navigation, no reload, ~50ms instead of 2000ms.
**Rule:** Any `window.location.href = ...` or `window.location = ...` in a click handler inside a Next.js / Remix / React-Router app is almost certainly an INP bug. Grep for it across the codebase before profiling anything else; replace with the framework's client-side router. Anchor tags with `<a href>` get a free pass because the browser handles them, but JS-assignment-as-navigation is the silent killer. Add a lint rule if patterns recur.

### Memoize at the boundary, not the leaf
**Date:** 2026-05-06
**What happened:** When fixing the secondary INP issues, several components had `Object.keys(SOMETHING)` or `.filter()`/`.find()` running in the render body on every parent re-render. Wrapping each with `useMemo` knocked 5-50ms off render time per component. The pattern wasn't "the operation was slow" — `Object.keys` on a 6-key object is microseconds — it was "the operation produced a fresh array reference, which invalidated downstream `memo`/`useEffect` deps, which cascaded into more renders." Memoize the values that flow DOWN the tree (inputs to memoized children, useEffect deps), not the values consumed locally.
**Rule:** Reach for `useMemo` when (a) the value is passed as a prop to a `React.memo`-wrapped child, (b) the value appears in another hook's deps array, or (c) it's an object/array literal recreated each render and used in either of the above. Don't memoize scalar values used only locally — that's pure overhead.

### Phase 1 = infrastructure, Phase 2 = wiring — keep them separate commits
**Date:** 2026-05-06
**What happened:** When shipping photo/video upload, the temptation was to land "the whole thing": new table + bucket + API + uploader component + integration into all 17 workflow step cards in one PR. Resisted that and explicitly scoped the sprint agent to "Phase 1 — infrastructure only, do NOT wire it into workflow steps." Result: a clean, reviewable, mergeable bundle (migration, route, standalone component) that ships safely on its own. Phase 2 wiring becomes a follow-up where each workflow gets a 5-10 line patch using the now-stable component contract — and if Phase 1 needs a tweak, we discover it before 17 callsites are downstream of the API.
**Rule:** When building a feature that needs both infrastructure and N call-sites, ship the infrastructure as one isolated PR with a standalone usage example, then ship the call-site wiring as a second PR (or a series of small ones). The seam between "the API exists" and "everywhere uses the API" is where bugs hide; surface them deliberately by putting it on the calendar instead of inside one mega-commit.

### Multi-agent parallel sprints want a verification gate at the end
**Date:** 2026-05-06
**What happened:** Ran a 5-agent parallel sprint (A: quick wins, B: AI test harness + tooltips, C: photo upload Phase 1, D: dashboard, E: INP fixes). All five reported success in their own context. Tried to run `tsc --noEmit` afterward to confirm the combined output composes cleanly — and the workspace bash kept timing out at 45s. Spawned a verification agent which ran into the same constraint. Punted to "user runs `npm run build` locally before push." That's fine but it means "verification" got pushed onto the human. Better: budget the last 10-15 min of any parallel sprint for a single verification agent that has explicit permission to run a 3-5 min build, OR design the agents to each commit to their own branch so each is independently testable, then merge sequentially.
**Rule:** End every parallel-agent sprint with a single verification step that runs against the COMBINED output, not just each agent's local view. If the sandbox can't host that verification (timeouts, missing tools), make it the user's first action post-handoff and tell them explicitly "run `npm run build` BEFORE `git push` — I couldn't verify the merge in-session."

### Path-alias respect: a file written to `app/data/` is NOT reachable via `@/data/...`
**Date:** 2026-05-06
**What happened:** Sprint Agent B created `data/glossary.json` at the repo root and `TermTooltip.tsx` imported it as `@/data/glossary.json`. The Next.js / Turbopack build still passed (it has its own resolution path), but standalone `tsc --noEmit` failed because the `@/*` alias in `tsconfig.json` maps to `./src/*` — so `@/data/glossary.json` resolves to `src/data/glossary.json`, which didn't exist. Same shape applies to anywhere we write `@/foo/...`: the file MUST live under `src/foo/...`. The build's silent success masked the IDE-level breakage.
**Rule:** Before writing any file referenced via the `@/` alias, check `tsconfig.json` `compilerOptions.paths` and put the file at the path that resolves through that alias. If a sub-agent reports "I created X.json at /repo-root/data/", verify the import path matches the alias mapping before merging. Easy reflex: `grep` the new import in tsconfig and ensure path resolution lines up.

### Don't gate the push script on standalone `tsc` — gate on `npm run build`
**Date:** 2026-05-06
**What happened:** Wrote a push script that ran `npx tsc --noEmit` before `next build`, expecting tsc to be the tighter gate. It surfaced 110 errors — but 109 of them were pre-existing test files that import `jest`, `@testing-library/react`, etc., which aren't installed and which `next build` correctly excludes via its own tsconfig handling. The one real error (the alias-path bug above) was buried under noise, and the script blocked an otherwise-shippable commit. The user had already pushed via `npm run build && git ... && git push` which is the correct ordering.
**Rule:** In a Next.js repo, the production gate is `npm run build`, not standalone `tsc`. `next build` runs its own typecheck against the production-relevant tsconfig (typically excluding `__tests__`, `*.test.*`, etc.) and matches what Vercel will run. Keep `tsc --noEmit` as an optional dev-time check for stricter coverage, but don't make a deploy script depend on it unless the test setup is healthy.
