# Cowork Session V3 — BKG Killer App Rehaul (Restart, Branch-Isolated)

**For:** Cowork session, parallel agents (as many as the runtime allows)
**Founder:** Chilly Dahlgren — managing from iPhone via Dispatch tonight
**Date:** 2026-05-26
**Repo:** `/Users/chilly/Developer/bkg` · GitHub `chilly611/builders-knowledge-garden`
**Parent branch for ALL work:** `feature/v3-killerapp-rehaul`
**Main branch:** SACRED · no agent pushes here under any circumstance

---

## ⚡ READ THIS FIRST — The Moat

**The RSI Heartbeat is the platform.** One self-improving knowledge graph per garden, ingesting source data on a domain cadence, re-verifying every entity, surfacing freshness on every claim, learning from use. The platform doesn't hold knowledge — it improves itself in public. Every other platform in our space holds static data and ages. We get more right every week. **That is the moat in the AI era.**

This paragraph leads every commit message, every PR description, every code comment that introduces a new concept, every customer-facing artifact.

---

## What changed since last Cowork attempt

Last session: WS1 (presentation deep-dive pieces 13-20) ✅ completed on `feature/ws1-presentation-deep-dive`. WS2-WS6 blocked by `.git/index.lock` issues with worktree isolation. Session crashed.

This session: WS1's work is already merged. The full 20-piece presentation is **live in production** at `https://frontiermap.theknowledgegardens.com/theKnowledgeGardensOS`. The v3 strategy is committed at `8e09aa7` and `670310b` on origin/main.

**Key change from last brief:** Instead of trying 6 truly parallel workstreams from the start (which broke on worktree isolation), this session runs a **Workstream 0 first, sequentially**, that creates the shared primitive components and route stubs. Then **Workstreams 2-6 run parallel** — they only touch their own route files, so no file conflicts, no worktree isolation needed.

---

## PRE-FLIGHT — Run these commands FIRST, before any agent dispatch

```bash
cd /Users/chilly/Developer/bkg
rm -f .git/index.lock .git/HEAD.lock .git/index.lock.cleared.* .git/HEAD.lock.cleared.* .git/index.lock.stale
git fetch origin
git checkout main
git pull origin main
git checkout -b feature/v3-killerapp-rehaul
git push -u origin feature/v3-killerapp-rehaul
git status
```

Expected: clean working tree, on `feature/v3-killerapp-rehaul`, tracking origin. If `git status` is dirty, stash or discard before proceeding — the rehaul branch must start clean.

If pre-flight fails: STOP and flag to Chilly. Do not proceed.

---

## Branch strategy (PHONE-REVIEWABLE)

```
main (sacred — Vercel auto-deploys to builders.theknowledgegardens.com)
└── feature/v3-killerapp-rehaul (parent rehaul branch — never merged until founder approval)
    ├── feature/v3-killerapp-rehaul-ws0 (primitives — runs FIRST sequentially)
    ├── feature/v3-killerapp-rehaul-ws2 (credentialing — parallel after ws0)
    ├── feature/v3-killerapp-rehaul-ws3 (project pipeline — parallel after ws0)
    ├── feature/v3-killerapp-rehaul-ws4 (compliance alerts — parallel after ws0)
    ├── feature/v3-killerapp-rehaul-ws5 (GreenFlash rewards — parallel after ws0)
    └── feature/v3-killerapp-rehaul-ws6 (Ask Anything search — parallel after ws0)
```

Each WS sub-branch pushes to origin → Vercel auto-deploys a preview URL → Chilly reviews from iPhone → opens PR from sub-branch into the parent rehaul branch on GitHub mobile.

**No agent merges anything to main. No agent merges anything to the parent rehaul branch.** PRs are opened; Chilly approves and merges them himself.

---

## Tool stack — what each agent uses

### Primary: Claude Design (TRY THIS FIRST)
Anthropic's design tool. Attempt to use it for visual surfaces — credentialing dashboard, project pipeline cards, compliance alerts, rewards UI. If Claude Design is enabled in this session, use it for the visual composition pass before writing React/TSX.

### Fallback: direct Next.js work
If Claude Design is unavailable, fall back to direct Next.js + Tailwind work on the existing codebase. The brand discipline lives in:
- `docs/strategy/the-knowledge-gardens-os.html` — production-quality CSS variables and patterns (parchment `#F5F0E8`, copper `#B87333`, steel `#71797E`, forest ink `#0F2419`, Cormorant Garamond + Space Mono)
- `docs/design-constitution.md` — the 7 constitutional primitives + 10 goals
- `docs/strategy/kgos-architecture.svg` — the architecture diagram, locked May 25
- `docs/strategy/lane-stance-strategy-v3.md` — v3 strategy memo with all 20 Pattern Language pieces + 14 axes

### Skills (if available — graceful skip if not)
- `/mnt/skills/public/frontend-design/SKILL.md` — design tokens for this environment
- `/mnt/skills/public/docx/SKILL.md`, `pdf`, `pptx`, `xlsx` — only if deliverable demands

### Live verification
- Production site: `https://builders.theknowledgegardens.com` (Next.js, fetches return shell HTML — use DevTools or Vercel preview URLs for visual checks)
- Vercel previews: each push to a `feature/v3-killerapp-rehaul-wsN` branch auto-generates a preview at a unique URL — agents should print their preview URL in the WS completion summary so Chilly can open it on his phone

### Authentication notes
- **Vercel CLI**: token-based only (`VERCEL_TOKEN` env var). Browser login fails on this machine. Token already set in user's shell environment.
- **GitHub**: PAT in `~/Developer/bkg/.git/config` (already configured). Push will work.

---

## REQUIRED READING — every agent reads these in order before claiming a workstream

Files already in the BKG repo (under `~/Developer/bkg/`):

1. `docs/strategy/lane-stance-strategy-v3.md` — the v3 strategy memo, decisions locked, 20-piece Pattern Language, 14-axis Stance Card spec
2. `docs/strategy/the-knowledge-gardens-os.html` — the live presentation site; pieces 1-20 fully deep-dived with axes indicators and BKG examples. **This is your visual education on the Pattern Language. Scroll through it before designing any surface.**
3. `docs/strategy/knowledge-gardens-os-v2.md` — umbrella OS spine
4. `docs/strategy/kgos-architecture.svg` — architecture diagram
5. `docs/design-constitution.md` — the 7 primitives + 10 goals (locked 2026-04-16)
6. `docs/cowork-dispatch-package.md` — prior Cowork prep, useful context
7. `tasks.lessons.md` (at repo root) — accumulated process lessons; read at every session start
8. `tasks.todo.md` (at repo root) — current priorities

Files NOT in the BKG repo (in the umbrella Claude project — paste into Cowork if needed):
- `FRONTIER_MAP_PORTABLE.md`
- `02_BRANDING.md`
- `02_BRANDING_AIKIDO_ADDENDUM.md` (couldn't be found last session — proceed without it; flag voice ambiguity rather than invent)
- `BKG_SHIP_STRATEGY.md` (Chilly will paste if needed; otherwise infer from current codebase + design constitution)

---

## WORKSTREAM 0 — Shared Primitives (RUNS FIRST, SEQUENTIALLY, ~20-30 min)

**Branch:** `feature/v3-killerapp-rehaul-ws0`
**Goal:** Create the shared TypeScript components and schemas every other workstream imports. Without this, WS2-WS6 cannot run in parallel (they would all try to create the same shared files and conflict).

### Deliverables

Create the directory structure:
```
src/
├── components/
│   └── primitives/
│       ├── index.ts (exports)
│       ├── StanceCard.types.ts (14-axis user-state TypeScript types)
│       ├── TrustStrip.tsx
│       ├── ThreeSourceRule.ts (helper for claim verification)
│       ├── InvitationCard.tsx
│       ├── ProToggle.tsx
│       ├── TempoAdapt.tsx
│       ├── AskAnything.tsx
│       ├── EmotionalArc.tsx
│       ├── Whisper.tsx
│       ├── TimeMachine.tsx
│       ├── ProgressiveReveal.tsx
│       ├── InfiniteDescent.tsx
│       ├── ModalityMirror.tsx
│       ├── CulturalRender.tsx
│       ├── AccessibilityAdapt.tsx
│       ├── CrossSurfaceBridge.tsx
│       ├── LifecycleMemory.tsx
│       └── TrustPostureAdapt.tsx
├── lib/
│   ├── stance-card.ts (server-side Stance Card resolver — reads request headers, user session, device, locale, time to compute the 14-axis snapshot)
│   └── brand-tokens.ts (TypeScript constants for parchment/copper/steel/forest-ink + font families)
└── app/
    └── killerapp/
        ├── credentialing/page.tsx (empty stub — WS2 fills in)
        ├── compliance/page.tsx (empty stub — WS4 fills in)
        ├── alerts/page.tsx (empty stub — WS4 fills in)
        └── rewards/page.tsx (empty stub — WS5 fills in)
```

### Per-primitive requirements

Each primitive component:
- TypeScript types defined
- React functional component with `'use client'` directive if it needs interactivity, server component otherwise
- JSDoc at the top stating: Pattern Language number (01-20), category (Constitutional/Platform/Rendering), which axes it touches (primary + active), one-sentence plain-English explanation
- Reads from a `useStanceCard()` hook (define this in `lib/stance-card.ts`) when it needs to make rendering decisions
- Brand-compliant CSS — use Tailwind classes that match the existing constitution. Parchment background, Cormorant for display, Space Mono for technical labels.
- Sensible defaults — components must render acceptably with minimal props

### Stance Card schema (canonical — embed this exact shape)

```typescript
export interface StanceCard {
  domain: 'construction' | 'orchids' | 'toxicology' | 'health' | 'biomarker' | 'unknown';
  surface: 'garden' | 'dream' | 'killer-app';
  stage?: string; // domain-specific lifecycle stage
  lane: 'administrator' | 'professional' | 'public' | 'machine';
  skill_signal: number; // 0.0-1.0 continuous
  modality: 'visual' | 'voice' | 'gesture' | 'agent-api';
  device_class: 'phone' | 'tablet' | 'desktop' | 'xr' | 'voice-only' | 'agent';
  tempo: 'leisurely' | 'focused' | 'urgent' | 'emergency';
  emotional_signal?: 'curious' | 'anxious' | 'confident' | 'overwhelmed' | 'celebratory' | 'mournful';
  locale: { language: string; jurisdiction: string; units: 'imperial' | 'metric'; currency: string; conventions: Record<string, unknown> };
  accessibility: { vision: 'default' | 'low' | 'blind'; hearing: 'default' | 'low' | 'deaf'; motor: 'default' | 'limited'; cognitive: 'default' | 'reduced-motion' | 'simplified'; neurodivergent: boolean };
  economic_signal?: number; // 0.0-1.0, only when relevant
  time_horizon: 'now' | 'today' | 'this-week' | 'this-project' | 'lifetime';
  trust_posture: number; // 0.0-1.0, inferred from tenure + behavior
}
```

### TrustStrip component (canonical — embed this exact API)

```typescript
export interface TrustStripProps {
  sourceCount: number; // must be ≥3 for "authoritative" rendering
  sources: Array<{ name: string; url?: string; jurisdiction?: string }>;
  lastVerified: Date | string;
  contested?: boolean;
  contestedReason?: string;
  variant?: 'inline' | 'badge' | 'full';
}
```

### Commit + push when complete

```bash
git add src/components/primitives/ src/lib/stance-card.ts src/lib/brand-tokens.ts src/app/killerapp/credentialing/page.tsx src/app/killerapp/compliance/page.tsx src/app/killerapp/alerts/page.tsx src/app/killerapp/rewards/page.tsx
git commit -m "[WS0] primitives: extract Pattern Language components + Stance Card schema + route stubs"
git push -u origin feature/v3-killerapp-rehaul-ws0
```

Then output the Vercel preview URL for Chilly to verify on his phone before dispatching WS2-WS6.

**WS0 is the gate. Do not dispatch WS2-WS6 until WS0 lands cleanly.**

---

## WORKSTREAMS 2-6 — Parallel after WS0 lands

Each WS branches off `feature/v3-killerapp-rehaul` (parent), NOT off WS0's branch. After WS0 is merged into the parent rehaul branch, each WS picks it up via `git pull`. Each WS commits to its own sub-branch.

Bootstrap for each WS agent:
```bash
git fetch origin
git checkout feature/v3-killerapp-rehaul
git pull origin feature/v3-killerapp-rehaul
git checkout -b feature/v3-killerapp-rehaul-wsN
```

### Workstream 2 — Credentialing Dashboard
**Branch:** `feature/v3-killerapp-rehaul-ws2`
**Route:** `src/app/killerapp/credentialing/page.tsx` (stub created by WS0)
**Scope:** Scaffold the credentialing dashboard. Mock data is fine — wire types correctly so real Supabase data slots in later.

Required Pattern Language compositions:
- `<InvitationCard>` (Floor 0): "Renew which credential first?" with three soonest-expiring as buttons
- `<TrustStrip>` on every credential record: source authority, last-verified, expiration date
- `<TempoAdapt>` wrapper: full UI when 30+ days out; stripped-to-one-button at 2 days out
- `<ProToggle>` at top: "OSHA-10" in human mode / "OSHA Construction Industry Outreach Training Program, 10hr" in pro mode
- `<TimeMachine>` integration: every renewal action has a 7-day undo window
- `useStanceCard()` on every page load

Four-lane Floor 0 checklist (must answer all four):
- Administrator (GC running the firm): "what's expiring across my crew?"
- Professional (the licensed contractor): "how do I renew this fastest?"
- Public (the homeowner): "is my contractor properly licensed?"
- Machine (agent on user's behalf): structured JSON payload at `/api/v1/credentialing` (mock JSON returned for now)

Preserve as-is anywhere it exists: GreenFlash particle effects + Web Audio chimes on successful renewals.

### Workstream 3 — Project Pipeline
**Branch:** `feature/v3-killerapp-rehaul-ws3`
**Routes:** `src/app/killerapp/projects/page.tsx` + `src/app/killerapp/projects/[id]/page.tsx` (existing — rebuild)
**Scope:** Rebuild the project pipeline composing from the 20-piece Pattern Language.

Required compositions:
- `<InvitationCard>`: "What's next on which project?"
- `<ProToggle>`: human cards mode / Gantt critical-path mode
- `<CrossSurfaceBridge>`: Dream Machine sketches anchor onto project pages; Knowledge Garden citations propagate to Code Compliance worksheets (data flow is mock for now; types must be right)
- `<LifecycleMemory>`: every project shows context from prior stages (Size Up → Lock → Plan → Build → Adapt → Collect → Reflect)
- `<TrustStrip>` on every budget/schedule claim
- `<InfiniteDescent>` with floors: F0 "what's happening?" → F4 "AIA pay app status with line-item variance" → F6 agent payload

Four-lane Floor 0:
- Administrator: "which projects are at risk this week?"
- Professional: "what's blocking me right now?"
- Public (homeowner viewing their project): "where is my house at?"
- Machine: project state as JSON

### Workstream 4 — Compliance Alerts
**Branch:** `feature/v3-killerapp-rehaul-ws4`
**Routes:** `src/app/killerapp/compliance/page.tsx`, `src/app/killerapp/alerts/page.tsx` (stubs created by WS0)
**Scope:** Build the compliance and alerts surfaces.

Required compositions:
- `<TempoAdapt>` as the cardinal feature — drives the entire UI from leisurely → emergency
- `<TrustPostureAdapt>`: new users get full context; veterans get one-tap "renew"
- `<TrustStrip>`: every regulatory citation wears source + freshness + jurisdiction
- `<ThreeSourceRule>`: alerts triggered only when state board + city + contractor record agree
- `<TimeMachine>`: dismissed alerts recoverable for 30 days
- `<ModalityMirror>`: alerts surface via in-app, SMS, email, voice call as tempo escalates (channel routing is mock for now)

Four-lane Floor 0:
- Administrator: "what's on fire?"
- Professional: "what do I need to fix today?"
- Public: not primary lane; minimal surface
- Machine: alert stream as MCP feed

### Workstream 5 — GreenFlash CRM Reward Loop
**Branch:** `feature/v3-killerapp-rehaul-ws5`
**Route:** `src/app/killerapp/rewards/page.tsx` (stub created by WS0)
**Scope:** Build the rewards surface.

Required compositions:
- `<EmotionalArc>`: worry → control → celebration gradient drives visual progression
- `<ProgressiveReveal>`: power features (referral bonuses, tier multipliers) emerge after demonstrated use
- `<LifecycleMemory>`: rewards track project-to-project tenure
- `<Whisper>` for first-time encounter with each reward type
- `<TrustStrip>` on point calculations (sources: completion event + verified review + payment receipt)
- Cross-link in footer: reward events surface to umbrella `theknowledgegardens.com` profile (link, even if profile page doesn't exist yet)

**Critical preservation:** The existing GreenFlashProvider at `src/components/GreenFlashProvider.tsx` — particle effects (Canvas) + Web Audio chimes — is the brand's emotional anchor. Build the surfaces AROUND this provider, do not modify it.

### Workstream 6 — Ask Anything Search
**Branch:** `feature/v3-killerapp-rehaul-ws6`
**Scope:** Integrate the global Ask Anything box across all Killer App surfaces. Build it as a layout-level component.

Required compositions:
- `<AskAnything>` (cardinal): omnipresent box, one tap away, mounted in the killerapp layout
- `<CulturalRender>`: results in user's locale (US English / Spanish / units / jurisdiction)
- `<TrustStrip>` on every answer with source attribution
- `<ThreeSourceRule>` before any answer renders as authoritative
- `useStanceCard()` to scope results (a GC asking "what's a Manual J" gets pro-level; a homeowner gets plain-language)
- Machine-Legible Everything: agent-facing version of every answer accessible at `/api/v1/ask` (mock for now)

Four-lane Floor 0:
- Administrator: "answer with operations focus"
- Professional: "answer with code/spec depth"
- Public: "answer in plain English"
- Machine: structured JSON

---

## Hard gates — every WS walks this checklist before pushing

Each agent walks this checklist before pushing its branch:

- [ ] The RSI Heartbeat moat paragraph appears in the PR description (and in the commit message body for the final commit)
- [ ] Surface composes from the 20-piece Pattern Language with named pieces listed in PR description
- [ ] All four umbrella lanes (Admin, Pro, Public, Machine) have a Floor 0 question + Floor 0 answer in the code (comments are fine)
- [ ] `<TrustStrip>` renders on every primary claim
- [ ] `<ThreeSourceRule>` check enforced on every authoritative claim
- [ ] Federation Contract met (umbrella header reachable, parchment background, Cormorant + Space Mono, cross-link to ≥ 1 other live surface)
- [ ] `useStanceCard()` consumed by every primitive on the surface
- [ ] No buzzword copy: no "revolutionize", "disrupt", "game-changer", "cutting-edge", "innovative", "leveraging synergies"
- [ ] No "We think...", "Probably...", "Our AI believes...", "Trust us"
- [ ] Vercel preview deploys successfully (push triggers it automatically; verify in output)
- [ ] Brand test: "Would a curator at Royal Botanic Gardens AND a staff engineer at Stripe both respect this?" If no — back to the drawing board.

If any gate fails, fix before pushing. Do not push broken state to a feature branch.

---

## Coordination protocol

- **Commit message convention:** `[WS<n>] <surface>: <pattern-language-composition-summary>`
  - Example: `[WS2] credentialing: TrustStrip + TempoAdapt + ProToggle on renewal cards`
- **Final commit message** (the one that completes the WS) must include the RSI Heartbeat moat paragraph in the body
- **Push frequency:** small, frequent pushes are better than one giant push. Each push gets a Vercel preview URL Chilly can review on his phone.
- **Cross-WS dependencies:** Workstream 6 depends on Stance Card schema being finalized (WS0). WS4 depends on TrustStrip + ThreeSourceRule + TempoAdapt (all WS0). All other WS-to-WS dependencies should resolve through the shared primitives.
- **If you (an agent) need a primitive WS0 didn't deliver:** flag in the session, do NOT create it yourself. Chilly resolves.
- **PR creation:** each WS opens a PR on GitHub from `feature/v3-killerapp-rehaul-wsN` → `feature/v3-killerapp-rehaul`. Chilly reviews from his phone (GitHub mobile app handles this fine). DO NOT MERGE.

---

## What to do if you get stuck

Three escape valves, in order:

1. **Re-read the relevant files** in `docs/strategy/` — the answer to most design questions lives there
2. **Check `tasks.lessons.md`** — past sessions encoded the answer; many constraints are non-obvious
3. **Flag in the session** with the marker `🛑 WS<n> blocked: <one-line reason>`

**Specifically for git lock issues** (which broke last session):
```bash
rm -f .git/index.lock .git/HEAD.lock
```
Run that at the start of any agent that needs to commit. If `rm` is blocked by mount permissions, try `mv .git/index.lock /tmp/stuck-lock-$(date +%s)` instead.

**Do not invent. Do not ship a surface that violates the federation contract because "the docs were unclear." If you're not sure, ask in the session.**

---

## End-of-session protocol (BEFORE the last agent finishes)

Whichever agent completes last must:

1. Update `tasks.lessons.md` with any new lessons learned this session
2. Update `tasks.todo.md` with what shipped + what's queued for next sprint
3. Append a session entry to `docs/session-log.md` summarizing:
   - Which WS's completed cleanly
   - Which WS's blocked or partially completed
   - Vercel preview URLs for each WS (so Chilly can review on his phone)
   - Open PRs ready for Chilly's review
4. Commit these meta-updates to the parent rehaul branch (`feature/v3-killerapp-rehaul`), NOT to a WS sub-branch
5. Push parent rehaul branch
6. Print a clean summary in the session output:

```
SESSION COMPLETE — V3 KILLER APP REHAUL

Parent branch: feature/v3-killerapp-rehaul (pushed to origin)
Vercel previews (for iPhone review):
  WS0 primitives:    [URL]
  WS2 credentialing: [URL]
  WS3 projects:      [URL]
  WS4 compliance:    [URL]
  WS5 rewards:       [URL]
  WS6 ask anything:  [URL]

Open PRs on GitHub for review:
  [list of PR URLs]

Status per WS:
  WS0: [done / blocked + reason]
  WS2: [done / blocked + reason]
  ...

Updated: tasks.lessons.md, tasks.todo.md, docs/session-log.md

Next move for Chilly:
  - Review each Vercel preview on iPhone
  - Approve/comment/reject each PR on GitHub mobile
  - Merged PRs flow into parent rehaul branch, not main
  - Parent rehaul branch merges to main only after founder dogfood pass
```

---

## Why this brief is structured this way

This brief embeds the Pattern Language into its own structure. The "Required reading" is Progressive Reveal (you can't access the workstreams until you've shown you've read the foundation). The "Hard gates" are Three-Source Rule applied to your own PR. The branch isolation is Trust Posture Adapt (production trusts you only as far as a preview deployment will validate).

The brief teaches the philosophy by being built with it. If reading it makes the pieces feel obvious, that's the test passing.

**Speed is paramount. Quality is non-negotiable. Main is sacred. Push to feature branches, review on the phone, iterate fast.**

Now go build.

— Chilly, 2026-05-26
