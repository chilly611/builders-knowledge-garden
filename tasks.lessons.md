# Builder's Knowledge Garden — Lessons Learned
## Updated: 2026-04-01

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
