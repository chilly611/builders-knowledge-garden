# Meeting Transcript Protocol

This folder is the canonical home for every recorded meeting, walkthrough, voice memo, or external conversation that informs Builder's Knowledge Garden strategy or product direction. The structured digests here — not the raw transcripts — are what future sessions read.

---

## Why this exists

Raw transcripts are gold but only if processed. Three failure modes the protocol prevents:

1. **The transcript-graveyard problem.** A 4,000-word transcript saved to a folder is functionally invisible. Nobody re-reads it. The signal inside is lost.
2. **Founder-voice drift.** How you articulated the platform in March is not how you'll articulate it in August. Without capture, the original language is gone — and the manifesto, pitch deck, and About page get written by someone else's voice (often a copywriter's).
3. **Decision drift.** Meetings produce decisions (or near-decisions) that never make it into the founder-locked list. Six months later, an agent or contractor revisits the same question because the prior decision was never captured.

Every digest produced under this protocol fixes all three.

---

## File layout

```
docs/
└── meetings/
    ├── README.md                          # this file (the protocol)
    ├── themes.md                          # cross-meeting synthesis (written when patterns emerge)
    ├── raw/
    │   └── YYYY-MM-DD-slug.md             # unedited transcript, permanent
    └── YYYY-MM-DD-slug.md                 # structured digest
```

**Slug convention:** lowercase, hyphenated, descriptive. Examples:
- `2026-03-26-bkg-walkthrough-john.md`
- `2026-05-17-contractor-partner-pricing.md`
- `2026-06-02-killer-app-scout-revision.md`

The slug must be unique. If two meetings happen on the same day, suffix with a number: `2026-04-12-john-1.md`, `2026-04-12-john-2.md`.

---

## The digest template

Every digest uses this exact structure. The frontmatter is machine-legible (Goal 8 of the Design Constitution applies); the body is human-legible.

```markdown
---
meeting_id: YYYY-MM-DD-slug
date: YYYY-MM-DD
attendees: [Chilly, ...]
type: walkthrough | dialogue | voice-memo | external-pitch | review
duration_min: ~XX
status: digested
touches:
  - <product/surface/decision>
  - ...
related_locks: []          # founder-locked decisions reinforced or challenged
calibration_partner: false # true if a calibration partner (John, contractor partner) actively reacted
---

# {Slug Title}

## TL;DR

Three bullets. The single most important thing first. No throat-clearing.

## New framings / articulations

Language worth keeping. Crystallizations of the platform that didn't exist in this form before. Each item gets a one-line description plus a decision call: adopt, reject, or hold.

## Decisions (made or proposed)

What got resolved. What's on the table. Each one tagged:
- **LOCKED** — founder explicitly locked it in this meeting
- **PROPOSED** — surfaced but not yet decided; goes to `tasks.todo.md`
- **REINFORCED** — restates an existing founder-locked decision (link to the lock)

## Open questions

Questions surfaced but unanswered. Each goes to `tasks.todo.md` as a calibration item.

## Action items

Concrete next steps. Owner assigned where possible. Each goes to `tasks.todo.md`.

## Notable quotes

Founder voice. Direct language worth preserving for manifesto, pitch deck, About page, brand voice training. This is the section that pays off in twelve months.

## Connections to existing canon

- **Reinforces:** <which founder-locked decisions, constitution goals, architecture choices>
- **Renames:** <existing concept this meeting gave a new label to>
- **Conflicts with:** <anything that disagrees with the canon; must be resolved>
- **New territory:** <anything not previously in the canon>

## Calibration partner reactions

Only if `calibration_partner: true` in frontmatter. Captures what John, the contractor partner, or another trusted reviewer specifically pushed back on, validated, or flagged.

## Stats snapshot

If the transcript contains platform metrics (entity count, route count, jurisdictions, etc.), capture them here as a time-stamped baseline. Do not "correct" stale numbers — they are the historical truth of that moment.
```

---

## Workflow per transcript

When a new transcript arrives:

1. **Save raw** to `docs/meetings/raw/YYYY-MM-DD-slug.md`. Do not edit.
2. **Write digest** to `docs/meetings/YYYY-MM-DD-slug.md` using the template above. Read the full transcript before writing. Do not summarize while reading — process the whole thing, then extract.
3. **Cross-check against canon.** Before finalizing the connections section, scan: founder-locked decisions (the eighteen), the Design Constitution v1.0, current `tasks.todo.md`. Surface anything that conflicts or duplicates.
4. **Produce APPEND fragments** for any of:
   - `tasks.todo.md` — new action items, open questions, calibration asks
   - `tasks.lessons.md` — if a pattern, principle, or anti-pattern emerged (rare; most meetings don't produce lessons)
   - `docs/session-log.md` — entry for the Chat session that processed the transcript, with a link to the digest
5. **Push to repo** via the standard GitHub Contents API workflow (`base64 -w 0` for encoding, fetch SHA before PUT on existing files).

---

## Cross-meeting synthesis

`docs/meetings/themes.md` exists for patterns that only become visible across multiple transcripts. Examples:

- John raises the same concern in three separate meetings → it's a real signal, not a passing comment
- The contractor partner flags pricing language repeatedly → there's a positioning problem
- Founder voice settles on a phrase across multiple articulations → it's brand-ready

`themes.md` gets written when the pattern crosses the threshold, not on a calendar. It points to the specific digests where each instance shows up.

---

## What this protocol is NOT

- It is not a meeting-notes app. It is not a calendar. It is not a CRM for collaborators.
- It does not replace `tasks.todo.md`. Action items flow from digests into `tasks.todo.md` and live there.
- It does not replace founder-locked decisions. A meeting can *propose* a lock, but the lock itself goes to the founder-locks document.
- It does not edit raw transcripts. Raw is permanent. Digests are revisable; raws are not.

---

## When to skip this protocol

If a "meeting" is actually a five-minute back-and-forth that produced no decisions, no quotes, no new framings, and no action items — skip the digest. Note it in the session log if at all. The protocol is for substantive conversations, not every interaction.

---

## Session of record

This protocol was designed in the Chat session on May 23, 2026, in response to the first meeting transcript being added to the project corpus. The protocol is revisable but should not be amended in passing — a session must be explicitly scoped as a protocol revision to change it.
