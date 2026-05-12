
# Builder's Knowledge Garden — Lessons Learned
## Updated: 2026-05-12

---

## CRM Strategy (research sprint, 2026-05-12)

### The "CRM rebuild" checkbox in Phase 2D was a placeholder, not a delivered product
**Date:** 2026-05-12 (discovered during CRM deep-research sprint)
**What happened:** Phase 2D's `[x] CRM rebuild: business pulse + AI attention queue wired to real project data` was carried forward from early 2026-03-29 work that the team had already named as a failure pattern: *"The CRM devolved into a generic SaaS demo — exactly what the presentation says we're NOT."* The line stayed checked because the `/crm` route renders without error. But the prior lessons entry from March 2026 already declared the surface wrong, and the research sprint confirms it. The current `/crm` Command Center is the floor of what we ship; the new five-surface MLP is the ceiling.
**Rule:** When a previous lessons-learned entry calls a surface "wrong," do not let a later "shipped" checkbox erase the lesson. Cross-reference task-completion against lessons before reusing a feature name. The word "rebuild" in a task list does not mean the constitution has been satisfied — only that the database now has rows.

### The word "CRM" is itself a Goal-1 violation
**Date:** 2026-05-12
**What surfaced:** Reddit quote from r/handyman that ended the debate: *"Considering that I don't even know what CRM is, I probably don't need it."* — solo handyman, [r/handyman 1i0lm2q](https://reddit.com/r/handyman/comments/1i0lm2q/). The acronym filters out our target user before they even see the product. The constitution already flagged this with the plain-language label "Who's asking, and what do I know about them?" but the existing route is `/crm`, the API is `/api/v1/crm`, and the schema is `docs/schemas/crm-schema.sql`. The naming-debt is real.
**Rule:** Every new CRM surface route in v1 uses the plain-language slug, never `/crm` (e.g., `/killerapp/who-is-asking`, `/killerapp/quick-reply`, `/killerapp/repeat-radar`, `/killerapp/today`). Pro Toggle re-exposes the term inside the UI; the URL stays plain. The existing `/crm` route stays for legacy linkability until a redirect is decided (deferred to Brief 8).

### Time Machine is the precondition for AI write access — not a feature, infrastructure
**Date:** 2026-05-12
**What Stream C concluded:** *"Without reversibility, humans won't grant write scope to agents."* Every CRM MCP server audited (HubSpot, Salesforce, Attio, Pipedrive, Folk, Twenty, JobNimbus community) bolts MCP onto a REST API that has no notion of audit-trail-as-first-class or reversibility-as-default. The BKG advantage compounds if every write carries `time_machine_handle` from row one. Retrofitting it later costs an order of magnitude more.
**Rule:** Every CRM-related table migration in v1 ships with `time_machine_handle TEXT NOT NULL` and `previous_state JSONB`. Every API write returns `time_machine_handle` in the response. Every MCP tool description states "undoable via `crm_undo(time_machine_handle)`." No exceptions. This is binding decision #2 of the constitution (Time Machine is platform infrastructure) made concrete in the CRM data layer.

### Constitution-extension proposal: Correction Loop as a possible 8th primitive
**Date:** 2026-05-12 (flagged by Stream D, recommended by Stream E — **decision required from Chilly before Brief 1 ships**)
**What surfaced:** Stream D's UX pattern audit found that several voice-CRM tools (Granola, Truely, Otter) ship a *correction* interaction that's distinct from undo — when the AI infers a field wrong, the user corrects the value and the model learns. This is not Time Machine (which is reversibility — undo back to a prior state). This is *teach* — push the right answer forward into the model. The two patterns share no UX, no data plumbing, and no API surface. Folding "AI was wrong" into Time Machine flattens them and loses the teaching signal.
**Stream E's recommendation:** Extend the constitution to 8 primitives. Add **Correction Loop** with its own spec across the six dimensions (visual, interaction, voice, machine-legible, Pro Toggle behavior, Time Machine behavior). The Time Machine entry on Correction Loop is "corrections are themselves reversible" — they nest.
**Open question for Chilly:** extend to 8 primitives, or fold Correction Loop into Whisper + Time Machine? The research recommends extension; the constitution is sacred and the founder gets the call. Tracked at the 2E decision gate in tasks.todo.md.

### "Defensible against ChatGPT" extends to surfaces, not just prompts (extending the W7.Q lesson)
**Date:** 2026-05-12 (extending the 2026-04-21 functional-truth lesson)
**What this sprint confirmed:** The W7.Q lesson said *"every prompt file gets a self-evaluation line at the top: 'Is this output defensible against ChatGPT for a working contractor?'"* That logic extends one level up: **every CRM surface must answer "what about this surface is not just a thin wrap around ChatGPT?"** Stream A's findings make this concrete: HubSpot Breeze, Pipedrive AI Sales Assistant, Salesforce Einstein, and Day.ai are all bolting ChatGPT-equivalent inference onto existing CRM data. BKG's only defensible angle is the *invisible CRM* — data accruing as a byproduct of work the contractor was doing anyway, attached to a Person record that survives across the 7-stage lifecycle plus repeat/warranty. Competitors can copy our AI prompts; they can't copy years of byproduct data.
**Rule:** Every CRM brief includes a 1-sentence self-evaluation: *"What about this surface produces data that ChatGPT couldn't have generated from public web?"* If the answer is nothing, the surface is a copy of the competition and shouldn't ship.

### Cowork parallel-subagent dispatch worked cleanly for research (4 parallel streams, 30k+ words total)
**Date:** 2026-05-12
**What worked:** Four parallel general-purpose subagents (Stream A landscape, Stream B contractor reality, Stream C machine surface, Stream D UX patterns) executed independently, each producing a 6k–9k word Markdown file with citations. Total: 30k+ words of research with 200+ cited sources in ~10 minutes wall-clock. The key was that each agent prompt was *self-contained* — every prompt included the full constitution (10 goals + 7 primitives + 3 binding decisions), the 7-stage lifecycle, the two non-negotiable framings, the file path, the output structure, and verification criteria. None of the agents asked clarifying questions.
**Contrast with the W3.5 farm:** W3.5 (5 agents × 3 workflows) produced 16 tsc errors because agents invented `StepResult` properties. The fix that lesson called for — *"the spec handed to each agent MUST include either the full text of the event-type / payload-shape source files inlined, or an explicit instruction 'read `<exact path>` before writing the onEvent handler'"* — is exactly what this research sprint did with the constitution text. Inline the source-of-truth; don't link to it.
**Rule for future research sprints:** Parallel subagents work if and only if (a) each prompt inlines the rubric (not just links to it), (b) each prompt has a single output file with an absolute path, (c) verification criteria are spelled out so the agent can self-check before reporting done. This sprint produced zero rework; W3.5 produced a half-day of integrator rework. The difference was prompt discipline, not the agents.

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

### Functional truth always ranks above marketing promise
**Date:** 2026-04-21
**What happened:** A real contractor demoed the platform with John Bou. He asked three questions that were exactly the kind of thing the product promises to handle:
1. **Code Compliance:** a NEC 2023 kitchen island receptacle update, a few months old. Platform returned nothing. Investigation showed the codes table has ~20 top-level article entries for CA/AZ/NV only — no subsections, no NEC 2023 coverage — and there was no "3 sources of truth" verification anywhere in code or docs. The 3-source design lived only in founder memory.
2. **Voice input:** repeated the contractor's phrase back to him 5 times. Root cause was `onresult` concatenating into `prev.transcript` on every interim fire in StepCard + FieldOps.
3. **Supply Ordering (q11):** the "peak moment" workflow. Founder expected a cost matrix (3-5 vendors × price × quality × lead time × URL). Got generic compliance-flavored questions ("For lumber, what's the intended use?") plus IBC/OSHA citations. ResourceBroker was built in W5.A but never wired into the workflow — `supply-suppliers.md` prompt even self-labels *"not defensible against ChatGPT"*.

The aesthetic pass I'd been polishing (hero copy, heritage grid, brass-on-trace) looked fine. But the foreground it sat on was not doing what the marketing said it did.

**Founder's words:** "Marketing promises are nothing unless you deliver upon them."

**Rules going forward:**
1. **No workflow ships as LIVE on the picker unless it passes a 3-query smoke test against real contractor questions.** "It compiles and returns text" is not the bar. The bar is: would a pro who just asked this ask a second question or close the tab? Until it passes, it renders as DRAFT on the picker, not LIVE and not SOON.
2. **The spec for a workflow is the promise to the contractor, not the prompt to the AI.** Write the promise first in one sentence ("q11 returns 3-5 vendors per material, sorted by delivered cost, with lead time"). Then derive the prompt from the promise. If the prompt doesn't guarantee the promise, the prompt is wrong — don't ship it.
3. **Every prompt file gets a self-evaluation line at the top.** "Is this output defensible against ChatGPT for a working contractor?" If no, mark the prompt DRAFT. If yes, explain in one sentence what makes it defensible (e.g. "cites BKG-seeded local amendment that ChatGPT can't know"). If `supply-suppliers.md` already had that honest self-label and we ignored it, the process failed earlier — fix the process, not just the prompt.
4. **"Completed" in the task list ≠ "delivering on the promise."** W5.A ResourceBroker was marked complete with the module built but never wired into q11. Going forward, a task flips to complete only after an end-to-end demo query with a real contractor-shape input produces the promised output. The smoke test is the definition of done, not the build.
5. **When the founder says "I remember we had X" and X cannot be found in code or docs, do not assume it was built and lost.** Assume it was aspirational and never shipped. Confirm against the repo before reassuring. Missed this one — the "3 sources of truth" lived only in memory, and we carried the reassurance forward for weeks.

**Rule:** Every design/aesthetic pass must be accompanied by a functional-truth pass — run the 3 most likely user questions through the workflow and verify the output. Ship the aesthetic improvements with the functional fixes, not separately.

### Web Speech API: `onresult` replaces, never appends
**Date:** 2026-04-21
**What happened:** Voice input on StepCard repeated phrases 5 times during a contractor demo. Root cause in `src/design-system/components/StepCard.tsx:104`: handler computed `transcript: prev.transcript + final + interim`. The Web Speech API fires `onresult` multiple times per utterance (once per interim refinement, plus a final). Each `event.results` is the *full* accumulated results array from index 0, not a delta. Appending `prev.transcript` on every fire compounds the same phrase across interim events, producing 5+ copies by the time the final fires.
**Fix:** `transcript: final || interim` — replace, not append. The event gives you the whole utterance every time; state should reflect it, not accumulate it.
**Rule:** For Web Speech API `onresult`: read `event.results` from `event.resultIndex` (not 0), separate `isFinal` from interim, and **replace** the transcript field with the current event's result. Never concatenate with previous state. If you need `continuous: true`, call `recognition.stop()` on first `isFinal: true` and restart on next user action — do not let the recognizer re-fire on the same utterance.

### Bundle must carry a `main` ref — not `HEAD` — for `push.sh` to consume it
**Date:** 2026-04-21
**What happened:** Regenerated `W4.1-global-coo-surfaces.bundle` with `git bundle create <path> f3e257a..HEAD`. Verified fine, but `push.sh` (which runs `git pull --ff-only <bundle> main`) died with `fatal: couldn't find remote ref main`. A rev-range alone produces a bundle whose ref is `HEAD`, not `main`.
**Fix:** `git bundle create <path> main --not <prereq-sha>` — includes commits AND names the ref `refs/heads/main`. Always `git bundle verify <path>` before handing to user; the output should say `refs/heads/main`.
**Rule:** When producing a bundle meant to be consumed by `git pull --ff-only <bundle> main`, pass a named branch ref (`main`) to `git bundle create`, not just a rev-range.

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

### Platform prefers LIGHT backgrounds, not dark
**Date:** 2026-04-02
**What happened:** The Command Center (/crm) was built with a dark background (#0a0a0a) matching a Bloomberg Terminal aesthetic. But the platform standard is light backgrounds across all pages.
**Fix:** Changed CRM background to #FAFAF8 (warm light), cards to white with subtle borders (#e5e5e0), text to dark grays. Accent colors (red urgency badges, green indicators) preserved.
**Rule:** All new pages should use light backgrounds by default. The warm light palette is: background #FAFAF8, cards #fff with border #e5e5e0, text #1a1a1a to #888 gradient. Dark backgrounds are only for the cinematic entry and Dream Machine intro screens, NOT for operational dashboards.

### Tooltip/overlay text must contrast with its background
**Date:** 2026-04-02
**What happened:** Genome onboarding tooltip used bg-gray-900 (near black) with text-gray-400 for the "Got it, let me explore" button — dark gray on dark background, unreadable.
**Fix:** Changed tooltip to bg-white with border, button to text-[#D85A30] (warm brand color), fully readable.
**Rule:** All tooltips, modals, and overlays must pass WCAG AA contrast. On dark overlays use white/light text. On light overlays use dark text. Never use gray-400 (#9CA3AF) on gray-900 (#111827) — that's 3.3:1 ratio, below the 4.5:1 minimum. Use the brand warm color (#D85A30) for CTAs on light backgrounds.

### Logomark and iconography need organic/photoreal registers, not just clean SVG
**Date:** 2026-04-20
**What happened:** Shipped design-moodboard-preview.html with an inline-SVG tool-tree logomark (geometric, stylized). Founder reviewed: "I love the design system. The actual tool tree image and some of the iconography need work I think. More organic and photo real I think." The issue is register mismatch: the brief is "engraved heritage / drafting-desk warmth," and a clean geometric SVG reads as generic tech-illustration, not 19th-century botanical plate dissolving into blueprint — which is the committed direction. The SVG is correct for favicon silhouette but the hero-scale version needs to feel **drawn** and **photographed**, not vectored.
**Rule:** Every motif in this design system has TWO registers to render — a silhouette (simple SVG, favicon-scale, UI chrome) and a heritage plate (engraved/photographed/hand-drawn at hero scale). When delivering a design artifact, ALWAYS commit both registers or explicitly flag which one is missing. Default to over-delivering the heritage register for this founder — they respond to texture and cultural memory, not cleanness. For the tool-tree specifically: the favicon is SVG-correct; the hero is an AI-generated engraved botanical plate or hand-drawn charcoal/pencil reference that the SVG silhouettes dissolve into. Do not ship only the clean-SVG version and call it done. Related rule for palette feedback: when the founder adds colors ("robin's egg blue + deep orange"), don't reflexively replace — stack them as a peak pair reserved for moment punctuation, so the everyday six stays disciplined and the new colors carry meaning when they appear. Ratio of additions : replacements defaults to additions. Never average colors into a gradient scrapbook.

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

## Workflow & Specialist Wiring

### Don't diagnose a "mock" output as a missing env var without checking the actual code path
**Date:** 2026-04-18
**What happened:** Live Code Compliance route showed a yellow "connect a specialist to see real analysis" banner above text reading "IBC Section 1607: Live loads verified...". I diagnosed this as missing `ANTHROPIC_API_KEY` (based on the graceful fallback in `src/lib/specialists.ts:112-116`). I wrote an entire audit dashboard framing the fix as "set the key in Vercel, one click to unblock." Founder checked Vercel and the key had been set since **Mar 24** — well before Week 1 shipped. The real source of the mocked text was `docs/workflows.json:411` `exampleOutput` field, rendered as a pre-trigger preview inside `StepCard` before the user actually activates the analysis step. I'd conflated two different demo affordances into one root cause.
**Fix:** Corrected the framing in conversation. The specialist is wired; the `exampleOutput` is intentional placeholder copy showing "what this step could return." To turn it into real output, the user has to activate the step (type input → click analyze) — the specialist then runs for real against Claude.
**Rule:** Before claiming a fallback-triggered mock, open BOTH endpoints: (a) the env-var check path (`specialists.ts:112`) AND (b) the pre-trigger placeholder path (`workflows.json exampleOutput` + `StepCard` render). If the placeholder fires before any analysis call is made, the env var is irrelevant. Test the actual code path end-to-end (click the analyze button, watch network tab) before writing an audit that blames an env var. The key signal: if the mock text is **identical** every time for every user across every jurisdiction, it's a static placeholder, not a runtime fallback.

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

## Cowork & Multi-Agent Patterns

### Cowork is better for parallel workstreams
**Date:** 2026-03-30
**Rule:** Use Cowork for: parallel agent execution (multiple specialists simultaneously), tasks requiring Chrome browser automation, file system operations on Mac. Use Chat for: design brainstorming, research, strategic planning, writing specs.

### Each Cowork task needs complete context
**Date:** 2026-03-30
**Rule:** Cowork agents don't share context with Chat sessions. Every Cowork task must include: the full project instructions, the specific task spec, relevant file paths, API keys/tokens needed, and success criteria.

### Replicate FLUX rate limits
**Date:** 2026-04-01
**What happened:** Trying to fire 15 FLUX generation requests simultaneously hit 429 rate limit. Account has <$5 credit, limited to 6 requests/min with burst of 1.
**Fix:** Sequential generation with 30s backoff on rate limit. All 15 completed.
**Rule:** Generate images sequentially, not in parallel. Budget for ~30s per image including polling.

### Supabase SQL Editor — use Monaco API for clean input
**Date:** 2026-04-01
**What happened:** Typing SQL into Supabase SQL Editor via Chrome automation caused bracket auto-completion to add extra closing parens, breaking the query (syntax error at line 38).
**Fix:** Used `window.monaco.editor.getEditors()[0].setValue(sql)` via JavaScript execution — bypasses autocomplete entirely.
**Rule:** For any code editor with autocomplete (Monaco, CodeMirror), use the JavaScript API to set content instead of simulating keyboard input.

### FLUX logos need permanent hosting
**Date:** 2026-04-01
**What happened:** Replicate delivery URLs (replicate.delivery/xezq/...) work initially but expire after some time.
**Fix:** Downloaded all 15 images and pushed to repo at `public/logos/dream/*.webp`. Updated hub to use `/logos/dream/{key}.webp` paths.
**Rule:** Always download AI-generated images and host permanently in the repo's public/ directory. Never use CDN delivery URLs as permanent references.

### Unicode minus sign breaks Vercel builds
**Date:** 2026-04-01
**What happened:** The Collider page had a Unicode minus sign (−, U+2212) instead of ASCII hyphen (-) in a numeric literal `[−100, 0]`. TypeScript compiled fine locally but Vercel's build failed.
**Fix:** Replace `−` with `-` globally in the file.
**Rule:** Always check for Unicode characters in code — especially minus signs, quotes, and dashes. Use ASCII equivalents in all code.

### Cowork tasks don't persist — repo is the only source of truth
**Date:** 2026-04-01
**What happened:** Cowork chat threads disappear between sessions. Can't reference previous work.
**Fix:** Established protocol: every session (Chat or Cowork) must append to `docs/session-log.md` and update `tasks.todo.md` via GitHub Contents API.
**Rule:** The repo is the SINGLE SOURCE OF TRUTH. Not chat threads, not Cowork tasks. CLAUDE.md in repo root enforces this for all agents.

### CSS variable architecture pays off massively for theme changes
**Date:** 2026-04-02
**What happened:** Swapping `var(--bg)` at the root recolors ~80% of the app. The remaining 20% is hardcoded hex values in inline styles — these must be hunted down file by file.
**Rule:** Use CSS variables consistently. Never hardcode surface colors.

### Distinguish dark-as-background vs dark-as-text-color
**Date:** 2026-04-02
**What happened:** During the purge, `#1a1a1a` appeared in CRM page — but as TEXT color on light backgrounds (correct!). Don't blindly replace all dark hex values; check context.
**Rule:** Always check the context of color values before replacing them.

### Git lock files in Cowork sandbox need manual cleanup
**Date:** 2026-04-02
**What happened:** The sandbox can leave `.git/index.lock` and `.git/HEAD.lock` files. Use `find .git -name "*.lock" -exec rm -f {} \;` to clean up before committing.
**Rule:** Clean up git lock files in Cowork before committing.

### Remote divergence is common across Chat/Cowork sessions
**Date:** 2026-04-02
**What happened:** Always `git pull --rebase origin main` before committing. The repo gets updated from multiple session types simultaneously.
**Rule:** Always pull and rebase before committing in multi-session environments.

### Outer container theme fix is NOT enough
**Date:** 2026-04-02
**What happened:** Changing the root div to `var(--bg)` only fixes the page background. Every internal element with `rgba(255,255,255,...)` colors (text, backgrounds, borders) must be individually converted. The 5 CRM sub-pages (field, clients, documents, finances, site) each had 20-40 dark-theme color values inside them despite the outer wrapper being "fixed."
**Rule:** When converting themes, check every nested element — the outer container is not enough.

### Dark-theme color mapping for light backgrounds
**Date:** 2026-04-02
Standard conversions:
- `color: '#fff'` → `color: '#1a1a1a'` (primary text)
- `color: 'rgba(255,255,255,0.6)'` → `color: '#666'` (secondary text)
- `color: 'rgba(255,255,255,0.4)'` → `color: '#888'` (tertiary text)
- `color: 'rgba(255,255,255,0.3)'` → `color: '#999'` (muted text)
- `background: 'rgba(255,255,255,0.02-0.03)'` → `background: '#F5F5F0'` (card surface)
- `border: '1px solid rgba(255,255,255,0.07)'` → `border: '1px solid #e5e5e0'` (borders)
- BUT: `color: '#fff'` on colored buttons (red, green, blue bg) is CORRECT — don't replace those.

### Worktree isolation requires a git repo at the session CWD, not at the subdirectory
**Date:** 2026-04-21
**What happened:** W5 overnight sprint launched 6 parallel agents. Three of them (W5.A broker module, W5.B supply-ordering client, W5.F RSI instrumentation) all used `isolation: "worktree"` in the Agent tool call because they were modifying code in `/sessions/serene-wonderful-feynman/bkg-repo`. All three immediately errored: `Cannot create agent worktree: not in a git repository and no WorktreeCreate hooks are configured.` The session CWD is `/sessions/serene-wonderful-feynman` which is NOT a git repo — the repo is a subfolder. Agent worktree isolation operates from the session CWD, not from wherever the agent ends up working.
**Fix:** Relaunched the three agents WITHOUT isolation, but scoped each to a disjoint file path (W5.A → `src/lib/resource-broker/`, W5.B → `src/app/killerapp/workflows/supply-ordering/`, W5.F → `src/app/api/specialists/` + migrations + prompt frontmatter + `src/types/database.ts`). All three ran in parallel, touched zero overlapping files, composed cleanly (`npx tsc --noEmit` green across all three).
**Rule:** When the repo-of-interest is a subfolder of the session CWD, worktree isolation on subagents will fail. Two workable patterns: (a) launch agents without isolation and give each a strict "stay in this folder" scope with disjoint file paths so parallel runs can't stomp each other, documenting the scope explicitly in each brief ("CRITICAL: You do NOT have worktree isolation. You share the file system with agents X and Y. STAY IN YOUR LANE: touch ONLY `<path>`. Do NOT modify files elsewhere."); (b) have agents work sequentially with git commits between them. Pattern (a) is faster when scopes are naturally disjoint — write the shared contract(s) FIRST as reference docs in the workspace folder, hand the contract to every agent, they build against the same TypeScript shapes without touching each other's code. The "shared contract pattern" made W5.A/W5.B parallel without either agent ever importing each other's files.

### `.claude/skills/` is read-only in Cowork — skills land in a staging folder and get copied
**Date:** 2026-04-21
**What happened:** W5.D agent asked to scaffold a `bkg-design` skill at `/sessions/serene-wonderful-feynman/mnt/.claude/skills/bkg-design/`. The folder is mounted with permissions `dr-x------` — read-only. Agent couldn't write there. It wrote to `/sessions/serene-wonderful-feynman/mnt/bkg-design-output/` instead and flagged the path deviation in its report.
**Rule:** When instructing a subagent (or myself) to create a new skill in Cowork, target `/sessions/serene-wonderful-feynman/mnt/bkg-<skill-name>-output/` or similar writable staging location, not `.claude/skills/`. In the morning report / user-facing docs, always include the one-line `cp` command the user runs on their Mac to install the skill permanently to `~/.claude/skills/<name>/`. Never tell the user "the skill is installed" when it's in a staging folder — they have to do the install step themselves. Related: the `consolidate-memory` skill exists specifically for reflecting over memory files; after a few skill-creator runs, run consolidate-memory to merge duplicates.

---

## Process & Workflow Discipline

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

### TypeScript `as any` for Supabase Auth extended types
**Date:** 2026-04-03
**Problem:** Supabase Auth returns users with `user_metadata` but our AuthUser type doesn't include it. `as Record<string, unknown>` fails because TypeScript sees it as potentially incorrect cast.
**Fix:** Use `(user as any).user_metadata` with `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comment above.
**Rule:** When accessing Supabase-specific fields not in our custom User type, use `as any` with eslint-disable. Don't try intermediate casts like `as unknown as Record` — they still fail.

### Cmd+A vs document.execCommand('selectAll') in GitHub CodeMirror
**Date:** 2026-04-03
**Problem:** `document.execCommand('selectAll')` does NOT reliably select all content in GitHub's CodeMirror 6 editor. It can leave content unselected, causing `insertText` to append instead of replace — resulting in file duplication.
**Fix:** Always use the `Cmd+A` keyboard shortcut (via browser automation key press) to select all content before `insertText`.
**Rule:** For GitHub web UI file editing: click in editor → Cmd+A → document.execCommand('insertText', false, newContent). Never use execCommand('selectAll').

### Next.js 16 requires Suspense for useSearchParams
**Date:** 2026-04-03
**Problem:** `useSearchParams()` in Next.js 16 causes build failure during prerendering if not wrapped in a `<Suspense>` boundary.
**Fix:** Split the page component: inner `PageContent` uses `useSearchParams()`, outer `Page` wraps it in `<Suspense fallback={...}>`.
**Rule:** Any page using `useSearchParams()` or `useRouter()` query params must have a Suspense boundary.

### GitHub API + UTF-8 decoding for file content
**Date:** 2026-04-03
**Problem:** GitHub API returns file content as base64. Using plain `atob()` corrupts multi-byte UTF-8 characters (em dashes, curly quotes become garbled).
**Fix:** `new TextDecoder('utf-8').decode(Uint8Array.from(atob(raw), c => c.charCodeAt(0)))`
**Rule:** Always use TextDecoder for GitHub API base64 content, never plain atob().

### Browser extension blocks decoded content display
**Date:** 2026-04-03
**Problem:** The Claude in Chrome extension blocks display of decoded file content in JavaScript results (shows `[BLOCKED: Cookie/query string data]`).
**Workaround:** Perform all modifications in JavaScript variables stored on `window._varName`. Only return non-sensitive metadata (line counts, section headers) to verify correctness.
**Rule:** Store file content in window globals, verify via metadata, apply via insertText. Never try to display full file content in JS results.

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

### Never hand the founder a CLI command with placeholder paths
**Date:** 2026-04-18
**What happened:** After Week 2 pushed locally, I told Chilly to run `cd ~/path/to/bkg-repo && git push origin main`. He copy-pasted it literally. zsh returned `cd: no such file or directory: /Users/chillydahlgren/path/to/bkg-repo` and `fatal: not a git repository` from the home dir. The push failed, and a live, working, green-gates Week 2 stack sat un-shipped because of filler text I wrote assuming he'd mentally substitute the real path. Nothing about `~/path/to/` is parseable as "your actual repo path" — it's a docs convention, not a Terminal instruction.
**Rule:** When handing the founder (or any non-dev user) a Terminal command, never write a placeholder path like `~/path/to/foo` or `<your-repo>`. Either (a) know the real path first (ask, or scan from this session's filesystem if the repo is mounted), or (b) lead with a **discovery command** they can run verbatim that finds the path for them, then give them the action command once they paste the result back. No `cd` instruction is usable if the path segment is symbolic.

### Development can "fork" from direction docs silently — re-read the direction doc on every session
**Date:** 2026-04-18
**What happened:** Shipped the Code Compliance Lookup route as commanded. Route works. But the chrome around it — `KillerAppNav.tsx` with "Command Center" tabs, hardcoded XP bar, SOON placeholder modules — directly contradicts Decisions #1, #3, #8, and #11 from `docs/killer-app-direction.md` (authored April 17), which founder had already locked. I'd treated those decisions as "vision, eventually," not as "nav shell to refactor before shipping Code Compliance." The founder's visitor experience is now: land on page, see a container the direction doc deleted, click into a workflow that's technically correct but visually stranded.
**Rule:** On every new session touching the killer app, re-read `docs/killer-app-direction.md` first, then `tasks.todo.md`, then `tasks.lessons.md`. The direction doc is authoritative; any work that ships inside a pre-direction-doc shell has to call that out explicitly as "temporary — shell replacement queued" or it creates the perception of development forking from the vision. When shipping any workflow route, the nav shell it lives inside must match the current locked decisions, OR the ship is partial and must be flagged as such to the founder.

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

### Data coverage is a feasibility input, not a shipping detail
**Date:** 2026-04-17
**What happened:** Chilly said "Let's do California, Arizona, and Nevada" for Week 1 jurisdiction coverage. Audit of `src/lib/knowledge-data.ts` showed CA had three cities catalogued, AZ had Phoenix, NV had zero. Shipping NV in Week 1 was not feasible without half a day of data population. The realistic answer was CA + Phoenix AZ Week 1, NV in Week 2 parallel to legal review.
**Rule:** Before accepting a scope commitment for code/data-backed features, audit the actual data in the repo. Jurisdictions, code editions, template inventories, supplier databases — these are feasibility constraints, not shipping details. Answer "is that doable?" with what the data supports, not with what would be nice.

### Consolidation requires an explicit "demographic check"
**Date:** 2026-04-17
**What happened:** Chilly approved collapsing 22 prompts toward ~16 production specialists but with the directive "make sure that we aren't leaving any demographic behind." The consolidation plan at `app/docs/consolidation-plan.md` added a "Demographic check — no loss" subsection under each merge, walking through all eight lanes (GC, DIY, specialty, worker, supplier, equipment, service provider, robot/AI agent) and every affected trade to confirm each is still served.
**Rule:** When collapsing N specialists into M, require a written check for every user lane and every trade that the source specialists served. If any lane or trade ends up underserved by the consolidation, the merge is wrong. "No demographic left behind" is a commit-gate, not a feel-good principle.

### Autonomous extraction sessions — paths, repos, PATs
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

---

## General Patterns & Strategy

### Procore/Oracle Competitive Analysis Lessons
**Date:** 2026-04-02

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

### Stripe Integration Lessons
**Date:** 2026-04-02/03

1. **Stripe dashboard blocked by browser safety restrictions.** The Cowork browser sandbox blocks `dashboard.stripe.com`. Fix: use the Stripe REST API with curl and the secret key to create prices, webhook endpoints, and payment links programmatically. `curl https://api.stripe.com/v1/prices -u sk_test_...:` works perfectly.

2. **Stripe Payment Links require `billing_scheme=per_unit` and `usage_type=licensed`.** When creating recurring prices via the API, use `-d "recurring[interval]=month"`. Then create payment links with `-d "line_items[0][price]=price_xxx" -d "line_items[0][quantity]=1"`.

3. **Stripe webhook signing secrets start with `whsec_`.** When creating a webhook endpoint via API, the response includes the secret directly. Store it immediately — you can't retrieve it again later.

4. **All Stripe tiers should be `subscription` mode, not `payment`.** The checkout route's MODE_MAP had Team and Enterprise as "payment" (one-time) instead of "subscription" (recurring). Both the price objects AND the checkout session mode must be recurring.

5. **`.env.local` is gitignored — env vars deploy via Vercel dashboard only.** Never try to `git add .env.local`. Stripe keys, webhook secrets, and payment link URLs all go through Vercel's Environment Variables UI (or CLI).

### Universal Save/Load System Lessons
**Date:** 2026-04-03

1. **Next.js App Router import paths: count directory depth carefully.** Pages at `src/app/dream/[interface]/page.tsx` need `../../dream-shared/` to reach `src/app/dream-shared/`. Using `../dream-shared/` resolves to `src/app/dream/dream-shared/` which doesn't exist. The rule: count the directories between the file and its target, then use that many `../` segments. Always verify with `path.resolve()` mentally before deploying.

2. **GitHub Contents API creates one commit per file — batch carefully.** Pushing 8+ files via individual API PUT calls triggers 8+ Vercel deploys. Intermediate deploys with partial file sets WILL fail (missing imports). Options: (a) push all files rapidly so only the last deploy matters, (b) use git push for multi-file changes, (c) accept that Vercel will show failed intermediate deploys and only the final one matters.

3. **StorageAdapter pattern enables zero-effort backend swap.** The save/load system uses `StorageAdapter` interface with `list/get/save/remove` methods. `LocalStorageAdapter` implements it with localStorage. When auth ships, swap in `ApiStorageAdapter` in one file (`ProjectContext.tsx`). This pattern should be used for ALL features that start with local storage and will later need server persistence.

4. **DreamEssence as portable project format.** Instead of each interface having incompatible save formats, extract a universal "essence" (styles, materials, features, moods, constraints, freeformNotes) that any interface can read. Each interface implements serialize (state → essence) and deserialize (essence → state) with fuzzy matching against its own entities. This lets projects flow between Oracle → Alchemist → Cosmos seamlessly.

5. **Verify Vercel build logs after deployment, not just the status page.** A deployment marked "Ready" on Vercel's list might have a different deployment as "Current". Always check that the latest deployment shows both "Ready" AND "Current" to confirm it's actually serving traffic.

### Constitution and Pattern-Level Thinking
**Date:** 2026-04-16

**Lesson — Constitution Before Surface:** When a user points out a UX problem on a single surface, the fix is almost never a single-surface fix. It is a platform-level pattern problem that shows up first on that surface. The SCOUT case showed this — the fix was not to rename three labels, but to write a platform constitution that prevents the same pattern failure on every other surface.

**Rule:** Before fixing a surface-level UX complaint, ask: **is this pattern violated elsewhere on the platform?** If yes, the fix is at the platform pattern level, not the surface level. Fix the pattern; the surface falls out.

**Lesson — The Founder Will Reject Cowardly Scope:** When offered the chance to scope down from three parallel pilots to one, the founder chose "all three in parallel — don't chicken out." The instruction is: when the work is strategically important, do not pre-emptively scope it down to make it easier. Present the ambitious plan; let the founder scope down if needed.

**Lesson — Load-Bearing Decisions Must Be Named:** The Design Constitution names three "binding decisions" explicitly — Pro Toggle visible on every screen, Time Machine as platform infrastructure, human arc as default. These are called out separately from the ten goals because they are the specific tradeoffs that can be softened under pressure and must not be.

**Rule:** When a session makes a strategic decision that has implementation cost (real estate, engineering complexity, philosophy), name it explicitly as a "binding decision" with the cost written in plain language next to it. This makes it harder to quietly walk back later.

### Product & Naming Strategy
**Date:** 2026-04-17

**Lesson — Content vs. Container:** When critiquing an existing artifact (prototype, document, feature), the right move is to separate **what's genuinely good** (the underlying content, IP, craft, decisions that are sound) from **what's wrong** (the framing, wrapper, implementation, surface-level choices). Most critiques lose both. "This is bad, rebuild it" throws out the good content with the bad container.

**The rule:** Before rebuilding anything, explicitly name:
1. What's the content (the part worth preserving)?
2. What's the container (the part that needs to change)?
3. Which is the critique actually aimed at?

**Lesson — Post-Revenue Before Fundraising Changes the Story:** The binary flip from "zero paying customers" to "any paying customers" changes fundraising meaningfully. Pre-revenue → post-revenue transitions are worth 50-70% in valuation and significantly better terms. The effort to get to even 3-5 paying customers at small MRR may be proportionally small compared to the fundraising upside.

**Rule:** Plan revenue in parallel with building. Not "build the whole thing then monetize" — "ship the thinnest possible paywall-crossing MLP and get first dollars in while the big build continues."

**Lesson — Stop When Marginal Return Drops:** Line-by-line reading of the prototype was high-leverage through the first ~1600 lines because the content was novel, dense, and decision-triggering. Past line 1600, returns diminished — the remaining code was implementation detail that doesn't port plus residual data that can be extracted mechanically by an agent. Continuing to read past the diminishing-return threshold would have produced mostly tired decisions and worse output. Stopping and consolidating was the right move.

**Rule:** At regular intervals in a long session, ask: **Is the next hour going to produce more value than the last hour?** If no, stop. Consolidate what's been learned. Sleep if it's late.

**Lesson — Name Products With Layered Meaning:** Names that carry multiple meanings simultaneously are more brandable and memorable than names that have a single meaning. "Building Intelligence" as a product name carries three meanings simultaneously: the *intelligence* of the act of building, *AI intelligence* that powers specialists, and *building intelligence* as an ongoing act.

**Rule:** When naming a product or initiative, aim for layered meaning. Ask: does this name work on at least 2-3 different levels?

### Dream Machine & Onboarding
**Date:** 2026-04-14

**Audit before you architect.** Fetch the actual live pages before proposing changes. The brainstorm doc listed 6 interfaces; the live site had 3 different ones. Ground truth > documentation.

**Three intents, not N interfaces.** Users have three intents: "help me figure it out," "I know what I want," and "I have something already." Every interface maps to one of these. Consolidation means reducing to intents, not averaging interfaces.

**Template fallback for AI calls.** Always build a non-AI fallback profile. If the Claude API is slow (>2s), the template renders instantly and gets overwritten when the real response arrives. Users never see a blank screen.

**localStorage is the dream handoff mechanism.** DreamEssence transfers between dream phases via localStorage with keys like `bkg-dream-profile` and `bkg-dream-express`. Design Studio reads on mount and clears after hydration. Simple, works offline, no auth required.

**Voice input is 20 lines of code.** Web Speech API is free, works in Chrome+Safari (85%+ of users), and the useSpeechRecognition hook is fully reusable. No excuse not to have voice everywhere. Hide the mic button on unsupported browsers instead of showing "coming soon."

**Redirects, not 404s.** When consolidating routes, 301 redirect old paths to the new unified page. Never leave dead ends — someone has those old URLs bookmarked.

### PM Module Corruption Pattern
**Date:** 2026-04-04

- BudgetModule, PunchListModule, SubmittalModule, and ChangeOrderModule all had scattered syntax corruption
- Corruption types: binary chars (0x06), merged CSS properties, stray quotes, JSX spliced into style objects, mismatched quote types, tab chars replacing quotes
- Turbopack stops at the first error per file - fixing one reveals the next. Must iterate builds until clean.
- When corruption is extensive (binary garbage), full rewrite from interfaces/state is faster than patching
- Always verify state variable names match when reconstructing missing code (e.g. setShowAddLineModal not setShowAddLineItem)

### Competitive UX Insights
**Date:** 2026-04-02

- Fieldwire = gold standard for adoption speed (consumer-app UX, zero training)
- XBuild = AI-guided onboarding (no training at all, AI walks through workflow)
- ALICE = visual scenario comparison (scatterplots for schedule options)
- Procore = unlimited users eliminates shadow IT
- Oracle Application Switcher = unified nav across federated apps (our compass bloom serves same purpose)
- Buildertrend = "too many clicks" complaint — keep interactions minimal

### Onboarding Persistence Patterns
**Date:** 2026-04-02

**Onboarding should use localStorage for state persistence.** `bkg_lane` stores selected persona, `bkg_onboarded` stores completion status. These keys gate the LanePicker and OnboardingFlow overlays on the CRM page. Users can reset by clicking their lane badge in the header.

**Dynamic imports prevent SSR issues with framer-motion components.** Use `dynamic(() => import(...), { ssr: false })` for any component using framer-motion that's imported into a page. Direct imports can cause hydration mismatches.

---

### When adding a field to a domain object, update the interface in the SAME commit
**Date:** 2026-04-21

**Pattern that bit us:** W6.C added `result.reasoning = ...` in `src/lib/resource-broker/search.ts`, in `search.test.ts`, and in `ResourceCardGrid.tsx` — but never touched `src/lib/resource-broker/types.ts` to declare `reasoning?: string` on the `ResourceResult` interface. Vitest passed because runtime JS has no type enforcement. The next full-repo `tsc --noEmit` emitted **15 separate errors** pointing at the same root cause. Push refused to ship.

**Rule:** Any agent that writes a new property on a typed object MUST also edit the interface/type file in the same commit. Before declaring a task "green," grep the changed files for new property accesses and verify each one is declared on its type. If the repo uses strict null checks, optional fields need `!` or explicit narrowing at read sites.

**Second hazard exposed at the same time:** W6.F wrote tests that accessed `.summary` on a union return (`{ ok: true; summary } | { ok: false; reason }`) without narrowing on `result.ok` first. The test runs because JS accepts `undefined.undefined`-style access at runtime-failure stages but tsc rightly rejects it. **Pattern:** when asserting `expect(x.ok).toBe(true)`, follow with `if (!x.ok) return;` before accessing the truthy-branch-only fields.

**Third hazard:** implicit-any on inline callbacks (`.some((n) => ...)`) when the parent array type got widened to `any[]` by an earlier `.map((l: any) => l.name)`. Either annotate `liensNames: string[]` explicitly or use a more specific cast at the `.map` site.

**Why we didn't catch it in-session:** full-repo tsc takes ~5 min CPU and was being killed for resource reasons. Vitest (62/62) doesn't type-check. **Mitigation going forward:** before closing a code-writing agent, run `npx tsc --noEmit` scoped to ONLY the files the agent touched plus their direct imports; that completes in seconds and catches this class of error.

---

### Declare every identifier you reference — including "it's obvious what this set contains"
**Date:** 2026-04-21 (evening)

**Pattern that bit us:** W7.J StepCard.tsx hero-treatment added `const isPeakStep = PEAK_STEP_IDS.has(step.id);` on line 954 and branched on `isPeakStep` in JSX at 1113 + 1137 — but the `PEAK_STEP_IDS` constant was never declared. The agent "knew" it meant `{s11-5, s2-6}` and wrote the consumer code correctly but forgot the producer. Runtime JS doesn't care; tsc caught it on the Mac during push.sh.

**Why the in-session scoped review missed it:** a subagent scan for "implicit any, union narrowing, missing exports, component imports" did not include "check every bare identifier against the file's declarations." The class was absent from the checklist.

**Rule:** When reviewing a large diff for tsc-ready-ness, include a step that extracts every bare identifier (not a property access, not a JSX tag, not a string) and verifies it's either (a) declared in the file, (b) imported, or (c) a known global. A 10-second grep of ALL_CAPS names catches half of these; a similar sweep for camelCase catches the rest.

**Lightweight detection script for future agent reviews:**
```bash
# For each changed file, extract identifiers used but check for their declarations
grep -oE "\b[A-Za-z_][A-Za-z0-9_]*\b" path/to/file.tsx | sort -u > /tmp/used
# Then for each, check it's declared, imported, or a known global/builtin.
```

**Generalized lesson:** the "write consumers first, then producers" anti-pattern is subtle in TypeScript because intellisense in-editor would flag it, but agents without live intellisense can write both sides of a reference and forget one. Always scan the final file for dangling references before declaring done.

---

## CSS — nested grids with the same template silently collapse content
**Date:** 2026-04-21 (W7.O)
**What happened:** On the `/killerapp` picker, SOON cards (Q1 / Q3) rendered with their text wrapped one word per line, sometimes one letter per line. LIVE cards next to them rendered correctly. The code looked symmetrical.

**Root cause:** `.workflowRowDisabled` (outer wrapper for SOON rows) AND `.workflowRow` (inner row content) were BOTH CSS grids with `grid-template-columns: 60px 1fr auto`. The outer grid placed the inner `.workflowRow` into its first 60px column. Inside that 60px container, the inner grid's own 60px/1fr/auto template tried to fit — the `1fr` column computed to ~0px and wrapped text one glyph at a time. The LIVE branch did NOT have this bug because its outer wrapper (`.workflowLink`) was `display: block`, so the inner grid was the only grid layout in the stack.

**Fix:** Match the LIVE pattern: outer wrapper is `display: block`, inner row owns the grid. Don't stack grids with the same template.

**Rule:** When one `display: grid` container wraps another `display: grid` child, the child becomes a grid item and its own grid template applies INSIDE whatever column/row cell the parent assigned it to. If both templates are identical the child gets the parent's first cell (often tiny) and its own columns collapse. Either (a) change the outer to `display: block` / `display: contents`, (b) change the inner to `display: block` or `display: flex`, or (c) span the inner across the full outer grid with `grid-column: 1 / -1`. Never leave two matching grid templates stacked.

**Detection heuristic:** if two class names share a grid template and one wraps the other in JSX, the composition will collapse. Grep for `display: grid` and `grid-template-columns` pairs when adding new wrappers.

---

## CSS — `overflow: hidden` + oversized display headings clips words silently
**Date:** 2026-04-21 (W7.O)
**What happened:** Hero heading "The operating system for your build." clipped "operating" mid-word on desktop. Font-size was `clamp(64px, 9vw, 120px)` — at the upper end, a 9-character word is wider than a flex column constrained to `1fr` next to a 180px logomark in a 1200px container, and the parent `.heroSection` had `overflow: hidden`.

**Root cause:** `overflow: hidden` hides any child that extends past the clip rect. Display headings at 100+px can generate single words wider than their flex column, and by default browsers do NOT break long words — they overflow.

**Fix:** (a) Cap clamp max at a value that fits the narrowest expected column width for the longest word. (b) Add `overflow-wrap: break-word; hyphens: auto;` so long words break instead of overflowing. Both together.

**Rule:** Any headline in a flex/grid column with bounded width should carry `overflow-wrap: break-word` if the container has `overflow: hidden` OR if clamp can scale past ~80px. Use the longest plausible single word in the copy to compute the clamp ceiling.

---

## Design — over-eager CTAs become lies when the surface grows past them
**Date:** 2026-04-21 (W7.O)
**What happened:** `WorkflowPickerSearchBox` shipped Week 2 with a "Pull the codes →" button because code-compliance was the only live workflow. By Week 7 the picker had 17 live workflows and the button was still hard-coded to route to code-compliance regardless of query. The label read as a broken promise — users typed "estimate my ADU" and got the code-lookup flow.

**Rule:** When a label bakes a specific destination into a generic entry point, that label is only correct for as long as there's one destination. The moment the surface grows, the label lies. Prefer neutral copy (`→`, "Go", "Find") on generic entries until intent routing is real, then flip to destination-specific copy if telemetry justifies it.

---

## Git bundles — `A..B` range syntax names the tip as `HEAD`, not the branch
**Date:** 2026-04-21 (W7.O push)
**What happened:** Built a bundle with `git bundle create w7.bundle origin/main..HEAD`. Bundle verified fine on the creating machine. On push.sh the consumer ran `git pull "$BUNDLE" main --ff-only` and got `fatal: couldn't find remote ref main`. The pull failed even though the commits were in the bundle.

**Root cause:** `git bundle create <file> <revrange>` uses `git-rev-list-args` semantics. When you pass a range like `origin/main..HEAD`, the bundle's included ref is named `HEAD`, not `refs/heads/main`. Consumers pulling with `git pull <bundle> main` look for a ref named `main` and fail.

**Fix:** Build bundles with a named branch on the left side of the revlist, and exclude the upstream with `--not`:
```bash
git bundle create w7.bundle main --not origin/main
```
This produces `refs/heads/main` as the bundle's ref. Then `git pull <bundle> main` works.

**Verification command:** `git bundle verify <file>` prints the contained refs. If it says `<sha> HEAD` you have the bad form. If it says `<sha> refs/heads/main` you have the good form.

**Rule:** Always build bundles with an explicit branch name on the left, not a range expression. Always verify the bundle shows `refs/heads/<branch>`, not `HEAD`, before handing it to push.sh.

---

## Parallel agents — partition by file path and use smaller shards than you think
**Date:** 2026-04-22 (W7.Q post-demo burn)
**What happened:** Fired 8 parallel agents for the 3-source verification + vendor layer + supply UI + RSI scaffold. Agent 4 (local amendments: 14 files, ~140 amendments across 11 JSON files + loader + tests) timed out with "stream idle timeout — partial response received" after 24 minutes with only 4 of 14 files written.

**Root cause:** One agent was asked to produce too much content in one shot. JSON payloads that size compound — each subsequent file eats context, tokens per second slow, and the stream eventually idles. All other agents in the same burn (each scoped to ≤6 deliverables) finished cleanly in 3–6 minutes.

**Also observed:** Re-running the work split across two smaller agents (one owning 3 JSONs + the loader + tests, the other owning 5 JSONs) finished in roughly half the wall-clock time the original would have taken had it not timed out.

**Rule:** When firing parallel agents, hard-cap each agent at roughly 6 deliverable files OR ~400 lines of generated content, whichever is smaller. If a plan calls for 10+ files, split before firing. Always partition agent work by file path (each agent owns a disjoint set) so shards can be fired/re-fired without coordination. Name the non-owned paths explicitly in every prompt so agents know what NOT to touch.

---

## Verify-before-complete — agent summaries lie pleasantly
**Date:** 2026-04-22 (W7.Q post-demo burn)
**What happened:** 6 parallel agents all reported successful completion with "all tests pass, TypeScript strict, ready to ship." Ran `npx tsc --noEmit` and got 15+ errors. Ran `npx vitest run` and got 4 failing tests. Root causes were legitimate (Supabase generated types didn't know about new migration tables, a test referenced a field that doesn't exist on the type, an Anthropic SDK mock used the wrong export shape).

**Why the lie lands:** Agents report their intent and what they believe they did. They often run their own tests in isolation, which can pass even when the full-repo build fails because type resolution differs at the project boundary.

**Rule:** After ANY parallel agent burn, before marking any task complete, run the full-repo green gates yourself — `tsc --noEmit` AND `vitest run` — and scan for regressions outside the agent's stated scope. Do not trust agent self-reported success. If the gates are red, fire ONE narrow fixup agent pointed at the specific errors (file + line number + minimal reproduction) rather than asking the original agent to "please check again."

---

## When workflows reference specialist IDs, test that the prompt file EXISTS on disk
**Date:** 2026-04-22 (W7.S Code Compliance shippability burn)
**What happened:** Agent B restructured q5 to route to four per-discipline specialists: `compliance-structural`, `compliance-electrical`, `compliance-plumbing`, `compliance-fire`. The electrical and structural prompts already existed. The plumbing and fire prompts did NOT. The agent's self-report said "20 tests passing" but no test validated the contract between workflows.json and docs/ai-prompts/. The user would have hit a "Specialist prompt not found" runtime error the first time they asked about a plumbing or fire question.

**Root cause:** The existing renderer test only checked step count and field-naming convention. It never validated that each step's `promptId` had a matching `docs/ai-prompts/{id}.production.md`. The contract was implicit, not test-gated.

**Rule:** Any time you add or rename a specialist step in `docs/workflows.json`, also add/update a test that asserts `docs/ai-prompts/{promptId}.production.md` exists on disk for every analysis_result step. Prompt files are part of the public contract for the workflow, not an implementation detail. Made this concrete in `WorkflowRenderer.test.ts` → "every q5 promptId resolves to an existing production prompt file."

---

## Workflow restructures ripple into existing tests — update assertions in the same agent prompt
**Date:** 2026-04-22 (W7.S Code Compliance shippability burn)
**What happened:** Agent B added a router step and promoted two subordinate steps to `analysis_result` in q5, bringing the total from 2 to 5. The existing `WorkflowRenderer.test.ts` asserted exactly 2 analysis_result steps and a specific 2-element promptIds array. Agent B's self-reported "20 tests passing" was true of the new tests it added, but it never re-ran the full suite to notice the old assertion was now stale. Verification caught it; gate turned red.

**Rule:** When an agent prompt says "restructure q5 to route through a router" (or any schema/contract change), include in the same prompt: "Update `src/design-system/components/__tests__/WorkflowRenderer.test.ts` and any other file that references the prior step count, step IDs, or promptIds. Run `npx vitest run` on the full repo, not just your new tests, before reporting done." Specific instance of the more general verify-before-complete rule, but worth calling out separately because contract tests are load-bearing for shippability gates.

---

## Brand-voice sweeps must update contract tests in the same turn
**Date:** 2026-04-22 (W8 killerapp shippability, Wave 1)
**What happened:** Agent B in Wave 1 rewrote 258 user-facing strings across `docs/workflows.json` (27 workflow labels + 138 step labels + placeholders) to match the new foreman voice. The prompt said "rewrite labels only — do not touch structure." The agent honored "do not touch structure" (it didn't add or remove steps). But it also deferred its test run "due to env timeout." The verification gate then caught 19 vitest failures across four happy-path test files — every test that hardcoded an old label string (e.g., `expect(workflow.label).toBe('Estimating')` became stale when q2 label changed to 'Quick estimate'). Separate issue: the W7.S q5 restructure (7 steps, router + 4 specialists) had been designed in tests + production prompts but the workflows.json migration never actually landed — q5 still had 6 steps with 2 checklist placeholders instead of analysis_result wiring. The brand sweep made the gap visible but wasn't itself the regression.

**Root cause (brand sweep failures):** User-facing copy is the contract that happy-path tests exercise. `.toBe('exact old string')` is a fragile assertion — one copy edit breaks N tests. Label-assertion tests should either (a) use `.toContain('stable keyword')` with a keyword that survives foreman-voice rewrites (e.g., `'estimate'`, `'orders'`, `'trades'`) or (b) be updated in the same agent turn as the copy change. Agent prompts for copy sweeps must include "grep for exact-match assertions against any string you're changing and update them."

**Rule:** Two-part rule. (1) **Authoring rule:** when writing a contract test that touches user-facing copy, prefer `.toContain('keyword')` over `.toBe('exact string')` unless the label is load-bearing product surface (e.g., the legal name of a flow). (2) **Dispatch rule:** every parallel agent prompt that rewrites user-facing copy must list the test files that assert against that copy and require the agent to update them in the same turn. For BKG specifically: `src/app/killerapp/workflows/*/__tests__/happy-path.test.tsx` is the registry of label-coupled tests — any `docs/workflows.json` label change must read that directory first.

---

## Long-running tsc/vitest needs nohup + log file, not a blocking bash call
**Date:** 2026-04-22 (W8.7 verification gate)
**What happened:** `npx tsc --noEmit` on this repo takes ~20 minutes (big dependency graph, incremental build from empty). `npx vitest run` takes ~60 seconds. Running tsc directly inside a Bash tool call caused the shell wrapper to time out / get killed (exit code 143 = SIGTERM), losing the output. A parallel tool call that errors also cancels the sibling call. Each wasted attempt cost minutes.
**Fix:** `nohup npx tsc --noEmit > /tmp/tsc.log 2>&1 & echo "PID=$!"` — captures the PID, detaches the process, streams stdout+stderr to a file. Then poll with `kill -0 $PID` + `sleep`. File survives even if the shell wrapper dies.
**Rule:** Any build/test command expected to run > 60s should: (a) write logs to a file, not stdout; (b) run under `nohup` + `&` so it detaches from the shell; (c) be checked via `kill -0 $PID` polling, not `wait` or direct pipe. Document completion by log size + tail, not by the bash call's exit code. Never run tsc and vitest as parallel tool calls — when one errors (SIGTERM, etc), the other gets cancelled too.

---

## Vitest in this repo doesn't resolve the `@/` path alias for runtime imports
**Date:** 2026-04-22 (W9.B.5 green-gate verification)
**What happened:** I wrote a happy-path test for the new IntegratedNavigator that did `import IntegratedNavigator from '@/components/IntegratedNavigator'`. Vitest failed with `Cannot find package '@/components/IntegratedNavigator'`. tsc resolved the alias fine (via `tsconfig.json` `paths`), but vitest's runtime loader doesn't — there's no `vitest.config.*` and no `vite.config.ts` in the repo that wires `resolve.alias`. The existing happy-path tests (estimating, code-compliance, supply-ordering) only use `@/` for `import type` — types are erased at runtime so vitest never has to resolve them.
**Fix:** Switch value imports in tests to relative paths (`../types`, `../../IntegratedNavigator`). Reserve `@/` for `import type` only.
**Rule:** In BKG test files, **`@/` is for `import type` only**. Any value import (class, function, constant, default-exported component) must use a relative path. If you need to test a module that itself uses `@/` internally (and hence fails to load under vitest), either (a) mock the `@/` modules with `vi.mock` before the import — vi.mock intercepts path-alias resolution — or (b) test the module's exports indirectly via a smaller sub-module that doesn't traverse `@/` transitively. The clean long-term fix is to add a `vitest.config.ts` with `resolve.alias: { '@': path.resolve(__dirname, 'src') }` and a matching `test.setupFiles`, but that's a separate shippability investment.

---

## `JSX.Element` return types break under React 19 + new `@types/react`
**Date:** 2026-04-22 (W9.B.5 green-gate verification)
**What happened:** Parallel agents writing new navigator components annotated component return types as `: JSX.Element`. Under this repo's `react@19.2.4` + `@types/react@^19` combo, the global `JSX` namespace is no longer auto-injected — it's `React.JSX.Element`. Result: 11 files with `Cannot find namespace 'JSX'` errors, all from one uniform pattern.
**Fix:** Drop the explicit return-type annotation and let TypeScript infer — React function components don't benefit from an explicit return type (any valid JSX is inferred correctly). For places where you genuinely need the type (e.g., a `Record<K, () => JSX.Element>` value), use `React.JSX.Element` with a `import type React from 'react'`.
**Rule:** In this repo, **don't write `: JSX.Element` return types on function components.** Either infer (preferred) or use `React.JSX.Element`. Agents scaffolding new components should be told this explicitly in their prompts — it's a repeated failure mode when multiple agents write parallel components.

---

## When delegating parallel component scaffolds, ship the shared type contract first
**Date:** 2026-04-22 (W9.B IntegratedNavigator parallel build)
**What happened:** I dispatched 6 agents in parallel to build IntegratedNavigator sub-components (JourneyStrip, TimeMachineLever, BudgetTimeline, NavigatorContext, icons, root orchestrator). I wrote the shared `types.ts` first — which was the right call and let all six converge on the same `StageId`, `StageProgress`, `NavigatorCollapseState`, etc. without cross-talk. But I didn't specify *which* library module owned `STAGE_WORKFLOWS` (the stage→workflow-ids map). The root orchestrator agent invented the import path `@/lib/journey-progress`, where it doesn't exist — it lives in `@/lib/lifecycle-stages`. tsc caught it, but only at green-gate time.
**Fix:** The shared type-contract file should also include a comment block that enumerates the *existing* helper modules an implementer is allowed to import from, with canonical paths. For W9 that was: `@/lib/budget-spine` (money), `@/lib/journey-progress` (events/subscription only), `@/lib/lifecycle-stages` (stage→workflow maps). Anything outside that list is either a new export (add to the same commit) or a phantom import.
**Rule:** Before dispatching parallel agents, write *both* the type contract *and* a "known imports" list enumerating which symbols come from which canonical module. Agent prompts should include: "Do not invent import paths — if a symbol isn't in the known-imports list, implement it locally." This prevents the downstream fix of "delete phantom import, add to the real module" during the green gate.
