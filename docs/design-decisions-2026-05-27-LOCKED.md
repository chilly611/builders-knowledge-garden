# BKG Design System — Implementation Decisions (LOCKED)

*Updated 2026-05-27 with Chilly's answers. Source of truth for the Wednesday-night Claude Code session and the Cowork rollout session. All previously-open questions resolved.*

## Palette canonicality

**Herbarium wins.** Codebase tokens become aliases. Per README §3 the design system author already mapped this; we're executing their plan.

## Token aliases (codebase → herbarium)

| Codebase | Herbarium | Note |
|---|---|---|
| `--navy` | `--specimen-teal-deep` | Deep primary brand |
| `--brass` | `--specimen-brass` | Literal match |
| `--robin` | `--specimen-teal` | Bright teal accent |
| `--orange` | `--specimen-amber` | Shift toward gold accepted |
| `--redline` | `--specimen-rust` | Alert / critical |
| `--trace` | `--paper-edge` | Hairline borders |
| `--graphite` | `--ink-graphite` | Literal match |

## Killer App palette — MERGE

The bright instrument tokens are retired, not preserved as overlay. Concrete mapping:

| Old (`--instrument-*`) | New (herbarium) |
|---|---|
| `#FDF8F0` (bg) | `var(--paper-cream)` |
| `#FAFAF8` (card) | `var(--paper-vellum)` |
| `#E8443A` (chrome red) | `var(--specimen-rust)` |
| `#B83A30` (spend red) | `var(--specimen-rust-deep)` |
| `#1D9E75` (income actual) | `var(--specimen-sage)` |
| `#5BAE7F` (income projected) | `var(--specimen-sage-pale)` |
| `#1A1A1A` (text ink) | `var(--ink-graphite)` |
| `#6B6358` (text warm gray) | `var(--ink-faded)` |

Applies to `BudgetRibbon`, `JourneyTimeRow`, `StageNode`, `TimelineMarkers`, `HeadroomGauge`, `IncomeStackedTracks`, `SpendBlock`. The `--instrument-*` token block does **not** appear in `tokens.css`.

**Timing decision needed:** merge runs Wednesday night (contractor sees final product) OR Thursday post-demo (less risk to demo). Default if Chilly doesn't override: Wednesday night, sequential with the Code session.

## Demo cleanup scope

**Option (b).** Keep functional surfaces, kill duplicates of the chrome.

**KEEP** on `/projects/[id]`: Back to CRM, Export Report / Edit / Delete, RFI / Submittals / Change Orders / Punch List / Budget tabs, and Codes / Schedule / Materials / Team / Permits / Estimate sub-routes (if they're real pages).

**CUT** on `/projects/[id]`: four legacy cards (Budget $NaNK / Timeline / Risk / Confidence), Project Health sidebar, Milestone Timeline section, duplicate project name header, "operating system for your build" tagline, "drop file here" hero block (if present), legacy Overview tab content entirely.

Result: page fits 1280×800, chrome doesn't scroll.

## Execution order

**Wednesday night — Claude Code (30 min) → Cowork (60 min) sequential, if pulling merge forward:**

- Code: fix `$NaNK`, execute CUT list, verify no scroll, screenshots, commit + push
- Then Cowork: install `SKILL.md` globally + repo-local, drop `tokens.css` (no `--instrument-*` block), edit `globals.css` to alias the seven codebase tokens, archive `brand-tokens.ts` + pre-herbarium palette to `_archive/2026-05-28-design-system/`, re-skin Killer App chrome per the merge table above, wire EB Garamond + Pinyon Script + JetBrains Mono via `next/font/google`, update `docs/design-constitution.md`, index UI kit components into `docs/ui-kit.md`, verify Vercel preview

**Alternative — Thursday post-demo:** Code session same Wednesday night, Cowork session deferred to Thursday post-demo. Contractor sees bright instrument chrome on Thursday, herbarium-merged chrome from Friday onward.

**Next sprint:**
- Orchids repo token migration (read/write access confirmed)
- Dream Machine + Knowledge Garden surface chromes (described in design system, not built)
- Hardcoded-hex audit across components
- Font licensing — license EB Garamond, Pinyon Script (or Italianno), JetBrains Mono for offline / PDF / PPTX export. Until licensed: Google Fonts CDN only, no offline exports
- Custom icon font to retire lucide fallback (deferred, accept lucide stop-gap)

## SKILL.md placement

**Both.** `/Users/chilly/Developer/bkg/.claude/skills/knowledge-gardens-design/` for repo-local auto-load + `~/.claude/skills/knowledge-gardens-design/` for cross-repo (BKG, Orchids, XRWorkers).

## Resolved questions (no further input needed)

- ~~Font licensing~~ → follow-up task tracked, CDN tonight
- ~~Orchids access~~ → read/write confirmed
- ~~Custom icon font~~ → defer
- ~~Killer App palette~~ → merge
- ~~Orange→amber shift~~ → accepted

## Single remaining call for Chilly

**Merge timing: Wednesday night (pull forward) or Thursday post-demo (deferred)?** Default if unset: pull forward.
