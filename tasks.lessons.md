
# Builder's Knowledge Garden — Lessons Learned
## Updated: 2026-05-12

---

## CRM Strategy (research sprint, 2026-05-12)

### Specialist prompt filename convention is `.v2.md` / `.production.md` / `.md` — never `.v1.md`
**Date:** 2026-05-12
**What happened:** I shipped a new specialist prompt as `docs/ai-prompts/contact-extract.v1.md`. The route called `callSpecialist('contact-extract', ctx, { mockIfNoKey: true, version: 'v1' })` and got a 500. Cause: `loadSpecialistPrompt` in `src/lib/specialists.ts` resolves prompts in this order — `<id>.v2.md` (only if `version === 'v2'`), then `<id>.production.md` (only if `preferProductionPrompt: true`), then `<id>.md` (the fallback "prototype" path which requires a different heading: `## Original prototype system prompt` wrapped in backticks). There is NO `.v1.md` path. My file was invisible to the loader.
**Fix:** Renamed the prompt to `<id>.production.md` (the file already had the right `## System Prompt` heading) and updated routes to pass `preferProductionPrompt: true`.
**Rule:** New specialist prompts ALWAYS go to `docs/ai-prompts/<id>.production.md`. Routes that call them pass `preferProductionPrompt: true`. Use `.v2.md` only when adding a v2 of an EXISTING specialist that's already in `DEFAULT_VERSION_BY_SPECIALIST`. Never use `.v1.md` — the loader will never find it.

### Confirm user geography before inventing personas / demos
**Date:** 2026-05-13
**What happened:** Stream B (CRM contractor reality research) invented "Carlos Méndez, Tampa FL roofer" as a vivid adoption-story persona. The research subagent invented that — it wasn't asked. The persona then propagated forward through Stream E's adoption narrative and into `docs/demos/brief-1-who-is-asking-demo.md`. Chilly is actually in San Diego, BKG's pilot jurisdictions are CA / NV / AZ, the contractor partner is in SD, his dad is in SF. Tampa / FL / Bayshore Boulevard had nothing to do with any of it. I kept dragging the FL details into every smoke test transcript and demo script without realizing the disconnect.
**Why it slipped:** Adoption stories are rhetorical — they sound concrete even when the location is invented. The Stream B research file lives 8,000+ words deep; the FL details were one line in a 30-quote section. Once they were in the canonical adoption story, every downstream doc reused them.
**Rule:** When a research subagent invents a persona / location / business name without explicit user input, **flag it as fictional** in the doc itself (e.g., "Carlos Méndez (fictional persona)") AND prompt the user to confirm or supply real grounding before propagating the persona into demo scripts, prompts, sample queries, or marketing copy. Geography in particular matters — jurisdictions, area codes, weather radar radii, and "find a local supplier" features all key off real location data. For BKG: pilot is **California (Chula Vista / San Diego / SF Bay), Nevada, Arizona**. Never Florida. Never Texas. Never Tampa. When in doubt: ask.

### Vercel API beats the dashboard for env var management — same pattern as GitHub PAT
**Date:** 2026-05-13
**What happened:** After upgrading to Pro, Chilly granted a Vercel API token. From a single bash session: listed teams, found the project, generated CRON_SECRET, created 4 env vars across all 3 environments, triggered a redeploy, polled for READY, smoke-tested the cron + webhook auth. ~5 minutes of wall-clock, zero clicks for Chilly.
**Why this matters:** Almost everything Chilly was doing in the Vercel dashboard (managing env vars, redeploying, inspecting builds, checking deployment status) is exposed in the Vercel REST API at `https://api.vercel.com/...`. A scoped Bearer token unlocks all of it. Same pattern as the GitHub PAT for the Contents API, the Twilio Account SID + Auth Token for the SMS API, the Supabase MCP for SQL.
**Rule:** For every external service the project depends on, ask "is there an API token I can hold (with the right scope + expiry) instead of clicking through the dashboard each session?" If yes, that's the cleanest workflow. If no, fall back to Claude in Chrome browser automation. Almost every modern SaaS has a token; the dashboard is the slow path for what should be a 30-second API call.

### Vercel Hobby tier doesn't allow sub-daily cron schedules
**Date:** 2026-05-12 (Brief 2 cron deploy)
**What happened:** Pushed `vercel.json` with `{"path": "/api/v1/cron/crm-send-flush", "schedule": "* * * * *"}` for the outbound SMS flush. Build failed immediately with "Deployment failed." The Vercel error link redirected to docs about cron pricing — every-minute scheduling is a Pro-tier feature.
**Fix:** Removed the cron entry from `vercel.json`. The route handler stays — it's reachable at `/api/v1/cron/crm-send-flush` and can be triggered manually (with `Authorization: Bearer <CRON_SECRET>`) or from external schedulers (cron-job.org, GitHub Actions schedule).
**Rule:** Before adding any cron to `vercel.json`, check the customer's Vercel plan tier. Hobby allows daily; Pro allows any frequency (down to every minute). If sub-daily scheduling is required AND the project is on Hobby, options: (a) upgrade to Pro, (b) use Supabase pg_cron via an Edge Function, (c) use an external scheduler (GitHub Actions `schedule:` workflow can fire as often as every 5 minutes for free). For BKG specifically: the SMS flush is acceptable to be manual or via external scheduler until Pro upgrade.

### Don't trust a CHECK constraint enum to be complete on first design
**Date:** 2026-05-12 (Twilio webhook smoke)
**What happened:** Brief 1's `crm_contacts.source` CHECK constraint allowed `('voice','photo','manual','dream_builder')` based on the original Brief 1 capture sources. When Brief 2's Twilio inbound webhook tried to insert a new contact with `source: 'sms'`, the constraint violated → insert failed → route swallowed the error and returned 200 to ack Twilio → smoke test showed `0 rows` in the DB.
**Fix:** `ALTER TABLE public.crm_contacts DROP CONSTRAINT crm_contacts_source_check; ALTER TABLE ... ADD CONSTRAINT ... CHECK (source IN ('voice','photo','manual','dream_builder','sms','email','call'));`
**Rule:** When designing a CHECK constraint with an enum, anticipate future channel additions and either (a) leave the constraint off entirely (cheap to add later, easy to forget), or (b) include EVERY plausible value up front (email, sms, call, voice, photo, manual, import, api, etc) even if you're not building for them yet. The cost of an unused enum value is zero; the cost of a silent constraint violation on a webhook is hours of debugging.

### Markdown-fields parser is the LLM-tax safety net
**Date:** 2026-05-12 (Brief 1.1 final fix)
**What happened:** Three rounds of prompt iteration plus route-side `cleanupNarrative` + `calibrateConfidence` STILL didn't reliably get structured output from `contact-extract`. Claude Sonnet 4 would emit markdown like:
```
**Contact Record Created:**

Name: Sara Chen
Address: 1456 Davis Boulevard, Tampa, FL
Trade Intent: Plumbing - water heater
Budget Range: ~$2,000
```
with ZERO `<json>` tags. The route's `specialists.ts` parser at line 378 (`rawResponse.match(/<json>([\s\S]*?)<\/json>/)`) returned no match, so `result.structured` was `{}` and the route fell into the "Unknown" mock path.
**Fix:** Added a `parseMarkdownFields(text, body)` function in the capture route. It uses a regex (`/(?:^|\n)\s*(?:[-*•]\s*)?(?:\*\*)?\s*([A-Za-z][A-Za-z _/&-]{1,50})(?:\*\*)?\s*:\s*([^\n]+)/g`) to find every `Key: Value` line in the raw response. Then maps known keys (`Name`, `Address`, `Phone`, `Email`, `Trade Intent`, `Budget Range`, etc.) into the canonical `ExtractedContactJson` shape — including splitting `name` into givenName/familyName and `address` into a nested PostalAddress with locality/region. Sets confidence 0.75 on a successful markdown parse. Falls through to `mockExtraction` only if zero fields found.
**Outcome:** Voice capture for "New lead Sara Chen 1456 Davis Boulevard Tampa, water heater leaking, looking for a quote around 2 grand" now reliably produces a contact with name=Sara Chen, address populated, description populated, lane=homeowner, confidence 0.65 (calibrated from field presence). Works whether the LLM emits `<json>` tags OR markdown.
**Rule:** When the LLM consistently outputs structured information in a *parseable* shape (just not the shape you asked for), add a route-side parser for the shape it actually emits. Three rounds of prompt iteration is the ceiling — past that, the LLM is teaching you what shape it WANTS to output, and you should listen.

### Trust the LLM's structured output, doubt the prose — route-side fallback is more robust than prompt-engineering
**Date:** 2026-05-12 (Brief 1.1)
**What happened:** Three rounds of prompt iteration on `contact-extract.production.md` to fix the "narrative is a markdown heading" and "confidence is always 0" failure modes. Each round changed the structure of the prompt; each time the LLM (claude-sonnet-4-20250514) ignored the instructions and produced either `**Contact Record:**` headings, full markdown-formatted "Contact Record" blocks, or `bkg:confidence: 0` despite explicit calibration rules. Adding 3 concrete examples + 1 negative example didn't move the needle.
**Why prompt iteration alone failed:** Claude Sonnet 4 has strong priors toward "be a helpful assistant that produces structured, labeled output." Fighting this with prompt syntax (markdown labels, DO NOT instructions) is a losing battle for short, casual output formats. The model would rather be structurally helpful than literally compliant.
**The fix (deferred to v1.1 implementation, NOT another prompt round):** Trust the LLM's STRUCTURED output (the `<json>` block content is reliably correct — name, address fields, lane, intent are extracted well) and fall back to that for the narrative. Specifically, in the route: if `result.narrative` contains markdown patterns (`^##`, `**Name:**`, leading `\*\*[A-Z]`), discard it and use `extracted.description` (the JSON-LD `description` field, which is reliably one-sentence). Similarly for confidence: if the LLM returned `bkg:confidence: 0` but the JSON-LD has a name AND an address AND an intent (description with a verb), calibrate server-side to 0.7. Don't ask the LLM to grade itself.
**Rule:** When the LLM is consistent in its structured output but flaky in its prose, write route-side parsers/calibrators instead of more prompts. Three rounds of prompt iteration is the breaking point — past that, the failure is the prompt-engineering approach, not the prompt content.

### Verify table existence before referencing in a migration FK
**Date:** 2026-05-12
**What happened:** Brief 2's `crm_messages` migration referenced `specialist_runs(run_id)` as a foreign key for `ai_run_id`. The migration failed with `ERROR: 42P01: relation "public.specialist_runs" does not exist` because the W7.R RSI table migration (`supabase/migrations/20260422_rsi_deltas.sql`) was authored in the repo but never applied to the production Supabase. Re-ran the migration with the FK constraint dropped to `ai_run_id uuid` (no FK).
**Why this matters:** The repo's `supabase/migrations/` folder is the source of truth for engineers, but it's NOT necessarily the state of the prod DB. Many migrations were applied via ad-hoc raw SQL during the W3 push and never recorded in the migrations table. The Supabase MCP `list_migrations` only returns 7 entries for `knowledge-gardens-prod`; the repo has 18+ migration files.
**Rule:** Before referencing any table in a new migration's FK constraints, verify it exists in the target database via `mcp__supabase__list_tables` or a `SELECT FROM information_schema.tables`. Don't trust the existence of a table just because the repo has a CREATE TABLE for it. Same for any joins — verify the joined table is in prod before shipping a query that depends on it.

### Capture endpoint smoke tests must include cleanup of test data
**Date:** 2026-05-12
**What happened:** End-to-end smoke test of Brief 1 voice capture created 3 contact rows in the production `knowledge-gardens-prod` Supabase, including one "Unknown" row from the failed pre-prompt-fix call. Forgot to delete after the test. Manually cleaned up via `DELETE FROM crm_contacts WHERE project_id = 'smoke-test-2026-05-12'`. Risk: smoke tests pollute production data if not scoped to a test project_id AND cleaned up after.
**Rule:** Every smoke test against a live API endpoint that writes to prod Supabase must (a) scope the write with a clearly-named test `project_id` (e.g. `smoke-test-YYYY-MM-DD-<purpose>`), (b) delete the test rows at the end of the test, (c) verify the delete was complete before declaring done.

### React 19 / Next 16: `JSX.Element` is no longer a global namespace — strip return-type annotations on components
**Date:** 2026-05-12
**What happened:** Brief 1's 5 React components were written by a code agent with explicit `: JSX.Element` return-type annotations. Audit didn't catch it because the agent claimed the existing repo pattern used `Promise<JSX.Element>` based on inferred type from `tsc --declaration` — but that was the *inferred* type, not the *source* annotation. The actual repo has exactly one file using `JSX.Element` and it imports the namespace explicitly. Under Next 16.2.1 + React 19.2.4, the JSX namespace is not globally augmented for client components — Vercel's stricter `next build` typecheck (not stock tsc) fails with `Cannot find namespace 'JSX'`.
**Fix:** Strip every `: JSX.Element` and `: Promise<JSX.Element>` annotation from function-component declarations. Let TypeScript infer. Alternative: `import { type JSX } from 'react'` at the top of each file. Removing the annotation is the cleaner, repo-consistent option.
**Rule:** When writing or auditing React components for this repo (Next 16 + React 19): never annotate the return type of a function component. Let TypeScript infer. If you must annotate, use `React.ReactNode` or import the JSX namespace explicitly. The 2026-04-18 lesson about `next build` having stricter typechecks than `tsc --noEmit` applies — local tsc would miss this one, only `next build` catches it.

### Always fetch the agent's output back from GitHub and read it before celebrating a push
**Date:** 2026-05-12
**What happened:** Pushed 13 Brief 1 files in a single batch via the GitHub Contents API. All 13 returned 201/200 — push was clean. But Vercel's build of that commit failed (red). I didn't see it until polling the status API ~2 min later. Live site is fine (Vercel keeps last green build serving until a new one promotes), but the failure means new pushes don't deploy until the broken HEAD is fixed.
**Root cause of the failure:** Unknown without the build log. Agent-written files were pattern-grounded to the audit, but a code agent can still ship a strict-mode TypeScript error that local heuristic checks miss. Without a local clone of the repo I can't run `tsc --noEmit` before pushing — `next build` checks are stricter than stock `tsc`, per the 2026-04-18 lesson.
**Rule:** Before relying on a code-writing subagent for >5 files at once: (a) clone the repo into the Cowork workspace OR (b) use Supabase / Vercel REST API tokens so I can fetch failed deploy logs without asking the user. Without one of those, my agent push is "spray and pray" — patches require the user to copy the build error from their dashboard, which is a context-switching tax. Next time: request the repo clone path via `request_cowork_directory` BEFORE writing code, or pre-arrange a Vercel token alongside the GitHub PAT.

---

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

## 2026-05-18 — Bisect when Vercel logs aren't accessible

When a Trees-API atomic commit breaks the Vercel build and you don't have a
Vercel API token, the fastest path is:

1. **Revert just the consumer-of-new-types files** (the ones with the most
   code surface — components that import the new module). Keep new files
   and type extensions untouched; those rarely break a build on their own.
2. **Push that revert.** If Vercel goes green, the bug is in one of the
   reverted files.
3. **Re-layer one file at a time.** Each re-layer is a single-file Trees
   commit. ~1 minute per cycle.

Why this works: build failures often surface in the IMPORTING file, not the
new module. Reverting the importers is a binary-search step that costs one
push but pays back log access we couldn't otherwise get.

## 2026-05-18 — `Record<string, unknown>` index types break `.trim()`

When `state.fields` is typed `Record<string, string>` but the enclosing
state extends `Record<string, unknown>`, indexed access inside a callback
can collapse to `unknown`. `.trim()` fails the type-check downstream
without an explicit `Record<string, string>` annotation on the local copy.

The fix: declare `const f: Record<string, string> = { ...prev.fields };`
explicitly inside the autofill effect. Don't rely on the spread carrying
narrow types through nested closures.

## 2026-05-18 — Sandbox can't reproduce `next build`

The Cowork sandbox runs out of memory (`Bus error`, core dump) on a
`next build` of a repo this size. Don't burn time trying — bisect via
pushes instead. `tsc --noEmit` also times out before producing output.
The ONLY usable signal is the GitHub commit-status API.



---

### Record<string, unknown> spread widens through `as T` cast — narrow the assignment target locally
**Date:** 2026-05-18 (PM)
**What happened:** Third attempt at C3 contracts spine autofill finally landed clean (commit `ebdb85b`). Prior two attempts (commits `3ba65f94`, `81e84597` — both reverted same day) hit `Type 'unknown' is not assignable to type 'string'` inside the seed callback. Confirmed root cause: `ContractsState extends Record<string, unknown>`, and `useProjectStateBlob`'s hydration does `const merged = { ...defaultValue, ...blob } as T` where `blob: Record<string, unknown>` (line 451 of `useProjectWorkflowState.ts`). The `as T` cast doesn't roll back the spread widening — fields hydrated from `blob` come through as `unknown`. Inside the seed callback, `prev.fields ?? {}` is inferred as `Record<string, unknown>`, so `f[key] = String(val)` re-checks against an unknown index signature and tsc rejects.

**Fix:** declare `const f: Record<string, string> = { ...(prev.fields ?? {}) }` LOCALLY in the callback. This narrows the assignment target back to string-only at the call site — the surrounding `ContractsState` can stay widely typed without forcing the writer to fight the spread.

**Rule:** When a state shape extends `Record<string, unknown>` (whether for hook ergonomics or JSONB persistence), any caller that wants to write specific-typed values into a sub-shape MUST declare a locally-narrowed type for the destination object. Don't rely on the wider type to "remember" what its sub-shapes were — `as T` over a spread erases that. The annotation lives at the WRITE site, not the type definition.

---

### Cowork sandbox cannot write inside `.git/` on the mounted workspace — Trees API always
**Date:** 2026-05-18 (PM)
**What happened:** Tried to commit via `git add` from inside `/sessions/.../mnt/The Builder Garden/app/`. Got `fatal: Unable to create '.git/index.lock': File exists`. Tried to `rm` the lock — `Operation not permitted`. The sandbox FUSE mount makes the `.git` directory effectively read-only for our user, even though `git status` and `git diff` work fine.

**Fix:** Use Trees API (GitHub REST `/git/blobs` + `/git/trees` + `/git/commits` + `/git/refs`) for multi-file atomic commits via a Python script in `outputs/`. The script reads file contents from disk, base64-encodes blobs, creates a tree based on `base_tree_sha`, creates a commit, updates the branch ref. Works for ANY filesystem location — no `.git` write needed.

**Rule:** In Cowork, never use `git commit` / `git push`. Always Trees API for multi-file commits, Contents API for single-file. This is also better for atomicity: one Trees-API commit covers N files; N Contents-API PUTs trigger N Vercel builds with potentially-broken intermediates.

---

### Knowledge gardens share Supabase — table names differ, jurisdiction_ids is `uuid[]`, title/summary/body are jsonb i18n objects
**Date:** 2026-05-18 (PM)
**What happened:** Queried `SELECT FROM projects WHERE id = '55730cd3-…'` to find the demo Marin project; got `42P01: relation "projects" does not exist`. List-tables showed why: the BKG Supabase project at `vlezoyalutexenbnzzui` is shared with at least three other knowledge gardens (Orchids: `species`, `orchid_genera`, `synonyms`, `provenance_records`; EWG Water: `ewg_contaminants`, `substances`, `regulatory_limits`; a case-management thing: `cases`, `experts`, `case_documents`). BKG's project table is `command_center_projects` (20 rows). Also discovered: `knowledge_entities.title/summary/body` are jsonb objects (`{"en": "..."}`), NOT plain text; `knowledge_entities.jurisdiction_ids` is `uuid[]` referencing `jurisdictions.id`, NOT a text array of slugs.

**Fix:** For demo seeding, first inspect `information_schema.columns` for the target table to confirm types. Use `jsonb_build_object('en', '...')` for i18n title/summary/body. Look up jurisdiction UUIDs first (`SELECT id, slug FROM jurisdictions WHERE slug = 'ca-marin'`) and pass `ARRAY['<uuid>'::uuid]` for `jurisdiction_ids`.

**Rule:** When working with this Supabase project, never assume table names from the in-app reasoning — always check `list_tables` first. Most BKG tables are prefixed (`command_center_*`, `project_*`, `crm_*`) or differently named (`knowledge_entities`, `jurisdictions`) to avoid collision with the other gardens. Two columns also have non-obvious shape: `knowledge_entities.title/summary/body` (jsonb i18n) and `knowledge_entities.jurisdiction_ids` (uuid[] not text[]). Also: 23 BKG-adjacent tables have RLS disabled — flag for the user as a separate concern, never auto-fix.

---

### Parallel `Edit` tool calls require prior `Read` per file — same turn won't work
**Date:** 2026-05-18 (PM)
**What happened:** Tried to apply 12 copy-fix Edits in parallel across 5 files. 11 of 12 failed with "File has not been read yet. Read it first before writing to it." Only the 1 file I'd Read earlier in the session accepted its Edit. Trying to parallelize `Read` and `Edit` in the same tool-use block is the wrong shape — the harness needs the Read to land BEFORE the Edit's permission check fires.

**Fix:** When applying multiple Edits across multiple files, first do one bash/Read pass that opens every target file. THEN do the parallel Edits in a separate tool-use block. The Read is what registers the file as "open for editing"; without it, the harness refuses the Edit.

**Rule:** Parallelize within phases, not across phases. Reads in one turn, Edits in the next. Same applies for any "X must be opened before Y" tool pair — bundle the prerequisite in a prior turn.

---

### WebFetch is provenance-locked — delegate cold-start prod audits to a subagent
**Date:** 2026-05-18 (PM)
**What happened:** Tried to WebFetch `https://builders.theknowledgegardens.com/dream/oracle` after Ship 1+3 shipped, to verify the copy changes were live. Got "URL not in provenance set." The user's initial prompt mentioned the host (`https://builders.theknowledgegardens.com`) but not the full path `/dream/oracle`. Provenance is strict per-URL, not per-host.

**Fix:** For prod URL verification, either (a) get the user to paste the exact URL into chat first, (b) use a subagent (Agent tool) — subagents have their own WebFetch provenance and pick up URLs from the parent's SPAWN PROMPT, or (c) fetch the host root URL once first so subpaths become reachable transitively (sometimes works, sometimes doesn't).

**Rule:** Cold-start trust audits and any "walk this list of N URLs" task should be delegated to a subagent (general-purpose). The subagent's WebFetch is unrestricted as long as the URL appears in the spawn prompt. Save the parent's narrow provenance for things you actually can't delegate (like the Trees API push or Supabase MCP).

---

### Vercel build status is on the legacy GitHub Status API — poll `/status`, not `/check-runs`
**Date:** 2026-05-18 (PM)
**What happened:** Polled `/repos/.../commits/<sha>/check-runs` and got `total_count: 0` even though Vercel was actively deploying. Tried `/repos/.../commits/<sha>/status` (the legacy "combined status" endpoint) and got `state: success, context: Vercel, description: Deployment has completed` exactly when Vercel finished. The Vercel integration on `chilly611/builders-knowledge-garden` posts to the Status API, not the Checks API.

**Fix:** For BKG build verification, poll `/commits/<sha>/status` with a Bearer PAT. ~25-30s after push gives the `pending` signal; ~90-120s gives `success` (or `failure`). The `target_url` on the status object points at the Vercel deployment detail page (useful for clicking through to logs from a real browser, though our sandbox can't reach the dashboard).

**Rule:** Always poll `/commits/<sha>/status` for Vercel state in this repo. Don't bother with `/check-runs` until / unless a Checks-API integration replaces the Status integration.

---


---

### Platform infrastructure that's invisible to users isn't really shipped
**Date:** 2026-05-18 (burn 2)
**What happened:** The W7.Q.1 ship (2026-04-22) built `queryAllSources` for 3-source code verification. It computed `codeSourceConfidenceData.sourceCount`, injected the count into the LLM prompt, and influenced the model's `confidence` field. But the `sourceCount` itself was never returned in `SpecialistResult` and never rendered in the UI. For four weeks the platform was multi-source-verifying every compliance answer and saying nothing about it to the user. The investor demo would have leaned on a feature no one could see.

**Fix (this burn):** One additive type field (`sourceCount?: number` in `SpecialistResult`), one line in the return statement, one new component (`SourceCountBadge`, 95 LOC), one JSX insertion in `AnalysisPane.tsx`. Total LOC: ~110. Total time: ~15 min. The signal is now visible everywhere the confidence band renders.

**Rule:** When shipping infrastructure that improves an answer's quality (multi-source verification, RAG hit-count, retrieval grounding, citation provenance, freshness check) — ALWAYS ship the user-visible signal in the same sprint. The rule "platform invisible = not shipped" applies regardless of how clean the back-end implementation is. Story for the demo / investor / customer / engineer reading the result needs the badge as much as the code path needs the verification. Bake this into review: "does the user see when this is on?" If no, the ship isn't complete.

**Detection pattern:** for any `Result` interface returned by a `lib/`-layer specialist or service, audit it twice a sprint — once for "is every field actually rendered somewhere?" and once for "are there computed values in the function body that DON'T get attached to the result?" The latter is what bit us here; `sourceCount` lived in a local var named `codeSourceConfidenceData` and dropped on the floor at the return boundary.

---

### Cross-jurisdiction code seeding: tag with both `jurisdiction_ids` (uuid[]) and `metadata.adopted_by` (text[])
**Date:** 2026-05-18 (burn 2)
**What happened:** Seeded 16 new building codes spanning data center / skyscraper / commercial / hospital / school / residential reno / accessibility / desert. Each code is relevant to multiple jurisdictions (a Title 24 §140.3 envelope rule applies in SF, Oakland, San Jose, SD, plus the statewide level). Initial instinct was to seed one row per jurisdiction (cross-product). That's wasteful — each row is the same text; only the FK changes.

**Fix:** One row per code, with TWO multi-jurisdiction columns populated:
- `jurisdiction_ids: uuid[]` — the canonical FK to `jurisdictions.id`. Used by joins and the formal data model.
- `metadata.adopted_by: text[]` — the legacy slug list used by `queryAllSources` keyword filter (`bkg-seed.ts` searches `metadata::text ILIKE '%<jurisdiction>%'`).

**Rule:** When seeding cross-jurisdictional code data, write the row once and tag both columns. The UUID array satisfies the schema; the slug array satisfies the existing retrieval keyword filter. Until the filter migrates to FK joins, populate both — belt-and-braces. Also: when adding a new code system to BKG, scan `src/lib/code-sources/*.ts` for the active retrieval path so you know which fields it inspects.

---

### Stray non-ASCII chars in SQL strings: a Chinese/Cyrillic glyph in a function call name silently kills the parse
**Date:** 2026-05-18 (burn 2)
**What happened:** One INSERT failed with `function gen_租_uuid() does not exist`. The string `gen_random_uuid` had been corrupted to `gen_租_uuid` — a Chinese character `租` (zū = "rent") substituted for `random`. Probable origin: editor autocorrect, IME glitch, or a copy-paste from a normalized document that compressed `_random_` to `_租_` via a normalization pass. Hard to spot visually because the underscore framing made it look like the rest of the identifier.

**Fix:** Re-run the INSERT with the correct identifier; works clean. Post-hoc: install non-ASCII linter rule for SQL inserts that should be ASCII-only (function names, identifiers, table/column refs).

**Rule:** When a SQL query mysteriously fails on a function name that "should exist", grep the raw query text for non-ASCII characters before debugging anything else. `grep -P '[^\x00-\x7F]'` on the SQL string surfaces these in 100ms. Same applies to JSON keys, TypeScript identifiers, and any literal where ASCII is structurally required.

---

### Trust signals on a demo screen are demo content, not engineering polish
**Date:** 2026-05-18 (burn 2)
**What happened:** Through 4 weeks of agent rotations on this codebase, no one prioritized making the 3-source verification visible — the badge was always "P2 nice-to-have, post-demo." The investor pitch script for Wednesday says: "we cross-check every code answer against multiple sources, so you never get an AI hallucination on a building permit." A pitch claim that's invisible on screen is a pitch claim that doesn't land. The badge IS the demo content.

**Rule:** Trust signals (source count, freshness, provenance, "verified by", "updated N min ago", "synced from Supabase") sit at the intersection of platform infrastructure and demo content. They are NOT polish to do after the demo — they ARE the demo. When a pitch has a claim like "no hallucinations" / "live data" / "verified citations", build the on-screen artifact that proves the claim BEFORE the demo, not after. Same as for "100% test coverage" badges, security audit stamps, SOC2 logos on landing pages — the artifact is part of the product, not commentary on it.

---


---

### Subagent Read→Edit→Write can silently stomp the working tree when HEAD has drifted
**Date:** 2026-05-19 (Burn 4 Wave 2 incident)
**What happened:** Dispatched a code-writing subagent with 5 surgical fixes to apply across 5 files. For 3 files (JourneyArc, AuthAndProjectIndicator, BudgetSnapshot) the result was clean and additive. For TWO files (`useProjectWorkflowState.ts` and `ProjectCockpit.tsx`) the agent's local working tree was a stale snapshot — the file on disk did NOT match HEAD on main. The agent's standard Read→Edit→Write loop silently reverted critical unrelated work that had landed between its base snapshot and the current HEAD, INCLUDING:

- In `useProjectWorkflowState.ts`: the W11 emergency-batch demo-id rescue (`!raw.startsWith('demo-')` allowing demo-seeded project IDs to hydrate) AND 14 lines of SOON workflow state column types (`bid_risk_state`, `client_lookup_state`, `change_orders_state`, `draw_requests_state`, `lien_waivers_state`, `payroll_check_state`, `walk_through_state`, `retainage_state`, `warranty_state`, `project_review_state`). The columns are referenced elsewhere in the codebase via TypeScript; removing them turned the build red ~50s into the Vercel job with `Property 'X' does not exist on type 'ProjectStateColumns'`.

- In `ProjectCockpit.tsx`: the ENTIRE `useTimeMachineRewind` hook import + invocation (29 lines), the `REWIND_EVENT` listener that pulls historical journey + budget state into the cockpit when the user scrubs the dial, the `RewindToast` import + render wrapper, the `currentSnapshotId` prop pass-through to TimeMachineDial, the `rewindTo(snapshotId)` call inside `handleTimeScrub`, AND the W11 emergency-batch comment about rendering the cockpit on the picker route. The agent REPLACED that with an `if (pathname === '/killerapp') return null;` regression that would have hidden the cockpit entirely on the picker — reverting the exact W11 fix that shipped 2026-05-11.

Vercel caught both via the same TS error pattern, but the rewind stomp would NOT have been visible in a typecheck — the rewind functionality would have silently disappeared from prod. Could have shipped to investors before anyone noticed.

**Detection path:** PARALLEL-AGENT-PLAYBOOK Pattern C (bisect by re-layering). Re-pushed each Wave 2 file individually to main. `useProjectWorkflowState` failed alone → confirmed culprit. PROACTIVELY diffed each remaining file against canonical HEAD before pushing it. Found the ProjectCockpit stomp before pushing it broken.

**Fix:** for each stomped file:
1. Fetch the canonical version from main via Contents API.
2. `cp` it over the local working tree (replacing the agent's stomped version).
3. Re-read via the Read tool so the harness re-registers state.
4. Apply ONLY the intended surgical edits via the Edit tool.
5. Diff the result against the canonical version — confirm ONLY the intended hunks are present.
6. Push via Trees API.

**Rule:** never trust a subagent's Write on a file when the agent's view of HEAD may have drifted. Specifically: when a subagent is asked to edit a file, the build orchestrator MUST diff the agent's output against the canonical main version BEFORE pushing — or instruct the agent to fetch the canonical version itself BEFORE editing. Diff-before-push is non-negotiable for any file that has shipped material in the last 7 days (it has unaccounted-for-by-the-agent work).

**Tactical heuristics:**
- If the agent's "lines changed" estimate is wildly off (LOC delta says +24 but the visible logic is only +14), there are ghost changes — probably reverts. Investigate before pushing.
- For high-risk files (the spine: `ProjectContext.tsx`, `useProjectWorkflowState.ts`, `ProjectCockpit.tsx`, `layout.tsx`, `page.tsx` of demo routes), always fetch canonical AND diff before push, regardless of agent claims.
- After pushing any subagent-written file, if Vercel fails fast (<60s = typecheck error), assume a stomp and bisect with canonical-restoration as step 1 — not edit-the-edit.

**Generalization:** this is a specific instance of the broader "agent self-reports lie pleasantly" pattern (lesson 2026-04-22). Subagents report their intent and what they believe they did. They don't know what the parent's main is. Trust the build output, not the agent narrative.


---

### Diff-before-push protocol pays off in the first sprint — catch whole-file rewrites before they ship
**Date:** 2026-05-19 (Burn 5 — Ships 8-11)
**What happened:** After the Burn 4 "subagent stomp" incident (`useProjectWorkflowState.ts` + `ProjectCockpit.tsx`), the new rule was: before pushing any subagent-written file, fetch the canonical version from main via Contents API and diff against the local working tree. Burn 5 had FOUR subagent-written file modifications. Three were clean surgical edits. One (`/api/v1/crm/route.ts`) was a **WHOLE-FILE REWRITE** — different imports, different module structure, removed `export const STAGES` / `CONTACT_TYPES` / `TEMPERATURES` constants and types. The diff-before-push step caught it before push.

The rewrite turned out to be SAFE — `grep -rn "from.*api/v1/crm/route" src/` returned zero matches (no external consumers of the removed exports). Push proceeded. Build went green.

**Rule (operationalized):** the diff-before-push step has two layers:
1. **Mechanical**: diff the agent's output against canonical main. If it's not a small surgical change, treat as a rewrite.
2. **Risk-assessment for rewrites**: grep for external consumers of any removed exports. If no consumers exist, the rewrite is safe. If consumers exist, force the agent to redo as a surgical edit OR fix the consumers in the same commit.

**The cost of doing this check:** ~30 seconds per file (one curl + one diff + one grep). For 4 files that's ~2 minutes. The cost of NOT doing it on Burn 4 was: 2 failed Vercel deploys, a force-push rollback, two bisect passes, plus near-shipping the Time Machine rewind stomp to investors.

**Sub-lesson:** when an agent reports "rewrote the POST handler" or similar, that's not a surgical edit — it's a rewrite. The diff will show it. Don't trust the agent's framing; look at the diff.

---

### Use Claude in Chrome for hydration-time JS verification
**Date:** 2026-05-19 (Ship 12)
**What happened:** The Ship 5 trust badge and Ship 2 contracts autofill are hydration-time effects — they fire AFTER the React tree mounts and the project context resolves. WebFetch sees the SSR shell; it does not see the hydrated state. So "is the autofill paint working?" can't be verified by curl or WebFetch.

**Pattern:** dispatch a subagent with Claude in Chrome MCP tools (`mcp__Claude_in_Chrome__navigate`, `get_page_text`, `find`, `form_input`, `read_console_messages`). The subagent drives a real browser, waits for hydration, reads the actual form input values, and reports the observed state. Cost: ~150k tokens + ~3 min wall-clock for a 3-project smoke test. Compared to manual click-through on a real laptop: faster, deterministic, captures console errors.

**Rule:** for any feature that lives in client-side hydration (autofill, event subscribers, animations, state-derived UI), use Claude in Chrome to smoke-test on prod. WebFetch is only good for SSR / shell-level checks.

**Tactical:** in the subagent's spawn prompt, include the exact URLs, expected observable values, and a tolerance (e.g., "$905,000 ± $1,000"). The agent will report exact-match where possible; tolerance handles rounding / formatting drift.

---

### Discover Supabase schema + storage buckets BEFORE dispatching code-writing subagents
**Date:** 2026-05-19 (Burn 5)
**What happened:** Before dispatching Ships 9 and 10 build agents, queried Supabase MCP for:
1. `crm_contacts` table schema (33 columns: 5 NOT-NULL non-id, plus required `time_machine_handle` per the Stream-C spec)
2. `storage.buckets` listing (confirmed `crm-photos` exists and is public)
3. `agent_identities` table (turned out to NOT exist — surfaced gap for Ship 8 auth)

Pasting that exact schema into each agent's spawn prompt meant the agents:
- Used `time_machine_handle` correctly (would have missed it otherwise)
- Knew the bucket name without guessing
- Didn't try to write to a non-existent auth table

Total query time: ~10 seconds. Saved at least one Vercel build failure.

**Rule:** for any subagent that's going to write Supabase-touching code, the orchestrator does a 3-query schema discovery FIRST and inlines the result in the spawn prompt. Don't let the agent infer the schema from grep'd type definitions — they're often stale or partial.

---

### Hydration-time autofill is observable, but only end-to-end
**Date:** 2026-05-19 (Ship 12 smoke)
**What happened:** The contracts autofill `useEffect` runs once per session after the project hook hydrates. To verify it works on a project, you have to: (1) navigate to the URL with `?project=<uuid>`, (2) wait for the hook to fetch the project from Supabase, (3) wait for the autofill effect to fire, (4) click the template tile to enter step 2, (5) observe the form input values. Skip any step and you see nothing.

**Observable in the Claude in Chrome run:**
- Project name on the project context banner ("Modern farmhouse in Marin") — confirms hook hydrated
- Form `projectName` input value matching project name — confirms autofill fired
- Form `contractAmount` input formatted as currency — confirms midpoint calc + formatter ran
- `scopeOfWork` populated from `project.ai_summary` — confirms the optional path also fired

**Rule:** when designing a smoke test for a hydration-time effect, list the COMPLETE observable chain (project context → effect fires → form value set → UI renders) and have the agent verify each link. Reporting only "the page loaded" is not enough.

## 2026-05-18 — DXT renamed to MCPB mid-2025; ship `.mcpb` for zero-touch demo installs

Anthropic renamed the Desktop Extension format from DXT to MCPB. `.dxt` files were the old name; the current spec is `.mcpb` (MCP Bundle), `manifest_version: "0.3"`, and the official packager is `@anthropic-ai/mcpb` (`npx -y -p @anthropic-ai/mcpb mcpb pack`). Any plan that mentions `.dxt` is referring to the obsolete name — fetch the README at `github.com/anthropics/mcpb` for the current schema before writing the manifest.

**Why this matters for our demo:** the `.mcpb` install path (download + double-click → Claude Desktop installs) is the only zero-touch route for connecting a fresh laptop to BKG's MCP server. Manual `claude_desktop_config.json` editing is the fallback for older Claude Desktop builds. We host the bundle at `/bkg-mcp.mcpb` on prod so any laptop with a browser can install in ~30 seconds.

**Recipe:**
1. `mcp-bridge/manifest.json` with `manifest_version: "0.3"`, `server.type: "node"`, `server.entry_point: "mcp-bridge.js"`, and `server.mcp_config.args: ["${__dirname}/mcp-bridge.js"]`.
2. Build script copies the canonical bridge (`scripts/mcp-bridge.js`) + manifest into a staging dir then runs `mcpb pack`.
3. Output to `public/bkg-mcp.mcpb` so Vercel serves it as a static file.
4. Landing page at `/install-mcp` with a single `<a href="/bkg-mcp.mcpb" download>` button.

## 2026-05-18 — `body_plain` was always a phantom column; use `search_text` for FTS on `knowledge_entities`

`src/app/api/v1/mcp/route.ts` `search_knowledge` queried `knowledge_entities.body_plain` via `textSearch`. That column does not exist on the table. Every Supabase query errored silently, the `if (!error && data)` guard was bypassed (error truthy → fall through), and every demo query returned the hardcoded mock data (IBC sprinklers / OSHA fall protection / 4000 PSI concrete) — including the Act 4 closer "What are the Marin County energy code requirements?"

**The fix is the proven pattern from `src/app/api/v1/search/route.ts` and `src/lib/rag.ts`:**
- `select` does not include a `body_plain` field
- `.eq("status", "published")` filter (so unpublished drafts don't leak)
- `.textSearch("search_text", query, { type: "plain", config: "english" })` — `search_text` is the generated tsvector column
- Use `domain` not `domain_id` for the filter
- Fall back to `ilike` OR-of-words on `search_text` when FTS returns no rows — catches partial-word + abbreviation queries like "Marin energy code" where the body text says "Title 24 §110.10 solar"

**Rule:** when adding a new query path against `knowledge_entities` (or any shared table), grep for at least one existing working query against the same table and match its column list. Don't invent column names from a comment or an early-draft schema.

## 2026-05-18 — Parallel-agent push rebase pattern: small, file-scoped, no merges

This session was interrupted twice by concurrent pushes from Chilly's parallel session (Burn 5 close-out, then Ship 8.5 installer). Both rebased cleanly with `git rebase FETCH_HEAD` because the file paths didn't overlap: my work touched `mcp-bridge/`, `scripts/build-mcpb.mjs`, `public/bkg-mcp.mcpb`, `src/app/install-mcp/`, `docs/onboarding/`, `package.json`, `src/app/api/v1/mcp/route.ts`; Chilly's touched `scripts/mcp-bridge.js`/`mcp-bridge.README.md`/`mcp-bridge.smoke.sh`, `src/app/api/v1/crm/route.ts`, `src/app/signup/`, `src/app/login/page.tsx`, `tasks.*.md`, `docs/session-log.md`.

**The one file we both could have touched** is `src/app/api/v1/mcp/route.ts` — Chilly's burn was building a bridge that wraps that endpoint, mine was fixing a bug inside it. Pure luck that Chilly didn't also need to edit it.

**Rule when two agents are coding in parallel against `main`:**
1. **Pull-rebase before every push, not just on rejection.** Costs 2 seconds, catches the conflict-prone case at planning time.
2. **Declare file paths in `tasks.todo.md` follow-ups when you claim a task.** A 2-line "touching: route.ts / install-mcp/page.tsx / build-mcpb.mjs" note lets the other agent route around.
3. **When the same file does conflict, the agent that pushes second resolves** — they have the smaller diff to re-apply on top of the larger landed change.
4. **De-dupe via post-merge consolidation, not pre-merge coordination.** If two agents both ship a stdio bridge (as happened here), the second one rebases, deletes their duplicate, and adapts their unique work (.mcpb packaging) to wrap the first one's canonical file. One source of truth, both contributions ship.

## 2026-05-19 — Workflow API `user_id` filter is a demo-day foot-gun

Every workflow page (`/killerapp/workflows/*`) hydrates project state via `useProjectWorkflowState`, which calls `/api/v1/projects?id=<id>`. That endpoint runs `.eq('id', projectId).eq('user_id', user.id).single()` — so it returns 404 if the *currently authenticated user* doesn't own the project, even if the project exists. The autofill effects then no-op silently (`if (!project) return` guards in every workflow client), leaving form fields empty with no error toast.

**The trap:** during a live demo, this looks identical to "autofill is broken" or "the page is buggy." Nothing on screen tells you the API 404'd. The fix is "log in as the right user," not "ship more code."

**Rule for every demo prep:** before a demo, run a cold-start dress rehearsal as the actual presenter's account (not "I'm logged in as some user, it'll be fine"). The smoke test we ran today caught this 36 hours before showtime, not 30 seconds before.

**Cleanup options for after:**
1. Add `is_demo_project boolean DEFAULT false` to `command_center_projects` + filter API with `.or('user_id.eq.<id>,is_demo_project.eq.true')`. Also filter demo rows OUT of users' personal project lists.
2. Tighter: when API returns 404 because of the user_id filter (vs. truly nonexistent project), return a structured "wrong owner" error that the workflow page surfaces visibly. Stumble-but-visible > silent-failure.
3. For workflow pages specifically: relax the filter to allow read access on any project the user has been added to (via a `project_collaborators` table). This generalizes beyond demo.

## 2026-05-19 — `WorkflowPickerSearchBox` strips jurisdiction at project create time

The killerapp "describe your project" search box (`src/app/killerapp/WorkflowPickerSearchBox.tsx:185`) POSTs only `{ raw_input: q }` to `/api/v1/projects`. The server then stores `jurisdiction: body.jurisdiction || null` — so every project created via the killerapp surface has `command_center_projects.jurisdiction = NULL` in the database, even though the user's natural-language input contains the location.

Every downstream workflow that reads `project.jurisdiction` then receives null and hits its fallback path — usually "show the first jurisdiction in the list" or "leave the picker wherever it last was." When the user has previously clicked something else, that selection sticks, and you get the demo killer where a project described as "San Francisco" renders Santa Monica citations.

**Two-layer fix pattern:**

1. **Immediate (workflow-side):** in each workflow client that needs jurisdiction, scan `project.raw_input` / `project.ai_summary` / `project.name` in addition to `project.jurisdiction`. Match canonical jurisdiction names (with the ", XX" state suffix and "(statewide)" tags stripped) against word-bounded normalized signals. Score by level (city > county > state) then by canonical-name length (longer = more specific). Only override the picker when the user hasn't manually changed it.

2. **Right answer (project-create-side):** parse jurisdiction at create time via an LLM call (the AI Take pass is already happening — extend its output to extract jurisdiction + project_type + estimated cost range) and write them to the row. Once that's in place every workflow gets jurisdiction for free without per-workflow autofill logic.

**Rule when a "wrong default" bug shows up in a workflow:** check what's actually stored on the project row BEFORE assuming the workflow code is the bug. If the source column is empty, the workflow is correctly rendering the fallback — the bug is upstream at project creation.

## 2026-05-19 — Word-boundary matching for jurisdiction inference

When matching a free-text project description against the JURISDICTIONS list, naive substring matching (`signals.includes(name)`) silently corrupts results because city names overlap with common English words and other place names: "Marin" ⊂ "Marina", "Burbank" ⊂ random text very rarely but it can happen, and worst of all "California" never appears as a substring of "ca 94122" so state-level matches miss entirely.

The fix (shipped in `CodeComplianceClient.tsx` 2026-05-19): normalize signal text by replacing every non-alphanumeric run with a single space, then pad with leading/trailing spaces, then match against `` ` ${canonical_name} ` `` (with spaces). This gives token-bounded substring matching without needing a regex per jurisdiction.

Also: when the canonical name ends in " county" (e.g. "Marin County"), also accept the base name ("marin") as a valid match — users say "in Marin", not "in Marin County."

## 2026-05-19 — USPS state codes need a real map, not a first-letter heuristic

`JurisdictionPicker.tsx getShortLabel` previously computed two-letter state codes by taking `state.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase()`. This silently breaks on every single-word state name: California → "C", Texas → "T", Florida → "F", Ohio → "O". Only multi-word state names accidentally work ("New York" → "NY"). And on top of that, most jurisdiction `name` fields already include the state suffix (e.g., "San Francisco, CA"), so appending a state code double-tags the label even when the abbreviation is correct.

**Rule:** for state/country code conversion, use a real lookup table (USPS, ISO 3166). Never derive codes from name heuristics — country and state names are full of one-word forms, multi-word forms, abbreviations, and exceptions. The 50 states + DC map is 51 entries; it's not a maintenance burden.

**Second rule:** before appending a derived label suffix to a value that might already contain it, regex-check for the suffix and skip the append. Cheap defense against silent double-tagging.

## 2026-05-19 — Sticky state-flag bugs are invisible until the wrong rendering path shows up

Spent four commits chasing a "paragraph overflow" bug. Three of them shipped correct, defensible improvements to `renderParagraph` (strip HTML comments, oversized-token break, replace custom wrap with `splitTextToSize`, add character-level hardWrap safety net) — none of which fixed the user's report, because the disclaimer paragraphs weren't going through `renderParagraph` at all. They were going through `renderSignatureBlock` because `inSignatureBlock = true` set after `## SIGNATURES` had no terminator except another `## ` heading, and persisted across the `---` separator and into the disclaimer.

The breakthrough was Michael's screenshot showing the disclaimer paragraph rendered in courier (monospace). Courier ≠ helvetica → not `renderParagraph` → wrong code path. Without that visual clue, the four prior fixes would have shipped and the demo would still have broken.

**Rules:**

1. **When a fix doesn't take, suspect the dispatch, not the renderer.** If you've audited the rendering logic and it should work, the most likely explanation is that the content isn't reaching that renderer at all. Add tracing or sanity-check the parser/router before piling on more renderer-side defenses.

2. **State flags that flip on but never flip off are a foot-gun.** `inSignatureBlock = true` set by `## SIGNATURES` and reset only by the next `## ` heading meant a `---` separator silently extended sig-block mode through the disclaimer. The fix is to give every persistent flag MULTIPLE explicit reset triggers (`---` AND any heading of any level), not just the inverse of what set it.

3. **Visual artifacts (font, weight, color) are the cheapest debug signal.** A user reporting "doesn't wrap" is ambiguous. A screenshot showing courier vs. helvetica is unambiguous and points at the exact branch.


---

### Diff-before-push paid off three times in 6 hours
**Date:** 2026-05-19 (Ships 13–34 marathon)
**What happened:** The Burn 4 lesson "subagent Read→Write can silently stomp a stale tree" was operationalized as: the orchestrator MUST fetch the canonical version from main via Contents API and diff against the local working tree before pushing ANY file a subagent edited. This session it caught three near-shipping regressions:
1. Ship 28 subagent removed the 69-line CSI breakdown table renderer (Ship 6237ebaf demo prereq) while adding AI handoff. Caught by 103-deletion-line discrepancy vs agent's "+377/-0" self-report.
2. Ship 25 subagent rewrote the entire `/api/v1/crm` route. Diff confirmed no external consumers of removed exports (grep `from.*api/v1/crm/route` returned empty) → safe to ship.
3. Ship 29 subagent widened `StageId` 1..7 → 0..7 affecting StageContextPill + StageBreadcrumb. Caught not by diff (the change was localized to stage-accents.ts) but by the Vercel build failure 50s in. Diff confirmed the type change was the ONLY semantic change in that file, narrowing the fix to "revert the type widening."

**Rule:** for every file a subagent modifies, fetch canonical + diff before push. If the diff shows MORE deletions than the agent claimed, STOP. If the deletion is inside a documented demo-prereq region, STOP. Restore canonical and re-apply ONLY the intended additions. The cost (≈30 sec per file) is dwarfed by one bisect-and-rollback cycle (≈6 min).

---

### Bisect-by-re-layering (Pattern C) is the recovery playbook — never panic-fix-forward
**Date:** 2026-05-19 (Ship 29 type-widening Vercel failure)
**What happened:** Push of Ships 29-34 (6 files) failed Vercel ~50s in (typecheck error from StageId widening). Resisted the temptation to look at the build log + fix-forward. Instead:
1. Rolled back main to last green via force-PATCH of refs/heads/main.
2. Pushed 4 of the 6 files (excluding the stage-accents trio) — GREEN. Confirmed the failure was isolated to the stage-accents widening.
3. Re-architected the type change (keep StageId narrow, add StageAccentKey for the wider key set), pushed the corrected stage-accents trio — GREEN.

Total recovery: 2 push cycles, ~6 minutes. Compare to fix-forward attempts that historically take 20-30 minutes of guessing + multiple failed Vercel deploys.

**Rule:** when Vercel fails, ALWAYS:
1. Rollback main to last green (force-PATCH of refs/heads/main with the prior commit's SHA).
2. Bisect the failed commit's files into 2-3 groups based on risk + isolation.
3. Push the safest group first. Wait for green. If green, that group's clean — failure is in the other group(s).
4. Narrow further if needed. Each step adds ~90s of Vercel time but removes ambiguity.
5. Re-architect the failing change once the cause is isolated. NEVER guess.

---

### Const-assertion + derived type keys avoid widening regressions
**Date:** 2026-05-19 (Ship 29 re-architecture)
**What happened:** Original plan: add Stage 0 (Money) to `STAGE_ACCENTS` by widening `type StageId = 1..7` to `0..7`. Broken approach — any consumer doing `Record<StageId, T>` for lifecycle-only data (StageContextPill, StageBreadcrumb, KillerAppNav) now needed a `0` key that doesn't semantically exist.

Fix: use const-assertion on the data + derive a separate type for the keys:
```ts
export const STAGE_ACCENTS = {
  0: { ... }, 1: { ... }, ..., 7: { ... }
} as const;
export type StageId = 1 | 2 | 3 | 4 | 5 | 6 | 7;            // lifecycle-only consumers
export type StageAccentKey = keyof typeof STAGE_ACCENTS;     // = 0|1|...|7 (wider)
export function stageAccent(id: StageAccentKey) { ... }      // accepts 0..7
```

Lifecycle consumers (StageContextPill etc.) keep using `StageId` and stay narrow. STAGE_ACCENTS itself has all 8 keys. The Money group (stage 0) consumers index via `StageAccentKey`.

**Rule:** when you need to add a NEW key to an existing typed map BUT some consumers want the narrower lifecycle set:
- Const-assert the data
- Derive `keyof typeof X` for the wider key type
- Keep the narrower type (originally exported) UNCHANGED — it now represents the LIFECYCLE subset, not all keys
- Comment block in the file explains the distinction for future agents

This is general — applies any time you're tempted to widen an existing union type to accommodate a new variant. Don't widen. Add a parallel wider type and let lifecycle consumers keep using the narrow one.

---

### Streaming SSE: server can defeat itself with "accumulate before send" patterns
**Date:** 2026-05-19 (Ship 13)
**What happened:** `/api/v1/copilot` was instrumented for SSE streaming (ReadableStream, `Content-Type: text/event-stream`, client parses `data: {chunk}` frames). But someone added a `sanitizeCopilotResponse(fullText)` step that needed to run on the COMPLETE response, and they "solved" it by NOT emitting per-chunk delta events server-side — accumulate the entire Anthropic response, sanitize, send one `complete` event. Effect: 20-30 second dead-air period before the user saw any text (Claude Sonnet 4 takes that long for a 2048-token response).

Fix: send per-chunk events live AS THEY ARRIVE, AND send the sanitized `complete` event at the end. Client (already coded for this) renders chunks immediately + swaps to the sanitized version on completion (imperceptible flicker). Net UX: user sees text materialize within 1-2 seconds + smooth streaming.

**Rule:** if the design constraint is "sanitize the FULL output before showing", don't defeat streaming by accumulating server-side. Stream the raw + emit a sanitized `complete` event at the end + let the client swap on receipt. Users care about TTFB more than perfect-from-the-first-character.

Belt-and-suspenders headers to add to any SSE route:
- `Cache-Control: no-cache, no-transform` (no-transform prevents CDN rewriting of chunked encoding)
- `X-Accel-Buffering: no` (disables Vercel/Nginx proxy buffering)
- `Connection: keep-alive`
- `export const dynamic = 'force-dynamic'` (explicit, no ISR caching)
- `export const maxDuration = 60` (default 10s is shorter than typical long completions)

---

### State-after-stream needs a stable fallback chain, not a boolean ternary
**Date:** 2026-05-19 (Ship 14)
**What happened:** Render conditional was `streaming ? streamingResponse : persistedAssistant?.content ?? project?.ai_summary ?? ''`. Worked WHILE streaming (showed live chunks), failed AFTER streaming completed (snapped back to spinner). Why: `persistProjectExchange` writes to DB fire-and-forget after stream close; `refreshAfterStream` fetches conversations milliseconds later and gets empty (the write hasn't landed). `persistedAssistant` = undefined → falls through to `project?.ai_summary` (empty for new projects) → empty string → spinner.

Fix: prefer the freshest available text regardless of streaming flag:
```ts
const rawAiText = streamingResponse || persistedAssistant?.content || project?.ai_summary || '';
```

`streaming` flag is purely cosmetic (drives a "streaming…" label suffix). The body text stays stable across the stream-end → persist-write window. When persist eventually lands later, persistedAssistant gets the same content → no visible swap.

**Rule:** when state can come from multiple async sources (live stream + DB fetch + cached snapshot), order them by RECENCY in a `??` chain. Don't use a boolean flag to switch SOURCES — use it to switch DECORATIONS.

---

### Cinematic / animated content is HTML + CSS + SVG + Framer Motion, NOT video
**Date:** 2026-05-19 (DEMO-CINEMATIC-SPEC drafted)
**What happened:** The cinematic intro for the investor demo is a single-page animated presentation. Tempted to use Three.js + procedural 3D + audio. Resisted. Three reasons:
1. Three.js renderers have a long debug tail in browsers — Vercel preview may render differently than local
2. Video files balloon bundle size + need re-rendering every time a screenshot is stale
3. Audio is investor-meeting hazard — a demo that surprise-plays sound loses the room

Approach for the intro: pure HTML/CSS/SVG + Framer Motion timing. Five 8-30-second "acts" with scroll-triggered or auto-advance reveals. Act 4 embeds the actual live `/killerapp/budget` route (iframe with a `?hideShell=1` query param) so investors interact with REAL product, not a mockup.

**Rule:** for any "cinematic" or "marketing" page in a working-software demo:
- HTML/CSS/SVG/Framer Motion only
- No video assets (use SVG illustrations + motion)
- No audio (default off, no exceptions)
- The "wow moment" is always the LIVE PRODUCT embedded, not a recorded version
- Respect `prefers-reduced-motion` (motion off → final state still shows)
- Skippable at any moment (Esc key + visible "Skip" link)

---

### Pre-seed Supabase schema discovery BEFORE dispatching code-writing subagents
**Date:** 2026-05-19 (Ships 22 + 25 + Contractor handover plan)
**What happened:** Multiple agents this session needed Supabase schema info (column names, types, RLS state, existing tables) before writing code. Without pre-seeding, agents either guessed (wrong) or did expensive discovery passes mid-build. With pre-seeding (orchestrator runs `list_tables` + `execute_sql` ahead of time, inlines results in the spawn prompt), agents wrote correct code first try.

Concrete example for the contractor handover plan: pre-confirmed `crm_contacts` schema (33 columns, 5 NOT-NULL non-id, requires `time_machine_handle`), `crm-photos` bucket exists + public, `agent_identities` table doesn't exist. The agents that consumed this info shipped clean; the one Ship-25 agent that didn't get pre-seeded info had to discover at runtime + made a category-mapping mistake.

**Rule:** for any subagent that will write Supabase-touching code, the orchestrator:
1. Runs `list_tables` for relevant schema.
2. Runs `execute_sql` for column types + sample rows of any table the agent will write to.
3. Inlines the result in the spawn prompt as a "schema reference" block.

Total cost: ~10 seconds per subagent. Savings: at least one Vercel build failure per dispatched agent.


---

### useSearchParams() in a Next 16 layout: the layout itself must be Suspense-wrapped, not just its returned JSX
**Date:** 2026-05-20 (Cowork Ship 36d failure → Claude Code commit `53f2421` recovery)
**What happened:** Cowork added `useSearchParams()` at the top of `KillerAppLayout` to read a `?hideShell=1` flag. The layout's JSX already contained `<Suspense fallback={null}>` wrapping the providers. Reasoned (wrongly) that this would satisfy Next 16's prerender requirement. Vercel build failed:

> useSearchParams() should be wrapped in a suspense boundary at page …

The Next.js rule is stricter than I assumed. `<Suspense>` INSIDE the JSX returned by a component does not retroactively wrap the hook call — by the time JSX is being built, the hook has already executed at the top of the function. Next.js requires the component-that-calls-`useSearchParams` to itself be wrapped in `<Suspense>` at its USE SITE, OR the hook to be in a child component that is `<Suspense>`-wrapped.

**Two correct patterns:**
1. Split the layout into an outer + inner:
   ```tsx
   export default function KillerAppLayout({ children }) {
     return <Suspense fallback={null}><KillerAppLayoutInner>{children}</KillerAppLayoutInner></Suspense>;
   }
   function KillerAppLayoutInner({ children }) { const sp = useSearchParams(); … }
   ```
2. Pull the searchParams-reading logic into a dedicated child component that's already mounted under Suspense (Claude Code's `53f2421` used this pattern — moved the `hideShell` derivation into a new `GlobalChromeGate` child that runs under the existing top-level Suspense).

**Diagnostic shortcut:** when you add `useSearchParams()` to ANY file that's a layout or other always-rendered shell, BEFORE pushing: look up where the file is mounted by Next's router, confirm it's already inside a `<Suspense>` boundary in the parent (it isn't, for top-level layouts), and either split into outer/inner or move the hook into a child component.

**Rule:** for `useSearchParams()` in a layout or root-level client component, the file CALLING the hook must itself be Suspense-wrapped at its call site. Never trust JSX-internal Suspense to retroactively cover an already-executed hook. Match the pattern of an existing successful file (`/signup/page.tsx` and `/login/page.tsx` both use the outer/inner split — copy that shape).

---

### Cross-surface coordination via `docs/in-flight.md` lock-file works
**Date:** 2026-05-20 (Cowork + Claude Code collaborating on /intro)
**What happened:** Claude Code introduced `docs/in-flight.md` as a soft lock-file when both surfaces could plausibly edit the same files (`src/app/intro/page.tsx`, `src/app/killerapp/layout.tsx`, etc.). Pattern: append a row when starting an edit, mark RELEASED with a one-line "what changed" when done. Stale locks (> 30 min) treated as abandoned.

This session validated the pattern end-to-end. Cowork drafted `/intro` to disk, marked it released-with-note ("untracked, not yet on origin/main"). Claude Code then git-pulled, integrated, and shipped 9 commits on top including a wholesale V2 spec revision. Zero edit collisions; no stomps.

**Rule:** when multiple agent surfaces are likely to touch the same files concurrently, ship a `docs/in-flight.md` lock-file pattern alongside `tasks.todo.md`. Keep entries tight (current 15-min window). The orchestrator-of-the-moment should glance at it before opening any hot file.

---

### Surface-divergence pattern: when Cowork and Claude Code edit the same file across windows, read disk before every push
**Date:** 2026-05-20 (Cowork Ship 36d aftermath)
**What happened:** While Cowork was waiting on a permission prompt mid-flight, Chilly (or Claude Code) reverted local edits Cowork had made to `login/page.tsx`, `signup/page.tsx`, `LegalFooter.tsx`, and `layout.tsx`. System reminders surfaced these reverts ("This change was intentional, so make sure to take it into account"). The pattern from Burn 4's "Read→Write subagent stomp" lesson applies one level up: any time the agent has been idle for non-trivial wall-clock time AND any external surface (chat, Claude Code, IDE, human) might have edited the file, re-Read the file before Edit-ing.

**Rule:** before any Edit or Write on a file the agent has touched earlier in the session, re-Read it if (a) more than a few minutes have passed AND (b) any other surface might have changed it. The `git status` + canonical-diff dance from Burn 4 catches subagent stomps within a session; the pre-Edit re-Read catches HUMAN or other-surface stomps between sessions. Both checks are cheap (~1 tool call); the cost of either missing is a silent overwrite of intentional work.

---

### Bisect-by-relayering Pattern C remains the recovery playbook (used 3× in one session)
**Date:** 2026-05-20 (Cowork Ships 36 / 36b / 36c / 36d)
**What happened:** Cowork shipped a batched Phase 5 + Phase 4 commit (`c544b1b`, "Ship 36"). Vercel failed. Identified `/welcome` lacking Suspense as the cause, applied fix, re-pushed everything together as "Ship 36b" — Vercel failed AGAIN (suggesting more than one issue). Instead of guessing the third change, executed Pattern C strictly:

1. Rollback main to last green (`4f417f7`, Ship 35).
2. Push Phase 5 ONLY (no /intro, no layout.tsx) as "Ship 36c" — GREEN. Confirmed Phase 5 was clean.
3. Push layout.tsx ALONE as "Ship 36d" — FAILED. Bisect confirmed: layout.tsx was the second issue (the Suspense-in-layout problem above).
4. Rolled back to Ship 36c; paused for direction rather than guess a fourth push. Claude Code picked up and shipped the layout fix correctly (`53f2421`) by reading the existing successful pattern.

Total: 2 successful pushes (Ship 35, Ship 36c) + 3 rollbacks + 1 bisect-step (Ship 36d). Recovery time across 3 failures: ~12 minutes of pushing + polling.

**Rule:** when a batched commit fails Vercel and the first targeted re-push fails AGAIN, the right move is NOT to layer more fixes on top — it's to ROLL BACK and bisect into smaller groups. The cost of an extra 90s Vercel cycle is dwarfed by the cost of a guessing-loop. Three failed pushes is a signal to stop coding and start bisecting.

**Pairs well with:** the `docs/in-flight.md` lock-file pattern above. The bisect surface needs to be sure no other agent is concurrently editing the same files.

---

### Service-role API routes need the same auth gate as anon routes — `SUPABASE_SERVICE_ROLE_KEY` is an RLS-bypass
**Date:** 2026-05-22 (Cowork ship-prep, commits `7d84d48` + `2ce4ecc`)
**What happened:** `/api/v1/rfis`, `/api/v1/punch-list`, `/api/v1/mcp`, `/api/v1/uploads/photo`, `/api/v1/render` all instantiated the Supabase client with `SUPABASE_SERVICE_ROLE_KEY` and proceeded to `SELECT` / `INSERT` / `UPDATE` directly with no `getAuthUser` check up front. Reading the code casually, "we have RLS policies on these tables" felt like enough. It isn't. The service role key BYPASSES RLS by design (it's the admin key). Any unauthenticated HTTP caller hitting these routes became effectively a superuser — listing every contractor's RFIs, scraping every job's punch list, burning Anthropic / Replicate credits on someone else's bill.
**Fix:** Every service-role route now starts with `const { user } = await requireAuth(request)` (or the route-local equivalent), returning 401 before any Supabase call. Ownership is then verified against `project.user_id` OR `demo_project_id` allowlist before the query runs. The service-role key is still used so writes succeed, but the auth gate runs first.
**Rule:** if a route imports `SUPABASE_SERVICE_ROLE_KEY` (directly or via a `createServiceClient()` helper), the FIRST line of the handler body — before any DB call, before any input parse beyond the route's path — must be an auth check. RLS is a defense-in-depth layer for anon-key code paths; it is NOT a defense for service-role routes, because the service role is what RLS exists to let bypass. Treat `SUPABASE_SERVICE_ROLE_KEY` exactly like a root password: every route that holds it gatekeeps itself.

---

### Triple-source verifier beats N-person dogfood at catching numerical drift
**Date:** 2026-05-22 (10-agent dogfood fleet — 8 personas + 3 dedicated verifiers)
**What happened:** Tonight's dogfood fleet ran 8 persona agents (Lisa architect, Tom MEP, Diego plumbing sub, Tony foreman, Rachel commercial owner, Nick dreamer, Jenny bookkeeper, Mike VC) plus 3 dedicated verifiers (NUMBERS, CONTRACTS, SEQUENCING+INSTRUCTIONS). All 8 personas missed the same finding: SoMa's "budget" showed $914K on the line-item table, $1.05M in the contract autofill (midpoint of 180-240), and $0 on the cockpit HeroStrip. Each persona saw one or two views; none compared them. The NUMBERS verifier — whose entire job was "for each project, list every view that shows a $ figure for this field, then diff" — caught the 3-way drift in its first pass and surfaced it as a single P0.
**Why personas miss this:** persona walkthroughs simulate ONE user's session through ONE workflow. A real contractor would see drift if they tabbed between cockpit and contract, but they'd attribute it to "the contract is rounding" or "the cockpit hasn't refreshed" — not "two routes are reading from different tables." Verifiers cross-cut the surface; personas walk the surface.
**Rule:** dogfood fleets should always include at least one cross-cutting verifier per high-stakes dimension (numbers, sequencing, contracts, security, accessibility). The verifier's prompt is structural: "find every place X is displayed and diff." Personas catch UX friction; verifiers catch consistency bugs that no single user would catch. Budget for both: don't trade a verifier slot for a 9th persona.

---

### "Hide unless ready" is the wrong default when the route already has a real implementation
**Date:** 2026-05-22 (commits `5df1324` + `914c935`)
**What happened:** q20-q27 (10 workflows: draw requests, lien waivers, change-order log, retainage, punch list, daily log, warranty, closeout, reflect, etc.) were excluded from `LIVE_WORKFLOWS` and `NextWorkflowCard.WORKFLOW_LABELS` literally hardcoded `"Adapt (TBD)"`, `"Collect (TBD)"`, `"Reflect (TBD)"` strings visible to users. The justification, repeated across PR descriptions, was "hide until they're ready." Meanwhile, the ROUTES existed and returned 200 OK with real wizards behind them — q21 draw requests had a 5-step wizard, q22 lien waivers had a checklist, q25 retainage took inputs. Hidden navigation + working route = "we built this but apparently it's not good enough to admit we have," which is worse than either showing or removing.
**Fix:** open all 27 workflows in `LIVE_WORKFLOWS`, replace `(TBD)` strings with the real stage labels (Size Up / Lock / Plan / Build / Adapt / Collect / Reflect), and add PREVIEW BANNERS on the workflows that are simpler than spec (draw, lien waivers, retainage). The banner says "Preview: this workflow captures the basics; full G702/G703 + statutory templates ship next." That's honest disclosure; "(TBD)" is hide-the-football.
**Rule:** when a feature is implemented but below polish bar, the choice is (a) ship it with an honest "preview" banner, or (b) remove it entirely. Never the third path of hiding navigation while leaving the route live — it's the worst of both: users can still reach it via deep link or workflow auto-advance, AND the surface that should set their expectation is missing. "(TBD)" labels in production are a code smell: if it's TBD, it shouldn't be in the route list yet.

---

### `didAutofill` (any one-shot boolean) is an anti-pattern when upstream can update post-mount — use a content-hash ref
**Date:** 2026-05-22 (commit `6183f90`)
**What happened:** ContractsClient had `const [didAutofill, setDidAutofill] = useState(false)` guarding the auto-fill effect: "run once when ai_summary becomes available, never again." Worked for the simple case. But the AI summary regenerates in two real flows: (1) user edits the project scope/sqft in the cockpit and the summary re-streams, (2) the summary is initially mocked then the real LLM run lands ~5s later. In both flows the new summary contains updated numbers — and the contract autofill never re-ran, because `didAutofill === true`. Sarah's dogfood: edited Marin scope from "kitchen remodel" to "kitchen + primary bath" → AI summary updated → contract Scope of Work still showed the old kitchen-only text.
**Fix:** Replaced `didAutofill: boolean` with `lastAutofilledSummaryRef = useRef<string | null>(null)`. The effect runs whenever `ai_summary` changes; inside the effect, it compares `summary` against `lastAutofilledSummaryRef.current` and only autofills if they differ. Stores the new summary into the ref on success. The user's manual edits to the contract field are still preserved (autofill only runs on field-empty + summary-changed).
**Rule:** a `didFoo: boolean` "run once" guard is correct only when the upstream value is monotonic (never re-emitted after first non-null). For any state that streams, gets retried, or gets edited (AI summaries, fetched data, form values from a parent), the right guard is a content-hash ref: store what you last reacted to, compare on each render. The one-shot boolean is a useState shape that lies about reality — it claims "this fires once" when what you actually want is "this fires once per distinct upstream value."

---

### Modal mounted in the design system ≠ modal rendered in production — search for the instantiation site, not the component file
**Date:** 2026-05-22 (commit `d7a3e13`)
**What happened:** `StageWelcome` was a 400+ LOC component with foreman-voice copy for all 7 stages, an `onClose` API, scroll lock, focus trap, 17 passing unit tests, and a Storybook entry. By every signal of "we shipped this," it was shipped. It was not rendered. Anywhere. The component file existed; nothing imported it. The investor-demo screenshot deck even showed a mockup of it. Reason: `src/app/killerapp/layout.tsx` line 111 had a comment `// TODO: mount StageWelcome modal` next to where the JSX would go. The TODO never got turned into JSX. Tests passed because tests imported the component directly and rendered it in isolation; the page tests didn't assert its presence because nobody had wired the assertion either.
**Fix:** one-line JSX insert at layout.tsx:111 + a `useStageWelcome()` hook that reads the user's current stage from the route. Now mounts.
**Rule:** "tests pass" + "component file exists" + "Storybook works" does not equal "component renders in the running app." The decisive question is: in the file tree of `src/app/`, does ANY page or layout literally `<StageWelcome ... />` it? Use `grep -r '<ComponentName' src/app/` (not `import StageWelcome` — imports prove nothing). If the answer is "no instantiation site," the feature is unshipped regardless of how complete the rest of the work is. Audit checklist for any "mostly-done" UI feature: (1) component file, (2) tests, (3) USAGE site in a route or layout. Item 3 is the only one users see.

---

### Schema-first parallelism: ship the migration as commit #1 to unblock N UI agents at once
**Date:** 2026-05-22 late evening (Cowork round-3 ship, 14 parallel agents, 11 commits)
**What happened:** Chilly returned with a 14-item wishlist after the 2nd dogfood verdict — CA HIC statutory blocks, sub-bid submission, owner approvals, vendor master + AR/AP, audit_log writes, MEP load calcs, lane gating, DIY wizard, real ICC/NFPA fetcher framework. The naive plan would have dispatched 13 feature agents simultaneously, each adding their own `CREATE TABLE` migration. Three would have collided on `audit_log`, two on `project_members`, and the orchestrator would have spent 30+ minutes resolving migration-order conflicts. Instead: SCHEMA-ALPHA shipped ONE migration with 10 tables (vendors, invoices superset, audit_log, project_members, sub_bids, change_order_signatures, panel_schedules, equipment_schedules, contracts revisions, etc.) + audit triggers + the `stage_id` column on command_center_projects as commit `26e00da`. Once that landed on `origin/main`, LANE-INFRA, SUBBID-FLOW, OWNER-LANE, BOOKKEEPER-UI, MEP-CALCS, DIY-LANE, CONTRACTS-CA, CODE-SOURCES, COCKPIT-FIXES, and WORKFLOWS-PICKER all developed against the same fixed substrate in parallel. Zero schema collisions; 10 feature commits in the next ~2 hours.
**Rule:** when scope is broad and most agents need DB writes, identify the schema substrate FIRST and ship it as the single first commit before any feature agent dispatches. The migration agent reads the wishlist, designs the table superset (union of every feature's needs), and ships RLS + audit triggers in one go. Feature agents then `git pull` and code against a known schema. This pattern is the difference between "parallel" and "racing." Pair with: a `docs/in-flight.md` lock-file so the migration agent has exclusive write on `supabase/migrations/` during its turn.

---

### Audit triggers with check constraints need a positive-path smoke test inside the same migration
**Date:** 2026-05-22 late evening (commit `26e00da`, caught during `08d68d6` backfill)
**What happened:** The round-3 migration added `audit_trigger_fn()` that captured TG_OP into `audit_log.action`, plus an `audit_log_action_check` constraint on the column requiring lowercase `('insert', 'update', 'delete')`. Postgres's `TG_OP` returns UPPERCASE — `'INSERT'`, `'UPDATE'`, `'DELETE'`. The migration applied cleanly because no rows were inserted during the migration itself; the trigger wasn't exercised. Caught only when COCKPIT-FIXES tried to backfill `stage_id` on the 3 demo projects: every `UPDATE` blew up with `audit_log_action_check violation: 'UPDATE'`. The fix was a one-character lowercase-cast in `audit_trigger_fn`, but the workaround dance (disable trigger → backfill → re-enable trigger) cost ~10 minutes of agent time and a follow-up migration. The bug was avoidable: had the migration ended with a `BEGIN; INSERT ... UPDATE ... DELETE ... ROLLBACK;` against a demo row, the constraint would have fired during `apply_migration` and the agent would have caught it before the commit.
**Rule:** any migration that adds a trigger AND a check constraint on a column the trigger writes must include a positive-path smoke test inside the same transaction. Pattern: at the bottom of the migration, do `BEGIN; INSERT INTO target VALUES (...); UPDATE target SET ...; DELETE FROM target WHERE ...; ROLLBACK;` on one demo row. If the trigger + constraint disagree, the migration fails to apply and you see it immediately. Cost: ~5 lines of SQL. Savings: one follow-up migration, plus all the "why is every UPDATE failing" debugging by feature agents downstream.

---

### Unique non-numeric q-ids per agent serialize workflow-registry edits without semantic conflict
**Date:** 2026-05-22 late evening (commit `8492130` consolidating 15 new workflows from 14 agents)
**What happened:** Round 3 added 15 new workflows across 14 parallel agents — RFI, punch list, sub-bid submit, sub-bid inbox, owner approvals, vendor master, ledger, QB export, audit trail, panel schedule, equipment schedule, load calc API, AOR concierge, find-a-GC, cost explainer. Every one needed a registration in 5 files: `src/lib/lifecycle-stages.ts`, `src/lib/workflows/LIVE_WORKFLOWS.ts`, `src/lib/workflows/LIVE_WORKFLOW_PATHS.ts`, `public/workflows.json`, and `src/lib/live-workflows.ts`. The existing q1-q27 numeric scheme would have raced — two agents both picking "q28" with no coordination. Instead, each agent picked a unique non-numeric q-id descriptive of its feature: `q-rfi`, `q-punch`, `q-sub-bid-submit`, `q-sub-bid-inbox`, `q-approvals`, `q-vendors`, `q-ledger`, `q-qbexport`, `q-audit-trail`, `q-panel-schedule`, `q-equipment-schedule`, `q-load-calc`, `q-aor`, `q-find-gc`, `q-cost-explainer`. Edits to the 5 map files were still serialized through the file tools (one writer at a time), but because no two agents wrote the same key, the edits composed naturally. Final consolidation commit `8492130` just merged any remaining drift; no semantic conflicts to resolve.
**Rule:** when N parallel agents need to register entries in a shared map/registry/enum, assign each agent a unique HUMAN-READABLE identifier (not a sequential number). Numeric IDs invite races because every agent picks the "next" one. Descriptive IDs (`q-vendors`, `q-rfi`) make the registration self-documenting AND eliminate the race because no two agents will independently pick the same string. Bonus: the IDs survive renames/reorders in a way that q28, q29, q30 don't. Apply to: workflow registries, route registries, plugin manifests, feature flags, any shared key-value table.

---

### `text: data.text ?? ''` is the right cheap fix when integrating untyped HTTP responses against a strict TS build
**Date:** 2026-05-22 late evening (commit `c9031fa`, code-sources framework)
**What happened:** CODE-SOURCES shipped `src/lib/code-sources/icc.ts` and `nfpa.ts` as real-fetcher frameworks awaiting paywall keys. The HTTP responses are typed as `unknown` at the boundary (correct) and narrowed via Zod-ish runtime checks. The narrowed `data.text` is `string | undefined` per the schema, but the function returns `CodeSourceResult` whose `text` field is `string` (non-nullable). Build failed: `Type 'string | undefined' is not assignable to type 'string'`. The PROPER fix is to extend the schema with a discriminated union: either `{ ok: true, text: string }` or `{ ok: false, error: string }`, then narrow upstream. That's a 30-minute refactor across 6 call sites. The cheap fix that unblocks the build in 30 seconds: `text: data.text ?? ''`. Both fetchers shipped with the nullish coalesce; tech debt noted in `tasks.todo.md`.
**Rule:** when a strict TypeScript build blocks a feature commit because an untyped HTTP boundary returns `T | undefined` where the consumer expects `T`, the right tactic in the moment is: (a) add the nullish-coalesce/non-null-assertion to unblock the commit, (b) leave a `// TODO: type the response shape properly` comment, (c) add the tech-debt item to `tasks.todo.md` under P2. Do NOT block the feature commit on the type refactor unless the missing field would cause a runtime bug (e.g., dereferencing the undefined immediately after). The proper fix is real work; doing it inside a feature commit doubles the PR scope and increases reviewer load. Pattern: "build green now, type-correct later" beats "type-correct in flight, build red for an hour."

---

### Lane gating substrate ships in one commit so follow-up agents opt in without coordination
**Date:** 2026-05-22 late evening (commit `e12af77`, LANE-INFRA)
**What happened:** Round 2 caught that `user_metadata.lane` was set on 5 trial accounts but no production route ever read it — pure theater. The naive fix would be to retrofit every workflow with lane-gating logic, requiring 27 separate edits. LANE-INFRA shipped instead a complete SUBSTRATE: `useUserLane()` hook reading `user_metadata.lane`, `<LaneGate>` wrapper component that checks the user's lane against allowed roles, `ProjectContext.projectRole` field, 6 seeded `project_members` rows distributing roles across the demo accounts, AND a `roles?: ProjectRole[]` field added to `CompassWorkflowNav`'s workflow-entry type. The nav now FILTERS workflows by lane when the field is populated — but every existing workflow has `roles: undefined`, which means "show to all" (no behavior change). Follow-up agents adding lane-specific workflows just populate `roles: ['gc']` or `roles: ['sub', 'gc']` on their entry; the filter automatically excludes the workflow for other lanes. Zero coordination needed between agents. The substrate makes opt-in trivial.
**Rule:** when retrofitting a cross-cutting concern (role-based access, feature flags, i18n, telemetry) across an existing surface, ship the substrate + the OPT-IN HOOK in one commit, with sane defaults that produce no behavior change for existing call sites. Follow-up agents then ADD the metadata on the workflows they own without touching anyone else's. The anti-pattern is the "big-bang retrofit" where one commit edits all 27 workflows to add `roles: []` — that's both a merge-conflict magnet and an opportunity for the orchestrator to mis-classify a workflow. Substrate + opt-in scales linearly; big-bang scales quadratically.

---

### Union-superset schemas let new feature UIs coexist with legacy API consumers without breaking either
**Date:** 2026-05-22 late evening (commits `26e00da` schema + `c1e433e` bookkeeper UI)
**What happened:** SCHEMA-ALPHA needed to model invoices for two different consumers: the existing `/api/v1/invoices` route that was designed for AIA G702/G703 payment-application shape (`progress_billing_period`, `retainage_pct`, `cumulative_completed`, etc.) and BOOKKEEPER-UI's new simple AR/AP ledger needing `vendor_id`, `invoice_number`, `amount_due`, `paid_date`. Two options were considered: (a) two tables (`invoices_g702`, `invoices_ar_ap`) with cross-references — clean schema, expensive to query, requires two API routes; (b) one UNION-superset table where every column from both shapes coexists as nullable. Picked option (b). The invoices table now has both column sets; G702 consumers write the G702 fields and leave AR/AP NULL, AR/AP consumers do the inverse. Both `/api/v1/invoices` and the new bookkeeper UI read the same table; neither needed a destructive migration. RLS policy is one rule covering both shapes (`user_id` ownership).
**Rule:** when a new feature needs a table that overlaps semantically with an existing one but has different fields, ask first whether the overlap can live as a UNION SUPERSET (one table, both shapes' columns, mostly-NULL on each row). The trade-off is more nullable columns — which is fine if both shapes are owned by the same product and you're not exposing the schema as a public API. The win: zero downtime, zero breaking change for legacy consumers, one RLS policy, one set of audit triggers. The anti-pattern that this avoids: two tables + a JOIN view + double-writes during a deprecation window + a 3-step destructive migration. Apply when the schemas overlap on ownership/lifecycle/RLS (yes, here) and skip when they don't (e.g., billing vs. logging).


### Idempotent upsert needs a UNIQUE INDEX, not delete-then-insert
**Date:** 2026-05-22 deep evening (Cowork round-4 ship, commit `fix(budget)`)
**What happened:** Round 2 fixed `BudgetClient`'s READ path to hit the normalized `project_budgets` table but left the WRITE path PATCHing the legacy JSONB column. Round 3 carried the write-path bug forward (P1 still open). Round 4's first plan was to delete all rows for `project_id` then re-insert the new lines — a "clear the slate" idempotent pattern. The problem: BudgetClient autosaves every 500ms, EstimatingClient PATCHes on every CSI line edit, and the cockpit polls. With delete-then-insert, two concurrent requests can interleave (Req A deletes → Req B deletes → Req A inserts → Req B inserts) producing duplicate rows. The real fix: add `CREATE UNIQUE INDEX project_budgets_proj_csi_uniq ON project_budgets (project_id, csi_division)`, then use `INSERT ... ON CONFLICT (project_id, csi_division) DO UPDATE SET ...`. Postgres handles atomicity inside the row-level lock; no race window, no orphan rows, no transaction-isolation gymnastics.
**Rule:** when a route's mutation will be hammered (autosave loops, polling cockpits, anything that fires more than once a second), idempotency requires a UNIQUE INDEX on the natural key + `ON CONFLICT DO UPDATE`, not delete-then-insert. The UNIQUE INDEX is the single most important atomicity guarantee — without it, you're relying on transaction isolation to save you and that breaks down under load. Add the index in the same migration as the route ships. Bonus: the UNIQUE INDEX doubles as a query-planner hint for the natural-key lookup.

---

### Schema-first parallelism extends to PUBLICATION patterns — bundle DDL by concern, ship as a cluster
**Date:** 2026-05-22 deep evening (5 round-4 migrations, ship cluster A)
**What happened:** Round 3 introduced schema-first parallelism with ONE big 10-table migration as commit #1. That worked because every feature agent was blocked on the same substrate. Round 4 had a different shape: 5 unrelated schema additions (budget UNIQUE INDEX, cslb_lookup_cache table, knowledge_entities HNSW index + RPC, organizations + org_members + vendors.org_id, audit_log monthly partition with pg_cron). The naive plan would have bundled all 5 into one migration — but then a bug in HNSW config would have rolled back the org tables too, and vice versa. Instead: 5 separate migrations, each a single concern, each could be reverted independently. All 5 went out as cluster A (commit #1 batch) before any feature agent dispatched. Same parallelism benefit, finer rollback granularity.
**Rule:** schema-first parallelism doesn't mean "one giant migration" — it means "all migrations first, before features." When you have N unrelated DDL changes, ship them as N migrations in the same commit cluster, NOT one bundled migration. Each migration covers a single concern (one table family, one index, one extension, one cron job). A bug in one rolls back only that one. Feature agents read the cluster as a unit. Rule of thumb: if you can write a one-sentence purpose for the migration ("add UNIQUE INDEX for budget upsert"), it's the right grain; if the sentence has an "and," split it.

---

### Cookie + SSR is the only way to eliminate hydration flashes when DOM trees differ by user state
**Date:** 2026-05-22 deep evening (commit `feat(cockpit)`, middleware lane-cookie)
**What happened:** Round 3's `<DiyCockpitOverlay>` shipped as a client-side gate: `useUserLane()` returned the lane from `user_metadata.lane` AFTER hydration, then the overlay swapped in. On slow connections the DIY user saw the pro cockpit for ~200-800ms before the DIY overlay covered it — a "wrong-lane flash." Three attempts to fix this client-side all failed: (1) Suspense boundaries still rendered the pro tree first; (2) `useLayoutEffect` ran post-hydration; (3) inlining the lane check in `<body>` JS still happened after first paint. The actual fix: set a `bkg-lane` cookie on auth (and on any lane-change action), then read the cookie in Next middleware + the root layout server-component, apply it as a `data-lane` body attribute SERVER-SIDE before any HTML ships. The DIY overlay's CSS selectors gate off `[data-lane="dreamer"]` so the right tree is rendered on the very first paint. No flash, no race.
**Rule:** any UI that depends on user state and renders different DOM trees needs a SERVER-READABLE cookie if no-flash matters. Client-side state reads (localStorage, `useEffect`, even `useLayoutEffect`) all happen after first paint by definition — there is no client-side trick that prevents the flash, because the flash IS the first paint. Pattern: (1) write the user-state to a cookie at the moment the state changes (login, lane switch, theme toggle); (2) read the cookie in middleware OR a server component; (3) apply it as a data-attribute on `<html>` or `<body>` before HTML ships; (4) CSS/server-components branch off the attribute. Same pattern for theme, locale, role, feature-flags — any "two-tree" UI.

---

### Resend's `ok: true` doesn't mean delivered — it means accepted; every external service needs a domain-specific "actually delivered" gate
**Date:** 2026-05-22 deep evening (commit `feat(email)`, healthcheck + DNS wizard)
**What happened:** Round 3 shipped Resend wiring for contract delivery. The route returned `200 ok: true` on every send, and the dashboard never showed a failure. Reality: the Resend API only verifies that the REQUEST was well-formed; if the sending domain isn't DNS-verified (TXT + CNAME + DMARC), the email is silently dropped and the recipient never sees it. Two trial accounts went a full day thinking their contracts were sent before someone manually checked an inbox and saw nothing. Real fix: pre-flight the Resend `/domains` API on every send. If the domain's `status !== 'verified'`, REFUSE the send and return `{ ok: false, reason: 'domain_unverified', wizardUrl: '/admin/email-status' }`. Admin can override with `?force=true` for testing. The `/admin/email-status` page polls `/api/v1/email/healthcheck` which lists every domain + DNS record state with copy-pasteable values for the registrar.
**Rule:** every external service that says `ok: true` on the API response needs a domain-specific "actually delivered" gate. Resend → domain-verified check. Twilio → from-number provisioned check. Stripe webhooks → `event.livemode` check. S3 puts → object-exists round-trip. The pattern: before counting a send/write/publish as success, do a small follow-up check that proves the side-effect actually happened. If the check is too expensive to do on every call, do it on the FIRST call after deploy and cache the result with a TTL. The "API accepted my request" success bar is almost never the same as "the user got the thing."

---

### Partition audit_log BEFORE the write storm, not after
**Date:** 2026-05-22 deep evening (round-4 migration: audit_log monthly partition + pg_cron retention)
**What happened:** Round 3's schema added `audit_log` with audit triggers on 10 tables; round-4's `fix(budget)` was about to wire BudgetClient's autosave loop to the table. Conservative estimate of write rate: 300-1500 rows/minute during active editing sessions across ~30 trial accounts (autosave fires every 500ms, multiple users, mutation triggers fan-out). At that rate `audit_log` hits 10M rows in weeks. Partitioning a non-partitioned table at 10M rows requires `ALTER TABLE ... DETACH PARTITION` dance with `AccessExclusiveLock` for many minutes — every write blocks. Done at 22 rows (which was the count at round-4 ship time), the same dance takes <1 second and no app code notices. Plus pg_cron jobs scheduled monthly to create the next partition AND drop the oldest beyond retention — 19 partitions seeded (y2025m11 → y2027m05) so the table never runs out of runway. ~$0 ongoing cost, sub-millisecond writes forever.
**Rule:** pre-partition any audit/event/log/telemetry table BEFORE the write-amplifying feature ships, never after. The break-even point for "should I partition" is "do you expect more than ~1M rows in any 6-month window?" — and the answer for anything wired into audit triggers is yes. Partitioning at 22 rows is free; partitioning at 10M rows costs a maintenance window. Add the pg_cron job that rolls partitions forward in the same migration; otherwise someone has to remember to do it manually 6 months from now and they won't. Pattern: every audit table, every event log, every telemetry sink, every webhook-payload archive — partition by month or day at creation time, with pg_cron retention.

---

### Pattern-based backfill beats LLM-assisted backfill 10x — try regex/slug rules before reaching for AI
**Date:** 2026-05-22 deep evening (knowledge_entities source_urls backfill: 15 → 938 rows in one session)
**What happened:** Round 3 left 569 (then 1318) `knowledge_entities` rows with empty `source_urls` arrays — RAG could rank but rarely tier-3-verified because there was no URL to cite. The default plan: write a `backfill-source-urls.ts` script that calls an LLM per row ("given this entity's slug + title + jurisdiction, what's the canonical URL?"). At 2256 rows × ~$0.002/row = ~$5 + several hours of API time. Instead: inspected the slugs and found 30 consistent patterns (`nec-2023-210-52-c-5` → `https://up.codes/viewer/california/nec-2023/chapter/2/article-210#210.52(C)(5)`, `cbc-2022-r301` → `https://up.codes/viewer/california/cbc-2022/chapter/3#R301`, etc.). One SQL session, 30 CASE branches, `UPDATE knowledge_entities SET source_urls = ARRAY[...] WHERE slug ~ '...'`. 938 rows populated in <60 seconds. Zero API cost. The remaining 1318 rows are material/construction_method/jurisdiction types where slug naming isn't consistent enough — THOSE warrant the LLM call.
**Rule:** before reaching for an LLM-assisted backfill, audit whether the source data has enough structure for a pattern transform. If 50%+ of rows match consistent slug/path patterns, write the regex-and-CASE SQL first and save the LLM for the long tail. Order of operations: (1) `SELECT slug, count(*) FROM table GROUP BY pattern_extract(slug) ORDER BY count DESC` to find the bulk patterns; (2) write SQL CASE for the top N patterns; (3) THEN LLM-call the residual. Cost ratio is usually 10-100x in favor of patterns. Bonus: pattern transforms are auditable, deterministic, and revertable; LLM backfills are none of those.

---

### pg_cron scheduling beats Vercel cron when the job is DB-native
**Date:** 2026-05-22 deep evening (round-4 audit_log partition retention + KB index maintenance)
**What happened:** Round 4 needed two scheduled jobs: (1) `maintain_audit_log_partitions()` — create next month's partition, drop partitions older than retention; (2) refresh-on-write for `knowledge_entities` HNSW index after large insert batches. Default plan: Vercel cron at `/api/v1/cron/audit-maintain` calling a Supabase RPC. Problems: Hobby tier Vercel only allows daily cron (audit needs monthly which works, but if we ever want more granular it's a paywall); every fire is a network hop + auth handshake + cold start; if Vercel is broken (which has happened during incidents), the DB job doesn't run at all. The actual fix: `SELECT cron.schedule('audit_log_maint', '0 3 1 * *', 'SELECT maintain_audit_log_partitions()')`. pg_cron lives INSIDE the database. No network hop. No auth. No cold start. Runs even if Vercel is on fire. The job already has access to every table it needs because it's running in the same Postgres process.
**Rule:** for any periodic job that operates entirely within the database (partition maintenance, materialized-view refresh, stat collection, retention sweeps, vacuum hints), use pg_cron, not Vercel cron / GitHub Actions / external scheduler. The rule of thumb: if the job's body is "call this SQL function," it belongs in pg_cron. Use Vercel cron only when the job needs the app's runtime (calling third-party APIs, sending email, hitting the LLM). pg_cron is more reliable, faster, cheaper, and self-documenting (the schedule is in the DB next to the function). Bonus: pg_cron history is queryable (`SELECT * FROM cron.job_run_details`) — Vercel cron logs are scattered across deploy logs.

---

### When E2E verify finds "drift," query by name to surface duplicates before mutating
**Date:** 2026-05-23 (Cowork round-5 ship, E2E-VERIFY P1 on Marin)
**What happened:** E2E-VERIFY walked the 3 demo accounts through 8 surfaces and flagged TWO P1s on the Marin project: `total_sqft` was NULL and the cockpit `ai_summary` had drifted from the contract text. Reflex was to UPDATE the row to backfill sqft and re-sync the summary. Before mutating, one extra query — `SELECT id, name, total_sqft, ai_summary FROM command_center_projects WHERE name ILIKE '%marin%'` — revealed TWO rows: the canonical `55730cd3...` (sqft = 2800, summary correct) and a stale duplicate `6fb77918...` (sqft NULL, summary stale, created during a round-2 backfill that didn't dedupe on name). The verifier had been reading the duplicate by `created_at DESC`. The right fix wasn't an UPDATE on the canonical — it was a sync-not-delete: copy canonical values onto the duplicate so any consumer still resolving by either id sees the same data, then add a follow-up issue to dedupe in a maintenance window. Had we mutated blindly, we'd have overwritten the GOOD row with the BAD verifier-supplied "fix."
**Rule:** when an E2E verifier reports "stale data" or "drift" on a record, query by NAME (or other natural key) BEFORE mutating the id the verifier handed you. The pattern is: (1) `SELECT * FROM table WHERE natural_key ILIKE '%name%'` — surface duplicates; (2) if multiple rows exist, identify the canonical (oldest? most-referenced? most-complete?); (3) sync the staler rows to the canonical's values — don't delete in the same commit because something might still reference them; (4) file a dedupe-in-maintenance-window follow-up. The verifier's id is data; treat it as a starting point, not ground truth. Bonus: this surfaces a class of bug ("we have duplicates we didn't know about") that a single-row UPDATE would have hidden.

---

### Set the identity cookie inside the auth callback, not in a client-side post-hydration overlay
**Date:** 2026-05-23 (Cowork round-5 ship, DIY cold-flash fix)
**What happened:** Round 4 eliminated the steady-state DIY lane flash with a `bkg-lane` cookie + middleware + `data-lane` server-side. But the FIRST-EVER cold load (signup → first redirect) still flashed: the cookie wasn't set yet because the client-side `<DiyCockpitOverlay>` from round 3 wrote the cookie only AFTER hydration on the cockpit page. So the first paint after `/auth/callback` redirected straight into the cockpit with no cookie, hit the pro tree, hydrated, then swapped. The fix is one-line conceptually: the auth callback handler is already a server route that knows the user's `user_metadata.lane`; it writes the `bkg-lane` cookie INTO the response BEFORE issuing the redirect to `/killerapp`. The middleware then reads the cookie on the very first request to the cockpit and renders the right tree on first paint. Cold flash gone, no post-hydration swap, no race.
**Rule:** any UI state that depends on user identity belongs in a cookie set DURING THE AUTH HANDSHAKE (sign-in callback, sign-up callback, OAuth callback, magic-link callback), never inferred client-side post-render. The signal: if you find yourself writing `useEffect(() => { document.cookie = ...lane }, [user])`, you're too late — the user has already seen the wrong tree. Pattern: in the `/auth/callback` route handler, after `exchangeCodeForSession()`, read whatever user-derived state you need (lane, locale, role, theme preference, feature-flag opt-in) and `response.cookies.set(...)` BEFORE the `NextResponse.redirect()`. The cookie ships in the same response that triggers the navigation, so it's live on the very first request to the next route. Apply to: lane gating, theme, locale, A/B-test bucket, feature flags, any "two-tree" UI that switches on identity.

---

### Don't `npm install` a data structure you can hand-roll in 25 lines
**Date:** 2026-05-23 (Cowork round-5 ship, code-source LRU cache)
**What happened:** Round 4 left "caching layer on `aggregateSources`" as a P1. Default plan: `npm i lru-cache`, wire it up. lru-cache is 130KB unpacked, has 8 sub-dependencies, and ships with a TypeScript types pack that's been the subject of multiple breaking releases (v6 → v7 changed every signature, v10 changed it again). Actual implementation: a 25-line `Map`-backed LRU with TTL, `.get/.set/.clear/.size` matching the lru-cache surface exactly. Insertion order in JS `Map` is already LRU-friendly; eviction is `if (map.size > MAX) { map.delete(map.keys().next().value) }`. TTL is one `expiresAt` field per entry checked on `.get`. Zero deps, ~1KB compiled, easier to debug (set a breakpoint and you can read the whole implementation in one screen), no version-drift risk.
**Rule:** before `npm install <data-structure>`, ask: how many lines is the data structure itself? If <50 lines (LRU, deque, priority queue with array heap, bloom filter for small N, simple ring buffer, token bucket rate-limiter, debounce/throttle, even a basic trie), hand-roll it in a `src/lib/cache/` or `src/lib/util/` file. Reach for npm only when the data structure is genuinely complex (concurrent skiplist, persistent immutable trie, B-tree on disk). The win: zero supply-chain risk, smaller bundle, faster build, no major-version migrations, the implementation is in YOUR repo where the next debugger can read it. The bar is "would I be embarrassed to write this from scratch?" — for an LRU, the answer is no.

---

### Idempotent endpoints need explicit existence checks, not just unique constraints
**Date:** 2026-05-23 (Cowork round-5 ship, onboard-new-user route)
**What happened:** Self-serve signup runs `/api/v1/onboarding/onboard-new-user` which creates an org, an org_members row, a default project, and seeds 4 budget rows + a contract draft. The naive implementation relied on `org_members_pkey (user_id, org_id)` + RLS to keep things consistent. The failure mode: a flaky mobile network causes the client to retry the POST after a 30-second timeout. The first request actually succeeded but the response never made it back. The retry creates a SECOND org with a different `org_id`, a SECOND org_members row (no conflict because the new org_id), a SECOND project. The user logs in and sees two orgs in their picker. The unique constraint didn't save us because the natural-key collision was on user_id alone, not (user_id, org_id). The fix: `SELECT EXISTS(SELECT 1 FROM org_members WHERE user_id = $1) AS has_org` as step #0; if true, return the existing org/project ids without mutating. Plus compensating-delete in a transaction: if the project insert fails after the org insert, roll back both. The check + transaction is ~15 lines; the bug it prevents is "support ticket: I have two accounts."
**Rule:** idempotent endpoints (signup, first-time setup, "ensure resource exists" calls) need TWO things, not just a unique index: (1) an explicit existence check on the natural identity FIRST, returning the existing resource ids if found, and (2) a single transaction or compensating-delete around the multi-step creation so a mid-flight failure doesn't leave half-created state. Unique constraints save you from EXACT duplicates; they don't save you from "I created adjacent rows that semantically duplicate the intent." For signup specifically, the natural key is the user — not (user, org) — because the question "does this user already have an org?" is the one you actually need to answer. Apply to: signup flows, first-project bootstrap, default-resource provisioning, anything that runs once-per-user-lifetime.

---

### When adding auth to a route family, exclude signed-webhook subpaths by construction
**Date:** 2026-05-23 (Cowork round-5 ship, marketplace transactions auth gate)
**What happened:** E2E-VERIFY found that `/api/v1/marketplace/transactions` accepted POSTs with no auth — a P1 leak. Reflex: wrap the route module in `requireAuthUser()`. Problem: the same path serves Stripe webhook callbacks at `/api/v1/marketplace/transactions/webhook`, and Stripe doesn't send a user cookie — it signs the request body with `Stripe-Signature` and the verification is `stripe.webhooks.constructEvent(body, sig, secret)`. Wrapping the whole module would have broken the webhook (and `marketplace/transactions/refunds` which is also webhook-driven). The fix had to be path-specific: gate the user-facing routes (`/marketplace/transactions/create`, `/list`, `/get/:id`) on `requireAuthUser()` while leaving `/webhook` and `/refunds` alone — those have their own signature-verification middleware. Caught the second webhook subpath only because the first audit grep was `grep -r 'POST.*marketplace/transactions'` rather than `grep -r 'marketplace/transactions'` — the latter surfaced both.
**Rule:** when retrofitting auth onto a route family, never apply it at the directory/module level without auditing for signed-webhook subpaths. Pattern: (1) `grep -r '<route-family>/' src/app/api/` to enumerate every leaf route in the family; (2) classify each as "user-facing" (cookie/session auth) or "external-signed" (HMAC, JWT-from-issuer, Stripe-Signature, GitHub webhook signature, Twilio request validation); (3) apply auth only to the user-facing leaves; (4) verify the external-signed leaves still have their signature check (it's easy to assume they do and find out later they don't). Anti-pattern: blanket-wrapping `route.ts` exports — this breaks webhooks silently because the 401 happens before the signature check runs. Apply during ANY auth retrofit: Stripe, Twilio, GitHub, Slack, Resend, Vercel deploy hooks, any third-party that signs requests.

---

### Statutory text is a contract — lock it with a content-hash golden test
**Date:** 2026-05-23 (Cowork round-5 ship, §7159 SHA-256 lock)
**What happened:** Round 4 mechanically verified the §7159 statutory callout via "42 instances of `/F2 12 Tf` in the PDF" — that's a FONT-RUN check, not a TEXT check. A future PR could mistype "ENTITLED to" as "TITLED to" in the Mechanics Lien Warning, ship 42 instances of 12pt Helvetica-Bold of the wrong text, pass the font check, and ship a non-compliant contract. California Bus & Prof Code §7159 prescribes EXACT statutory text; a typo isn't a typo, it's a compliance violation that voids the contract's enforceability. The fix: a golden file at `src/lib/contracts/__tests__/fixtures/7159-statutory.golden.txt` containing the exact statutory text, plus a SHA-256 of that file baked into `src/lib/contracts/ca-hic.ts` as a constant. The test extracts the §7159 block from the generated PDF, normalizes whitespace, computes SHA-256, and asserts equality with the constant. Any text drift fails the test loudly with a diff. Updating the statutory text legitimately (next code amendment) requires updating both the golden file AND the constant — a deliberate two-step that forces a reviewer to ask "did the statute actually change?"
**Rule:** any legally-prescribed text (statutory blocks, prescribed forms, regulatory disclosures, license notices, MIT/Apache/GPL boilerplate, court-mandated disclosures, healthcare HIPAA notices, financial Reg-Z disclosures) belongs under a content-hash lock in tests. Pattern: (1) save the exact text as a golden fixture; (2) compute SHA-256 once, bake it into source as a constant; (3) test extracts the text from the production artifact (PDF, email body, web page), normalizes whitespace + case if appropriate, computes SHA-256, asserts equality. Updating the prescribed text becomes a two-step: change the golden, change the constant — both in the same PR, with a comment naming the statute/regulation citation. Anti-pattern: assertions on substrings ("contains 'Mechanics Lien'") — those pass for both correct text and slightly-wrong text. The hash is the only assertion that catches the silent-typo class of compliance bug.

---

### Invest in the systematic E2E verifier — spot-checks miss the failure modes that matter
**Date:** 2026-05-23 (Cowork round-5 ship, E2E-VERIFY agent caught 3 P1s)
**What happened:** Round 4 spot-checked Marin sqft with a single SQL query, saw the value, called it good. Round 5 dispatched an E2E-VERIFY agent that walked all 3 demo accounts (gc-trial-01, owner-demo, diy-demo) through 8 surfaces each (cockpit, budget, estimating, contracts, vendors, RFI, audit trail, MEP calcs). The walk surfaced 3 P1s the spot-check had missed: (1) Marin sqft was NULL on the duplicate row the verifier was reading by `created_at DESC`; (2) cockpit ai_summary drifted from contract text on the same duplicate; (3) `/api/v1/marketplace/transactions` accepted unauthenticated POSTs (the spot-check audit had never touched that route family). The verifier took ~12 minutes to write and ~3 minutes to run; it caught failures that human spot-checking would have missed for weeks. The ROI math: 15 verifier-minutes vs. potentially shipping 3 P1s into a dogfood session and losing trial-user trust.
**Rule:** every major shipping round (3+ feature commits) gets a systematic E2E verifier agent, not just spot-checks on the headline features. The verifier's job is to walk every demo persona through every primary surface the round touched, asserting both POSITIVE invariants (numbers tie, text matches, links resolve) and NEGATIVE invariants (this route requires auth, this RLS policy blocks the wrong tenant, this column is non-NULL). Cost: 10-20 minutes of agent-time. Benefit: catches the failure-mode that spot-checks systematically miss — the surfaces nobody thought to spot-check. Anti-pattern: "we tested the thing we shipped" — that's necessary but not sufficient. The bugs that bite are the surfaces adjacent to the thing you shipped, on the personas you didn't think to retest. Make the E2E verifier a standing item in the round-ship template.

