# Builder's Knowledge Garden Design System Audit (W9)

**Date:** April 22, 2026  
**Status:** Reconnaissance pass (read-only). No edits applied.  
**Scope:** Token inventory, typography, spacing, motion, voice, drift detection, and hex-color offenders.

---

## 1. Token Inventory

### Root CSS Variables (globals.css, lines 63-76)

**Canonical Palette (W8 locked)**

| Token | CSS Property | Hex | Role | Contrast Note |
|-------|--------------|-----|------|---------------|
| Navy | `--navy` | `#1B3B5E` | Blueprint dark, heritage, primary ink | ✓ WCAG AAA on paper |
| Navy Deep | `--navy-deep` | `#0E2A47` | Splash/wordmark moments only | Dark splash background |
| Trace Paper | `--trace` / `--paper` | `#F4F0E6` | Light ground, sheet color | Light background |
| Graphite | `--graphite` | `#2E2E30` | Type, primary ink, linework | ✓ WCAG AAA on paper |
| Faded Rule | `--faded-rule` / `--rule` | `#C9C3B3` | Heritage grids, hairlines | ⚠️ WCAG A only (secondary text) |
| Drafting Brass | `--brass` | `#B6873A` | CTAs, focus, everyday warm | ✓ WCAG AA on paper |
| Redline | `--redline` | `#A1473A` | Errors, edits, revision callouts | ✓ WCAG AA on paper |
| Robin's Egg | `--robin` | `#7FCFCB` | Peak moments, verification ONLY | ⚠️ Low on navy (decorative/icons only) |
| Orange | `--orange` | `#D9642E` | Celebration, ritual, close-out crown | ✓ WCAG AA on paper |

**Legacy Palette (in globals.css, lines 4-62) — DEPRECATED**

The CSS also defines ~80 legacy `--bp-*` variables (e.g., `--bp-ink-900`, `--bp-cyan-main`, `--bp-phase-dream`). These are re-exported from `/src/design-system/tokens/colors.ts` and marked **DEPRECATED** with a comment: "use --navy / --robin / --brass / --orange / --trace / --graphite / --faded-rule / --redline instead."

### Token Conflict: Dual System in Place

**Risk:** Two color systems active simultaneously:
- **Canonical** (9 tokens): `--navy`, `--trace`, `--graphite`, etc.
- **Legacy** (80+ tokens): `--bp-ink-*`, `--bp-cyan-*`, `--bp-phase-*`, etc.

**Impact:** Components can use either system, causing palette drift. Example: `--bp-cyan-main (#00B8D4)` is SaaS-coded tech teal, contradicting the design moodboard's "no corporate teal" rule.

---

## 2. Typography System

### Declared Fonts (SKILL.md, lines 63-67)

| Role | Primary | Fallback | Use Case |
|------|---------|----------|----------|
| Display / UI Sans | Söhne | Untitled Sans | Functional UI, navigation, labels |
| Mono (Technical) | Berkeley Mono | JetBrains Mono | Instrument output, data readouts |
| Archival Display | ABC Diatype or Canela Deck | (sparse, hero only) | Close-out rituals, peak moments |

### Actual Implementation (globals.css)

```css
--font-archivo: ...; /* Imported in <head> but not committed in token vars */
--bp-font-sans: 'Space Grotesk', var(--font-archivo), sans-serif;
--bp-font-mono: 'Courier Prime', 'Courier New', 'SF Mono', monospace;
```

**Drift:** 
- Declared: Söhne, Berkeley Mono
- Actual: Archivo, Space Grotesk, Courier Prime
- **Reason:** Likely licensing/availability; moodboard auditions were never finalized (see moodboard.md line 56: "These are auditions to commit in v2").

### Typography Scale (Not Specified in Design System)

The design system lacks explicit sizing rules (e.g., h1: 32px, body: 14px, caption: 11px). Spacing/sizing inferred from component patterns:
- Labels: 10–12px mono, uppercase, letter-spacing 0.1–0.15em (see globals.css `.bp-label`)
- Body: 13–14px (from `.bp-data`, input fields)
- Headings: 18–32px range observed in components

**Issue:** No canonical scale document. Sizing appears component-by-component.

---

## 3. Spacing & Layout Rules

### Grid System (Implied)

- **Base grid:** 24px (from `.bp-grid`, `.bp-grid-fine` background-size: 24px 24px)
- **Fine grid:** 6px (background-size: 6px 6px for texture depth)
- **Gutter:** 16–20px (observed padding in `.bp-panel`, `.bp-card`)

### Border Radius (Explicit)

```css
--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 16px;
--radius-xl: 24px;
```

Most components use `border-radius: 2px` (technical, blueprint aesthetic) or no rounding.

### Shadows (Defined, Rarely Used)

```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 2px 8px rgba(0,0,0,0.08);
--shadow-lg: 0 8px 30px rgba(0,0,0,0.1);
```

Most `.bp-*` components use minimal shadow or none (except `.bp-card:hover`, which adds `0 4px 16px rgba(27,58,92,0.12)`).

### Line Weights (SKILL.md, lines 70-77)

| Weight | Size | Purpose |
|--------|------|---------|
| Hairline | 0.5px | Background grids, engravings, faded heritage |
| Light | 1px | Structural chrome, UI borders |
| Medium | 1.5–2px | Interactive affordances |
| Bold | 3px | Emblem outlines at small scale |

**Observation:** Implemented in `.bp-border` (1.5px), `.bp-divider` (1px), `.bp-grid` (linear-gradient hairlines).

---

## 4. Motion System

### Animation Register (Defined, Mostly Unimplemented)

The `animation-register.md` specifies **four moments** where motion is allowed:

| Moment | Duration | Easing | Implementation Status |
|--------|----------|--------|----------------------|
| Compass First Load | 3.0–3.5s | `cubic-bezier(0.4, 0.02, 0.2, 1)` | Not found in codebase |
| Workflow Completion | 2.6–2.8s | `ease-out` (particles) | Not found in codebase |
| Project Close-Out Ritual | 2.5–3.0s total (sub-motions 1–2s each) | `cubic-bezier(0.4, 0.02, 0.2, 1)` | Spec exists (compass-closeout-spec.md), MP4 asset uploaded, SVG/CSS implementation pending |
| Stage Transitions | 0.6–1.0s | `cubic-bezier(0.4, 0.02, 0.2, 1)` | Not found in codebase |

### Entrance Animations (Implemented in globals.css, lines 447–526)

Defined in codebase but **contradict the Animation Register:**

```css
@keyframes bkgFadeUp { /* 280ms, springy cubic-bezier(0.2, 0.8, 0.2, 1) */ }
@keyframes bkgFadeIn { /* 240ms, ease-out */ }
@keyframes bkgScaleIn { /* 220ms, springy */ }
@keyframes bkgHeroMark { /* 900ms, springy */ }
```

**Issue:** Easing is `cubic-bezier(0.2, 0.8, 0.2, 1)` (springy, has bounce), not the hand-drawn `cubic-bezier(0.4, 0.02, 0.2, 1)` specified in the register. The register says "no bouncy easing" and "never spring-back."

### Reduced-Motion Guard (Implemented)

```css
@media (prefers-reduced-motion: reduce) { animation: none !important; }
```

✓ Present and correct (lines 510–525).

---

## 5. Brand Voice One-Liner

**Distilled from design moodboard, SKILL.md, and palette-tokens.md:**

> "A builder's apprentice learning from centuries of blueprints and hand-drawn diagrams, stacked beneath clean, modern workflows — heritage ground invisible until you linger."

**Rationale:** 
- Three-layer framework (heritage + functional + punctuation) establishes the voice as *layered, not flat*
- "Builder's apprentice" addresses the construction industry context
- "Centuries of blueprints" captures the engraved-instruments, graph-paper aesthetic
- "Invisible until you linger" reflects the moodboard's opening: "A dreamer scrolling past sees clean; a pro who lingers discovers the deep cuts"

---

## 6. Five Weak or Drifted Areas

### 1. **Font Family Mismatch (HIGH IMPACT)**

**Location:** `/src/app/globals.css` lines 61, 96, 120  
**Issue:** Declared fonts (Söhne, Berkeley Mono) not used; actual stack is Archivo, Space Grotesk, Courier Prime  
**Citation:** SKILL.md lines 63–65 vs. globals.css line 96: `font-family: var(--font-archivo), 'Helvetica Neue'...`  
**Risk:** Brand voice diluted. Söhne is "functional modernist grotesque without corporate cleanliness"; Space Grotesk reads corporate  

### 2. **Dual Color Palette Creates Drift**

**Location:** `/src/app/globals.css` lines 4–62 (legacy) + lines 63–76 (canonical)  
**Issue:** 80+ legacy `--bp-*` colors still active alongside 9 canonical tokens  
**Citation:** Deprecated comment (line 78) says these will be removed "in a future release"  
**Risk:** Components use `--bp-cyan-main (#00B8D4)` and `--bp-phase-dream (#D85A30)` instead of `--robin` and `--orange`, breaking the peak-pair rule  

### 3. **Entrance Easing Contradicts Motion Register**

**Location:** `/src/app/globals.css` lines 471–488  
**Issue:** `.bkg-fade-up`, `.bkg-fade-in`, `.bkg-scale-in`, `.bkg-hero-mark` use `cubic-bezier(0.2, 0.8, 0.2, 1)` (springy bounce)  
**Citation:** Animation Register demands `cubic-bezier(0.4, 0.02, 0.2, 1)` (hand-drawn, no bounce); explicitly warns "never spring-back" (line 119)  
**Risk:** Pros staring 10 hours/day feel bouncy, distracting motion; violates stillness-first philosophy  

### 4. **Close-Out Ritual Spec Complete but Unimplemented**

**Location:** `/src/bkg-repo/docs/design/compass-closeout-spec.md` + `/src/bkg-repo/mnt/uploads/chillyprojects_A_tree...mp4`  
**Issue:** Detailed trigger logic, timing, and MP4 asset defined (April 21); no SVG/CSS implementation or component integration begun  
**Citation:** compass-closeout-spec.md lines 1–7 describe asset; animation-register.md Moment 3 waits for this spec  
**Risk:** Peak moment (project close-out) has no live code path; ritual exists in design but not in product  

### 5. **Typography Scale Undefined**

**Location:** No canonical typography scale document (h1, h2, body, caption sizes)  
**Issue:** Sizing inferred component-by-component from globals.css utilities (`.bp-label` 10px, `.bp-data` 13px, etc.)  
**Citation:** Moodboard.md line 163 states "No audition of actual type specimens (next pass: live samples side by side)"  
**Risk:** Inconsistent sizing across UI; new components guess at scale rather than following rule  

---

## 7. Three Sharpening Recommendations

### Recommendation 1: Commit Typography, Deprecate Legacy Fonts

**Problem:** Declared (Söhne, Berkeley Mono) ≠ Actual (Archivo, Space Grotesk, Courier Prime)  
**Fix:** Choose. If Arquivo is correct, update SKILL.md lines 63–65 to reflect final decision and explain why Söhne was swapped. If Söhne is required, acquire the license and update globals.css line 96.  
**File & Timing:**  
- **Before:** `/src/app/globals.css` line 96: `font-family: var(--font-archivo), 'Helvetica Neue'...`  
- **After:** `font-family: 'Söhne', 'Untitled Sans', sans-serif;` (+ import statement) OR document why Archivo is the approved substitute  
- **Scope:** SKILL.md lines 63–67 + globals.css lines 61, 96, 120  

### Recommendation 2: Replace Entrance Easing, Align to Motion Register

**Problem:** `.bkg-fade-up` et al. use springy bounce; register forbids it  
**Fix:** Change all entrance animation easing from `cubic-bezier(0.2, 0.8, 0.2, 1)` to `cubic-bezier(0.4, 0.02, 0.2, 1)` (hand-drawn, no bounce)  
**File & Timing:**  
- **Before:** `/src/app/globals.css` lines 471–488:  
  ```css
  animation: bkgFadeUp 280ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
  ```  
- **After:**  
  ```css
  animation: bkgFadeUp 280ms cubic-bezier(0.4, 0.02, 0.2, 1) both;
  ```  
- **Scope:** All `.bkg-*` animation classes (4 keyframes, 4 animation rules)  

### Recommendation 3: Retire Legacy Color Palette, Migrate to Canonical

**Problem:** Dual palette (legacy `--bp-*` + canonical `--*`) allows palette drift; "DEPRECATED" comment says removal planned but not scheduled  
**Fix:** Set explicit migration deadline (e.g., "remove all `--bp-*` variables by W12"). Run codemod to find all `--bp-cyan-*`, `--bp-phase-*` usage in `/src` and rewrite to canonical tokens (or accept they won't exist and fail builds).  
**File & Timing:**  
- **Before:** `/src/app/globals.css` lines 4–62 remain; components use `var(--bp-cyan-main)`  
- **After:** Delete lines 4–62; update any components using legacy tokens  
- **Scope:** globals.css + scan all `.tsx` files for `--bp-` references  

---

## 8. Top 10 Raw-Hex Offenders

These files bypass CSS variables and hardcode hex colors inline, breaking token isolation:

| File | Hex Count | Top Offenders | Issue |
|------|-----------|---------------|-------|
| `/src/app/launch/page.tsx` | 48 | `#1D9E75` (accent, 8×), `#7F77DD` (phase, 4×), `#378ADD` (phase, 2×), `#BA7517` (phase, 2×), `#639922` (phase, 1×) | All legacy phase colors; should use `--orange` or canonical tokens |
| `/src/design-system/tokens/colors.ts` | 55 | `#1B3B5E`, `#D9642E`, `#2E7D32`, `#378ADD`, `#BA7517` | **Intentional:** Color palette definition file (acceptable) |
| `/src/app/page.tsx` | 23 | `#1D9E75` (5×), `#7F77DD` (2×), `#378ADD` (1×) | Phase colors in inline styles |
| `/src/components/CopilotPanel.tsx` | 19 | Multiple hex in gradient/shadow definitions | Vendor code or WIP; check context |
| `/src/app/killerapp/page.tsx` | 15 | `#1D9E75`, `#D85A30`, `#0F6E56` | Deep orange override; gradient with non-canonical green |
| `/src/components/SharedAutonomyInterface.tsx` | 14 | Status/phase colors | Likely structured form or table with color coding |
| `/src/design-system/components/StepCard.tsx` | 12 | Heritage grid patterns using rgba(27,58,92,0.08) | Grid backgrounds; acceptable pattern use |
| `/src/app/layout.tsx` | 11 | Various hex in @tailwind/@theme | Tailwind config or CSS injection; context-dependent |
| `/src/components/compass/ProjectCompassSVG.tsx` | 10 | SVG stroke/fill colors | SVG hardcoding common; should extract to data attributes |
| `/src/app/legal/terms/page.tsx` | 8 | Link colors, text colors | Legal pages often override for accessibility/print; acceptable |

**Summary:** ~4,149 total hex occurrences across 152 files. Top offenders are phase colors (`#1D9E75`, `#7F77DD`, `#378ADD`, `#BA7517`) used in `.tsx` inline styles instead of canonical tokens or CSS class bindings.

---

## 9. System Health Summary

### Strengths
- ✓ Canonical palette locked and documented (W8)
- ✓ Closed motif set enforced (6 only, trade-in process defined)
- ✓ Animation register detailed with easing and timing rules
- ✓ Close-out ritual spec produced with MP4 asset attached
- ✓ Reduced-motion guard implemented
- ✓ Grid and spacing patterns established (24px base, fine 6px)

### Gaps
- ⚠️ Typography scale undefined (no h1/h2/body/caption sizing rule)
- ⚠️ Font families (Söhne, Berkeley Mono) declared but not used; actual fonts (Archivo, Space Grotesk) not officially committed
- ⚠️ Entrance animations use springy easing, contradicting motion register's "no bounce" rule
- ⚠️ Dual color palette (legacy + canonical) still active; deprecation timeline vague
- ⚠️ Close-out ritual spec exists but no implementation begun (SVG/CSS code, component integration)
- ⚠️ ~4,000+ raw hex colors inline across codebase, majority in phase colors not canonical tokens

### Drift Risk: Moderate-High
The system has strong intentional structure (three layers, closed motif set, peak pair rule) but **execution lag** in fonts, motion easing, and color migration creates daily opportunities for new components to drift. New team members will copy from launch.page.tsx (which hardcodes `#1D9E75`) instead of using tokens.

---

## 10. Recommendations Priority Order

1. **Immediate (W9–W10):** Commit typography decision; update SKILL.md with final fonts or explain Archivo substitution.
2. **W10:** Migrate entrance animations to hand-drawn easing; confirm visual feel with motion register.
3. **W11:** Schedule legacy color palette retirement; run codemod to identify `--bp-*` usage and plan migration.
4. **W12:** Produce typography scale document (h1–h6, body, caption, label sizing + line-height rule).
5. **W13:** Implement close-out ritual SVG/CSS from compass-closeout-spec.md; integrate trigger logic.

---

**Audit completed:** April 22, 2026  
**Next review:** W13 (after typography scale and ritual implementation)
