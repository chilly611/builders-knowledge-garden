# Contractor handover plan — kicking the tires for real

**Goal:** by end of Wednesday, a handful of vetted contractors can sign up, use the killer app for a real (or simulated-real) project, and tell us what's missing.

**Audience:** general contractors first. Specialty trades second. DIY/owner-builders third. Eight lanes are wired but the demo data biases toward GC.

**Truth-in-advertising rule:** be upfront with contractors about what's manual vs automated. We are NOT shipping a fully-automated platform tomorrow. We're shipping a platform that LETS them do their actual job faster than what they have now (notebook + Excel + texts).

## What contractors can really do today (the honest list)

### Fully automated (works without typing)
- Speak intent → project created with raw_input + AI summary + estimated cost range
- Open a workflow → same project context everywhere, no re-entry
- Click a code-compliance question → multi-source-verified citation with the trust badge
- Push AI estimate → budget page pre-populated with categories
- Time Machine snapshots fire automatically on workflow saves
- All workflow autosaves visible in the top-right "Saved Xs ago" indicator

### Manual but assisted (the platform holds their hand)
- Budget line items by category — pre-populated by the AI estimate, manually editable, state-cycle chips (Pending → Estimated → Locked-in → Paid)
- Contract drafts — autofill from project context, manual review + edit, PDF generation
- Permit checklist — jurisdiction-aware suggestions, manual confirm + filing
- Sub-bid comparison — manual entry, but the workflow guides the comparison
- Photo upload / documentation — manual capture, saved to project automatically
- Voice CRM intake — works for capturing leads, you/customer/loved-one lens (Ship 17)

### Coming soon (be upfront)
- Real-time cash flow forecasting (we show the timeline, you fill in the dates)
- Vendor catalog with live pricing (we show categories, you input vendor)
- Automated permit filing (we tell you what's needed, you submit)
- MCP closer integration (Claude Desktop can fetch BKG knowledge, but configuration needs Chilly's bridge install)
- Mobile native app (we have a responsive web build; native is post-demo)

## What we need to build for handover (today's Phase 5)

### 1. `/feedback` page (`src/app/feedback/page.tsx`)

Single-screen form, no auth required. Fields:

- **Your first name** (text)
- **Your trade / role** (select, prefill from /onboard if signed in): GC, Specialty trade, DIY owner-builder, Architect/designer, Other
- **What's the project you tried with us?** (text — short, optional)
- **What worked?** (textarea, optional but encouraged)
- **What didn't?** (textarea, optional but encouraged)
- **What's missing that you wish was there?** (textarea, optional but encouraged)
- **Can we follow up with you?** (email field, optional with checkbox)
- **Submit** button

On submit:
- POST to `/api/v1/feedback` → INSERT into `contractor_feedback` table (new Supabase table — apply migration)
- Show a "Thanks — heard you." confirmation
- If `email` provided, set a flag so Chilly can follow up

### 2. New Supabase table `contractor_feedback`

```sql
CREATE TABLE contractor_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text,
  trade text,
  project_description text,
  what_worked text,
  what_didnt text,
  what_missing text,
  email text,
  follow_up_ok boolean DEFAULT false,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_agent text,
  source_path text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE contractor_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert feedback"
  ON contractor_feedback FOR INSERT
  TO public WITH CHECK (true);
CREATE POLICY "Authenticated users see their own"
  ON contractor_feedback FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
-- Chilly (admin) sees all via service role.
```

### 3. Footer link

Add to `src/components/LegalFooter.tsx`: a "Help us improve" link → `/feedback`. Sits next to Terms / Privacy / Disclaimer.

### 4. 5 pre-seeded contractor demo accounts

Pre-create in Supabase auth (via `apply_migration` or a one-off seed script) — throwaway emails Chilly can hand out. Each pre-attached to one of our 3 demo projects:

| Email | Password (one-shot) | Lane | Pre-attached project |
|---|---|---|---|
| `gc-trial-01@theknowledgegardens.com` | `BuildersGarden!01` | Builder | Marin farmhouse |
| `gc-trial-02@theknowledgegardens.com` | `BuildersGarden!02` | Builder | ADU in Sausalito |
| `gc-trial-03@theknowledgegardens.com` | `BuildersGarden!03` | Builder | Commercial TI in SoMa |
| `specialty-trial-01@theknowledgegardens.com` | `BuildersGarden!04` | Specialist | Marin farmhouse |
| `diy-trial-01@theknowledgegardens.com` | `BuildersGarden!05` | Dreamer | ADU in Sausalito |

Generate the SQL via Supabase MCP. Then ship a markdown table with these credentials INTO this doc so Chilly can copy/paste them when handing out access.

### 5. A one-page "Welcome, contractor" landing at `/welcome`

When a contractor signs in for the first time with one of the trial accounts, redirect them to `/welcome` instead of `/killerapp`. The page should:

- Say "Hey, welcome. We pre-loaded a `<project type>` project for you to try."
- List 3 concrete actions: "Try the AI estimate", "Push your numbers to the budget", "Generate a draft contract"
- Below: "When you find something broken or missing, hit `/feedback` — we read every single one."
- Big primary CTA: "Take me to my project →" → `/killerapp?project=<their-attached-uuid>`

After their first visit, `/welcome` redirects them straight to their project (use a `welcomed_at` flag in user metadata).

## What we are NOT doing for handover (deferred)

- Onboarding video tutorial — too time-consuming to script + film + edit
- In-app product tour overlays (we have `/onboard` already; that's enough for v1 handover)
- Slack/Discord community — post-demo
- Office hours / coaching session — post-demo if there's demand
- Free trial billing flow — everything is free for handover. Billing wiring happens post-demo.

## Success criteria for handover

We've succeeded if, by Friday May 22:
1. At least 3 GCs have signed up with their own (not trial) accounts AND used at least 2 workflows for a real or simulated project
2. We have at least 5 pieces of structured `contractor_feedback` rows in the DB
3. At least 1 GC explicitly says "if you fixed X, I'd use this every day" — that's the post-demo roadmap input we need

## What to tell contractors when handing it over (the pitch)

> "This is a tool for general contractors who want to talk to their software the way they talk to their crew. Speak the job into it, and it sets up your estimate, your codes, your contracts. Some parts auto-fill. Some parts you'll still have to type. The point: stop fighting Excel and Notes and text messages — and stop letting the AI noise own your day. We're calling it #aikidotheAI. Take it for a spin. Tell us what's broken. We're moving fast."

That's it. Hand them a trial account, a link, and a feedback form. Get out of their way.
