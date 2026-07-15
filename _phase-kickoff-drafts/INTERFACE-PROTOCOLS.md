# Interface Protocols — How Claude Surfaces Operate

*Version 1.0 · 2026-05-28 · Companion to PLATFORM-CONSTITUTION.md*

---

## Why this document exists

The team uses Claude through multiple interfaces, each with different capabilities, constraints, and persistence behaviors. Without a shared protocol, instances drift — Chat recommends one thing, Cowork ships something subtly different, Code introduces a third pattern, Design specifies a fourth.

This document defines what each interface is for, what it can and cannot do, and how work flows between them. **The goal is one source of truth, four execution surfaces.**

---

## The four interfaces

### Chat (claude.ai web and mobile)

**What it is:** A conversational surface for strategy, generation, and document digestion.

**What it is best at:**
- Strategic conversations and architecture decisions
- Generating long-form documents, prompts, and specs that other interfaces will execute
- Digesting external inputs (meeting transcripts, PDFs, screenshots, uploaded files)
- Writing prompts FOR Cowork, Code, and Design sessions
- Producing downloadable artifacts (HTML, markdown, PDFs)
- Holding ambiguity while the human thinks out loud

**What it cannot do:**
- Write directly to the file system on the user's machine
- Persist context across separate chat sessions (except via Projects + memory)
- Run code in a way that affects the user's repos
- Execute multi-step file operations autonomously

**Persistence model:** Within a single chat thread, full context. Across chats, only what's saved in Project files or memory.

**Output discipline:** Chat outputs are inputs for other interfaces. Every Chat session that produces a prompt, spec, or document should also produce a clear instruction for where that artifact goes and which interface picks it up next.

---

### Cowork (Claude Desktop)

**What it is:** A desktop application with direct file system access on the user's machine.

**What it is best at:**
- Editing real files in real folders on the user's local machine
- Running terminal commands, deploys, and file operations
- Multi-step file workflows (read, edit, save, verify) without copy-paste overhead
- Working in non-git project folders (like Vercel-CLI deploys)
- Sessions where the human watches the work happen

**What it cannot do:**
- Persist tasks between separate sessions — the repo files ARE the source of truth, Cowork session memory is not
- Reach repos that aren't on the local machine
- Replace the kind of long strategic thinking Chat does well

**Persistence model:** None across sessions. Every Cowork session starts fresh. This is why the session-end ritual is non-negotiable.

**Output discipline:** Every Cowork session ends with an entry appended to `<garden>-session-log.md` and a push (if the project is git-backed) or a deploy (if Vercel-CLI). If the session doesn't produce those, the work didn't happen — it just leaked.

---

### Claude Code (CLI)

**What it is:** A command-line tool that delegates coding work to Claude, with direct repo write access and the ability to spawn parallel sub-agents.

**What it is best at:**
- Repo work where multiple files change in coordination
- Parallel execution via sub-agents (one task per agent, focused scope)
- Long-running agentic coding tasks where the human steps away
- Reading CLAUDE.md at the repo root and following its protocols

**What it cannot do:**
- Operate outside the repo it's pointed at
- Run without a `CLAUDE.md` providing context (will work, but poorly)
- Make decisions that should be human calls (e.g. founder-locked architecture)

**Persistence model:** The repo IS the persistence. CLAUDE.md, tasks files, session log — these are the durable state. Sub-agents have ephemeral context within a single Claude Code invocation.

**Output discipline:** Every Claude Code session updates CLAUDE.md if anything was learned, appends to session-log, and commits + pushes (or surfaces a clear "this needs review before push" handoff).

---

### Claude Design

**What it is:** A surface for generating visual specs, design mockups, and design constitution documents.

**What it is best at:**
- Producing standalone HTML/CSS visual specs that other interfaces can implement
- Brand-coherent design generation when given clear constraints (palette, typography, layout grids)
- Design system documents and component libraries
- Visual decisions captured as documents that survive the session

**What it cannot do:**
- Edit live production code (that's Cowork or Code)
- Make business decisions or product strategy calls
- Replace human design judgment for high-stakes brand decisions

**Persistence model:** Spec documents are the persistence. Design produces files that Cowork or Code implements.

**Output discipline:** Every Design session produces a named spec document with clear acceptance criteria, then hands off to Cowork or Code for implementation. The spec is the deliverable.

---

## Universal rules (all interfaces)

These hold regardless of which surface the team is working through:

1. **Read first, write second.** Every session begins by reading the relevant Tier 1 + Tier 2 documents. See MANUAL-RSI-PROTOCOL.md for the order.

2. **Append, don't overwrite.** Session logs are append-only. History matters.

3. **Name decisions explicitly.** When something gets decided, write it down with a date. Founder-locked decisions go in a numbered list.

4. **Capture lessons inline.** When a Claude instance makes a mistake and the human corrects it, that lesson goes into `tasks.lessons.md` IMMEDIATELY, not at session end.

5. **Don't drift the brand.** Light backgrounds. Specified typography. The palette. These are not preferences — they are platform invariants.

6. **Respect interface boundaries.** Don't have Chat try to run repo work. Don't have Cowork write a strategic blueprint. Each interface to its strengths.

7. **No "remember for next time" promises.** No interface persists in ways the human can't see. If something needs to carry forward, it goes in a file.

---

## Handoff patterns

### Chat → Cowork
Chat writes a complete, self-contained Cowork prompt as a code block. The prompt includes: project location, project type (git vs Vercel-CLI vs other), current state, asset inventory, what to build, performance guardrails, acceptance criteria, deploy command, and explicit "do not" list. The human pastes that prompt into a fresh Cowork session.

### Chat → Claude Code
Same as Chat → Cowork, but the prompt lives in the repo as a doc (e.g. `docs/agents/<task>.md`) and Claude Code reads it. CLAUDE.md at the repo root governs the session.

### Chat → Claude Design
Chat specifies the design problem (brief, palette, typography, layout, acceptance criteria) and Design produces a named spec document. Spec is committed to the repo or saved as a file Cowork/Code will pick up.

### Cowork → Chat
Cowork hits a strategic question or an architectural ambiguity. The Cowork session ends. The human opens Chat with a summary of where Cowork stopped, the question, and the relevant files. Chat thinks through the strategy, writes the next prompt back into the Cowork pipeline.

### Code → Cowork
Code finishes a coding task that needs a visual review or file-system follow-up. Code's session ends with a clear "next: Cowork should verify X and Y". The human runs Cowork against the same repo.

### Any interface → Any interface
The session log, tasks.todo, and tasks.lessons files are the conveyor belt. Every interface reads them at start, writes to them at end. Cross-interface coherence comes from those three files, period.

---

## When in doubt

Default to Chat for thinking, Cowork for files, Code for repos, Design for specs. When two interfaces could both do something, pick the one whose persistence model matches what the work needs:

- One-off generation that won't be touched again? → Chat
- File that lives on disk and will be edited? → Cowork
- File that lives in a git repo with sub-agent work? → Code
- Visual spec that other interfaces will implement? → Design
