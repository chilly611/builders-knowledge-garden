# A1 — CRM Research Outputs Audit

**Sprint:** BKG Demo-Readiness (May 17 → May 20, 2026)
**Run:** Retroactive audit — Lane A never fired on Sun May 17. Running it 2026-05-19 AM, two days before the investor demo.

## Audit Scope & File Verification

**Research file verified:** `Builder's Knowledge Garden/docs/research/crm/stream-e-strategy.md`
- File size: 64,913 bytes
- Companion files: `stream-a-landscape.md`, `stream-b-contractor-reality.md`, `stream-c-machine-surface.md`, `stream-d-ux-patterns.md`

All five research documents exist and are dated May 12, 2026 in the CRM research directory.

## Exec Summary (5 bullets)

1. **Core mission:** The BKG CRM is "the connective tissue under 'Who's asking, and what do I know about them?'" — a single JSON-LD record following every job from first contact through warranty, with human and AI agent as equal readers/writers.
2. **Invisible by design:** Not a "CRM module" but the floor under all seven Killer App lifecycle stages (Lead → Size Up → Lock → Plan → Build → Adapt → Collect → Reflect → Repeat/Warranty). Contractor never hears the word "CRM"; AI agent never sees a UI.
3. **Five competitive moats:** Plain-language URLs + Pro Toggle, invisible byproduct capture (30+ moments), reversible AI writes (`time_machine_handle`), lane-aware records (8-lane knowledge), and voice-first offline-capable design.
4. **Five surfaces ship in three briefs:** Brief 1 (`/killerapp/who-is-asking`) covers voice/photo capture; Brief 2 (`/killerapp/quick-reply`) handles inbound SMS/voicemail AI drafts; Brief 3 (`/killerapp/repeat-radar`) surfaces post-job warranty/anniversary/storm pings.
5. **Adoption moment is operational pain:** Contractors adopt when a missed text loses a job, an estimate sits dead in email, or warranty data from a four-year-old job vanishes. Memory and continuity, not pipeline visualization, is the wedge.

## The 5 CRM Surfaces (v1 MLP)

| # | Surface | Plain-Language Q | Route | Why this one |
|---|---|---|---|---|
| 1 | Today | "What's on my plate?" | `/killerapp/today` | Landing screen. Solves "by the time I get home I barely remember what I did this morning." |
| 2 | Who's asking? | "Who's curious about my work?" | `/killerapp/who-is-asking` | Door to CRM. CompanyCam-style photo-as-record + voice + SMS. Solves missed calls → lost jobs. |
| 3 | What might happen next? | "Where is every job today?" | `/killerapp/what-might-happen-next` | 7-stage lifecycle journey strip (not abstract Kanban). Pro Toggle flips to kanban view. |
| 4 | Quick reply | "What should I say back?" | `/killerapp/quick-reply` | AI drafts replies in contractor's voice for every inbound SMS/voicemail/email. Thumb-approve. 90-second undo. |
| 5 | Repeat client radar | "Who should I check on?" | `/killerapp/repeat-radar` | Post-Reflect surface: warranty checkpoints, storm alerts to coastal addresses, anniversary touches. |

## Streams A–D (one line each)

| Stream | Name | Summary |
|---|---|---|
| A | Mainstream + Vertical CRM Landscape | 25+ competitors audited; three patterns to steal (Scout voice, Cmd+K palette, photo-as-record); three to reject (sales walls, paywalls, no mobile). |
| B | Contractor Reality | Ground-truth from Reddit + Capterra + ContractorTalk: CRM already exists as spiral notebook + wife + QuickBooks; phone IS the office; conversion moment is lost job, not pipeline. |
| C | Machine-Readable CRM Surface | Every CRM MCP today is thin wrapper over old REST API; BKG ships one canonical `bkg_contact` + `bkg_deal` as JSON-LD with events (not endpoints), Time Machine on every write. |
| D | UX Patterns to Steal or Reject | Steal: Day.ai zero-entry first run, CompanyCam tap-camera-as-record, Linear Cmd+K inference. Reject: Salesforce 6+ tabs, required-field gates, modal onboarding tours. |

## Ship Status: CRM Surfaces vs. Codebase

Search scope: `app/src/app/killerapp/`. None of the 5 proposed CRM surfaces ship as their own route today.

| Surface | Proposed route | Status |
|---|---|---|
| Today | `/killerapp/today` | **NOT SHIPPED** — no directory, no LIVE_WORKFLOWS entry |
| Who's asking? | `/killerapp/who-is-asking` | **NOT SHIPPED** — referenced in `JourneyMapHeader` + demo plan, but no `page.tsx` exists. (q3 client-lookup lives at `/killerapp/workflows/client-lookup` and is the closest analog.) |
| What might happen next? | `/killerapp/what-might-happen-next` | **NOT SHIPPED** |
| Quick reply | `/killerapp/quick-reply` | **NOT SHIPPED** |
| Repeat client radar | `/killerapp/repeat-radar` | **NOT SHIPPED** |

## Conclusion

The Stream E CRM strategy is complete and architecturally sound. Zero of the five proposed CRM surfaces are implemented as of 2026-05-19. **Demo implication:** every prior demo doc references `/killerapp/who-is-asking` as Act 2's first hop, but the route does not exist. Either repoint the demo at `/killerapp/workflows/client-lookup` (q3, which DOES ship) or pull the Who's-asking? voice extract ship from the P1 list and land it Tuesday (Agent E's 5-step ~500-LOC plan from the 2026-05-18 burn is the smallest path).
