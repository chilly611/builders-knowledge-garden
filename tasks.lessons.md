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
