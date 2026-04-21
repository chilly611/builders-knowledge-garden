# Compass Close-Out Ritual — Implementation Specification

**Version:** 1.0  
**Date:** 2026-04-21  
**Status:** Specification (no code changes)  
**Asset:** MP4 tree-of-tools animation (624×624, 24fps, 5.2s, 125 frames)  
**Approved Asset Location:** `/sessions/serene-wonderful-feynman/mnt/uploads/chillyprojects_A_tree_made_entirely_from_construction_tools_t_83ecf509-9d79-4e41-877f-c00c5af93cec_1-b7470803.mp4`

---

## 1. Trigger Conditions

The Close-Out Ritual fires when **all workflows in the project's Reflect stage (stage 7) have emitted `step_completed` for their final step.**

### Detection Logic

```
For a given projectId:
  1. Query journey-progress event log: all events where projectId = X
  2. Identify all workflows in stageId = 7 (Reflect) per docs/workflows.json:
     - q25: Retainage Chase (5 steps)
     - q26: Warranty Reminders (5 steps)
     - q27: Lessons Learned (5 steps)
  3. For each of these three workflows:
     - Check if step_completed event exists for the final step (s-5)
     - If ALL three workflows have completed their last step:
       → Ritual is eligible to fire
```

### Trigger Points

**Primary trigger:** Automatic  
When the final step of the third and final Reflect-stage workflow completes:
  - Listen for `step_completed` event on `s27-5` (Lessons Learned, "Tag lessons")
  - If `step_completed` fires and prior two workflows (q25, q26) have also completed their final steps, emit `close_out_ready` event to the global event bus
  - Mount the ritual surface automatically

**Fallback trigger:** Manual  
A "Close out project" button rendered on the Compass (primary nav Reflect chip or project-summary card):
  - Allows demo/testing without completing all Reflect workflows
  - Emits `close_out_manual_trigger` event
  - Mounts ritual with `isManualTrigger: true` in state (telemetry distinction)

### Prerequisite State

The ritual expects the following data to be available in localStorage or project context:
- `bkg-active-project` — project ID (string)
- `bkg-project-data` — project name, client name, phase count, XP earned (object)
- Journey event log (server-side or IndexedDB) for telemetry replay

---

## 2. Timing Curve & Phases

**Total ritual duration:** 5.2 seconds (matches MP4 playback) + transitions

### Phase Breakdown

| Phase | Duration | Role | Easing |
|-------|----------|------|--------|
| **Pre-roll** | 0.3s | Black ground fade-in, audio cue (if enabled) | `cubic-bezier(.4,.02,.2,1)` |
| **Main animation** | 5.2s | MP4 playback: tree grows, orrery unfolds, crown appears | `linear` (MP4 timing) |
| **Post-roll resolve** | 0.8s | Orrery halos pulse once, orange crown stabilizes | `cubic-bezier(.4,.02,.2,1)` |
| **Content reveal** | 0.6s | Before/after summary cards + personalized anchor fade in | `cubic-bezier(.4,.02,.2,1)` |
| **Total** | **6.9s** | | |

### Easing Specification

Use `cubic-bezier(.4,.02,.2,1)` for all non-playback transitions. This curve:
- Starts slow (hand-drawn feel)
- Accelerates smoothly
- Slightly overshoots the end (settles at 1.02) then returns
- Avoids bouncy spring behavior
- Matches "stroke-draw" motion language from design-moodboard-v1

**No auto-loops.** Ritual plays once, then resolves to content state.

---

## 3. Asset Pipeline

### Video Compression & Delivery

**Original:** `/sessions/serene-wonderful-feynman/mnt/uploads/...mp4`  
- Codec: H.264
- Dimensions: 624×624
- Frame rate: 24fps
- Duration: 5.2s
- Estimated file size: ~2.3 MB

**Compressed versions (delivery):**

1. **H.264 Primary (mobile-friendly)**
   - Target: ~1 MB (0.43× original)
   - Bitrate: 1200 kbps
   - Preset: `fast` (encode speed vs. quality trade-off)
   - Output path: `/public/rituals/close-out/tree-animation.mp4`
   - MIME: `video/mp4; codecs="avc1.42E01E"`

2. **WebM Fallback (Firefox / Safari compatibility)**
   - Target: ~900 KB
   - Codec: VP9
   - Bitrate: 1000 kbps
   - Output path: `/public/rituals/close-out/tree-animation.webm`
   - MIME: `video/webm; codecs="vp9"`

3. **Poster Image (HTML5 `<video poster>`)**
   - Source: First frame of MP4 (frame-001.jpg extracted at 5.2s offset)
   - Output path: `/public/rituals/close-out/poster.jpg`
   - Dimensions: 624×624
   - Quality: 85% JPEG
   - Use case: Fallback display while video loads / prefers-reduced-motion state

### ffmpeg Commands

```bash
# H.264 compression
ffmpeg -i tree-animation.mp4 \
  -c:v libx264 -preset fast -crf 23 -b:v 1200k \
  -pix_fmt yuv420p -movflags +faststart \
  /public/rituals/close-out/tree-animation.mp4

# WebM fallback
ffmpeg -i tree-animation.mp4 \
  -c:v libvpx-vp9 -b:v 1000k -crf 30 \
  /public/rituals/close-out/tree-animation.webm

# Poster (extract first frame)
ffmpeg -i tree-animation.mp4 -vf fps=fps=1/5.2 -q:v 2 \
  /public/rituals/close-out/poster.jpg
```

### Color Grading (Optional Enhancement)

If visual polish is desired, apply a subtle warm color grade to the MP4 during compression to emphasize the Deep Orange (`#D9642E`) crown moment:
- Shift midtones +0.05 toward warm (temperature +300K equivalent)
- Boost saturation of orange/warm tones by 8%
- Preserve blacks and highlight detail
- FFmpeg `curves` filter or post-production tool (DaVinci Resolve, Final Cut)

**Decision point for founder:** Apply color grade or keep original? (See §9 Open Questions)

### File Organization

```
/public/rituals/close-out/
├── tree-animation.mp4          [primary, H.264, ~1 MB]
├── tree-animation.webm         [fallback, VP9, ~900 KB]
├── poster.jpg                  [first frame, 624×624]
└── metadata.json               [optional: animation metadata, timing, accessibility]
```

---

## 4. Integration & Route Architecture

### Proposed Mount Point

**Route:** `/killerapp/projects/[id]/close-out`  
(Parallels existing Compass route structure; projects are implicit in URL param)

**Alternative (modal):** Overlay modal triggered from Compass Reflect-stage completion, no dedicated route.  
*Recommendation: Dedicated route + breadcrumb for clarity and deep-linking capability.*

### Route Structure

```
/killerapp/projects/[id]/
├── page.tsx                  [project summary landing]
├── close-out/
│   ├── page.tsx             [CloseOutPage server component]
│   ├── CloseOutClient.tsx   [useEffect + state management]
│   ├── CloseOutRitual.tsx   [video + animation orchestration]
│   └── PostRitualContent.tsx [before/after, halo, anchor]
```

### Data Flow

**Input state (from parent Compass/project route):**
```typescript
interface CloseOutProps {
  projectId: string;
  projectName: string;
  clientName: string;
  stageCompletionDates: Record<'1'|'2'|'3'|'4'|'5'|'6'|'7', string>; // ISO dates
  totalXpEarned: number;
  journeyEvents: Array<JourneyEvent>; // for replay/summary
  manualTrigger?: boolean; // if true, skip auto-trigger check
}
```

**Global event bus:**
- Listen for `close_out_ready` (auto) or `close_out_manual_trigger` (manual)
- Extract `projectId` from event detail
- Push to `/killerapp/projects/[id]/close-out`

### Output State (After Ritual)

The post-ritual surface mounts four content zones in sequence:

**Zone 1: Before/After Reveal**
- Left panel: Compass map at stage 6 (Collect) — monochrome, faded
- Center: Animated arrow or transition blur
- Right panel: Compass map at stage 7 (Reflect) — full color, Deep Orange crown at apex
- Typography: "From planning to completion" (Söhne display size)

**Zone 2: Orrery Halo & Stats**
- Concentric rings (orrery motif from moodboard, §5 Moment Punctuation)
- Inner ring: Total project duration (weeks)
- Next ring: Total XP earned (rank achievement unlocked?)
- Outer ring: Deep Orange accent stroke, 3px weight
- Easing in: `cubic-bezier(.4,.02,.2,1)` 0.6s delay after ritual ends

**Zone 3: Personalized Vision Anchor** (if dataset exists)
- Pull the "dream" asset that anchored this project at Compass load
- Render as semi-transparent hero behind text
- Text: "Built: [Project Name] by [Client Name]"
- Typography: Fraunces display (archival voice from moodboard)
- Color: Deep Orange for year/date; graphite for names
- **Status: Parked for later sprint** (see §9)

**Zone 4: Shareable Summary Card**
- Title, date range, XP total, lessons count
- Copy-to-clipboard CTA button
- Optional social share (Twitter, LinkedIn with pre-filled text)
- Background: Trace paper (`#F4F0E6`), graphite border
- Typography: Söhne medium, size sm

### Component Reference Points

Files to touch (architecture only, no code implementation):

- `src/app/killerapp/projects/[id]/close-out/page.tsx` — Server wrapper, fetch project metadata
- `src/app/killerapp/projects/[id]/close-out/CloseOutClient.tsx` — Client state, trigger detection, navigation
- `src/design-system/components/CloseOutRitual.tsx` — Video playback orchestration, phase timing
- `src/design-system/components/PostRitualContent.tsx` — Before/after, halo, anchor, summary
- `src/lib/journey-progress.ts` — Extend `emitJourneyEvent()` to emit `close_out_ready` and `close_out_*` telemetry events

---

## 5. Prefers-Reduced-Motion Fallback

### Accessibility Strategy

For users with `prefers-reduced-motion: reduce`:

**Instead of video playback:**
1. Display poster frame (first frame JPG) at 624×624, centered
2. Render static "Project Complete" celebration text in Fraunces display, Deep Orange color, below poster
3. Skip all animations; show final state immediately
4. Render orrery as a static SVG illustration (concentric rings, no animation)
5. Show before/after cards (left/right columns) without fade transitions — snap to visible

**Implementation:**
```css
@media (prefers-reduced-motion: reduce) {
  video {
    display: none; /* Hide video element */
  }
  img.poster {
    display: block; /* Show poster instead */
  }
  .halo-animation {
    animation: none;
    opacity: 1; /* Instant to final state */
  }
  .reveal-fade {
    animation: none;
    opacity: 1;
  }
}
```

**JavaScript check:**
```typescript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (prefersReducedMotion) {
  // Use static poster + SVG, skip video
  setIsReducedMotion(true);
}
```

### Static SVG Orrery (Alternative to Halo Animation)

A hand-drawn-style SVG with three concentric rings:
- **Inner ring:** Tree-of-tools silhouette (monochrome)
- **Middle ring:** Graphite hairline, subtle wobble (heritage layer texture)
- **Outer ring:** Deep Orange 3px stroke, perfect geometry
- Center text: "Reflect" + stage emoji (per workflows.json)

No animation; renders instantly for accessibility.

---

## 6. Design-System Ties

### Palette Tokens (Per design-moodboard-v1)

| Role | Token | Hex | Usage in Ritual |
|------|-------|-----|-----------------|
| Dark ground | Blueprint navy | `#1B3B5E` | Video background fade-in |
| Dominant ink | Graphite | `#2E2E30` | "Project Complete" text, before/after labels |
| Paper | Trace paper | `#F4F0E6` | Summary card background |
| Fade line | Faded rule | `#C9C3B3` | Orrery hairlines, after-image border |
| Everyday warm | Drafting brass | `#B6873A` | CTA buttons (share, download) |
| **Peak pair: Celebration** | **Deep orange** | **`#D9642E`** | **Crown highlight in MP4, orrery outer ring, "Complete" text, halo pulses** |
| Peak pair: Verification | Robin's egg | `#7FCFCB` | Navigation breadcrumb active state, stage 7 highlight in Compass |

**Rule from moodboard:** Orange and robin's egg are reserved for moment punctuation and verification states. They never sit adjacent to brass in the same component. In the ritual, brass is absent—only orange is ceremonial.

### Motifs (From Closed Set, §6 of moodboard)

- **Tool-tree:** Rendered in the MP4; appears at full frame
- **Orrery / annotated halo:** Pulse animation post-ritual; only Deep Orange ring
- **Blueprint elevation linework:** Optional subtle background grid in before/after panels (faded rule weight)
- **Engraved instruments:** Heritage texture in summary card footer (decorative divider)
- **Graph-paper grid:** Very faint behind before/after Compass maps

No new motifs introduced.

### Typography

- **Display heading ("Project Complete"):** Fraunces at 64px, weight 700, Deep Orange (`#D9642E`)
- **Before/After labels:** Söhne, 14px, weight 600, Graphite
- **Stats (XP, duration):** Berkeley Mono, 16px, weight 400
- **Summary card headline:** Söhne, 18px, weight 600, Graphite
- **Share CTA text:** Söhne, 12px, weight 600, Drafting brass; hover → Deep orange

### Color Contrast Compliance

- All text on Trace paper background: use Graphite (`#2E2E30`)
- All text on Blueprint navy background: use Trace paper or white
- Decorative strokes: Faded rule for heritage layers; Bold strokes (3px) in Deep orange for punctuation
- WCAG AA compliant for all body copy

---

## 7. Sound (Optional)

**Recommendation: Silent by default.**

**Rationale:**
- Pros stare at screens 10+ hours/day; unexpected audio interrupts focus and can startle
- Motion-only celebration respects accessibility and ambient context
- No notification-like chimes in a work tool (different UX paradigm than games)

**If sound is approved (roadmap):**
- Single soft chime (muted on first load, unless user has enabled notifications)
- Frequency: G5 (784 Hz) — bright but not piercing
- Duration: 0.5s fade-in, 0.3s tail-off
- Peak volume: -20 dB (background-level, won't wake speakers)
- Trigger: Fire at 4.5s into ritual (tree crown moment)
- Muting: Respect `prefers-reduced-motion` AND browser audio autoplay policy (Chromium + Safari)
- Audio file: `/public/rituals/close-out/chime.mp3` (mono, 192 kbps)

**Default state:** `<audio>` element with `muted` prop; no autoplay. CTA to unmute on first ritual view.

---

## 8. Telemetry Events

The Close-Out Ritual emits to the global journey-progress event bus:

### Event: `close_out_started`
```typescript
{
  type: 'close_out_started',
  projectId: string,
  timestamp: ISO8601,
  trigger: 'auto' | 'manual',
  projectName?: string,
  clientName?: string,
}
```
Fired: When ritual surface mounts (video begins pre-roll)

### Event: `close_out_completed`
```typescript
{
  type: 'close_out_completed',
  projectId: string,
  timestamp: ISO8601,
  durationMs: number,        // wall-clock duration from start to content reveal
  playbackFinished: boolean, // did user watch full video or skip?
  postRitualEngagement: 'viewed' | 'scrolled' | 'shared' | 'closed',
}
```
Fired: When post-ritual content zone becomes visible (all animations resolve)

### Event: `close_out_skipped`
```typescript
{
  type: 'close_out_skipped',
  projectId: string,
  timestamp: ISO8601,
  reason: 'user_dismissed' | 'navigation_away' | 'error',
  playbackPercent: number,  // 0–100, how far into video before skip
}
```
Fired: If user dismisses ritual before `close_out_completed`

### Event Log Integration

All three events write to:
- **Server:** `journeys` collection (if backend tracking exists)
- **Client:** IndexedDB `bkg-journey-log` (local persistence)
- **Analytics:** (Optional) Send to analytics service via `window.trackEvent()` if configured

Events are queryable by `projectId`, enabling post-mortem review of project completion.

---

## 9. Open Questions for Founder

The following decisions require founder input in the morning:

1. **Color grade on MP4?**  
   Apply subtle warm color grade (boost oranges, shift midtones warm) to emphasize the Deep Orange crown moment? Or keep original footage as-is?

2. **Personalized vision-anchor inclusion?**  
   Should the post-ritual content include a "dream anchor" (the Compass-entry image that seeded this project) rendered as a semi-transparent hero? This feature is designed but requires dataset wiring (pulling dream state). Defer to next sprint if not ready.

3. **Sound on roadmap?**  
   Is celebratory audio (soft chime, 0.5s, -20 dB) in scope for close-out? Or keep ritual motion-only per accessibility best practice? If yes, when?

4. **Manual trigger button placement?**  
   Where should the "Close out project" fallback button render? Options:
   - On the Compass Reflect-stage chip (small action icon)
   - On a project summary card (prominent CTA)
   - In the stage-transition modal before final step completes
   - Recommend: Reflect-stage chip, small icon that reads as "advanced action"

5. **Route vs. modal?**  
   Mount ritual as a dedicated page (`/killerapp/projects/[id]/close-out`) or as a full-screen modal overlaying the Compass? Dedicated route allows deep-linking and clear breadcrumb navigation; modal keeps ritual in context. Recommend: Dedicated route for clarity and shareable state.

---

## Appendix A: Extracted MP4 Frames

Frame references for design spec validation. Frames extracted at 1.3s intervals:

| Frame | Time | Asset | Description |
|-------|------|-------|-------------|
| 1 | 0.0s | `frame-001.jpg` | Black ground, first tools begin entry from left |
| 2 | 1.3s | `frame-002.jpg` | Trunk established, branches forming, tools interlock |
| 3 | 2.6s | `frame-003.jpg` | Canopy near full, orrery halo becomes visible, crown tools visible |
| 4 | 5.2s | `frame-004.jpg` | Complete tree silhouette, orrery rings visible, Deep Orange crown stable |

All frames: 624×624px, `/sessions/serene-wonderful-feynman/mnt/Builder's Knowledge Garden/design-assets/close-out-frames/`

---

## Appendix B: Reference to Workflows.json

**Reflect Stage (Stage 7) Workflows:**

```json
{
  "id": 7,
  "name": "Reflect",
  "emoji": "📖"
}

Workflows:
- q25: Retainage Chase (5 steps, XP 110) — final step: s25-5 "Confirm payment"
- q26: Warranty Reminders (5 steps, XP 85) — final step: s26-5 "Close file"
- q27: Lessons Learned (5 steps, XP 100) — final step: s27-5 "Tag lessons"
```

Ritual fires when all three final steps emit `step_completed`.

---

## Appendix C: WorkflowShell Event Flow

(Reference for integration team)

`WorkflowShell.tsx` (lines 155–165) already emits `step_completed` events to the journey-progress event bus via `emitJourneyEvent()`:

```typescript
if (event.type === 'step_completed') {
  const stepIndex = workflow.steps.findIndex((s) => s.id === event.stepId);
  emitJourneyEvent({
    type: 'step_completed',
    workflowId: workflow.id,
    projectId,
    stepId: event.stepId,
    stepIndex: stepIndex < 0 ? 0 : stepIndex,
    totalSteps: workflow.steps.length,
  });
}
```

**Close-Out detection:** Extend the global journey-event listener (in `src/lib/journey-progress.ts`) to check if the incoming `step_completed` event matches `(workflowId: 'q27', stepId: 's27-5')`. If so, query prior two workflows' final-step status and emit `close_out_ready` event if all three are complete.

---

## Appendix D: File Manifest

**Deliverables for integration:**

- [ ] `/public/rituals/close-out/tree-animation.mp4` (compressed, ~1 MB)
- [ ] `/public/rituals/close-out/tree-animation.webm` (VP9 fallback, ~900 KB)
- [ ] `/public/rituals/close-out/poster.jpg` (first frame, 624×624)
- [ ] `/public/rituals/close-out/metadata.json` (timing, dimensions, accessibility notes)
- [ ] `/sessions/serene-wonderful-feynman/mnt/Builder's Knowledge Garden/design-assets/close-out-frames/frame-*.jpg` (4 frames for review)

**No code changes in this specification.** Routes, components, and event wiring are architectural notes only.

---

**Next Steps:**

1. Founder approves/revises answers to §9 Open Questions
2. Integration engineer builds routes and components per this spec
3. QA tests trigger conditions (auto + manual), telemetry, fallbacks
4. Ship with stage 7 workflows (likely Week 4 ship cycle)

---

*Specification drafted for the Builder's Knowledge Garden, the peak moment when every journey reaches reflection.*
