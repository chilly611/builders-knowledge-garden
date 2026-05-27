# bkg-design Skill Validation Report

## File Structure

```
bkg-design/
├── SKILL.md                           (167 lines)
├── references/
│   ├── moodboard.md                   (171 lines, copied from design-moodboard-v1.md)
│   ├── palette-tokens.md              (220 lines, new)
│   ├── motif-registry.md              (287 lines, new)
│   ├── animation-register.md          (344 lines, new)
│   └── close-out-ritual-spec.md       (51 lines, placeholder)
└── assets/
    └── preview.html                   (625 lines, copied from design-moodboard-preview.html)
```

**Total:** 7 files, ~1,865 lines (excluding backup HTML inline CSS/JS).

## Validation Checklist

### SKILL.md

- [x] YAML frontmatter is valid and parseable
- [x] `name` field present: `bkg-design`
- [x] `description` field present (702 chars)
- [x] Description is "pushy" with 25+ MANDATORY TRIGGERS explicitly listed:
  - palette, color, logo, logomark, tool-tree, icon, motif, workflow UI, component, page, close-out, ritual, blueprint, heritage, moodboard, design system, typography, font, animation, motion, FAB, Compass, workflow-shell, StepCard, journey map, budget widget, polish, visual, aesthetic, brand
- [x] SKILL.md body is 167 lines (well under 500-line limit)
- [x] Clear section structure:
  - Quick Reference color tokens table
  - Three Layers (Heritage, Functional, Moment)
  - Palette (with hex values and CSS custom properties)
  - Typography (three voices)
  - Linework Hierarchy
  - Closed Motif Set (six motifs)
  - Texture Rules
  - Animation Register (four moments)
  - Component Patterns
  - Before You Code Checklist
  - What to Resist
  - References & Assets
  - Why This Structure
- [x] Includes "Before you code" checklist for agents

### References

- [x] `moodboard.md` — Copy of design-moodboard-v1.md (full source of truth)
- [x] `palette-tokens.md` — Hex values, CSS custom properties, role map, usage guidelines
- [x] `motif-registry.md` — All six motifs with detailed usage rules and trade-in process
- [x] `animation-register.md` — Four moments with timing curves, durations, code patterns
- [x] `close-out-ritual-spec.md` — Placeholder pointing to compass-closeout-spec.md (to be produced by W5.E)

### Assets

- [x] `preview.html` — Copy of design-moodboard-preview.html (living preview, valid HTML)
- [ ] `mp4-frames/` — Not created (noted in original spec as "if W5.C produced frames")

## Frontmatter Decisions

**Description pushy score:** HIGH
- Begins with explicit "Use this skill WHENEVER"
- Contains 25 MANDATORY TRIGGERS in caps
- Ends with "load this skill first" directive
- Covers all UI work patterns: build, modify, style, review, palette, motif, animation, component, etc.

This description will reliably trigger whenever an agent encounters:
- Direct requests about UI, components, design
- Any mention of palette, color, typography, animation
- Any mention of the motifs (tool-tree, blueprint, orrery, tower crane)
- Any mention of the three layers or heritage/foreground/punctuation language
- References to specific UI elements (Compass, StepCard, workflow-shell, FAB, journey map, budget widget)

## Inclusions Debated

### Decided: YES — Include CSS Custom Property Reference
- **Rationale:** Agents will need to apply the palette programmatically. Providing token names up-front saves a reference lookup.
- **Included in:** SKILL.md quick reference table + palette-tokens.md detailed section.

### Decided: YES — Include Before You Code Checklist
- **Rationale:** Agents following the skill need a crisp action plan. The checklist ensures they read moodboard.md, use tokens by name, and follow the motif/animation constraints before coding.
- **Included in:** SKILL.md "Before You Code" section.

### Decided: NO — No evals/ Directory
- **Rationale:** This is a reference skill with subjective (aesthetic) outputs. Per skill-creator guidance: "let's vibe." Quantitative validation (pass/fail color or motif usage) is less useful than human review within the skill context.

### Decided: YES — Detailed Animation Register
- **Rationale:** Animation is expensive and highly specific. Four moments + CSS patterns + easing curves ensure consistency. Agents need this level of detail to ship correct motion.
- **Included in:** SKILL.md section + references/animation-register.md expanded detail.

### Decided: YES — Motif Registry with Trade-In Process
- **Rationale:** The "closed set of six" is a core commitment. Agents might be tempted to add a seventh motif. The trade-in process + registry prevents drift.
- **Included in:** SKILL.md brief + references/motif-registry.md with removal/addition procedures.

### Decided: YES — Peak Pair Rule Enforcement
- **Rationale:** Robin's egg + deep orange are reserved for moment punctuation. This is a subtle rule that's easy to violate. Repeating it in SKILL.md, palette-tokens.md, and animation-register.md ensures internalization.

## Notes for Installation

This skill is designed to live in the user's Claude config (`.claude/skills/bkg-design/`), not in the bkg-repo. Every future session (Cowork, Claude Code, any worktree) will auto-load it before touching any UI.

**Installation steps:**
1. Copy the entire `bkg-design/` directory to `~/.claude/skills/` (or equivalent path for your Claude setup)
2. No git commit required — this is user config, not part of the bkg-repo
3. On next Claude session, the skill will be available to all agents

## Readiness Assessment

- **Is the skill complete?** YES — all required sections and references in place.
- **Will it trigger reliably?** YES — description is pushy with 25+ explicit MANDATORY TRIGGERS.
- **Can agents use it immediately?** YES — SKILL.md is self-contained with essential guidance; deeper reference docs are available as needed.
- **Is the preview HTML displayable?** YES — valid HTML, includes inline CSS/JS, ready to open in any browser.
- **Are there any blockers?** NO — placeholder close-out-ritual-spec will be populated by W5.E session.

## Success Criteria Met

✓ All files exist at the specified paths
✓ SKILL.md validates (YAML frontmatter parseable, description is pushy, structure is clear, under 500 lines)
✓ preview.html is a valid copy and opens in browser
✓ References are well-organized and cross-linked
✓ Skill is loadable and useful for immediate use in UI design tasks
