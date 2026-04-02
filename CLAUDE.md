# CLAUDE.md — Agent Instructions for Builder's Knowledge Garden

## MANDATORY: End-of-Session Protocol

**At the end of EVERY task (Chat or Cowork), you MUST:**

1. **Append a session entry to `docs/session-log.md`** via the GitHub Contents API:
   - Get the current SHA: `GET /repos/chilly611/builders-knowledge-garden/contents/docs/session-log.md?ref=main`
   - Append your session entry following the format in that file
   - PUT with updated content + SHA to main branch

2. **Update `tasks.todo.md`** via the GitHub Contents API:
   - Mark completed items as `[x]`
   - Add any new items discovered during the session
   - Update the "CURRENT STATE SUMMARY" if routes or features changed

3. **Update `tasks.lessons.md`** if any new patterns, mistakes, or principles were learned

**GitHub Contents API pattern:**
```bash
TOKEN="<use the PAT stored in environment or provided by user>"
# Get file + SHA
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/chilly611/builders-knowledge-garden/contents/PATH?ref=main"
# Update file
CONTENT=$(base64 -w 0 /path/to/file)  # or base64 -i on Mac
curl -s -X PUT -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/chilly611/builders-knowledge-garden/contents/PATH" \
  -d '{"message":"commit msg","content":"BASE64","sha":"SHA","branch":"main"}'
```

## Session Log Entry Format

```markdown
## YYYY-MM-DD — [Chat/Cowork] Session: [Brief Title]
**Agent:** [Chat/Cowork] ([model])
**What was built:**
- [bullet list of deliverables with routes if applicable]

**Key decisions:**
- [bullet list of design/architecture decisions]

**Issues/bugs found:**
- [optional]
```

## Project Context

- **Repo:** github.com/chilly611/builders-knowledge-garden (branch: main)
- **Live:** builders.theknowledgegardens.com
- **Vercel:** Auto-deploys from `main` on any push
- **Stack:** Next.js 15 (App Router), TypeScript, Supabase, Clerk, Stripe, Vercel
- **Fonts:** Archivo (body), Archivo Black (display)
- **Three chromes:** Green (#1D9E75) = Knowledge Garden, Warm (#D85A30/#C4A44A) = Dream Machine, Red (#E8443A) = Killer App

## Key Files

- `tasks.todo.md` — Current priorities and status (UPDATE EVERY SESSION)
- `tasks.lessons.md` — Patterns, principles, mistakes to avoid (UPDATE WHEN LEARNING)
- `docs/session-log.md` — Canonical timeline of all work (APPEND EVERY SESSION)
- `docs/dream-builder-interface-brainstorm.md` — 18 interface concepts
- `docs/killer-app-recovery-plan.md` — Gap analysis + rebuild plan

## Philosophy

- **Minimal Lovable Product** — never MVP. Ship things people LOVE.
- **One's agency brings joy** — the platform amplifies the user's vision, never replaces it.
- **The databases ARE the product** — everything else is UI on top of the data.
- **API-first** — every feature is an endpoint before a UI.
- **All features emit events** — for RSI loop data collection.
