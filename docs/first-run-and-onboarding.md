# First Run & Onboarding — Doctrine

*Tier 1 doctrine · 2026-06-10 · Born from the 2026-06 founder dogfood pass (John + Mike) · Public-cleared*
*Implementing design: Claude Design — "First Run — The First Five Minutes" (spec v1, acceptance criteria + motion). Team narrative: "The Seed Bank & The Portals."*
*Governed by PLATFORM-CONSTITUTION.md decisions 20 & 21 (canonical, 2026-06-10; predecessors 18/19).*

## Why this exists

The dogfood pass proved the engine works (auth holds cross-machine, context-routing generalizes, voice→pipeline persists) and the first five minutes fail: no clear first move, garden-speak in the work surface, visual mud, affordance overload, no role read, money not surfaced first, and a hard crash. The verdict was not "rebuild" — it was **re-house the engine behind a simpler front.** Phase 1's shipping gate includes the first-run experience.

## The seven principles (locked)

1. **One door.** A single plain-language input ("What do you want to build — or get done?") with 3–5 example chips. No competing CTAs, no sidebar, no floating buttons. Empty submit is blocked silently; chips are always a valid path forward. Chips span the lanes — a dreamer ("a treehouse for my kids") sees themselves in five seconds alongside the GC ("Bid the Twin Peaks remodel").
2. **Plain words.** No "Lens," no "RESTRICTED," no garden-speak in the work surface. Every term of art lands in plain language within one sentence (Design Constitution Goal 1 — dual-label, pro vocabulary preserved as the quieter layer).
3. **Money and time up front.** The first substantive screen renders Budget / Business Class / First-Class Luxury as visually distinct architectural options — money range + timeline + flags above the fold. The recommendation is a default, never a lock-in. Signals are honest: no tier is all-green.
4. **Infer the role, confirm in one tap.** Echo the user's exact words back unedited; present a single inferred role as the bright pre-selected card with the alternate visible but recessive; rationale is one whisper line; switching is instant and non-punishing. Owner voice = outcomes/cost/timeline/look; contractor voice = working-docs/compliance/lifecycle. Same engine, copy swaps only.
5. **Progressive reveal.** The seven-stage cockpit is the expert view — reached only through "go deeper," never auto-shown. The reveal should feel like a workspace being handed over, earned.
6. **One thing brightest per screen.** Every screen declares its brightest element; everything else recedes to paper.
7. **Re-house, don't rebuild.** The engine (routing, grounding, persistence) is proven. First-run work is presentation and sequencing on top of it.

## Binding requirements on the implementation

- **Machine twins (Goal 8).** Every first-run screen exposes a structured-data twin an agent can traverse; acceptance includes a headless-agent pass of the same flow. If the Design spec lacks the machine-layer section, it is appended before Code builds.
- **Persistence is part of "done."** Delight that doesn't persist is not done: role read, tier choice, and the first work surface survive leave-and-return (the founder dogfood loop: sign in → project → workflow → save → leave → return → resume).
- **No hallucinated money.** Tier ranges derive from grounded context or render as honest ranges with the engine's-read label — never fabricated precision.
- **Flags everywhere money or feasibility appears** — per `docs/visual-first-and-flags.md` (sage/amber/rust, citation or "verify with your AHJ" on code/permit/cost).
- **The generation contract governs every image slot** — placeholder-first, generate-once, stream-in, branded fallback, reduced-motion states.
- **Lanes:** v1 first-run ships Owner + GC voices (beachhead scoping); the platform lane canon is NINE lanes (Tier 0). The role-read mechanism must extend to all nine without redesign.
- **Brand:** herbarium lock throughout; no `#E8443A`, no pure-white grounds, no emoji in chrome, no jargon untranslated.

## Acceptance (the bar the dogfood pass sets)

A cold user — dreamer or contractor — knows their first move within five seconds, sees money and an honest read within two screens, is correctly voiced (or one tap from it), never meets the cockpit until they ask for it, and can leave and come back to everything they made. A headless agent can do the same run through the machine twins.
