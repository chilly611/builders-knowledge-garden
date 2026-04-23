# W9 Compass Navigator Spec

**Document Status:** Design specification (read-only planning mode)  
**Author's Note:** Saved to `/sessions/serene-wonderful-feynman/bkg-repo/docs/design/W9-compass-navigator-spec.md`  
**Last Updated:** 2026-04-22

---

## 1. Current State Diagnosis

### CompassBloom Today (src/components/CompassBloom.tsx)
- **620-line expanding ring FAB** at bottom-right (sibling to AI FAB)
- **Animated bloom** on click: 8 petals (lanes) arranged in a circle, center hub displays XP + level + streak
- **XP visualization:** circular progress ring, gamification framing (level tier, accumulated XP)
- **Sub-routes panel:** clicking a petal expands a side panel with 4 sub-routes per lane
- **Behavior:** auto-closes on navigation, keyboard-accessible (Escape key), backdrop dismissal

### CompassNav (src/components/CompassNav.tsx)
- **Desktop sidebar** (64px collapsed, 220px expanded) + **mobile FAB** (2-column card bloom)
- **Lane-aware reordering:** prioritizes destinations by user's lane (dreamer, builder, merchant, etc.)
- **Auth button** with user menu (Sign in / Sign out)
- **Pinnable sidebar** (persist expanded state)
- **NOT wired to project switcher** — pure lane/destination navigation

### What Works
- Smooth animations + reduced-motion support
- Keyboard nav (Escape, focus trapping, ARIA labels)
- Lane detection via pathname prefix
- Responsive desktop/mobile split
- XP progress ring visual feedback

### What Drifts (Founder Flag)
- **Active project ID not persisted** across sessions (lives only in `useAuth` lane state)
- **No project switcher** — users can't load/save/switch between projects
- **"Projects" not first-class** — buried in lane sub-routes, not a lane-level primitive
- **No stage progress reflection** — doesn't show "we're 3 of 7 stages done on this project"
- **Bloom overlaps with AI FAB** — both bottom-right creates chrome competition

### What Frustrates
- **Multi-project users** (GCs managing 3+ simultaneous builds) have no quick-switch UI
- **Project context loss** — refreshing the page defaults to "default" project
- **Journey map is separate** — project progress (ProjectCompass) and lane navigation (CompassBloom) are visually decoupled
- **No coordination with IntegratedNavigator** — W9 work is designing a concurrent surface that may fight for space

---

## 2. Target Behavior — Navigator MUST Do

### Project Persistence
- **Key:** `bkg:active-project-id` in localStorage (already used by `useActiveProject()` hook in W4.1d)
- **Fallback:** anonymous `"default"` project for first-time users
- **Sync:** cross-tab via `StorageEvent` + `CustomEvent('bkg:active-project:changed')`

### Project Switcher
- **UI affordance:** chip in the center of bloom (or persistent pill if redesigned)
- **Modal on tap:** fetch `/api/v1/saved-projects` → list with thumbnails + "Create new" CTA
- **Persistence:** `recordProjectSwitch()` sets localStorage + emits `bkg:active-project:changed`
- **Silent fallback:** if API fails, show only the current project name

### First-Class "Projects" Lane
- **Visibility:** "Projects" appears as a top-level chip strip (or lane in bloom) alongside dreamer/builder/specialist/etc.
- **Contents:** recent projects + current project + quick-create button
- **Not a destination itself** — a picker/context-switcher that updates the active project for the rest of the app

### Stage Progress Reflection
- **Show:** "3 of 7 stages done" or visual progress ring on the navigator
- **Derive from:** `getJourneyState(activeProjectId)` → `rollupByStage()` from `journey-progress.ts`
- **Update live:** subscribe to `bkg:journey:changed` CustomEvent
- **Accessibility:** text label + optional ring visualization

### Coordinate with IntegratedNavigator (W9)
- **Decision needed:** Navigator is a FAB evolution OR a persistent left rail OR a top-bar dropdown
- **Constraint:** IntegratedNavigator cannot occupy the same chrome real estate
- **Output:** a clear "this is the Navigator's chrome zone" spec so W9 can design around it

---

## 3. Chrome Placement Decision

### Option A: Persistent LEFT Rail (Collapsible)
**Rationale:** Matches CompassNav's desktop sidebar pattern; projects become a top section.

**Pros:**
- Familiar desktop UX pattern
- "Projects" section can be large/visible at the top
- Right side of screen left free for IntegratedNavigator (if needed)

**Cons:**
- Reduces content width on desktop (already constrained in killerapp)
- Mobile still needs a FAB (two navs to maintain)
- Bigger departure from current bloom location

---

### Option B: Evolved Bottom-Right FAB (RECOMMENDED)
**Rationale:** Minimal chrome footprint; keeps AI FAB bottom-right without collision.

**Pros:**
- Preserves current bloom location (users expect compass there)
- Project chip in center hub is discoverable
- Project switcher modal doesn't add permanent chrome
- Mobile and desktop share same interaction pattern
- Right side fully free for IntegratedNavigator

**Cons:**
- Modal interactions (project picker) stack on top of bloom
- Stage progress needs careful visual encoding (ring? label? chip?)
- "Projects" first-class status is modal-based, not always-visible

---

### Option C: Top-Bar Dropdown
**Rationale:** Pair with logo/brand; projects become a top navigation item.

**Pros:**
- "Projects" always visible in top bar
- Reduces FAB clutter
- Clean separation from workflow chrome

**Cons:**
- Pulls focus from killer app content (stages, workflows, budget)
- IntegratedNavigator may also want top bar
- Requires top-bar redesign across all routes

---

### Option D: Split (Left Rail for Mobile, FAB for Desktop)
**Rationale:** Best of both (responsive optimization).

**Pros:**
- Desktop gets persistent rail, mobile gets lightweight FAB
- Projects always visible on desktop
- Mobile stays fast + thumb-friendly

**Cons:**
- Two different implementations to maintain
- User mental model shifts between platforms

---

## 4. Component Inventory

### Keep (with small refactors)
- **CompassBloom.tsx** — rename to `CompassNavigator.tsx`, swap `useAuth().lane` for `useActiveProject()`, add project chip + switcher button
- **LANES array & sub-routes** — structure is solid, still needed for lane switching
- **Animation keyframes** — all reused (bloomFadeIn, bloomPetalIn, etc.)
- **Keyboard nav + ARIA** — already compliant, extend with project switcher semantics

### Refactor
- **Center hub** — currently XP display; becomes project display + progress ring
- **Petal interaction** — already toggles lane; layer in project-switch affordance (chip tap)

### New Components
- **ProjectPickerModal.tsx** — searches `/api/v1/saved-projects`, renders list, handles new-project CTA
- **ProjectProgressRing.tsx** — derives `StageProgress` from `getJourneyState()`, renders visual feedback (optional; may fold into center hub)
- **useProjectSwitch() hook** — wraps localStorage + API fetch + event emission

### Delete
- **CompassFab.tsx** (if it exists separately) — merge into the renamed `CompassNavigator`

### Coordinate (Don't Modify Yet)
- **CompassNav.tsx** — stays as-is for now; W9 IntegratedNavigator may subsume or coexist
- **ProjectCompass.tsx** — (W4.4 component) already renders journey + budget; Navigator should NOT duplicate that visualization

---

## 5. State Model

### NavigatorState (New)
```typescript
interface NavigatorState {
  activeProjectId: string; // localStorage: bkg:active-project-id
  currentStageId?: number; // from usePathname → detectActiveLane → mapToStage
  stageProgress?: Record<number, StageProgress>; // rolled up journey state
  projects?: SavedProject[]; // cached from /api/v1/saved-projects
  isProjectModalOpen: boolean;
  isExpanded: boolean; // bloom open/closed
}
```

### Interactions with IntegratedNavigator State
- **No shared state** initially — Navigator persists `activeProjectId`, IntegratedNavigator reads it via `useActiveProject()`
- **Future:** if IntegratedNavigator also needs project context, both subscribe to `bkg:active-project:changed` CustomEvent
- **Fallback:** if IntegratedNavigator doesn't exist (e.g., user on older page), Navigator alone manages project state

### Project-Switcher Persistence
```typescript
// In useProjectSwitch():
function switchProject(projectId: string) {
  localStorage.setItem('bkg:active-project-id', projectId);
  window.dispatchEvent(
    new CustomEvent('bkg:active-project:changed', { 
      detail: { projectId } 
    })
  );
  // Optionally: navigate to /killerapp with new project context
}
```

### Anonymous-User Fallback
- If `localStorage` unavailable → all reads default to `"default"` string
- No error thrown; app degrades gracefully
- Once user signs in, real project list syncs from `/api/v1/saved-projects`

---

## 6. Three-Phase Rollout

### Phase 1: Project Switcher Only (Minimum Ship)
**Target:** Single PR, 1 engineer-day  
**Scope:**
- Add project chip to CompassBloom center hub
- Add "Switch Project" button → ProjectPickerModal (fetch `/api/v1/saved-projects`)
- Wire `useProjectSwitch()` to emit `bkg:active-project:changed`
- Integrate `useActiveProject()` into CompassBloom (swap `useAuth` lane state)
- **No stage progress visualization yet** — keep simple
- **Keep bloom location** — bottom-right FAB (Option B)

**Done Criteria:**
- `npx tsc --noEmit` exit 0
- `npm test` passing
- User can tap project chip → see saved projects → switch to one → page respects new context (no reload required)
- Anon fallback works (no console errors)

---

### Phase 2: Add Stage Progress + Lane Navigation (Medium)
**Target:** 1.5 engineer-days  
**Scope:**
- Wire `getJourneyState(activeProjectId)` into CompassBloom
- Render visual progress ring on center hub (or as a nested chip strip)
- Add "Projects" as a first-class lane (or chip at top of petal list) with recent projects
- Animate progress updates on `bkg:journey:changed` CustomEvent
- Test multi-project switching doesn't leak state

**Done Criteria:**
- Stage progress ring/label updates live as workflows complete
- "Projects" lane/section is discoverable
- Clicking a project in the Projects section switches context + updates journey view
- No cross-project state leaks

---

### Phase 3: Full Rail Variant OR Top-Bar Variant (Polish)
**Target:** 2+ engineer-days (design-gated)  
**Scope:**
- If Option A (left rail): split CompassNavigator into persistent sidebar + collapsible mobile FAB
- If Option C (top-bar): move project/stage display to a top-bar dropdown + adjust killerapp layout
- If Option D (split): both
- **DO NOT START** until founder locks chrome placement decision

**Done Criteria:**
- Live deploy on chosen layout
- IntegratedNavigator (W9) can coexist without chrome collision
- User journey audit: "I can switch projects and see my stage progress from anywhere"

---

## 7. Five Open Questions for Founder

### Q1: Chrome Placement (Critical Gate)
**Which surface should the Navigator occupy?**
- **(a)** Persistent left rail (collapsible), **Projects** top section
- **(b)** Evolved bottom-right FAB (RECOMMENDED), project chip in hub, modal switcher
- **(c)** Top-bar dropdown next to logo
- **(d)** Split per-platform (rail on desktop, FAB on mobile)

*Implication:* Phase 3 scope depends on this. Recommend (b) to avoid layout disruption.

---

### Q2: Project Chip Behavior
**When user taps the project chip in the bloom center:**
- Show a modal with full project list + search? (Current recommendation)
- Show a popover menu (inline, don't close bloom)?
- Do nothing (chip is display-only, separate "Switch" button opens modal)?

*Implication:* Affects interaction density + interaction count.

---

### Q3: Projects as a Lane vs. Section
**Should "Projects" be:**
- A full lane in the bloom (8th petal)? (Clutters the bloom, pushes other petals further out)
- A chip strip at the top of the expanded bloom (before petals)?
- A section in the modal (only visible when switcher opens)?
- A separate `ProjectsLane` destination at `/killerapp/projects`?

*Implication:* Affects navigation mental model + bloom geometry.

---

### Q4: Stage Progress Visibility
**How should the Navigator show "we're 3 of 7 stages done"?**
- Ring on the center hub (like the XP ring, but for stages)?
- Numeric label (e.g., "Stage 3/7")?
- Color ring + label combo?
- Omit from Navigator; only show in ProjectCompass?

*Implication:* Visual hierarchy + component complexity.

---

### Q5: Fetch Timing for Projects List
**When should `/api/v1/saved-projects` be called?**
- Eagerly on mount (show projects immediately)?
- Lazily on first modal open (faster initial paint)?
- Cached via SWR/React Query with revalidation on focus?

*Implication:* Performance trade-off; affects UX feel.

---

## 8. Critical Files for Implementation

The following files are the architectural boundary. Any Navigator redesign touches these:

1. **src/components/CompassBloom.tsx** (620 lines) — The FAB + bloom + petals. Rename to `CompassNavigator`, integrate `useActiveProject()`, add project chip + switcher button.

2. **src/lib/journey-progress.ts** (271 lines) — Already has `resolveProjectId()`, `getJourneyState()`, `rollupByStage()`. Navigator subscribes to `bkg:journey:changed` here.

3. **src/lib/hooks/use-active-project.ts** (if exists) — Provides `activeProjectId` + `switchProject()`. If not yet created, create it alongside Phase 1.

4. **src/components/ProjectPickerModal.tsx** (NEW) — Modal that fetches `/api/v1/saved-projects`, renders list, handles new-project CTA.

5. **src/app/killerapp/layout.tsx** — Mount point for Navigator (and GlobalJourneyMapHeader). Ensure `bkg:active-project:changed` propagates here.

**Optional (Phase 2+):**
- `src/components/ProjectProgressRing.tsx` — Visual feedback for stage progress
- `src/components/CompassNav.tsx` — Coordinate with W9 IntegratedNavigator to avoid collision

---

## 9. Brand & Accessibility Notes

- **Color tokens:** Use only brand tokens (brass, robin, teal, warm-orange, green `#1D9E75`). No new colors.
- **Reduced motion:** All animations in CompassNavigator must respect `prefers-reduced-motion: reduce` (already in place).
- **Keyboard nav:** Tab into project chip, Enter/Space to open modal, Escape to close modal, Arrow keys to navigate project list.
- **ARIA:** Update center hub label to reflect `"Project: [name], Stage 3 of 7 complete"` or similar.
- **AI FAB:** Must remain unaffected at `bottom: 96px, right: 24px`. Navigator sits at `bottom: 24px, right: 24px` (or leaves that space free if redesigned).

---

## 10. Open Design Debt

- **CompassFab.tsx** existence (not found in codebase; may be abandoned alias)
- **IntegratedNavigator W9 spec** not yet published; assume will need coordination once it exists
- **Per-phase client_payments on budget API** — currently heuristic (25/75); switch to real data once available
- **Visited-stages tracker** — already in `src/lib/visited-stages.ts` but not wired to Navigator yet; Phase 2 candidate

---

## Recommendation Summary

**Recommended Approach:**
- **Chrome:** Option B (Evolved bottom-right FAB, keep bloom location)
- **Phase 1 gates:** Project switcher modal + active-project persistence + `useActiveProject()` integration
- **Ship timeline:** Single PR in a day; hold Phase 2/3 until founder locks Q1–Q5 decisions
- **Coordination:** Publish this spec to W9 IntegratedNavigator team so both know not to fight for bottom-right real estate

**Rationale:** Minimal chrome footprint, preserves user expectation that compass lives bottom-right, unblocks project switching without layout disruption, leaves room for IntegratedNavigator elsewhere.

---

