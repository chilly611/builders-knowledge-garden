# Builder's Knowledge Garden Design System Skill

This directory contains the `bkg-design` skill — a comprehensive reference for the Builder's Knowledge Garden design system. Every future Claude agent (Cowork, Claude Code, any worktree) will auto-load this skill before touching UI.

## What's Inside

- **SKILL.md** — Skill manifest (167 lines) with compact reference material and "before you code" checklist
- **references/** — Deep dive docs for each design dimension
  - `moodboard.md` — Full design commitment (copied from design-moodboard-v1.md)
  - `palette-tokens.md` — All colors, CSS custom properties, usage rules
  - `motif-registry.md` — Six motifs + trade-in process for adding/removing
  - `animation-register.md` — Four moments, timing curves, easing, CSS patterns
  - `close-out-ritual-spec.md` — Placeholder (will be updated by W5.E)
- **assets/** — Living reference
  - `preview.html` — Open in browser to see the system applied to itself

## How to Use This Skill

### Installation

Copy the entire `bkg-design/` directory to your Claude config:
```bash
cp -r bkg-design/ ~/.claude/skills/
```

On your next Claude session, the skill will be available. Any request touching UI, components, colors, typography, motifs, or animations will trigger it automatically.

### As an Agent Using This Skill

**Before you touch code:**
1. Read `SKILL.md` (takes ~5 minutes)
2. Pick the right reference doc based on your task:
   - Starting fresh? Read `moodboard.md` for the big picture
   - Applying color? Use `palette-tokens.md`
   - Choosing icons/texture? Reference `motif-registry.md`
   - Adding motion? Follow `animation-register.md`
3. Use the "Before you code" checklist in SKILL.md to stay on track

**Common patterns:**
- "I need to build a component" → Use palette tokens by name (`--brass`, not `#B6873A`), pick a motif, check the preview.html for layout patterns
- "Should I animate this?" → Only if it matches one of the four moments in animation-register.md (Compass load, workflow complete, close-out ritual, stage transition)
- "I want to add [new visual element]" → Trade it in via motif-registry.md (remove one motif first)

## The Three Core Rules

1. **Three layers, never averaged.** Heritage ground (engraved, timeless) + Functional foreground (clean, modern) + Moment punctuation (revelation only at four specific times).
2. **Closed motif set of six.** No additions without trade-in.
3. **Peak pair reserved.** Robin's egg (#7FCFCB) and deep orange (#D9642E) appear only at moment punctuation, never next to brass.

## Preview the System

Open `assets/preview.html` in a browser to see the design system applied to itself — component examples, color swatches, typography pairing, animation register, and more.

## For the Next Session (W5.E)

When the close-out ritual MP4 review is complete:
1. Update `references/close-out-ritual-spec.md` with the final sequence spec (or copy from compass-closeout-spec.md)
2. Optionally add 3–5 animation frames to `assets/mp4-frames/` for reference

## Questions?

This skill encodes the entire design commitment from `moodboard.md`. Push back on any part of it by editing the source document — the skill will reflect changes on next session.

---

**Version:** 1.0 (2026-04-21)  
**Status:** Ready for production use  
**Dependency:** Waits for W5.E close-out ritual spec (non-blocking)
