# B7: "Who's asking?" CRM Surface — Stream-E Brief 1
**Lane C executor:** C7 | **Depends on:** C1 spine | **Ground truth:** `docs/research/crm/stream-e-strategy.md` (verified exists)

## Route + URL contract
- Path: `/killerapp/who-is-asking` (new App Router route)
- Project-agnostic: contacts are pre-project (lead stage). Reads `?project=` from spine if present.
- Pro Toggle (Goal 1): human label "Who's asking?", pro label "Contacts"
- Journey strip renders above via JourneyMapHeader; currentStageId=null (pre-Size Up)

## Three primary affordances (Goal 3)
1. **Hold-to-talk voice memo** — big circular brass mic using existing `useSpeechRecognition` at `src/lib/hooks/useSpeechRecognition.ts`
2. **Tap-to-photograph** — small camera icon, existing AttachmentUploader with `capture="environment"`
3. **Type fallback** — textarea below mic; same draft buffer

## Entity extraction
NEW endpoint `POST /api/v1/crm/extract`:
- Input: `{ transcript: string, attachment_ids?: string[] }`
- Calls Anthropic Haiku via `@anthropic-ai/sdk`
- Prompt: "Extract a construction lead from this voice memo. Return JSON only. Schema: { name, phone, email, address, scope_query, budget_low, budget_high }. Null any field not present."
- Returns: `{ extraction: {...}, draft_reply: string }` (draft reply in same call — saves roundtrip)

## Journey-strip dot at "Lead"
Add "Lead" position BEFORE stage 1 in JourneyMapHeader. Green dot (Robin's Egg #7FCFCB) anchored to left edge with 600ms fade+slide entrance. Click → contact card drawer. Badge if >1 unconverted contacts. Source: `GET /api/v1/crm?stage=new`.

## AI-drafted reply card
Card shows draft text (e.g., "Thanks for sending the address Maria — I'll swing by Wednesday at 9. Sound good?"). Two buttons: Approve & send (primary brass), Edit (secondary). Approve & send → `POST /api/v1/crm/send` (mock for demo, returns `{ sent: true, channel: "sms_mock" }`). Real Twilio out of scope. Persists into contact's activities[] via existing CRM PATCH.

## Database
**For demo: stay on existing MOCK_CONTACTS in `/api/v1/crm/route.ts`** — zero migration risk.
Propose future migration `supabase/migrations/20260518_crm_contacts.sql`:
```sql
bkg_contacts (id uuid pk, org_id uuid, first_name, last_name, phone, email,
  address jsonb, scope_query text, budget_low int, budget_high int,
  stage text default 'new', source text default 'who_is_asking',
  created_at timestamptz, json_ld jsonb, project_id uuid null)
```
json_ld matches Goal 8: `{ "@type": "bkg_contact", ...fields, "time_machine_handle": "<undo-stack-id>" }`.

## Files to CREATE
1. `src/app/killerapp/who-is-asking/page.tsx` (~30 lines)
2. `src/app/killerapp/who-is-asking/WhoIsAskingClient.tsx` (~280 lines)
3. `src/app/api/v1/crm/extract/route.ts` (~120 lines)
4. `src/app/api/v1/crm/send/route.ts` (~50 lines)
5. `src/app/killerapp/who-is-asking/who-is-asking.module.css` (~80 lines)

Total ~560 lines, ~6 hour Lane C budget.

## Files to MODIFY
- `src/components/JourneyMapHeader.tsx` — add optional pre-Size-Up "Lead" dot prop
- `src/app/api/v1/crm/route.ts` POST handler — accept new fields
- `docs/workflows.json` — add navigable entry (id `crm-1`, label "Who's asking?")
- `src/app/killerapp/page.tsx` — surface "Who's asking?" Invitation Card on lead-stage rail

## Acceptance criteria
- Tap /killerapp/who-is-asking; Pro Toggle visible; flipping label changes to "Contacts"
- Hold mic, speak "New lead, Maria Rodriguez, 4421 Brickell, roof leak after Saturday's storm, $5k budget"
- Within 5s: transcript visible, contact created (POST to /api/v1/crm 201)
- Green dot animates onto journey strip at "Lead"; badge updates
- Draft reply card renders with tone-matched text
- Tap Approve → toast "Sent (demo)"; activity logged
- Click journey dot → contact card drawer opens with all extracted fields
