# Builder's Knowledge Garden — Multi-Lane Strategy Brief

## Lanes × Lenses: One Project, Every Stakeholder, One System of Record

*Version 0.1 draft · 2026-05-28 · Author: Chilly + Claude (Chat) · Audience: John Bou, Michael Bou, first contractor partners, early investors*

---

## TL;DR

Today the Killer App assumes one user per project: the general contractor. They see everything, do everything, own everything. Every other human on the project — the homeowner, the framing sub, the architect, the supplier, the inspector, the lender — operates in the dark and creates friction by phone, text, and email.

We are making the Killer App **multi-lane**: same project, same 7-stage lifecycle (locked), same knowledge graph, **different view per role**. The homeowner sees their dream coming true with full transparency. The sub sees their scope, their pay, their inspections. The architect sees drawings and RFIs in context. Everyone sees what they need. Nothing they shouldn't.

This turns BKG from a contractor tool into the **system of record for the entire project** — for everyone on it. The GC sells $99/mo and the platform earns a seat on every stakeholder's phone for the life of the project, and beyond.

Construction lawsuits, change-order fights, and bad Yelp reviews come from one thing: **people in the dark**. We put them in the light. That's the sales pitch.

---

## The opportunity

A real construction project has 5–50 humans touching it. Today, every one of them lives in a different tool or no tool — email, text, paper invoices, paper change orders, lost receipts, "I thought you said," "you never told me." GCs lose 6–10% of every project to communication breakdowns. Owners file lawsuits because they don't know what's happening. Subs leave for other GCs because they get paid late. Architects get blamed for things that aren't on their drawings.

Every other construction tool — Procore, Buildertrend, Fieldwire, PlanGrid — sells to ONE user type and treats everyone else as an afterthought. We sell to the GC and **bring everyone else in for free**, with their own purpose-built view. The GC pays $99/mo and ten people get value. Network effects flow naturally. The platform becomes the system of record because no one else covers everyone.

---

## The architectural concept — Lanes × Lenses

Two axes. Both plain-language. Both already partially in the platform DNA.

**LANES** = who you are on a project. The eight lanes named in the project instructions (General Contractor, DIY Builder, Specialty Contractor, Supplier, Equipment Provider, Service Provider, Worker, Robots/AI) plus the explicit Owner lane and the role specializations within Service Provider (Architect, Structural Engineer, Inspector, Lender, Lawyer, Future Buyer).

**LENSES** = how each Lane sees the project. A Lens is the full configuration of:
- what data is visible
- what actions are allowed
- what tools are surfaced
- what notifications fire
- what the home screen looks like
- what language is used (no jargon-without-translation per lane)

**Same project. Same 7 stages. Same database. Different Lens per Lane.**

This preserves every founder-locked decision. It extends them.

```
                          THE 7 STAGES (LOCKED)
              Size Up → Lock → Plan → Build → Adapt → Collect → Reflect
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Owner Lane         budget pulse · photos · what's next · pay-app tap
  GC Lane            Command Center · margin · pipeline · risk
  Sub Lane           my scope · my pay · my inspections · field report
  Architect Lane     drawings · RFIs · clarifications · sign-off
  Supplier Lane      orders · POs · invoices · delivery windows
  Worker Lane        today's task · safety · timesheet · voice notes
  Inspector Lane     scheduled checks · code lookups · pass/fail
  Lender Lane        draws · documentation · loan-to-value pulse
```

Every Lane navigates the same 7 stages. Only the **content inside each stage** changes by Lane.

---

## The pitch — three versions

### Plain version (for contractor demos)
"Construction lawsuits and bad reviews come from one thing — people in the dark. We put everyone on the project in the same system, each seeing exactly what they need. Owners stop calling. Subs get paid faster. Architects answer questions in context. You run a tighter ship and look like a pro. Everyone wins because everyone sees."

### Dollar version (for GC sales)
"You lose 6–10% of every project to communication breakdowns — change-order fights, owner anxiety, sub turnover, supplier mix-ups. We give it back. For $99/mo per project, every stakeholder gets the right view, every conversation has context, every receipt is in one place, every change is documented and signed. One avoided lawsuit pays for ten years of subscriptions. One five-star review from a transparent build pays the next contract."

### Owner version (for the homeowner pitch — drives GC adoption)
"This is your house. You should see every dollar. Every decision. Every photo. Every code question. You should have receipts. You should know what's next. Your builder shares it all with you in real time. You can upload anything you find — a receipt, a sketch, a question, a video of the leak. You and your builder build the same record together. When it's done, you have a complete history of your home — for resale, for warranty, for memory."

---

## UX design strategy

**Lane Switcher in the top chrome.** Most users have one Lane on one project and never see it. People with multi-Lane access (a Sub on one project who's a GC on another; a project manager who works across both) get a quiet switcher.

**Each Lane has its own home screen.** Same brand chrome (Killer App red, light backgrounds, Archivo / Archivo Black — non-negotiable), different content. The home screen IS the Lens.

**The 7 stages are universal navigation.** Every Lane sees Size Up → Reflect across the top. Every Lane can drill into the current stage and see THEIR view of it.

**Plain language per Lane.** The Owner does not see "RFI." They see "Question being answered." The Owner does not see "Schedule of Values." They see "What you're paying for, week by week." Subs see their trade language. Architects see theirs. Founder-locked decision #12 (plain language accessible to anyone) governs.

**Aesthetic tone per Lane.** Same brand, slightly different emotional weight. Owner Lane leans calming, premium, transparent — warm-white cards, generous whitespace, big photo grids, big stage pills. GC Lane stays Command Center — denser, more chrome, more data. Sub Lane leans utility — phone-first, voice-first, big buttons. Architect Lane leans drawing-centric — wide canvas, layers, markup.

**The Killer App red chrome stays.** It signals the paid product. Each Lane gets it. Each Lane's home softens it differently with cream `#FDF8F0` and warm-white `#FAFAF8`.

---

## Onboarding (Lane-aware)

Every invite lands on a "Welcome to [Project Name]" screen tailored to the Lane:

**Owner onboarding (60 seconds):**
"You're the Owner of Modern Farmhouse Marin. Here's what's happening. Here's what you can see. Here's what you can do. Your builder will be here too. You can ask anything, upload anything, see everything that matters." Three swipeable cards, skippable forever after.

**Sub onboarding (30 seconds):**
"Your scope is here. Your schedule is here. Submit field reports by voice. Get paid faster than your current process. Two taps."

**Architect onboarding (30 seconds):**
"Your drawings. Your RFIs. Your clarifications in context. Sign off without leaving the app."

The onboarding for any Lane teaches:
1. What's already populated (the GC seeded the project)
2. What the user can see (their Lens, summarized)
3. What the user can do (their levers, listed)
4. The single most important first action for that Lane

---

## Deliverables (what ships, in MLP cuts)

**MLP-Owner ships first.** Highest emotional resonance, biggest demo punch, the Harwell family is already in the canonical Marin demo, GC Lens stays unchanged so nothing live breaks.

MLP-Owner consists of:
- Owner sign-in via invite link (magic link, no password)
- Owner home: progress hero ("Build, week 17 of 37 — framing inspection passed"), budget pulse read-only, recent photo grid, "what's next" pill
- Photo / video / sketch / receipt upload from phone
- Pay-app review and one-tap approval (Stripe Connect–backed, ACH preferred)
- Change-order review and signature (digital signature with timestamp)
- Plain-language summary of the current stage, AI-generated
- Direct message to GC (or to "the team")

**MLP-Sub ships second.** Pull through where MLP-Owner taught us about field-first UX.

MLP-Sub:
- Sub sign-in via invite link
- Sub home: this week's tasks, this week's pay status, next inspection
- Voice field report (mobile-first)
- Photo upload (mobile-first)
- Pay-app submission with line items
- RFI submission tied to a drawing or stage

**MLP-Architect / Engineer ships third.** Drawings + RFI surface. Sign-off on inspections.

**MLP-Supplier / Worker / Inspector / Lender** roll out in parallel where they don't conflict.

---

## Authorization, gating, control

The **lane administrator** invites and assigns. Default lane admin is the GC (or the Owner, if Owner-led project). Lane admin can:
- Invite a person to a Lane on this project
- Customize that person's Lens (the default Lens for that Lane is the starting point; admin can grant or revoke specific data fields)
- Revoke access at any time

Permissions are stored as a matrix:

```
LANE × DATA-CATEGORY × ACTION  →  permitted | not permitted

Owner × Budget-Total × Read    →  permitted
Owner × Sub-Margin × Read      →  not permitted
Owner × Pay-App × Approve      →  permitted
Sub-Framing × Schedule-Other-Trades × Read  →  not permitted by default,
                                              admin can grant
```

The default matrix lives in the database (one source of truth). Project-specific customizations override.

**Lens Editor** ships in v2. MLP ships the defaults only; lane admin can revoke individual people but cannot edit Lens defaults yet. Power users get the editor when we know what the right primitives are.

---

## Marketing tool angle

Closeout (the Reflect stage, already locked) gains a second output: a shareable **"We built this" page** that the Owner co-owns with the GC. Photos, story, specs, sequence of stages, credits to every Lane involved with link-backs.

Why this matters:
- Owners share it because it's their home. Their parents see it. Their neighbors see it. It looks beautiful and they're proud.
- GCs share it because every share is a free lead. The page links to a "build with this GC" CTA.
- Subs and suppliers get credit and a link back. Every Reflect page is a free marketing surface for every Lane that contributed.
- The page becomes the home's **permanent record**. When the home sells in 12 years, the next owner can see exactly how it was built — codes, materials, warranties, who did what. The Future Buyer Lane reads the same record.

This converts every completed project into a marketing asset for the platform AND for every Lane on it. Network effect, baked in.

---

## Payments and collections angle

Owner Lane gets **pay-app review and approval**. They see what's being asked, what's been completed, and tap to approve. GC collects faster because the Owner approves in-app, not by email. Stripe + Stripe Connect (already in the stack).

Sub Lane gets **pay-app submission**. Submit work completed, get GC review, get paid via Stripe Connect. Order-of-magnitude faster than the industry standard.

Supplier Lane gets **PO submission and invoicing**. Tracks against the project budget.

Lender Lane (if a construction loan exists) gets **draw documentation in real time**. Lenders love this. We sell into lenders separately later — Lender Lane becomes the wedge for a separate B2B product line.

Stripe Connect is the rails. We earn platform fees on every dollar that moves through.

---

## What this unlocks (the longer arc)

**Today:** GC pays $99/mo, ten stakeholders get value, the platform earns a seat on every phone for the life of the project. Owner stays a user after closeout — the home's record lives on. Subs and suppliers stay reachable for future projects. The GC's customer base becomes the platform's audience.

**Next:** Lender Lane productized at $500/mo per portfolio. Insurance Lane (review claims with the full record). Resale Lane (Future Buyers searching homes by build quality, code compliance, warranty status).

**End state:** BKG is the system of record for the entire $17 trillion global construction economy, and every garden in the broader Knowledge Gardens platform learns from the patterns BKG develops first.

---

## Sequencing — five parallel work streams

We use multiple Claude interfaces and machines simultaneously. Non-conflicting scope per stream:

| Stream | Interface | Scope | Owner |
|---|---|---|---|
| A | Claude Design | Visual specs: Lane Switcher, Owner Lane home, Sub Lane home, Architect Lane home | Chilly |
| B | Claude Code (machine 1) | Database: lanes, lens defaults, permission matrix, migration | Mike B |
| C | Claude Code (machine 2) | Owner Lane home implementation (reads from B's schema, follows A's spec) | John |
| D | Cowork (machine 1 or 2) | Multi-lane seed data for Marin: Harwell family as Owner, framing sub, architect, supplier | Chilly |
| E | Chat (separate session) | Legal copy for invitations, data-sharing notices, closeout marketing-page copy | John |

Streams B and C have a dependency (B's schema before C's UI). Streams A, D, and E run fully parallel from session start.

All five streams write to `docs/session-log.md`, `tasks.todo.md`, and `tasks.lessons.md`. The Manual RSI Protocol is the synchronization mechanism.

---

## Risks and how we hold the line

**Risk:** Scope balloon. Eight Lanes × seven stages × infinite customization = forever.
**Hold:** MLP-Owner ships first. Single Lane. We learn. Then Sub. Then the rest. Founder-locked decision #1 (MLP gate) governs.

**Risk:** Permissions complexity scares early users.
**Hold:** Default Lenses ship first. No editor. Lane admin can revoke, not customize, in v1.

**Risk:** Owner experience that touches money needs legal review.
**Hold:** Founder-locked decision #11 — contract templates require legal review before first paid sale. Same standard applies to pay-app approval flows. Stream E pulls this forward.

**Risk:** Drift from the 7-stage lock.
**Hold:** Multi-lane does not change stage names. Every Lane navigates Size Up → Reflect. Founder-locked decision #2 preserved.

**Risk:** Light-background discipline slips when designing dense Sub or Inspector views.
**Hold:** Founder-locked decision #4 — non-negotiable. Light backgrounds always. Density comes from card layout and typography weight, not dark surfaces.

---

## What we need from John, Mike, the contractors, the investors

**From John:** field validation that the Owner Lens content list is right. What does the Owner of Modern Farmhouse Marin actually want to see at this stage? What would the Harwells call us about that we should preempt?

**From Mike:** review of the permission matrix categories. Are we missing data types? Are any defaults too tight or too loose?

**From first contractor partners:** confirmation that the GC Lens stays unchanged in MLP-Owner. We are not breaking what works. We are adding around it.

**From early investors:** confirmation that the lifetime-value math holds. $99/mo × N projects × M-year platform retention × adjacent Lane monetization (Lender, Insurance, Resale) is the bull case. Push back where the math is too optimistic.

---

## Closing

This is not a feature add. This is the move from contractor tool to system of record for the entire construction economy. It does it by respecting every locked decision and extending the value of each one. The 7 stages get more powerful because more people navigate them. The knowledge graph gets richer because more Lanes contribute. The platform earns a seat on every phone on every project.

Transparency leading to harmony leading to happy customers leading to no lawsuits leading to more money leading to ease and joy for everyone. That IS the platform story.

Let's ship Lane 1.
