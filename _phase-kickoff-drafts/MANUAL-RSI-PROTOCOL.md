# Manual RSI Protocol — The Session Ritual

*Version 1.0 · 2026-05-28 · Companion to PLATFORM-CONSTITUTION.md*

---

## What Manual RSI is

Recursive Self-Improvement (RSI) is the goal: a platform that automatically gets better as it operates. Knowledge entities auto-enrich, search ranking auto-calibrates, code lookup auto-corrects against inspector outcomes, the AI copilot auto-improves from feedback signals.

We don't have automated RSI yet. The signal collection is being instrumented; the improvement loops aren't running. **Until they are, the team runs the loop manually.**

Manual RSI means: every session ends with the team — humans and AI together — capturing what was learned, updating the shared knowledge, and improving the protocols. The next session starts from a better position than the last one ended.

Without this ritual, knowledge leaks. With it, knowledge compounds.

---

## The session ritual

Every session in every interface runs three phases: **Open · Work · Close**. The Open and Close phases are the ritual; the Work phase is whatever the session is actually for.

### Open phase (every session, every interface)

Before any new work begins, read these files in this order:

1. **`PLATFORM-CONSTITUTION.md`** — values and decision rules. Skim if recently read; full re-read if first session of the week.
2. **`INTERFACE-PROTOCOLS.md`** — to remember what this interface is and isn't for.
3. **`<garden>-PROJECT-INSTRUCTIONS.md`** — the specific garden being worked on.
4. **`<garden>-tasks.lessons.md`** — what was learned in prior sessions about this garden. This is the highest-ROI doc in the stack; reading it prevents repeated mistakes.
5. **`<garden>-session-log.md`** (last 3–5 entries) — what happened recently, what's in flight.
6. **`<garden>-tasks.todo.md`** — what's next in the queue.

For Claude Code specifically: `CLAUDE.md` at the repo root incorporates the above by reference. Claude Code reads it first, then drills into the other files.

For interfaces without file-system access (Chat): the human pastes the relevant files at the start of the session, OR they live in the Project Instructions, OR the session works from memory of recent reads.

**The Open phase ends when the Claude instance can name:**
- The garden it's working on and that garden's current state
- The session's specific objective
- At least one prior lesson that's relevant to today's work

If those three can't be named, the Open phase isn't complete.

### Work phase

This is the session itself. Whatever the work is.

Two disciplines during work:

1. **Capture decisions inline.** Anytime something gets decided — a name, a number, an approach, a constraint — note it as a `[DECISION]` in the conversation or directly into the relevant doc. Don't trust memory.

2. **Capture lessons immediately.** Anytime the human corrects the AI, OR anytime the AI realizes mid-stream that an earlier assumption was wrong, append to `tasks.lessons.md` right then. Not at session end — right then. Lessons captured later get watered down.

### Close phase (every session, every interface)

Before the session ends, three things happen:

1. **Append to `<garden>-session-log.md`** with today's date and these fields:
   - **Goal:** what the session was for
   - **Shipped:** what got done
   - **Learned:** new patterns, surprises, decisions
   - **Open:** what's still in flight, what's blocked
   - **Next:** the natural follow-up session and which interface should run it

2. **Update `<garden>-tasks.todo.md`** — check off completed items, add new ones discovered during the session, reorder the NOW section if priorities shifted.

3. **Update `<garden>-tasks.lessons.md`** if any net-new lesson emerged that wasn't captured inline during work.

For interfaces with repo access: commit + push these updates. For interfaces without: produce the updates as text the human pastes into the files.

**A session that doesn't run the Close phase didn't happen — the work just leaked.**

---

## Per-interface adaptations

### Chat
- Open phase: human pastes the most recent session log entries + relevant garden's project instructions at the start. OR the relevant docs live in the Project for that garden.
- Close phase: Chat generates the session log entry as a markdown block the human pastes into the file. Same for todo and lessons updates.

### Cowork
- Open phase: Cowork reads the files directly via the file system. Always.
- Close phase: Cowork writes the updates directly. No human paste step.

### Claude Code
- Open phase: governed by CLAUDE.md at repo root. If CLAUDE.md is current, the protocol runs automatically.
- Close phase: Code commits the updates as part of its normal commit flow. Session log update goes in the same commit as the work.

### Claude Design
- Open phase: Design reads the design constitution + brand guidelines + the specific spec target.
- Close phase: Design produces the spec document. If the spec replaces or amends an existing spec, the prior version goes in a `specs/archive/` folder, not deleted.

---

## Per-garden adaptation

Each garden has its own:
- `<garden>-PROJECT-INSTRUCTIONS.md`
- `<garden>-tasks.todo.md`
- `<garden>-tasks.lessons.md`
- `<garden>-session-log.md`

The protocol is identical across gardens. What changes is the specific files being read and written.

When working on the platform itself (not a specific garden — e.g. updating the constitution), substitute the garden name with `PLATFORM`:
- `PLATFORM-tasks.todo.md`
- `PLATFORM-session-log.md`
- (no separate PLATFORM lessons file — those go in the constitution amendments)

---

## What this ritual buys

1. **No repeated mistakes.** Lessons captured in one session prevent the same trap in the next.
2. **Cross-interface coherence.** Every interface reading the same files means Chat, Cowork, Code, and Design all start with the same picture.
3. **The compounding bet.** Each session leaves the next session in a better starting position. Over weeks and months, the gap between us and competitors widens.
4. **Quality at scale.** As the number of gardens grows, the ritual is what keeps quality from degrading. New gardens get the protocol on day one.
5. **The pre-revenue threshold.** When we hit 50 paying subscribers and the platform story changes, the disciplined documentation IS the platform story. Investors can see the compounding.

---

## What this ritual costs

About 5 to 10 minutes per session — open phase and close phase combined. Less once it's habit.

That's the deal. Every session pays a 5-to-10-minute tax to make the next session 10-to-30 minutes more productive. The math is overwhelmingly in our favor.

---

## When to break protocol

Almost never. The two legitimate reasons:

1. **Emergencies.** The walkthrough is broken 30 minutes before John's demo — fix first, document after. But still document after.
2. **Tiny tactical chats.** A 60-second "what's the deploy command again?" doesn't need the full ritual. Use judgment — if the conversation didn't change anything or learn anything new, skip the close phase.

Otherwise, run the ritual. Every time. That's how the platform compounds.
