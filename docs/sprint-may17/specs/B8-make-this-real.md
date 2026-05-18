# B8: Dream → "Make This Real" handoff
**Lane C executor:** C8 | **Depends on:** C1 spine

## CTA Placement
Mount `<MakeThisRealButton>` on TWO dream surfaces:
1. **`/dream/oracle`** — append inside `RendersPhase` (line ~1251), sibling/replacement of "Begin Another Reading"
2. **`/dream`** gateway — replace silent `localStorage.setItem('bkg-dream-express',...) + router.push('/dream/design?source=express')` with same button flow

Do NOT mount on cosmos/alchemist/genome/narrator this sprint.

## Visual
- Background `#D85A30`, white text, Archivo 600, 16px
- 56px tall, 12px radius, full-width mobile (max-w 480px desktop)
- Anchored at bottom of dream output, 24px top margin
- Label: **"Make This Real →"**
- Disabled until raw_input non-empty: opacity 0.5, cursor: not-allowed, tooltip "Tell me what you want to build first."
- Loading: spinner + "Saving your dream...", disabled, uses existing `bkg-spine-pulse` keyframe

## POST Contract
Tap → authenticated POST to `/api/v1/projects` (session bearer via `supabase.auth.getSession()`):
```js
{
  name: <derived 80-char snippet, or "My Dream Project">,
  raw_input: <oracle: joined answers; gateway: expressInput>,
  ai_summary: <profile.overallVibe ?? null>,
  jurisdiction: <lane-default or null; demo seeds "Marin County, CA">,
  estimated_cost_low: null,  // reserved
  estimated_cost_high: null, // reserved
  project_type: <profile.aestheticDNA ?? null>
}
```
Response wraps in `{ project: { id, ... } }`. Use `data.project.id`.

**On success:**
1. `localStorage.setItem('bkg-active-project', id)`
2. Fire genesis snapshot (§4) BEFORE navigation
3. `router.push(\`/killerapp?project=${id}\`)`

## Genesis Snapshot
After POST, before navigation:
```js
createSnapshot(
  newProject.id,
  'manual_save',
  'discover',  // stage 0
  'Genesis — from Dream Builder',
  'dream-builder'
)
```
Per `src/lib/time-machine.ts:107`. kind='both' default. Budget midpoint deferred (low/high null v1).

## Failure modes
- POST non-2xx: inline error "Couldn't save the project — try again." Re-enable. No localStorage write.
- Network timeout >5s: AbortController cancel; same error.
- Snapshot write fails: swallow + log; proceed with navigation.
- Unauthenticated 401: "Sign in to save your dream." link to /login?next=/dream/oracle.

## Files
- **CREATE** `src/components/dream/MakeThisRealButton.tsx` (~120 lines)
- **MODIFY** `src/app/dream/oracle/page.tsx` — import + mount inside RendersPhase
- **MODIFY** `src/app/dream/page.tsx` — replace express submit branch (~lines 49-61)

(3 files. POST endpoint + Time Machine lib reused as-is.)

## Acceptance criteria
1. Tap → URL contains ?project=<uuid> within 2s on broadband
2. Hard refresh on /killerapp?project=<id> shows same project (raw_input + AI take cached)
3. Time Machine lists "Genesis — from Dream Builder" as earliest snapshot
4. Disabled tooltip on empty input
5. Failure surfaces inline error; preserves input on retry

## Constitution check
- Goal 1: "Make This Real" plain language, not "Create Project"
- Goal 5: Genesis snapshot is rewindable — user can scrub back to "before I dreamed this up"
