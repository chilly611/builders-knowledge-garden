# A7 — Onboarding Methods Audit

## Three onboarding flows found

### 1. ProgressiveProfiler (`/onboard`) — lane detection fast-track
**Maturity:** demo-ready. **Steps:** 3. **Time to aha:** ~45 seconds.

Located at `app/src/components/ProgressiveProfiler.tsx`; route `/onboard`.

Flow: Q1 (intent) → Q2 (conditional sub-choice) → Q3 (pain point) → lane assignment → celebration → route to surface.

- 8 lanes detected: dreamer, builder, specialist, merchant, ally, crew, fleet, machine
- Deterministic lane logic from `intent + sub-choice`
- Each lane has a surface redirect (builder → `/killerapp`, dreamer → `/dream`, etc.)
- Celebration animation with lane-colored pulse before routing

**Scores:** Demo-readiness 4/5 · Time to aha 5/5 · Lane-fit 5/5

### 2. OnboardingFlow (modal component) — product education loop
**Maturity:** partial. **Steps:** 5. **Time to aha:** ~90 seconds.

Located at `app/src/components/OnboardingFlow.tsx`; imported by `/onboard/page.tsx`.

Flow: see-what-you-save → AI COO mockup → codes-updated-while-you-sleep → works-with-dirty-hands → you're-ready.

- Generic 5-step flow — **does NOT adapt by lane**
- Framer Motion animations throughout
- Savings amounts hardcoded; jurisdiction list hardcoded
- Progress bar + skip button

**Scores:** Demo-readiness 3/5 · Time to aha 3/5 · Lane-fit 1/5

### 3. OnboardingPage (`/onboarding`) — comprehensive setup wizard
**Maturity:** production. **Steps:** 7. **Time to aha:** 180+ seconds.

Located at `app/src/app/onboarding/page.tsx`.

Flow:
1. Trade selection (10 options: GC, Roofer, HVAC, Electrician, etc.)
2. Goal selection (up to 3 of 10)
3. Company info (optional, skippable)
4. Quick-win demo (trade-specific AI estimate snippet)
5. Voice onboarding (mic pulse + 3 voice command examples)
6. Features showcase (Dream Builder, Knowledge Garden, Killer App; LIVE/BETA labels)
7. Celebration + next steps (XP badge, personalized actions, "Start Building" CTA)

- 8-trade map (gc, roofer, hvac, electrician, plumber, solar, cabinetmaker, remodeler, adu, supplier)
- Trade-specific quick wins
- Saves to Supabase `user_profiles` on completion
- Blueprint-styled code block (dark bg, cyan text) for estimates
- Confetti animation on step 7

**Scores:** Demo-readiness 5/5 · Time to aha 4/5 · Lane-fit 3/5 (maps trade, not lane — misses Ally, Fleet, Machine)

## Lane vs trade

| Mapping | Route | Notes |
|---|---|---|
| Lane | `/onboard` (ProgressiveProfiler) | All 8 lanes; fast |
| Trade | `/onboarding` (OnboardingPage) | 8 trades; production polish |
| Generic | OnboardingFlow modal | No adaptation |

## Recommendation

**Use ProgressiveProfiler (`/onboard`) as the demo opener.**

Justification: it is the **only flow that detects all 8 lanes**, completes in 45 seconds (fast enough for investor demo), and routes to a lane-specific surface — proving the platform adapts by persona. Solves the W7.Q "branding has outrun delivery" lesson — user sees their lane immediately, not vague capability pitches.

OnboardingPage is production-grade but trade-centric (missing Machine, Fleet, Ally) and takes 3+ minutes — keep it for the post-signup deep dive. OnboardingFlow is pretty but generic — pull it from active surfaces or rewrite per lane.

## Routes to test for demo

| Route | Component | Use case |
|---|---|---|
| `/onboard` | ProgressiveProfiler | **Demo opener** |
| `/onboarding` | OnboardingPage | Fallback / detailed walkthrough |
| modal | OnboardingFlow | Currently embedded in `/onboard`; consider removing or making lane-aware |

## Files audited

- `app/src/app/onboard/page.tsx`
- `app/src/app/onboarding/page.tsx`
- `app/src/components/OnboardingFlow.tsx`
- `app/src/components/ProgressiveProfiler.tsx`
- `app/src/components/LaneSelector.tsx`
- `app/src/components/DemoMode.tsx`
