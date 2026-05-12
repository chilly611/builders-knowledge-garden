# Stream A — Mainstream + Vertical CRM Landscape

> Research sprint feeding the Builder's Knowledge Garden CRM that contractors don't recognize as a CRM. Scope: map what 25+ competing products do today so synthesis can decide what to steal, leapfrog, ignore. Rubric: every recommendation passes the BKG Design Constitution (plain-language first, dual-track Human + Machine, voice-equal, all-eight-lanes).

---

## Executive summary

The horizontal CRM market has converged on the same shape — pipelines, deals, contacts, sequences — and now competes on AI overlays (Day.ai's auto-import, Attio's Ask Attio, Pipedrive's Sales Assistant). All of them assume an indoor knowledge worker with two free hands and a clean desktop. None of them are honestly usable by a roofer on a ladder.

The construction-vertical CRMs (JobNimbus, AccuLynx, JobTread, Roofr, Buildertrend) have largely solved a different problem: they bolt job-photo capture, estimating, and scheduling onto a CRM core, then ship a mobile app that is consistently described as slower and more limited than the desktop. Pricing is opaque — JobNimbus, AccuLynx, Followup CRM, and Buildertrend all require sales calls — which directly violates the BKG "Invitation, not Instruction" goal at the front door.

**Three patterns worth stealing:** (1) JobNimbus Scout's voice-first action grammar inside the mobile app, (2) Attio's Cmd+K command bar that creates records via inferred fields, (3) CompanyCam's photo-as-the-primary-record default that makes documentation feel like phone-camera muscle memory rather than data entry.

**Three patterns worth rejecting:** (1) Salesforce/Buildertrend's "request a demo" pricing wall (violates Goal 3 — Invitation, not Instruction), (2) HubSpot Free's two-user cap and feature-gated mobile insights (violates Goal 6 — Designed for the most constrained user), (3) Folk's no-native-mobile posture (violates Goal 9 — Voice is Equal and Goal 6).

---

## A1. Horizontal CRMs

### HubSpot (Free CRM + Sales Hub)

- **Opinionated UX choice:** "Free forever" hook that locks the most-used branding-removal, automation, and pipeline-multiplicity features behind paid tiers. The CRM is functionally a marketing-acquisition funnel for Sales Hub Starter at $20/seat/mo and Pro at higher rates ([bestcrmreviews.com](https://bestcrmreviews.com/hubspot-pricing), [hubspot.com/products/crm/starter](https://www.hubspot.com/products/crm/starter)).
- **Mobile field-use story:** Full contact/deal/timeline access, log calls, send tracked emails, update deal stages, plus Breeze Assistant AI on mobile. But reviewers consistently call out "limited features in the mobile app" (466 mentions on G2) and note sales insights are Android-only ([G2 HubSpot Sales Hub](https://www.g2.com/products/hubspot-sales-hub/reviews), [HubSpot mobile app docs](https://knowledge.hubspot.com/prospecting/review-sales-rep-insights-on-the-hubspot-mobile-app)).
- **Pricing for 1–5 person business:** Free tier capped at 2 users, 10 custom properties total, 1 automation action, HubSpot branding stamped on every customer-facing surface. Sales Hub Starter $20/seat/mo monthly or $15/seat/mo annual = roughly $75–$100/mo for a 5-person crew before any add-ons ([bestcrmreviews.com](https://bestcrmreviews.com/hubspot-pricing)).
- **Time to first value:** Sign-up to first contact entered: minutes. But "first value" — visible reporting, automation, branding removed — requires upgrade or substantial config. New users routinely report multi-week setup.
- **Screen-level pattern to consider/reject:**
  - Consider: the persistent right-rail "About this record" auto-summary that infers fields from email signature.
  - Reject: the 2-user free cap. For BKG, every contractor is a free user from day one (Goal 6 — most constrained user first). The HubSpot model would lock out the 1-person LLC roofer we are explicitly trying to serve.
- **Source(s):** [bestcrmreviews.com HubSpot pricing](https://bestcrmreviews.com/hubspot-pricing), [HubSpot Starter Customer Platform](https://www.hubspot.com/products/crm/starter), [HubSpot Sales Hub pricing blog](https://blog.hubspot.com/sales/hubspot-sales-hub-pricing).

### Salesforce Sales Cloud

- **Opinionated UX choice:** The platform isn't a CRM, it's a development environment with sales objects pre-modeled. Every field is configurable; nothing is opinionated except the data model.
- **Mobile field-use story:** Salesforce Mobile exists and is full-featured for an admin-configured experience, but the "configure for field" step is non-trivial. No native voice-action interface like JobNimbus Scout.
- **Pricing for 1–5 person business:** Starter Suite $25/user/mo with Slack included; the "real" Sales Cloud Pro starts at $175/user/mo ([salesforce.com/sales/pricing](https://www.salesforce.com/sales/pricing/), [tech.co Salesforce pricing](https://tech.co/crm-software/salesforce-pricing-how-much-does-salesforce-cost)). For 5 users on Pro: $875/mo, before Einstein/Agentforce add-ons.
- **Time to first value:** Multi-week implementation is the norm even at SMB scale. Method Networks notes Starter Suite "is not designed for growing businesses" ([Method](https://www.method.me/blog/how-much-does-salesforce-cost/)).
- **Screen-level pattern to consider/reject:**
  - Consider: Einstein Copilot side panel that lives in every Salesforce screen as a conversational interface — that side-panel pattern is the right shape for our Ask Anything primitive.
  - Reject: "industry clouds at $175/user/mo" pattern. Pricing this high pre-filters everyone we want to serve. The plain-language test fails on the homepage.
- **Source(s):** [Salesforce Sales pricing](https://www.salesforce.com/sales/pricing/), [tech.co](https://tech.co/crm-software/salesforce-pricing-how-much-does-salesforce-cost), [Salesforce small business pricing](https://www.salesforce.com/small-business/pricing/).

### Pipedrive

- **Opinionated UX choice:** Drag-and-drop Kanban pipeline as the canonical view. "Every pipeline is a Kanban board, moving deals between stages is a single drag-and-drop action" ([OnePageCRM Pipedrive review](https://www.onepagecrm.com/crm-reviews/pipedrive/)). Deal-rot indicators visually flag stalled cards.
- **Mobile field-use story:** Full iOS/Android with deal management, contact, activity scheduling, calling. Reviewers credit Pipedrive with the fastest time-to-pipeline of any horizontal CRM (sub-30-minute setup). No construction-specific routing/map view.
- **Pricing for 1–5 person business:** Lite $14/user/mo annual, Growth $39/user/mo, Premium $49/user/mo annual (or $79 monthly). Notable: AI Sales Assistant is on the Lite tier, no feature-gating ([Pipedrive pricing](https://www.pipedrive.com/en/pricing), [Pipedrive AI Sales Assistant page](https://www.pipedrive.com/en/features/ai-sales-assistant)).
- **Time to first value:** Under 30 minutes is the reported norm. The Kanban itself onboards the user.
- **Screen-level pattern to consider/reject:**
  - Consider: Deal-rot color shifts (visual signal that a card has stalled — passive, ambient, no notification). This is exactly the right shape for BKG's Whisper primitive.
  - Consider: Sales Assistant exists on every plan — no feature-gating of AI. Match this.
  - Reject: "Pipeline" as the front-door noun. The plain-language test fails immediately for a roofer who has never sold software. Use "Who's asking, and what do I know about them?" as the entry surface; "Pipeline" lives behind the Pro Toggle (Goal 1).
- **Source(s):** [Pipedrive pricing](https://www.pipedrive.com/en/pricing), [Pipedrive AI Sales Assistant](https://www.pipedrive.com/en/features/ai-sales-assistant), [Pipedrive AI announcement](https://www.businesswire.com/news/home/20240416060312/en/Pipedrive-announces-Pipedrive-AI-a-suite-of-GenAI-powered-tools-to-help-small-businesses-grow).

### Zoho CRM

- **Opinionated UX choice:** Built for the Zoho ecosystem buyer — the value prop is "all the Zoho apps connect" more than any opinionated CRM UX. Free tier for 3 users is the most generous free in the category.
- **Mobile field-use story:** Mobile access on every tier including free. Standard analytics-only on paid tiers.
- **Pricing for 1–5 person business:** Free for 3 users with mobile + leads + documents. Standard $14/user/mo annual, Professional $23/user/mo, Enterprise $40/user/mo ([Zoho CRM pricing](https://www.zoho.com/crm/zohocrm-pricing.html)).
- **Time to first value:** Free signup, 3-user team running in minutes — but the UI is dense, and reviewers consistently say Zoho favors configurability over opinion, so first-meaningful-action takes longer than Pipedrive.
- **Screen-level pattern to consider/reject:**
  - Consider: Generous free tier (3 users, not 2). For BKG: free should mean "your whole company including subs, suppliers, customers can see what's theirs" (Goal 10 — all eight lanes always).
  - Reject: Configurability-as-default. Forces the user to design their own CRM before getting value. Violates Goal 3.
- **Source(s):** [Zoho CRM pricing](https://www.zoho.com/crm/zohocrm-pricing.html), [Method Zoho cost breakdown](https://www.method.me/blog/zoho-crm-cost/).

### Monday Sales CRM

- **Opinionated UX choice:** Boards-as-pipelines. Built on the same Work OS as monday.com generic, so it inherits the colorful customizable spreadsheet aesthetic.
- **Mobile field-use story:** Mobile-functional but reviewers don't single it out. The boards format does not adapt elegantly to phone screens.
- **Pricing for 1–5 person business:** Basic $12/user/mo annual, Standard $17, Pro $28, Enterprise quote. Minimum 3 seats required to access CRM ([monday.com/crm/pricing](https://monday.com/crm/pricing), [Capsule monday pricing review](https://capsulecrm.com/blog/monday-sales-crm-pricing/)). Forecasting locked to Pro tier ($84/mo+).
- **Time to first value:** Template-driven setup gets a board live in minutes. But the user has to make non-obvious choices about column types, automations, and views before the board is useful.
- **Screen-level pattern to consider/reject:**
  - Consider: The "Status" column with a finite enum of colored chips is unreasonably effective at communicating job state at a glance. Use for Killer-App-stage chips (Size Up → Lock → Plan → Build → Adapt → Collect → Reflect).
  - Reject: The 3-seat minimum gates the solo contractor out of even trying. Violates Goal 6.
- **Source(s):** [monday.com CRM pricing](https://monday.com/crm/pricing), [Capsule monday review](https://capsulecrm.com/blog/monday-sales-crm-pricing/).

### Copper

- **Opinionated UX choice:** Lives inside Gmail. The CRM is a Gmail sidebar; record creation is inferred from the email thread.
- **Mobile field-use story:** Mobile app for Android/iOS exists but is essentially companion to the Gmail-embedded primary surface.
- **Pricing for 1–5 person business:** Starter $9/seat, Basic $23/seat, Professional $49/seat annual, Business $89/seat annual. Note: Starter/Basic exclude Sales Opportunities and Leads — a forced-upgrade trap. Basic caps at 2,500 contacts ([copper.com/pricing](https://www.copper.com/pricing), [Zeeg Copper pricing](https://zeeg.me/en/blog/post/copper-crm-pricing)).
- **Time to first value:** Install the Gmail extension, see contacts auto-suggested from your email history — under 10 minutes for a Google Workspace user. Outside Google Workspace: not the product for you.
- **Screen-level pattern to consider/reject:**
  - Consider: The Gmail-sidebar-as-CRM-surface inverts the "open the CRM" workflow. For BKG, the equivalent is "the CRM is wherever you are" — embedded in Messages, in the inspection note, in the photo from the truck. The CRM is never a destination.
  - Reject: Forced upgrade at the "Leads" feature — selling the absent feature back to the user. Violates Goal 3 (Invitation, not Coercion).
- **Source(s):** [Copper pricing](https://www.copper.com/pricing), [Capsule Copper pricing review](https://capsulecrm.com/blog/Copper-CRM-pricing/).

### Close (close.com)

- **Opinionated UX choice:** Built around the Power Dialer. Every contact is one click from a phone call. Calling + SMS + email + AI agent (Chloe) in a single rep workspace. Strong opinion: "your CRM should make the next call easier, not the next dashboard prettier."
- **Mobile field-use story:** Mobile app exists; reviewers don't single it out as best-in-class but it covers the Power Dialer use case.
- **Pricing for 1–5 person business:** Solo $9/user/mo annual ($19 monthly), Essentials $35/user/mo, Growth $99/user/mo, Scale $139/user/mo. Power Dialer features require Growth or Scale. Real cost lands 2–3x headline due to phone credits and premium numbers ([close.com/pricing](https://close.com/pricing), [marketbetter.ai Close pricing](https://www.marketbetter.ai/blog/close-crm-pricing-2026/)).
- **Time to first value:** "Up to 50% faster to implement than competing CRMs" per Close marketing — implementation in days, not weeks.
- **Screen-level pattern to consider/reject:**
  - Consider: One-click-call from any contact card with auto-logged transcript. For BKG: "Call this customer" is one of the four primary actions on any person-record (text/call/photo/note).
  - Consider: Chloe (AI sales agent) joins calls, transcribes, summarizes, drafts follow-up. This is what BKG's "Reflect" stage should feel like — automatic.
  - Reject: $99/seat to unlock the headline feature (Power Dialer). The "fully usable" tier should be the default tier.
- **Source(s):** [Close pricing](https://close.com/pricing), [MarketBetter Close pricing breakdown](https://www.marketbetter.ai/blog/close-crm-pricing-2026/), [authencio Close review](https://www.authencio.com/blog/close-crm-review-power-dialer-pricing-pros-cons-competitors).

### Folk (folk.app)

- **Opinionated UX choice:** "The cleanest, fastest CRM to set up" — minimal design, no-distraction interface, contacts + pipeline views + sequences in one. Aimed at agencies, founders, and relationship-driven solo operators.
- **Mobile field-use story:** **No native mobile app.** Web-mobile only. This is a deal-breaker for the BKG target user.
- **Pricing for 1–5 person business:** Standard $20/user/mo, Premium $40/user/mo, Custom from $80–$100/user/mo. 14-day trial. ([folk.app/pricing](https://www.folk.app/pricing), [Lightfield folk pricing](https://lightfield.app/blog/folk-crm-pricing)).
- **Time to first value:** 20 minutes is the widely-quoted setup time. Cleanest onboarding in the category according to G2's 5/5 review average.
- **Screen-level pattern to consider/reject:**
  - Consider: The 20-minute setup is the bar. "From signed-up to first useful action" in under 20 minutes is the BKG goal.
  - Reject: No native mobile. Folk has decided their user is at a desk. BKG's user is on a ladder. Inverse priorities. Violates Goals 6 and 9.
- **Source(s):** [folk.app pricing](https://www.folk.app/pricing), [Efficient.app folk review](https://efficient.app/apps/folk), [Lightfield folk pricing](https://lightfield.app/blog/folk-crm-pricing).

### Attio

- **Opinionated UX choice:** Notion-meets-CRM with a Cmd+K command bar that opens "Quick actions" for record creation, search, and field inference. AI Attributes auto-fill custom fields by running Web Research Agent or Summarize Record on demand ([Attio Help — Create and view records](https://attio.com/help/reference/managing-your-data/records/create-and-view-records), [Attio navigating workspace](https://attio.com/help/reference/productivity-collaborating/navigating-your-workspace)).
- **Mobile field-use story:** Mobile app exists but Attio's identity is desktop-keyboard-first.
- **Pricing for 1–5 person business:** Free for up to 3 users with 250 automation credits/mo. Plus $29/user/mo annual. Pro $69/user/mo annual adds Call Intelligence and advanced permissions. Hybrid model: seats + usage credits ([checkthat.ai Attio pricing](https://checkthat.ai/brands/attio/pricing), [MarketBetter Attio pricing](https://www.marketbetter.ai/blog/attio-crm-pricing-breakdown-2026/)).
- **Time to first value:** With Cmd+K and the data-model inference, sub-30-minute is realistic for someone who has used Notion. For a roofer, no — the model is too abstract.
- **Screen-level pattern to consider/reject:**
  - **Steal directly:** Cmd+K command bar that creates records via inferred fields. This is the canonical "Ask Anything" surface for a power user and equally readable by an MCP agent. The same command surface should accept voice on mobile.
  - **Steal:** AI Attributes — fields that fill themselves by running an agent. For BKG: "current job status," "last contact," "estimated next action" should all be AI-filled attributes, not user-typed.
  - Reject: Notion-database aesthetic at the front door. Beautiful for product folks, alien for contractors. Live the Pro Toggle: show the simple view first, expose Attio-style power on the flip side.
- **Source(s):** [Attio Help Cmd+K docs](https://attio.com/help/reference/managing-your-data/records/create-and-view-records), [Attio navigating workspace](https://attio.com/help/reference/productivity-collaborating/navigating-your-workspace), [MarketBetter Attio pricing](https://www.marketbetter.ai/blog/attio-crm-pricing-breakdown-2026/).

### Day.ai

- **Opinionated UX choice:** Auto-CRM — connect Gmail/GCal or Microsoft 365 and the entire CRM populates from historical email and calendar without manual data entry. The AI assistant joins meetings, transcribes, and drafts contacts/deals/action items.
- **Mobile field-use story:** Mobile app is light — Day is primarily a knowledge-worker product. No field workflow in the construction sense.
- **Pricing for 1–5 person business:** Per-assistant pricing model with 20% annual discount. Pricing is "in flux" per coffee.ai and folk.app reviews ([folk.app Day AI review](https://www.folk.app/articles/day-ai-review), [day.ai/pricing](https://day.ai/pricing)). Setup reported at ~1.5 hours vs HubSpot's 3 weeks.
- **Time to first value:** ~1.5 hours from connection to populated CRM. Best-in-category for "from zero to looks-like-a-CRM."
- **Screen-level pattern to consider/reject:**
  - **Steal directly:** Day.ai's "we built your CRM from data you already have" inversion is the single most important pattern in this whole sweep. For BKG: connect Messages, Gmail, and the phone's photo roll, and we should reconstruct the entire customer history without the contractor entering anything.
  - Reject: The "knowledge-worker email-and-calendar" assumption. Contractors live in SMS, voice calls, and photos — not Gmail threads. We need the same auto-CRM idea applied to the contractor's actual data sources.
- **Source(s):** [Day.ai](https://day.ai/), [Day.ai pricing](https://day.ai/pricing), [folk Day AI review](https://www.folk.app/articles/day-ai-review), [Coffee.ai Day AI startups review](https://www.coffee.ai/articles/day-ai-crm-startups-review/).

---

## A2. Construction-vertical CRMs

### JobNimbus

- **Specific contractor problem they solved:** Photo-tagged jobs + production board for roofers, integrated with EagleView measurements and insurance-claim workflows. They won by giving roofers job photos and a Kanban-status board the office could see in real time.
- **Onboarding flow:** 14-day free trial, no credit card. Live onboarding help during trial. No required setup fee. Quote-only beyond trial ([jobnimbus.com/pricing](https://www.jobnimbus.com/pricing)).
- **Their take on the "contractor who hates CRM" problem:** They mostly don't call it CRM in the field UX — they call it "Jobs" and "Contacts." Scout (launched January 2026, closed beta) lets contractors say "Create a new job for 123 Oak Street" or "update the Johnson job status to materials ordered" with voice ([JobNimbus Scout press release](https://www.einpresswire.com/article/882981375/jobnimbus-unveils-scout-a-mobile-ai-assistant-designed-for-real-time-field-work), [Field Technologies Online](https://www.fieldtechnologiesonline.com/doc/jobnimbus-unveils-scout-a-mobile-ai-assistant-designed-for-real-time-field-work-0001)).
- **Pricing:** Tiered (Essentials, Pro, Premium, Enterprise) — all quote-based. Public reports place per-user at $20–$75/mo on top of base ([projul.com JobNimbus pricing](https://projul.com/blog/jobnimbus-pricing-analysis-2026/)).
- **Mobile story:** 4.8 iOS / 4.7 Android — among the highest in the category. Photo capture, annotations, forms, e-signatures, payments all on phone. But common complaint: "mobile app can lag," "frequent crashes, missing features compared to the desktop version" ([roofingsoftwareguide JobNimbus review](https://roofingsoftwareguide.com/reviews/jobnimbus-review/), [G2 JobNimbus reviews](https://www.g2.com/products/jobnimbus/reviews)).
- **Screen-level pattern to consider/reject:**
  - **Steal directly:** Scout's voice-command action grammar. "Create new job for [address]," "update [job] to [status]" — these become the canonical MCP tool signatures too. This is the single best example in the entire sweep of Goal 9 (Voice Is Equal) shipping in real product. Match it on day one, in all 30 languages.
  - **Steal:** The job-as-record pattern (vs deal-as-record). "Jobs" is the contractor's plain-language entity; "Deal" is corporate-sales bloat.
  - Reject: Quote-only pricing. Reject: tiered "Communication Bundle" add-ons (texting/calling sold separately). Goal 3 violation — every feature should be invitation, not upsell.
- **Source(s):** [JobNimbus pricing](https://www.jobnimbus.com/pricing), [JobNimbus Scout press release](https://www.einpresswire.com/article/882981375/jobnimbus-unveils-scout-a-mobile-ai-assistant-designed-for-real-time-field-work), [projul.com JobNimbus pricing analysis](https://projul.com/blog/jobnimbus-pricing-analysis-2026/), [Contractor Toolstack JobNimbus review](https://contractortoolstack.com/software/jobnimbus/).

### JobTread

- **Specific contractor problem they solved:** End-to-end project management with strong job-costing and estimating, plus unlimited free seats for subs/vendors/customers. They won the GC market by treating non-employees as first-class.
- **Onboarding flow:** Pricing public on the site, demo not required. Self-serve trial.
- **Their take on the "contractor who hates CRM" problem:** CRM is one of many modules, not the front door. The opinion is "job-first" — the CRM is a side-tracker on the leading-edge of the project.
- **Pricing:** Starts at $159/mo + per-user fees. Two editions, $159–$199 base. Tiered breaks after 10 users. "Subscription pricing hasn't increased in four years" per [JobTread pricing](https://www.jobtread.com/pricing).
- **Mobile story:** Mobile app supports project management workflows; not photo-led like JobNimbus or CompanyCam.
- **Screen-level pattern to consider/reject:**
  - **Steal directly:** Unlimited free access for subs, vendors, customers. This is the only construction CRM I found that gets Goal 10 (All Eight Lanes Always) right structurally. Subs and suppliers are not paid seats — they are participants. For BKG: same. Workers, robots, suppliers, equipment all have a free read/write surface.
  - Reject: "CRM as one module among many" framing. We are inverting this — the relationship layer IS the platform.
- **Source(s):** [JobTread pricing](https://www.jobtread.com/pricing), [JobTread CRM features](https://www.jobtread.com/features/construction-crm), [projul.com JobTread pricing analysis](https://projul.com/blog/jobtread-pricing-analysis-2026/).

### Followup CRM (followupcrm.com)

- **Specific contractor problem they solved:** Commercial subcontractor bid-tracking. The product is built around the high-volume, relationship-heavy sales cycle of a sub bidding multiple GCs.
- **Onboarding flow:** No public pricing — sales-call only.
- **Their take on the "contractor who hates CRM" problem:** Plays a niche so specific they avoid the "we are a CRM" framing — they're a "bid follow-up system."
- **Pricing:** Customized per company. No transparent tiers ([followupcrm.com/pricing](https://www.followupcrm.com/pricing)).
- **Mobile story:** Light; not differentiated.
- **Screen-level pattern to consider/reject:**
  - **Steal:** The naming. "Followup" is plain English. A roofer understands "I need to follow up with the Johnsons." She doesn't understand "I need to advance the Johnson opportunity to stage 4."
  - Reject: Sales-call-only pricing. Goal 3 violation. Reject: vertical so narrow (commercial subs only) it can't serve the residential market.
- **Source(s):** [Followup CRM pricing](https://www.followupcrm.com/pricing), [G2 Followup CRM reviews](https://www.g2.com/products/followup-crm/reviews).

### AccuLynx

- **Specific contractor problem they solved:** Insurance restoration roofing — EagleView integration, hail mapping, supplier ordering. Wins on the $3M+ roofing operations doing claims work.
- **Onboarding flow:** Quote-based, Essential plan publicly listed at $250/mo base ([acculynx.com/plan-options](https://acculynx.com/plan-options/)). Implementation fees commonly $500–$1,000.
- **Their take on the "contractor who hates CRM" problem:** They lean into "roofing CRM" — using the word, but specifying it. Mobile app exists but is consistently the loudest complaint in reviews: "slower and more limited than the desktop version" ([roofingsoftwareguide AccuLynx pricing](https://roofingsoftwareguide.com/guides/acculynx-pricing/)).
- **Pricing:** $250/mo base Essential plan. Reviewers estimate $100–$120/user/mo at scale, plus implementation, plus add-ons — "40–60% above the base subscription for a realistic monthly cost."
- **Mobile story:** Functional, but the loudest user complaint vector.
- **Screen-level pattern to consider/reject:**
  - **Steal:** EagleView and supplier-ordering integrations are differentiated value. BKG's equivalent: the eight-lane architecture means suppliers, equipment, workers are first-class — and orders/dispatch flow through the same surface.
  - Reject: Implementation fees. Reject: desktop-first product with mobile as second-class. Goal 6 violation.
- **Source(s):** [AccuLynx pricing plans](https://acculynx.com/plan-options/), [roofingsoftwareguide AccuLynx pricing](https://roofingsoftwareguide.com/guides/acculynx-pricing/), [Contractor Software Hub AccuLynx review](https://contractorsoftwarehub.com/acculynx-review/).

### Markate (markate.com)

- **Specific contractor problem they solved:** Field-service solo-operator and small-team: jobs + scheduling + dispatch + invoicing + payments on phone or desktop. Owner-operator scale.
- **Onboarding flow:** 14-day free trial, public pricing.
- **Their take on the "contractor who hates CRM" problem:** They don't call it a CRM in marketing — they call it a "Service Operations Platform." Plain language.
- **Pricing:** Owner Operator $39.95/mo, Team $39.95/mo + $5/employee. Add-ons start at $10/mo (custom SMS numbers, call forwarding) ([markate.com/pricing](https://www.markate.com/pricing)).
- **Mobile story:** Mobile app is native (iOS + Android) and explicitly designed for solo operator running the business from a phone.
- **Screen-level pattern to consider/reject:**
  - **Steal:** The owner-operator-first pricing model. $39.95/mo with you-the-owner as the single seat. BKG should make solo a first-class plan, not a downgrade.
  - **Steal:** Naming it "Service Operations Platform" not "CRM." For BKG: "Builder's Knowledge Garden" already gets this right — we go further by never showing the word CRM in product.
- **Source(s):** [Markate pricing](https://www.markate.com/pricing), [Markate Capterra](https://www.capterra.com/p/173150/Markate/).

### Contractor Foreman

- **Specific contractor problem they solved:** All-in-one for the budget-conscious small contractor — 35+ features (CRM, estimating, scheduling, time-cards w/ GPS, daily logs, accounting) under one price.
- **Onboarding flow:** 30-day free trial. Public pricing. "Price Lock + Unlimited Projects means your price never goes up."
- **Their take on the "contractor who hates CRM" problem:** Bundle everything so the contractor never needs another tool — feature-completeness as the moat. CRM is one tab.
- **Pricing:** Basic $49/mo, Standard $105/mo, Plus $166/mo, Pro/Unlimited up to $332/mo. Flat fee, not per-user ([contractorforeman.com/features](https://contractorforeman.com/features/)).
- **Mobile story:** Mobile app on iOS and Android; users report it's adequate for field photo upload and time-card use cases.
- **Screen-level pattern to consider/reject:**
  - **Steal:** Flat-fee pricing instead of per-seat. For a contractor with 8 part-time helpers, per-seat is a tax on team growth. Flat-fee aligns incentives.
  - Reject: Feature-bundling-as-strategy. Contractor Foreman wins on "everything in one" but the product is dense as a result. BKG's opinion is the opposite — fewer surfaces, deeper.
- **Source(s):** [Contractor Foreman features](https://contractorforeman.com/features/), [Capterra Contractor Foreman](https://www.capterra.com/p/166113/Contractor-Foreman/), [SoftwareSuggest Contractor Foreman mobile](https://www.softwaresuggest.com/contractor-foreman/mobile-app).

### Houzz Pro

- **Specific contractor problem they solved:** Lead-gen tied to the Houzz marketplace + a CRM to manage those leads. Targets remodelers and interior designers.
- **Onboarding flow:** 30-day free trial. Pricing varies by trade (contractor vs designer).
- **Their take on the "contractor who hates CRM" problem:** They tie CRM directly to lead acquisition — the user signs up because they want the leads, the CRM comes along. Distribution-first.
- **Pricing:** Starts $49/mo, Starter Plan $65/mo. Annual subscription required. Common reviewer complaint: unexpected price increases and lack of pricing transparency.
- **Mobile story:** Mobile app exists; not a differentiator.
- **Screen-level pattern to consider/reject:**
  - **Steal:** Tie the CRM to the actual customer-acquisition channel the contractor is already using. For BKG: when the lead comes in, the customer-record is already built — same as Day.ai's email auto-import.
  - Reject: Annual lock-in + opaque price increases. Goal 5 violation (Fearless Navigation/Time Machine — the contractor cannot leave when she wants).
- **Source(s):** [Houzz Pro pricing](https://www.houzz.com/houzz-pro/pricing), [pro.houzz.com construction CRM](https://pro.houzz.com/for-pros/software-construction-crm), [Capterra Houzz Pro](https://www.capterra.com/p/199689/Houzz-Pro/).

### JobProgress

- **Specific contractor problem they solved:** End-to-end from sale to production to customer service in one platform, for the small-to-mid contractor.
- **Onboarding flow:** Demo-led.
- **Their take on the "contractor who hates CRM" problem:** Production-focused, with CRM as one capability.
- **Pricing:** Recent significant price increases reported — $55/mo previously, now $99 base + $5–$6 per additional ([G2 JobProgress reviews](https://www.g2.com/products/jobprogress/reviews), [jobprogress.com/pricing](https://www.jobprogress.com/pricing/)). The price hike is the biggest signal in current reviews.
- **Mobile story:** Mobile + tablet app exists; functional, not standout.
- **Screen-level pattern to consider/reject:**
  - Reject: Mid-flight price hike that "priced the software out of being competitive" per reviewers. Goal 3 violation — the contractor was invited at $55, then trapped at $99+. BKG should commit to pricing stability publicly (à la JobTread's "hasn't increased in four years").
- **Source(s):** [JobProgress pricing](https://www.jobprogress.com/pricing/), [G2 JobProgress reviews](https://www.g2.com/products/jobprogress/reviews).

### Buildertrend — CRM module

- **Specific contractor problem they solved:** End-to-end residential/light-commercial GC platform — schedule, change orders, daily logs, client portal, CRM is one slice. Unlimited users on every plan.
- **Onboarding flow:** Demo-led. **No self-service free trial in 2026.**
- **Their take on the "contractor who hates CRM" problem:** CRM is a tab. The Sales Management module covers email marketing, lead management, proposals.
- **Pricing:** Essential $4,788/yr (~$399/mo), Advanced $699/mo, Complete $1,099/mo. Unlimited users included. "$300 discount first month." History of post-year-1 price increases ([buildertrend.com/pricing](https://buildertrend.com/pricing/), [buildertrendpricing.com](https://buildertrendpricing.com/)).
- **Mobile story:** Mobile app exists, full-featured.
- **Screen-level pattern to consider/reject:**
  - **Steal:** Unlimited users at every plan tier. This works for BKG's all-eight-lanes posture.
  - Reject: $399–$1,099/mo entry price. Reject: no self-service trial. Both Goal 3 violations.
- **Source(s):** [Buildertrend pricing](https://buildertrend.com/pricing/), [buildertrendpricing.com](https://buildertrendpricing.com/), [projul.com Buildertrend pricing](https://projul.com/blog/buildertrend-pricing-analysis-2026/).

### CompanyCam (adjacent — photos as CRM)

- **Specific contractor problem they solved:** Replace the camera roll. Every photo timestamped, GPS-tagged, organized by project automatically. Job documentation = the CRM record.
- **Onboarding flow:** Per-user pricing, 3-user minimum on most plans.
- **Their take on the "contractor who hates CRM" problem:** They don't pretend to be a CRM — they pretend to be a camera. The contractor opens the camera; the CRM is built as a side effect.
- **Pricing:** Reports vary: G2 lists $15–$19/user/mo, Capterra/fieldcamp.ai list $79–$199/user/mo for the more capable tiers ([fieldcamp.ai CompanyCam review](https://fieldcamp.ai/reviews/companycam/), [companycam.com/pricing](https://companycam.com/pricing)).
- **Mobile story:** Mobile-first. The mobile app IS the product. Desktop is for reviewing.
- **Screen-level pattern to consider/reject:**
  - **Steal directly:** The "open the camera, the CRM happens" inversion. For BKG: the first-action on any new job should be a photo. The record is created from the photo's GPS + timestamp + AI-classified content. This is the single best "Designed for the most constrained user" (Goal 6) example in the entire landscape.
  - **Steal:** Three-phase documentation workflow (before / during / after). Maps cleanly to BKG's Size Up → Build → Reflect.
  - Reject: Per-user pricing that punishes growing crews. Reject: photo-only scope — the constitution requires the surface to do photos, text, voice, calls all from the same primitive.
- **Source(s):** [CompanyCam advanced features](https://companycam.com/advanced-features), [CompanyCam pricing](https://companycam.com/pricing), [fieldcamp.ai CompanyCam review](https://fieldcamp.ai/reviews/companycam/), [CompanyCam blog — photo documentation](https://companycam.com/resources/blog/how-to-take-job-documentation-photos-that-actually-help-your-business).

### Roofr

- **Specific contractor problem they solved:** Aerial measurements + estimates + CRM for roofers in one — and the free tier lets you generate measurements without a credit card. Distribution moat: free measurements drive sign-ups, CRM upsells the recurring revenue.
- **Onboarding flow:** Free Starter ($19/report, estimated delivery). Essentials and Scale tiers paid + $13/report. Pricing overhaul in March 2026.
- **Their take on the "contractor who hates CRM" problem:** "The #1 Roofing CRM" — they use the word, but only after the user has signed up for measurements. CRM is the second-touch.
- **Pricing:** Starter free + $19/report. Essentials and Scale subscription (exact monthly prices not public — contact sales) ([roofr.com/pricing](https://roofr.com/pricing)).
- **Mobile story:** Mobile app exists; the proposal/measurement workflow is the differentiator.
- **Screen-level pattern to consider/reject:**
  - **Steal:** Free entry-point tied to a real, tangible deliverable (a measurement report). The CRM happens as a side effect of getting value. BKG equivalent: a free tier that delivers something concrete day one (an inspection summary? a customer profile?) — not "30 days to try the CRM."
  - **Steal:** Kanban + job-card-attached SMS/email + payment collection all on one card.
  - Reject: Per-report transaction fees on top of subscription. Goal 3 violation — surprise costs at point of use.
- **Source(s):** [Roofr pricing](https://roofr.com/pricing), [Roofr CRM page](https://roofr.com/crm), [roofingsoftwareguide Roofr review](https://roofingsoftwareguide.com/reviews/roofr).

---

## A3. AI-native CRMs

### Day.ai

- **What "AI-native" actually means in shipped product:** The CRM is *built from* the data, not into. Connect Gmail/GCal/M365 → AI scans historical email and calendar → contacts, companies, deals, notes, action items appear automatically. The AI assistant joins meetings to record/transcribe/summarize. Setup: ~1.5 hours vs HubSpot's 3 weeks per user reports ([folk.app Day AI review](https://www.folk.app/articles/day-ai-review)).
- **Strength:** Conversation intelligence + the auto-populate inversion is genuinely new.
- **Limit:** "Captures about 70% of unstructured data effectively while still creating data silos that block unified pipeline intelligence" per [coffee.ai Day AI startups review](https://www.coffee.ai/articles/day-ai-crm-startups-review/). And the assumption is knowledge-worker email/calendar data — not contractor SMS/photo data.
- **For BKG:** This is the most-stealable conceptual move in the AI-native category. The BKG version: connect Messages, the photo roll, and call logs → the customer history reconstructs itself.

### Attio AI

- **What "AI-native" actually means in shipped product:** AI Attributes (custom fields that fill themselves on demand by running Web Research Agent, Summarize Record, Classify Record). Ask Attio queries for meeting prep, email drafts, CRM lookups. Call Intelligence on Pro tier.
- **Strength:** AI Attributes are the right shape — fields become live agents, not static text. Cmd+K command bar is the unified entry surface for human and machine.
- **Limit:** Hybrid seat+credit billing model creates AI-feature anxiety ("am I burning credits?"). Aimed at tech startups, not field operators.
- **For BKG:** Steal the AI Attribute pattern. Don't steal the credit-consumption anxiety — AI features must feel unmetered.

### Salesforce Einstein / Agentforce

- **What "AI-native" actually means in shipped product:** Einstein Lead Scoring (1–99 score, ML-driven), Opportunity Scoring (deal health), Einstein Copilot as a side-panel conversational interface in every screen, Agentforce as autonomous lead-qualification agents that "research prospects and qualify leads 24/7" ([salesforce.com/artificial-intelligence](https://www.salesforce.com/artificial-intelligence/)).
- **Strength:** The side-panel-everywhere placement is the right architectural pattern — AI lives in every screen, not in a special screen.
- **Limit:** Bolted onto a Sales Cloud configured by an admin. Real-world adoption requires both Einstein licenses AND the data discipline of the Sales Cloud configuration. Out of reach for the BKG user.
- **For BKG:** Steal the side-panel pattern (matches "Ask Anything"). Reject the gating model — AI is not an upsell.

### Pipedrive AI Sales Assistant

- **What "AI-native" actually means in shipped product:** Win-probability prediction per deal, performance insights ("winning patterns, common reasons for loss, seasonal trends"), actionable notifications, AI Email Writer, AI Email Summarization, AI Report Generator. Crucially: "all AI features are available on every plan — no feature gating" ([Pipedrive AI Sales Assistant](https://www.pipedrive.com/en/features/ai-sales-assistant)).
- **Strength:** Unmetered AI on every tier is the right pricing posture. The Assistant is a Whisper — it pings only when something needs attention.
- **Limit:** Sales-specific framing. "Win probability" doesn't translate to a contractor's mental model.
- **For BKG:** Match the unmetered-on-every-tier pricing stance. Translate the language ("win probability" → "is this lead going anywhere?").

### Granola / Truely

- **What "AI-native" actually means in shipped product:** AI meeting notes that auto-push to CRM (HubSpot, Attio, Affinity native; Salesforce/Linear/Asana via Zapier; MCP server launched February 2026). Pushing summaries directly to HubSpot or Attio reportedly "reduces CRM update time by 90%" ([Granola integrations guide](https://www.granola.ai/blog/granola-integrations-complete-guide-connecting-meeting-tools), [Granola for customer success](https://www.granola.ai/blog/best-ai-notetaker-customer-success-teams-crm-integration)).
- **Strength:** Treats the CRM as a downstream destination — the user works in Granola, the CRM is hydrated. Pattern-match with Day.ai.
- **Limit:** Meeting-centric — assumes Zoom/Meet/Teams. Contractor reality is phone calls and in-person.
- **For BKG:** The "downstream-CRM" pattern translates to "contractors work in photos and texts; the CRM is hydrated from those." Build an MCP server day one so the same pattern applies to AI agents.

---

## A4. Inbox/CRM hybrids

### Superhuman

- **Screen-level patterns:**
  1. **Split Inbox** (Important / VIP / News / Calendar / Other) — AI-categorized tabs that learn behaviorally. **Consider for BKG:** The inbox metaphor maps to "Who's asking me?" — the front door of the BKG CRM is a Split Inbox where leads, repeat customers, suppliers, workers, and AI-agents-on-your-behalf each get a stream. (Goal 7 — Reusable Primitive.)
  2. **1-line summary above every conversation** updating instantly as new emails arrive. **Consider:** Each customer-record gets a one-line auto-summary ("Last contact: yesterday by text. Estimate sent. Awaiting reply.") that updates live.
  3. **AI drafts in your voice and tone** pulling from inbox, calendar, web, uploaded knowledge. **Reject as-is:** the "in your voice" is over-engineered for a contractor texting from a truck. The plain-language test: a contractor wants the draft to sound *correct*, not *like them*.
- **Pricing:** $30/user/mo. ([Superhuman Mail AI](https://superhuman.com/products/mail/ai), [Gmelius Superhuman review](https://gmelius.com/blog/superhuman-ai-review), [Clean.email Superhuman review](https://clean.email/blog/email-clients/superhuman-review)).

### Shortwave

- **Screen-level patterns:**
  1. **Bundles** (auto-clustered Finance, Travel, Purchases, etc., learning from user behavior). **Consider:** The Bundle pattern translates well to BKG — "Bills," "Estimates Out," "Customers Waiting on Me" are auto-clustered streams.
  2. **AI Search across team's emails and attachments.** **Consider:** Cross-record search that reads attached photos, voice memos, and texts simultaneously. (Goal 8 — Machine-Legible Everything — also applies to humans.)
  3. **AI Automation in plain English** announced October 2025 — write automation scripts in plain English connecting inbox to Slack, Calendar, Notion, Asana, HubSpot ([Shortwave pricing](https://www.shortwave.com/pricing/)). **Steal:** Plain-English automation grammar is exactly the Pro Toggle target — power users write automations in natural language, never in a builder UI.

### Missive

- **Screen-level patterns:**
  1. **In-thread internal chat** — team members talk inside an email thread without the recipient seeing. **Consider:** For a contractor's customer record, the office person, the project manager, and the AI agent should all be able to "talk in the margins" — a sidebar conversation attached to the customer that the customer never sees. Goal 8 — same surface for human + machine.
  2. **Real-time collaborative drafting** with live cursors, Google-Docs-style. **Consider:** Two people (or person + AI) editing the same reply to a customer simultaneously is the right shape for "agent drafts, human approves/edits."
  3. **Turn any email into a task.** **Consider:** Every text/photo/call should be one-tap "make this a follow-up." Reject the task-list paradigm at the front door — surface the next thing to do, never a generic list.
- **Pricing:** $14/user/mo ([Missive](https://missiveapp.com/), [G2 Missive](https://www.g2.com/products/missive/reviews)).

### Cluely

- **Screen-level patterns:**
  1. **Real-time overlay during calls** — transcribes the conversation, suggests responses, drafts follow-up. Invisible to the other party. **Consider but rework:** The "invisible-overlay-during-call" pattern is ethically queasy (Cluely's marketing is literally "cheats on everything," and the 2025 data breach exposed 83,000 users' interview transcripts and screenshots — [aiinsightsnews.net Cluely review](https://aiinsightsnews.net/cluely-ai/)). For BKG, the legitimate version is the **post-call** version: every call auto-transcribes to the customer record, and the contractor reviews the transcript in plain language while the AI drafts the follow-up.
  2. **Action-items extraction from live conversation.** **Steal the post-call version:** Every customer-conversation generates a list of "what I said I'd do," logged to the customer record automatically.

---

## Cross-cutting patterns — the steal / leapfrog / ignore matrix

| Pattern | Source product | Steal / Leapfrog / Ignore | Why (with constitution goal #) |
|---|---|---|---|
| Voice-command action grammar inside the mobile app | JobNimbus Scout | **Steal directly** | Goal 9 (Voice is Equal), Goal 6 (most constrained user). Best example in the entire sweep. Match in 30+ languages day one. |
| Cmd+K command bar that creates records via inferred fields | Attio | **Steal directly** | Goal 7 (Reusable Primitive — "Ask Anything"), Goal 8 (Machine-Legible — same surface accepts MCP). |
| Open the camera, the CRM happens | CompanyCam | **Steal directly** | Goal 6 (most constrained user — dirty hands, no typing). Photo + GPS + timestamp + AI-classification = a customer record without keystrokes. |
| Connect data sources, the CRM auto-populates | Day.ai | **Leapfrog** | Day does it for Gmail/GCal. We do it for Messages, photo roll, call logs — the contractor's actual data. Goal 4 (Ambient Onboarding). |
| AI Attributes — fields that fill themselves on demand | Attio | **Steal** | Goal 7 (Reusable Primitive). Every record has live AI-filled fields, not user-typed. |
| Pipeline / Kanban with drag-and-drop and deal-rot indicators | Pipedrive | **Steal (rename and re-skin)** | Goal 1 (Plain Language First). Keep the visual primitive, rename "Pipeline" → "Jobs in flight" or similar. Deal-rot color shift = Whisper primitive. |
| Unmetered AI on every plan tier | Pipedrive | **Steal** | Goal 3 (Invitation, not Instruction). AI is not an upsell. |
| Unlimited free seats for subs, vendors, customers | JobTread | **Steal** | Goal 10 (All Eight Lanes Always). Only construction CRM that gets this right structurally. |
| Free entry tied to a tangible deliverable (measurement report) | Roofr | **Steal** | Goal 3 (Invitation). Day-one delivers value, not "30 days to try." |
| Plain-language product noun ("Service Operations Platform," "Jobs") | Markate, JobNimbus | **Steal** | Goal 1. Never show the word CRM in product. |
| AI side-panel persistent in every screen | Salesforce Einstein Copilot | **Steal pattern, reject gating** | Goal 7 (Reusable Primitive — Ask Anything lives everywhere). |
| Auto-CRM-update from AI meeting notes via MCP | Granola | **Steal MCP-first posture** | Goal 8 (Machine-Legible Everything). Ship MCP day one as a first-class surface. |
| Split Inbox by stakeholder type with AI categorization | Superhuman | **Steal pattern** | Goal 7. "Who's asking?" front door is a Split Inbox: leads / customers / suppliers / workers / agents. |
| 1-line live summary above every record | Superhuman | **Steal** | Goal 2 (Emotional Sequencing). The summary tells the human-arc story; the underlying data feeds the Pro Toggle view. |
| Plain-English automation grammar (no builder UI) | Shortwave AI Automation | **Leapfrog** | Goal 8 + Goal 1. Automations written in natural language, voice-dictatable, MCP-callable. |
| In-thread internal chat invisible to the customer | Missive | **Steal** | Goal 8. Office + field + AI agent talk in the margins of the customer record. |
| Real-time collaborative drafting (live cursors) | Missive | **Steal** | Goal 7. The "AI drafts, human edits, both visible" pattern. |
| Post-call transcript + action-item extraction | Cluely (rework), Close (Chloe) | **Steal post-call version** | Goal 5 (Time Machine — replay the call). Reject the live-overlay version on ethics. |
| Photo-first three-phase documentation workflow (before/during/after) | CompanyCam | **Steal** | Goal 2 (Emotional Sequencing). Maps to Size Up → Build → Reflect. |
| Owner-operator pricing as a first-class plan | Markate | **Steal** | Goal 6. Solo contractors are not a downgrade. |
| 14-day free trial, no credit card, live onboarding help | JobNimbus | **Steal** | Goal 3 + Goal 4 (Ambient Onboarding). |
| "Request a demo" pricing gate | Salesforce, Buildertrend, AccuLynx, Followup, JobNimbus | **Ignore — actively reject** | Goal 3 violation. Pricing must be visible on the homepage. |
| 2-user cap on free tier | HubSpot | **Reject** | Goal 6. Excludes the solo contractor. |
| 3-seat minimum to access CRM | monday.com Sales CRM | **Reject** | Goal 6. Same. |
| No native mobile app | Folk | **Reject** | Goal 6 + Goal 9. The contractor lives on the phone. |
| Per-report transaction fees on top of subscription | Roofr | **Reject** | Goal 3. Surprise costs at point of use. |
| Mid-flight price hike that doubles cost | JobProgress | **Reject — commit publicly to price stability** | Goal 3 + Goal 5 (Fearless Navigation — the contractor must always be able to leave; price-trap is the opposite). |
| Configurability-as-default (build your own CRM first) | Zoho, Salesforce | **Reject** | Goal 3. Opinionated defaults, configurable later via Pro Toggle. |
| Annual lock-in + opaque renewal increases | Houzz Pro, Buildertrend | **Reject** | Goal 5. Time-travel includes the ability to leave. |
| Tier-gated headline feature (Power Dialer behind $99/seat) | Close CRM | **Reject** | Goal 3. The fully-usable tier IS the default tier. |
| Live AI overlay during call invisible to other party | Cluely | **Reject** | Ethical violation. Goal 3 violated against the *other* person in the conversation. |
| Notion-database aesthetic at the front door | Attio | **Reject at front door, steal behind Pro Toggle** | Goal 1. Power-user view lives on the flip side of the Pro Toggle. |
| Feature bundling as moat (35 features in one) | Contractor Foreman | **Ignore** | Goal 3. Density is not depth. |

---

## Direct quotes worth keeping

1. **"Roofing contractors don't want more software. They want fewer logins, fewer monthly charges, and a platform that actually works from a truck cab — not just a desktop."** — [myquoteiq.com — What Roofing Contractors Actually Want](https://myquoteiq.com/what-roofing-contractors-want-in-crm-software/). The single best summary of the BKG target user's mental state.

2. **"The goal is not finding the most feature-packed roofing CRM software on the market. The goal is finding the one you'll actually open every morning."** — [myquoteiq.com](https://myquoteiq.com/what-roofing-contractors-want-in-crm-software/). Goal-of-the-product compressed to one sentence.

3. **"The Roofing CRM Isn't a CRM: It's Mission Control."** — [roofingbusinesspartner.com](https://www.roofingbusinesspartner.com/blog/the-roofing-crm-isnt-a-crm-its-mission-control-and-heres-what-it-must-control). The headline-level rejection of the CRM frame from inside the industry. Validates our framing exactly.

4. **"What took me the better part of 3 weeks to set up in Hubspot... Day AI was able to do in about 1.5 hours today."** — Day.ai user, quoted in [skywork.ai](https://skywork.ai/skypage/en/Day.ai:-The-AI-Native-CRM-That-Works-For-You,-Not-The-Other-Way-Around/1976476111463968768). The setup-time gap is the wedge.

5. **"Pushing summaries directly to HubSpot or Attio reduces CRM update time by 90%."** — [granola.ai/blog](https://www.granola.ai/blog/best-ai-notetaker-customer-success-teams-crm-integration). The CRM as a downstream destination, not a destination — pattern proof.

6. **"By enabling updates to happen when the work happens, Scout helps align field and office teams, and supports faster job movement without requiring additional taps or end-of-day data entry."** — [JobNimbus Scout press release](https://www.einpresswire.com/article/882981375/jobnimbus-unveils-scout-a-mobile-ai-assistant-designed-for-real-time-field-work). Voice-first action grammar shipping in real contractor software, January 2026.

7. **"All AI features are available on every plan — no feature gating."** — [Pipedrive AI Sales Assistant docs](https://www.pipedrive.com/en/features/ai-sales-assistant). The right pricing posture for AI, on the record.

8. **"Unlike traditional CRMs that operate as standalone systems, Copper embeds directly into Gmail, creating a unified experience."** — [appendment.com Copper review](https://appendment.com/blog/copper-crm-review/). The CRM-as-embedded-surface (not a destination) thesis, validated.

---

## Closing observation for the synthesis stream

Every product in this sweep has solved either (a) the *form* problem (Attio's command bar, Pipedrive's Kanban, Day.ai's auto-import) or (b) the *vertical-fit* problem (JobNimbus's photo+job, CompanyCam's camera-first, JobTread's free-subcontractors). Nobody has solved both, and nobody has solved either while passing the constitution's plain-language and dual-Human+Machine tests.

The opening: a CRM where the front door says "Who's asking, and what do I know about them?", where the only required action on a new lead is a photo, where voice creates records in 30 languages on the mobile app, where the same Cmd+K surface that a power user types into is also the MCP tool surface an agent calls, and where there are no quote-only tiers, no feature gates on AI, no per-report fees, and no 3-seat minimums. That stack has not shipped. It is shippable now.
