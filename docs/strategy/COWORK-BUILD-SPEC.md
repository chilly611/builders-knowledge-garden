# Dream Machine Consolidation — Cowork Build Spec

## What This Does
Replaces the 6-9 card dream hub with a unified 3-ramp landing page:
1. **Express** — type/voice → straight to Design Studio
2. **Discover** — 5-question Oracle flow → dream reveal → Design Studio  
3. **Upload** — routes to existing /dream/upload (unchanged)

All three converge to /dream/design with pre-populated DreamEssence.

## Locked Decisions (all 12 approved by Chilly)
1. Discover lives AT /dream (replaces the hub)
2. 5 questions: feel, priorities, style, outdoor, scale
3. Dream palette chips + progress ring during discovery
4. Real voice via Web Speech API (already used in /dream/describe)
5. Same questions for everyone; trade-aware placeholder prompts
6. Real Claude call via /api/v1/oracle/analyze + template fallback
7. DreamEssence handoff via localStorage (existing pattern)
8. Paid gate at "Start this project" after refinement
9. Shareable links show refined output
10. Mobile: swipe (AnimatePresence handles transitions)
11. GreenFlash at: first answer, all answered, dream revealed, start project
12. Old routes 301 redirect to /dream

---

## Files to Create/Replace

### NEW: `src/lib/hooks/useSpeechRecognition.ts`
- Web Speech API hook with graceful fallback
- Drop-in replacement — can be used by /dream/describe too

### NEW: `src/app/dream/components/DiscoverFlow.tsx`
- 5-step question flow with tappable cards
- framer-motion AnimatePresence for swipe transitions
- Voice input via useSpeechRecognition
- Progress ring + dream palette chips

### NEW: `src/app/dream/components/DreamReveal.tsx`
- Synthesis animation (2.2s reveal)
- Claude API call to /api/v1/oracle/analyze (POST)
- Template fallback profiles for when API is slow
- Dream card with style, mood, materials, color palette, budget
- "Refine this dream" → saves to localStorage, routes to /dream/design

### REPLACE: `src/app/dream/page.tsx`
- Unified landing with Express input + Discover + Upload buttons
- Trade-aware placeholder prompts (reads `bkg-lane` from localStorage)
- Animated particles, warm/gold chrome
- Routes: type/voice → /dream/design?source=express
          discover → in-page flow → /dream/design?source=discover
          upload → /dream/upload

---

## Redirects to Add (next.config.ts)

```typescript
// Add to existing redirects array in next.config.ts
async redirects() {
  return [
    // Dream consolidation: old sub-routes → unified landing
    { source: '/dream/oracle', destination: '/dream', permanent: true },
    { source: '/dream/alchemist', destination: '/dream', permanent: true },
    { source: '/dream/cosmos', destination: '/dream', permanent: true },
    { source: '/dream/sandbox', destination: '/dream', permanent: true },
    { source: '/dream/explore', destination: '/dream', permanent: true },
    { source: '/dream/describe', destination: '/dream', permanent: true },
    { source: '/dream/inspire', destination: '/dream', permanent: true },
    { source: '/dream/sketch', destination: '/dream', permanent: true },
    { source: '/dream/browse', destination: '/dream', permanent: true },
    { source: '/dream/garden', destination: '/dream', permanent: true },
    // Keep these active:
    // /dream/upload — Upload Studio (unchanged)
    // /dream/design — Design Studio (receives DreamEssence)
    // /dream/imagine — accessible but not in nav (fold into design later)
    // /dream/shared/[slug] — shareable dream links (unchanged)
  ];
},
```

---

## Design Studio Integration (/dream/design)

The Design Studio needs one change: read pre-populated DreamEssence on mount.

```typescript
// Add to /dream/design page.tsx useEffect:
useEffect(() => {
  const source = searchParams.get('source');
  
  if (source === 'discover') {
    const stored = localStorage.getItem('bkg-dream-profile');
    if (stored) {
      const profile = JSON.parse(stored);
      // Pre-fill the design brief:
      // - Set architectural style from profile.style
      // - Set mood from profile.mood  
      // - Set budget from profile.estimatedBudget
      // - Set materials from profile.materials
      // - Skip to Generate phase (brief is pre-filled)
      localStorage.removeItem('bkg-dream-profile');
    }
  }
  
  if (source === 'express') {
    const stored = localStorage.getItem('bkg-dream-express');
    if (stored) {
      const data = JSON.parse(stored);
      // Set description field to data.prompt
      // Trigger generation immediately
      localStorage.removeItem('bkg-dream-express');
    }
  }
}, [searchParams]);
```

---

## GreenFlash Integration

Wire into existing GreenFlashContext. Four celebration moments:

1. **First answer** (DiscoverFlow, on first handleSelect):
   ```typescript
   greenFlash?.trigger({ message: 'Dream started!', xp: 10, type: 'sparkle' });
   ```

2. **All 5 answered** (DiscoverFlow, step 4 → "Reveal"):
   ```typescript
   greenFlash?.trigger({ message: 'Vision complete!', xp: 25, type: 'ring' });
   ```

3. **Dream revealed** (DreamReveal, on phase === 'revealed'):
   ```typescript
   greenFlash?.trigger({ message: 'Dream revealed!', xp: 50, type: 'burst' });
   ```

4. **Start this project** (Design Studio, on paid gate):
   ```typescript
   greenFlash?.trigger({ message: 'Builder unlocked!', xp: 100, type: 'celebration' });
   ```

---

## Build Verification

After dropping files and wiring:
1. `npm run build` — must compile with 0 TypeScript errors
2. Visit /dream — should show unified landing, not 6-card hub
3. Type "modern farmhouse" + Enter → should route to /dream/design?source=express
4. Tap "Help me discover" → 5-question flow
5. Complete all 5 → reveal animation → dream profile card
6. Tap "Refine" → routes to /dream/design?source=discover
7. Visit /dream/upload → should still work unchanged
8. Visit /dream/oracle → should 301 redirect to /dream
9. Voice button should work in Chrome/Safari, hidden in Firefox

---

## Files to Archive (move to _archived/, remove from nav)

```
src/app/dream/_archived/
  oracle/page.tsx
  alchemist/page.tsx
  cosmos/page.tsx
  sandbox/page.tsx  (or imagine/page.tsx)
  explore/page.tsx
  describe/page.tsx
  inspire/page.tsx
  sketch/page.tsx
  browse/page.tsx
  garden/page.tsx
```

Keep the code intact for reference — just move out of active routing.

---

## Session Log Entry

Append to `docs/session-log.md`:

```markdown
### 2026-04-14 (Chat): Dream Machine Consolidation — Architecture + Spec
**Unified dream landing replaces 6-card hub with 3-ramp entry**

Decisions locked (12/12):
- Discover ramp lives AT /dream (replaces hub)
- 5 Oracle questions: feel, priorities, style, outdoor, scale
- Real Web Speech API voice input
- Real Claude API call at reveal + template fallback
- DreamEssence handoff via localStorage → Design Studio
- Paid gate after refinement ("Start this project")
- Old routes 301 redirect to /dream
- GreenFlash at 4 moments

Files created:
- src/lib/hooks/useSpeechRecognition.ts (Web Speech API hook)
- src/app/dream/components/DiscoverFlow.tsx (5-question Oracle flow)
- src/app/dream/components/DreamReveal.tsx (AI synthesis + profile card)
- src/app/dream/page.tsx (unified 3-ramp landing)
- Cowork build spec (this file)

Next: Cowork session to wire files into repo, add redirects, integrate GreenFlash, verify build.
```
