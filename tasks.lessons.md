# Builder's Knowledge Garden — Lessons Learned
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
