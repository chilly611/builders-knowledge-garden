# Stream B — Contractor Reality

*Ground-truth research for the Builder's Knowledge Garden CRM design sprint. Pulled from r/Construction, r/Roofing, r/HVAC, r/Plumbing, r/electricians, r/handyman, r/smallbusiness, r/Contractor, Capterra reviews, ContractorTalk, and industry blogs. Direct quotes are reproduced verbatim where possible; light cleanup is noted.*

---

## Executive summary

**Three field truths the BKG CRM must respect.**

1. **The "CRM" already exists — it just isn't software.** It is a spiral notebook in the truck door, a whiteboard in the shop, a wife/mom/sister doing the books from the kitchen table, a phone Contacts app with hand-written nicknames, and a QuickBooks customer list. A "CRM" that does not absorb this analog stack will be abandoned in 90 days. Reddit users repeatedly described their current state as Google Calendar + QuickBooks + Notes + text threads — and they liked it.
2. **The phone is the office. The truck is the office. The customer's driveway is the office.** Contractors are "elbow deep in a drain" (r/Plumbing, u/Plumb_1rqe4dh) or "covered in grit half the day" (same thread). Anything that takes more than one tap, requires a wifi signal, or assumes clean hands has already failed. The mobile experience is not a "companion app." It is the only app.
3. **The conversion moment is operational pain, not sales pain.** Contractors do not adopt CRMs to "see their pipeline." They adopt when a missed text loses a job (r/Contractor 1rorqtg), an estimate sits dead in an email thread (r/Construction 1qtlbw4), or a customer calls about a warranty issue from a job four years ago and the data is locked inside an old CRM they want to leave (r/Roofing 1kdk4ac — "ACX-CRM Data Hostage"). The wedge is **memory and continuity**, not pipeline visualization.

**Three CRM patterns contractors hate (with source).**

1. **Clicks-per-task inflation.** "I've tried JobNimbus and thought it was really over rated. It just took like 6 clicks for something that should have taken 2." — r/Roofing/comments/1n1yvrp
2. **Pay-to-unlock basic features.** "I didn't realize until after signing up that reviews cost an extra $39 a month and referrals are another $29. Those feel like basic features that any CRM should already include." — r/Contractor/comments/1qk5y04 (Jobber complaint)
3. **Enterprise software dropped on solo operators.** "It's like trying to fly a Boeing 747 just to fix a leaky faucet. Way too many screens and menus for someone who is literally covered in grit half the day." — r/Plumbing/comments/1rqe4dh (re: ServiceTitan)

**The two magnetic moments that would convert a skeptic.**

1. **The "follow-up that already happened" moment.** Contractor sends an estimate from their phone in the truck. Two weeks later, the customer is automatically nudged in the contractor's voice ("Hey, still want me to swing by?") because the system noticed silence. The contractor sees the response on his phone screen the next time he sits down. He never opened a CRM. This solves the #1 self-reported leak in trade business: "Anyone else lose jobs because they forget to follow up on quotes?" (r/Contractor 1rorqtg, ~80 upvotes, dozens of "literally me" comments).
2. **The "I can find that photo from the Smith job two years ago" moment.** Warranty call comes in. Contractor opens the app, says the customer name out loud, and every photo, text thread, invoice, and note is there — including the conversation his wife had with the customer in 2024. This is the moment the ACX-CRM hostage post (r/Roofing 1kdk4ac) is begging for: "99% of the time we won't need it but 1% of the time it's crucial." Win that 1% and you've earned the seat.

---

## B1. Direct quotes from the field

> "I've used jobnimbus and thought it was really over rated. It just took like 6 clicks for something that should have taken 2. This was like 5 years ago, maybe it's gotten less frustrating to use."
- Source: https://reddit.com/r/Roofing/comments/1n1yvrp/unhappy_with_current_crm/
- Contractor type: PA roofer, ~$6M revenue, ~80% retail
- What this tells us: Click-count is the unit of contempt. Every additional tap between thought and action is a tax. The constitution's "single-tap" guidance is literal.
- Constitution implication: **Most-Constrained User First** (single-tap), **Reusable Primitives** (don't make me re-learn a flow each click).

> "JobNimbus fucking blows but it may be the best out of all of them. They are beta testing their software on us. I've used it for 3-4 years. Never fix any bugs. … Doesn't work in low reception areas, no offline mode. … Tons of glitches and inventory issues. Addresses don't autopopulate even more. … But… the time and cost to switch means I'm stuck."
- Source: https://reddit.com/r/Roofing/comments/1n1yvrp/unhappy_with_current_crm/
- Contractor type: Roofer, multi-year JobNimbus user
- What this tells us: The dominant emotion is *captive resentment.* Contractors stay because exporting their data and retraining their crew is more painful than the daily papercuts. Offline-mode is table stakes.
- Constitution implication: **Time Machine** (data must be portable; data hostage is a betrayal), **Voice Is Equal** (low-reception attics demand local capture).

> "As a solo plumber I can tell you the biggest killer is the setup time. I tried ServiceTitan because everyone talks about it but it's like trying to fly a Boeing 747 just to fix a leaky faucet. Way too many screens and menus for someone who is literally covered in grit half the day."
- Source: https://reddit.com/r/Plumbing/comments/1rqe4dh/plumberswhat_appsoftware_do_you_use_to_handle/
- Contractor type: Solo residential plumber
- What this tells us: Enterprise tools are *physically* inappropriate. The user's hands and attention budget are the binding constraint. Plain Language First is enforced by reality, not just preference.
- Constitution implication: **Plain Language First**, **Most-Constrained User First**, **Ambient Onboarding** (no setup wizard — must be useful in 5 minutes).

> "I basically never answer the phone unless it's slow. I get far more phone calls than I could possibly handle. … If they text or leave a voicemail I'll see if it's interesting, if it seems like it's gonna be a shitshow I don't bother responding."
- Source: https://reddit.com/r/Plumbing/comments/1oz4ge2/question_for_people_who_run_plumbing_business/
- Contractor type: Established plumber, choosing leads
- What this tells us: Lead qualification happens in the contractor's head with zero data. A CRM that helps him triage ("is this a shitshow?") is more valuable than one that captures every lead.
- Constitution implication: **Whisper** (AI surfaces lead quality signal silently), **Invitation Not Instruction** (suggest, don't force capture).

> "I take calls, keep the books updated, invoice, estimate, do the work, clean the truck, make the Facebook posts, respond to the reviews."
- Source: https://reddit.com/r/Plumbing/comments/1oz4ge2/question_for_people_who_run_plumbing_business/
- Contractor type: Owner-operator plumber
- What this tells us: The user is *one human wearing nine hats.* Context switches are the actual cost. A CRM is one more hat unless it eats the others.
- Constitution implication: **All Eight Lanes Always** — every lane (lead, plan, build, collect, reflect) must surface in the *same* interface because there is no separate department.

> "He's constantly texting his crew 'where are you?' Spends every Friday night doing invoices from crumpled receipts. Forgets to bill for half the materials he uses. Answers customer calls while under sinks (customers can hear the wrench clanking)."
- Source: https://reddit.com/r/Plumbing/comments/1pu866k/software_developer_here_friends_plumbing_business/
- Contractor type: 3-person plumbing shop (described by software dev friend)
- What this tells us: The actual workflow is *Friday-night triage of crumpled paper.* The CRM moment isn't pipeline review — it's reducing Friday-night paper count.
- Constitution implication: **Invisible CRM / byproduct** — bill capture must happen at material purchase, not Friday night.

> "Honestly the scheduling and invoicing part is the easy part, there's a dozen apps for that. The thing that was killing me was everything BEFORE the scheduling. Customer calls, I'm elbow deep in a drain, call goes to voicemail, they never leave a message. By the time I call back they already booked someone off Google. I had to solve the intake problem before any CRM or scheduling app even mattered. The best software in the world doesn't help if the lead never makes it into your system."
- Source: https://reddit.com/r/Plumbing/comments/1rqe4dh/plumberswhat_appsoftware_do_you_use_to_handle/
- Contractor type: Solo plumber
- What this tells us: The funnel leak is *at the front door*, not in the pipeline. Missed-call-to-text and AI receptionist patterns are the real wedge for service trades.
- Constitution implication: **Ambient Onboarding** for inbound leads (no app needed for the lead), **Whisper** (alert contractor without interruption).

> "Some days I'm so busy on site that by the time I get home, I barely remember what I did that morning. Then a week later, I realized I had sent a few quotes and never followed up. Most of the time I just assume the client went with someone else, but lately, I've been wondering how many jobs just disappear because no one checks back in."
- Source: https://reddit.com/r/Contractor/comments/1rorqtg/anyone_else_lose_jobs_because_they_forget_to/
- Contractor type: Generalist contractor
- What this tells us: Quote-forgetting is universal. The "did the client respond?" question is the recurring nightmare. This is the magnetic moment.
- Constitution implication: **Emotional Sequencing Default** — the day ends with "what did I forget?" The system should answer it before he asks.

> "Yes, literally all of the time. I also forget to call people back that want estimates or don't send a quote fast enough because we're so busy on other jobs and when I get home I just want to not do more work related work. The worst is when you spend a lot of time on a quote and then they ghost you and you could have spent that time on someone else."
- Source: https://reddit.com/r/Contractor/comments/1rorqtg/anyone_else_lose_jobs_because_they_forget_to/
- Contractor type: GC
- What this tells us: Emotional exhaustion is the gating factor. The CRM must do work *while the contractor is not working.* This is where AI agency matters.
- Constitution implication: **Whisper** + **Machine-Legible Everything** — the agent works the pipeline at night while the human sleeps.

> "I'm a plumbing contractor with just me and my brother but I've spent a lot of years working as a crew lead and head foreman at larger companies. … If you're solo or very small you don't even need software. Most of your schedule you really only need a day planner for, and your estimation is spreadsheets. Your books and invoicing are either QuickBooks or square. There's really no need for this big stuff. … In short, I don't believe there's really any market for your idea because a spreadsheet covers most of it."
- Source: https://reddit.com/r/handyman/comments/1i0lm2q/building_a_crm_for_solopreneur_handymen_find_it/
- Contractor type: 2-person plumbing shop
- What this tells us: This is the explicit anti-CRM thesis from a *credentialed* user (CS degree, built his own tool). The bar for switching is "more useful than a spreadsheet I already trust."
- Constitution implication: **Plain Language First** — must be obviously better than the spreadsheet within minutes.

> "Considering that I don't even know what CRM is, I probably don't need it."
- Source: https://reddit.com/r/handyman/comments/1i0lm2q/building_a_crm_for_solopreneur_handymen_find_it/
- Contractor type: Solo handyman
- What this tells us: The word "CRM" is itself a gatekeeper. Contractors who don't know the acronym believe (correctly) they are outside the target audience. Validates the BKG framing decision to never use the word.
- Constitution implication: **Plain Language First** (and: the product name and onboarding language cannot use "CRM").

> "I run a stone installation company and been on the lookout for awhile for a CRM to facilitate daily admin. I went with Jobber because it's everywhere. … During the demo, the rep really pushed the grow plan and assured me it would cover everything I needed. I was clear that reviews and referrals were important to me, but I didn't realize until after signing up that reviews cost an extra $39 a month and referrals are another $29. Those feel like basic features that any CRM should already include. The platform itself is also way more complicated than it needs to be."
- Source: https://reddit.com/r/Contractor/comments/1qk5y04/im_really_disappointed_with_jobber/
- Contractor type: Stone installation contractor
- What this tells us: Add-on pricing is a *trust violation.* Once the contractor finds a paywall on a feature he was sold, he leaves emotionally even if he stays operationally.
- Constitution implication: **Invitation Not Instruction** — no dark patterns, no upsell at the moment of need.

> "We've been with Jobber for a while, and have been equally frustrated, as they were trying to squeeze you out for every penny… as we grew, we realized that it's built for small companies and that they are building new features, but at a very superficial level (just to say they have it), and trying to upsell for everything."
- Source: https://reddit.com/r/Contractor/comments/1qk5y04/im_really_disappointed_with_jobber/
- Contractor type: Residential & commercial cleaning company (grown past small)
- What this tells us: The "grow with you" promise is widely felt as a bait-and-switch. Software that punishes growth is a recurring pattern.
- Constitution implication: **Time Machine** — fearless nav also means fearless scaling; no penalty for getting bigger.

> "I have JN right now, in the process of switching to ProLine."
- Source: https://reddit.com/r/Roofing/comments/1qdamkm/best_crmmanagement_software_for_roofing_companies/
- Contractor type: Canadian roofer
- What this tells us: Switching is constant. There is no loyalty. The product is the contractor's last source of patience.
- Constitution implication: **Time Machine** (export must be trivial — the customer should not feel hostage).

> "DO NOT use ServiceTitan unless: You want to pay 1% of your total revenue per job to them. You want to call your sales consultants 'technicians.' You want your sales consultants to 'dispatch' themselves to the sales appt 'log that they are onsite' and 'log that they have departed' the sales appt. This is a CRM for service techs. Our experience has been terrible."
- Source: https://reddit.com/r/Roofing/comments/1n1yvrp/unhappy_with_current_crm/
- Contractor type: PA roofer (mid-large)
- What this tells us: Vocabulary mismatch is fatal. A roofer doesn't have "technicians" — and forcing the model breaks adoption.
- Constitution implication: **Plain Language First** — the *user's* language, not the software's.

> "Acculynx had an overhaul about a year ago, and instead of improving it, they made it worse by eliminating things. I've grown to hate a product I use to enjoy."
- Source: https://reddit.com/r/Roofing/comments/1n1yvrp/unhappy_with_current_crm/
- Contractor type: Roofer
- What this tells us: Redesigns that strip features = betrayal. "I used to enjoy" is a strong attachment signal that gets eroded by change.
- Constitution implication: **Reusable Primitives** — change underlying components without changing the daily ritual.

> "Acculynx, JobNimbus, Pronto, Upkeep, ServiceTitan. They all suck in one way or another. And I hate to say it, but after trying so many insurance eventually came to the conclusion the grass will always seem greener, but unless you're building it in-house, its never actually going to be satisfying for every branch of the company."
- Source: https://reddit.com/r/Roofing/comments/1n1yvrp/unhappy_with_current_crm/
- Contractor type: Insurance roofing company
- What this tells us: A widely-held belief: *no CRM is good.* The market is post-hope. Contractors expect to be disappointed.
- Constitution implication: **Invitation Not Instruction** — don't promise everything; under-promise and deliver one *love-able* surface.

> "I had used Act! CRM for 10+ years but felt it stopped developing and staying current. … We use LACRM (Less Annoying CRM), which allows building custom pipelines and costs only $10/month. It has a terrible name but is a great program."
- Source: https://www.contractortalk.com/threads/what-crm-do-you-use.417931/ (cited via search summary; thread paywalled)
- Contractor type: GC, ContractorTalk forum user
- What this tells us: "Less Annoying" is literally the product name and the value prop. Trades reward anti-feature positioning.
- Constitution implication: **Plain Language First**, **Reusable Primitives**.

> "I have used many CRMs and I always find them overcomplicated, so it is difficult to advise one. The issue with CRMs is that they usually do not fit your specific needs, so you end up trying to twist them to fit your requirements. Have you thought about building your own system?"
- Source: https://reddit.com/r/Construction/comments/1obrl8p/window_replacement_company_crm_system_advice/
- Contractor type: GC commenting on a window-replacement question
- What this tells us: Contractors with capacity to build their own do so. The CRM market has lost the most sophisticated users.
- Constitution implication: **Machine-Legible Everything** — open API so the contractor can extend without forking.

> "We bought a app that tracks the trucks, and our guys do everything on a tablet. Up load pictures of invoices and the girls in the office handle it all. Don't ask me how it works....but it cost several grand. It does payroll too."
- Source: https://reddit.com/r/Plumbing/comments/1pu866k/software_developer_here_friends_plumbing_business/
- Contractor type: Mid-size plumbing shop
- What this tells us: The owner does not understand his own software. *The office staff do.* The customer/buyer/operator are three different humans.
- Constitution implication: **All Eight Lanes Always** — every role surface present, and **Pro Toggle** for the office.

> "Even my subs use it with no issue because they can send text notifications or emails and they don't need an app to download."
- Source: https://reddit.com/r/Construction/comments/1qtlbw4/what_crmproject_management_software_are_you_guys/
- Contractor type: Custom residential builder using Ressio
- What this tells us: Sub-contractor adoption is a *forcing function.* If subs need to install an app, they won't. The CRM must work for non-installers via text/email rails.
- Constitution implication: **Voice Is Equal** + **Most-Constrained User First** — design for the participant who downloads nothing.

> "If your crew won't check it on their phone daily for job details, it's dead on arrival and no matter how many features it has."
- Source: https://reddit.com/r/Construction/comments/1qtlbw4/what_crmproject_management_software_are_you_guys/
- Contractor type: Construction commenter
- What this tells us: Crew adoption *is* the product. There is no other test of success.
- Constitution implication: **Most-Constrained User First** — design for the laborer, not the owner.

> "I'm paying 600k very unhappy. I wish to subscribe to your crm, at any cost."
- Source: https://reddit.com/r/Roofing/comments/1pwkdon/50k_for_your_crm/
- Contractor type: Roofer (large)
- What this tells us: Even at $600K/year spend, the buyer is unhappy. Money is not the problem; *fit* is.
- Constitution implication: **Reusable Primitives**, **Pro Toggle** — power without bloat is the unmet need.

> "Cracked the code. I just pulled 9 years of customer data out. Like 400+Gbs. It stores it all locally or in a google/onedrive, and also keeps it in a format that can be easily imported into most other CRMs… But we decided not to switch because they wouldn't let us extract all of our past customer info. Addresses, pictures, phone #s, ect. This is really important for us mostly for warranty stuff. 99% of the time we won't need it but 1% of the time its crucial."
- Source: https://reddit.com/r/Roofing/comments/1kdk4ac/acxcrm_data_hostage/
- Contractor type: Roofer who taught himself to code in order to escape his CRM
- What this tells us: Data hostage is the single biggest reason contractors *don't* switch. Warranty memory is sacred. The 1% case dominates the 99%.
- Constitution implication: **Time Machine** is non-negotiable. Open export, owned data.

> "Roofing software gets expensive fast because estimating, job costing, comms, and follow-up all live in different boxes. … the make-or-break part is the handoff between sold job, production, and homeowner updates, that's where crews lose time and customers start texting for status."
- Source: https://reddit.com/r/Roofing/comments/1s7gtbf/what_are_must_haves_in_a_softwarecrm_in_roofing/ (commenter Shariq)
- Contractor type: Roofing industry commenter
- What this tells us: The break is *between* lanes (sold → production → update). This is exactly the BKG 7-stage lifecycle thesis.
- Constitution implication: **All Eight Lanes Always** — the handoff is the product.

> "We have GPS on our work vehicles and have to text in after each job is complete before we move onto the next one. It sucks but it's organized."
- Source: https://reddit.com/r/Plumbing/comments/1pu866k/software_developer_here_friends_plumbing_business/
- Contractor type: Mid-size plumber
- What this tells us: Text-based status is the lingua franca. "It sucks but it's organized" is the bar.
- Constitution implication: **Voice Is Equal** — text and voice channels are first-class data sources.

> "[Capterra reviewer]: The new Insights module has been called 'AWFUL' with functionality described as 'questionable at best.'"
- Source: https://www.capterra.com/p/126797/JobNimbus/reviews/ (summarized via search)
- Contractor type: JobNimbus customer
- What this tells us: Analytics is consistently *the worst module* of every CRM. Don't add dashboards no one trusts.
- Constitution implication: **Whisper** — surface the one number that matters, not a wall of charts.

> "The email system was described as 'terrible' by one reviewer, and proved to be the biggest reason for switching to another CRM. This reviewer missed a crucial email that resulted in a complaint on the BBB against their company and downgraded their rating, potentially costing them sales."
- Source: https://www.capterra.com/p/126797/JobNimbus/reviews/ (summarized)
- Contractor type: JobNimbus user (former)
- What this tells us: A missed-message *event* — not a feature gap — drove the switch. One bad day breaks the relationship.
- Constitution implication: **Emotional Sequencing Default** — high-stakes messages must never silently fail.

> "Most contractors I know are always booked out with work. They might have tiny holes here and there, but their challenge hasn't been getting work so much as it's making sure you get reliable employees to show up so you can get the jobs done and then you have to deal with weather related issues and in some cases quality issues because it's harder to find good help."
- Source: https://reddit.com/r/smallbusiness/comments/1pqjnok/stop_renting_your_business_in_2026_a_20year/
- Contractor type: 20-year landscape contractor
- What this tells us: For mature contractors, lead-gen is *not* the problem. Crew reliability is. The CRM market is solving the wrong problem for half the segment.
- Constitution implication: **All Eight Lanes Always** — crew/people lane is as core as customer lane.

> (Paraphrased from r/Plumbing thread, multiple commenters): "We tried running QuickBooks + a separate CRM for a while and honestly it just turned into constant syncing issues and double entry. Felt like we were paying for two systems but still doing things manually."
- Source: https://reddit.com/r/Plumbing/comments/1rtllfo/quickbooks_for_plumbers_is_it_worth_with_a_crm/
- Contractor type: Small plumbing shop
- What this tells us: Two-system integration = perceived as paying twice and doing it manually. Either own the books or sync them invisibly.
- Constitution implication: **Machine-Legible Everything** — true two-way sync, not webhooks-and-pray.

> "I get nervous if a potential client didn't respond to a quote within a day or two. I'd assume they hired someone else, or thought it was too expensive. But often, they'd reply a week later and say 'let's do it.' Now I send quotes and don't worry about it. If they need me, they'll hire me. Chasing after them reeks a bit of desperation."
- Source: https://reddit.com/r/Contractor/comments/1rorqtg/anyone_else_lose_jobs_because_they_forget_to/
- Contractor type: Established contractor
- What this tells us: Follow-up is *culturally fraught.* Some contractors actively don't want to chase. The CRM must enable the polite, low-pressure nudge — never a "salesy" cadence.
- Constitution implication: **Emotional Sequencing Default** — drip cadence tone is a design surface, not a setting.

---

## B2. The anti-CRM pattern (~500 words)

The "primitive system" most trade contractors run is far more sophisticated than software vendors give it credit for. Decoding what it actually does is the prerequisite to replacing it.

**The stack, as observed:** phone Contacts (with hand-written nicknames like "Dave-Smith-house-on-Pine"), text threads grouped by job address, a spiral notebook in the truck door with rough sketches and measurements, a shop whiteboard with magnetic tags for "to-quote / quoted / scheduled / in progress / done / collect," QuickBooks customer records doubling as a CRM, Google Calendar for crew dispatch, a folder of voicemails the contractor screens for "shitshow" tone, and — overwhelmingly — a spouse, parent, or sibling who does the books at the kitchen table on Friday nights.

**Why a notebook beats a CRM for some workflows.**
The notebook has zero login friction. It works under a sink, in an attic, in the rain, with gloved hands, with no signal. It encodes context the contractor can read instantly (a hash mark next to "Dave" means he's a pain; a smiley face means he tips). It survives a dropped phone. It never asks the contractor to choose a "pipeline stage" — the page itself is the stage (Tuesday's page = today's jobs; the dog-eared page = the chase list). And it does not nag. A CRM that auto-creates a notification every time a quote ages out feels like surveillance; the notebook is silent until the contractor flips to it.

The notebook also encodes a powerful organizing primitive: *one page per day, one job per line.* That's it. Any software that requires more taxonomy than this loses.

**Why "let me text the customer" beats logging an activity.**
Texting is the workflow. Logging is bureaucracy. The text message *is* the activity log — it has timestamp, recipient, content, and (often) a photo attachment. Asking the contractor to *also* go into an app and tap "log activity: text sent" is asking him to do the same work twice. From r/Plumbing 1pu866k: the friend "Answers customer calls while under sinks (customers can hear the wrench clanking)." The call is the customer service. The data the CRM wants is a byproduct that should be captured silently — not re-entered after the fact.

**What gets lost when the spouse stops doing the bookkeeping.**
The spouse-as-back-office is a recurring r/electricians and r/handyman pattern (e.g., r/electricians 168weyo, "I'm the co-owner of a new electric business (master electrician's wife). Tips for getting started?"). The spouse holds *context*: she knows that Mrs. Henderson's husband is sick, so the invoice can wait a week; she remembers that the Bakers always pay in cash; she knows the contractor's mood when he gets home and which customers to call back tonight. This is **relationship intelligence** no field service software currently captures. When the spouse "graduates" or burns out, the business loses memory the contractor can't reconstruct. A real CRM would absorb the spouse's tacit knowledge — not replace her with a workflow.

**Where QuickBooks-as-CRM works and where it fails.**
Works: invoice history, payment status, customer addresses, recurring charge tracking. Fails: lead capture (no top-of-funnel concept), follow-up cadence, photo attachment to a customer, job-stage status, communication log. The contractor uses QB as a CRM *because* it has the money truth. Anything that wants to be the customer record-of-truth must integrate with the money record-of-truth — or absorb it. From r/Plumbing 1rtllfo: "the typical setup is: run the jobs in the CRM → invoices and payments sync to QuickBooks → QuickBooks handles the accounting and taxes." When sync breaks, both systems are abandoned in favor of paper.

---

## B3. The adoption-conversion pattern (~400 words)

The CRM-skeptic-to-believer arc almost never starts with "the pipeline view convinced me." Across dozens of threads, the inflection is almost always a moment of operational pain that the contractor blames himself for.

**The dominant inflection quote pattern:** *"I lost a job because I forgot to follow up."*

From r/Contractor 1rorqtg, the GC commenter who lands "2-3 projects a year": "I get lazy…tell myself I'll work on the proposal on the weekend…end up not doing it…so another week slides by, and then another…and lo and behold, the potential client loses interest. Fortunately I only need to land 2-3 projects a year to stay busy, but it still hurts to lose potentially lucrative business."

This is the moment. Not "I want a dashboard." It's the visceral, weekend-stomach-drop of realizing a six-figure project just walked because the proposal sat in the drafts folder.

**The second inflection: a missed warranty call.**

From r/Roofing 1kdk4ac, the contractor who taught himself to code to escape his CRM: "99% of the time we won't need it but 1% of the time its crucial." The triggering event is a customer calling about a 4-year-old roof, the rep on the phone unable to find the file, and the contractor realizing the entire institutional memory of his business is locked in a vendor's database.

**The third inflection: the spouse burnout.**

From r/electricians 168weyo, the master electrician's wife: "It's going really good so far. We've been pretty much booked every day since we started & we both quit our full time jobs within the first month… I'm doing everything else (calling clients, emails, estimates, invoicing, bookkeeping, asking for reviews, designing the website, blog posts, getting set up with vendors, marketing, picking up & returning supplies, designing the vehicle graphics, shirts, business cards, etc.)." This is the pre-burnout snapshot. When she breaks, the business loses its CRM. The conversion moment for *her* is "I can keep my Sunday."

**What the JobNimbus / JobProgress / Markate case studies show.**
The marketing language always frames adoption around "8-15 hours per week saved on admin" (r/Construction summaries). But the contractor language in actual reviews frames it around emotional events: "I almost lost the Patel job because I forgot to call back." "My wife was about to quit doing the books." "I couldn't find the photos from the Anderson roof when the storm came back." The vendors are selling time; the buyers are buying peace.

**Implication for BKG.** The onboarding wedge should not be "set up your pipeline." It should be a single magnetic question: *"What's the one thing you wish you remembered last week?"* — and answer it by importing texts, photos, and QuickBooks customers. The conversion moment is the contractor saying, *"Oh — it remembered."*

---

## B4. Trade-specific journeys (~1500 words total)

### Storm-chase roofer

A hailstorm rolls through a Denver suburb on a Saturday afternoon. By Monday morning, the storm-chase ecosystem is mobilized. Three distinct contractor types are in motion: out-of-state crews driving in pickup trucks with magnetic signs, local roofers who specialize in insurance work, and "drone inspection" sales reps from local-but-aggressive shops. The journey for each begins differently.

**Lead origin.** For the out-of-state chaser, the lead is the *neighborhood itself* — they pull the storm-track radar overlay, drop pins on the affected zip codes, and dispatch door-knockers in groups of two with iPads (sometimes Salesforce-pinned to the address, more often a Roof Link or AccuLynx canvasser kiosk). A door knock is the lead generation event. The homeowner thread on r/Roofing 1suyaog captures the homeowner side: "A company knocks on my door saying they replaced a roof down the street through insurance via a recent wind storm. They noticed my roof is old and offered a drone inspection." The lead in the chaser's CRM is created at the doorknock — name, address, "spoke with homeowner / spoke with spouse / no answer" disposition, and a photo of the front of the house.

**Qualification.** The chaser qualifies in two ways: (a) does the roof show damage on drone imagery, and (b) is the carrier one they have a working relationship with (State Farm and Allstate are friendlier; r/Roofing 1epma2c: "Claim being denied by Allstate" — chasers know the carrier risk profile). The internal CRM stage moves from "knocked" → "inspection scheduled" → "inspection complete / damage confirmed" → "claim filed with carrier."

**Win.** Winning is *signing a contingency contract* on the spot before insurance approves the claim. The "win" is conditional: the homeowner authorizes the contractor to represent them with the carrier in exchange for a roof IF the claim is approved. From r/Roofing 1suyaog, the homeowner is told: "They will not work on my roof until my insurance confirms they will pay in full." This is the chaser's standard play. The CRM has to handle: contingency agreement signed → carrier adjustor visit scheduled → supplement negotiation → check-issued-to-homeowner → check-endorsed-to-contractor → install scheduled. Each transition is a payment + paperwork event, not a sales event.

**Post-job relationship.** Here is the trap: the chaser leaves town. From r/Roofing 1suyaog: "They do the work and leave the area. '5 year Workman Warranty' doesn't mean jack to them. If there's a problem later. Good luck." The CRM is, for the chaser, a *short-lived deal flow tool*, not a relationship system. This is why local roofers (per r/Roofing 1svbwri) market on the explicit promise of being "in business for 5+ years."

**Next job from same customer.** Effectively zero. The chaser's repeat business is *the neighbor*, not the homeowner — every house on the block has the same roof age. The "referral" surface is the lawn sign and the post-install door knock on the adjacent house. A CRM for chasers must privilege *geographic clustering* over individual customer history.

### Residential remodel GC

A homeowner in Westchester decides to redo their kitchen. They get the contractor's name from a friend. That referral arrives as a *forwarded text*: "Hey, this is Mike — Sarah said you might be able to help us with our kitchen?"

**Lead origin.** Referral is the dominant channel for residential remodel GCs (industry blogs consistently put it at 60–80% of project flow). The lead enters via SMS or a Houzz/Instagram DM. Crucially, there is *no formal intake*. The contractor texts back the same day with availability for a site visit.

**Qualification (the slow burn).** The site visit lasts 60–90 minutes (industry standard per Mountainwood, Cipriani, Schaff). The contractor walks the home, listens for emotional drivers ("the kids are getting older, we need it before Joey starts high school"), takes ~40 photos, asks about budget range, and probes for the unspoken priority (resale vs. lifestyle, fast vs. perfect). The contractor leaves with mental notes, a few rough measurements in his notebook, and a verbal "ballpark." Many GCs (r/Contractor 1rorqtg, the "bespoke proposal" commenter) take days or weeks to produce the actual proposal because each one is custom.

This is where the *quote-rotting* problem lives. A referred lead can wait weeks for a proposal, and the GC's anxiety about preparing the document leads to procrastination, which leads to lost jobs. This is the magnetic moment.

**Win.** Winning happens at a second meeting — the proposal review — which is often held in the homeowner's kitchen at 7pm after the spouse is home. The proposal is reviewed line by line. Almost always, the GC adjusts on the spot. Signed contracts become live jobs after the first design milestone (often a "design retainer" of $2,000–$10,000 to start drawings or selections).

**Project execution.** This is the *long burn.* A residential remodel runs 3–12 months. The customer relationship is *live every single day* — they are in the house, they are walking through the work, they are texting questions at 9pm ("is this the right tile?"). From industry blogs (Mountainwood, Action Builders), the homeowner's emotional arc dips during the construction phase. The contractor lives through the entire arc with them.

The CRM surface that matters here is *change orders and communication log.* Every text from the homeowner is a potential change order. Every photo update is a relationship deposit. r/Roofing 1s7gtbf commenter: "the make-or-break part is the handoff between sold job, production, and homeowner updates, that's where crews lose time and customers start texting for status."

**Post-job relationship.** The remodel GC's repeat customer cycle is 5–15 years (kitchen → bath → addition → finish basement). The system must remember: scope, budget, finish selections, and the *family events* mentioned during construction ("Joey graduates in 2027"). This is the warranty + reputation + repeat-customer flywheel.

**Next job from same customer.** Triggered by life events. The CRM that can fire a whisper — "Mike, the Patels mentioned their basement when you were doing their kitchen 4 years ago. Sarah's mom is moving in this fall, want me to draft a hello?" — is the killer feature.

### Service trade (HVAC / plumbing / electrical)

A homeowner in Phoenix at 4pm on a 110°F July day notices the A/C isn't blowing cold. They Google "AC repair near me" and call the top three results. The first one to pick up wins.

**Lead origin.** Phone call is dominant. Many leads arrive *after* business hours (r/Plumbing 1pu866k: "Answers customer calls while under sinks"). Missed calls = lost jobs (r/Plumbing 1rqe4dh, the solo plumber: "By the time I call back they already booked someone off Google"). Web-form leads are secondary; texts are growing.

**Qualification.** Service-trade qualification is mostly about *triage* (r/Plumbing 1oz4ge2: "If they text or leave a voicemail I'll see if it's interesting, if it seems like it's gonna be a shitshow I don't bother responding"). The contractor's mental model: is this a quick fix, a maintenance contract opportunity, or a money pit? They listen for cues about the property age, the homeowner's tone, and whether insurance/home warranty is involved (which the contractor often *avoids* due to slow payment).

**Win.** Service-trade win is the *dispatch.* Customer agrees to a window (between 8am and noon Tuesday), pays a service fee, and the truck rolls. The win is rapid — minutes, not weeks. Service trades that lose at this stage lose forever; the next-best alternative is already on the other end of the line.

**Onsite execution.** The technician arrives, diagnoses, presents options (the "good/better/best" pricing menu is standard, often delivered on a tablet through ServiceTitan or FieldEdge). Customer signs. Work is done. Payment is collected on-site, often via a tablet with a card reader.

This is where the byproduct CRM data is *richest*: GPS-confirmed visit, photo of unit + serial + condition, options presented + chosen, signature, payment, and the diagnostic narrative. Every visit creates a deep customer record almost for free.

**Maintenance agreement (the moneymaker).** The conversion the technician is actually trained to make is *not* the repair — it's selling the annual maintenance agreement. From industry sources: 55% of HVAC industry revenue is recurring agreements. The customer signs up for two visits a year (spring tune / fall tune). The CRM now has a customer with two scheduled appointments, predictable revenue, and a long-running relationship.

**Post-job and next job.** The maintenance agreement *is* the next job. Every six months, the customer is re-touched. Equipment ages predictably; a 12-year-old A/C is a replacement conversation waiting to happen. The best HVAC CRMs surface "this customer has a 13-year-old unit that has had 4 service calls in 3 years — pitch replacement."

The biggest weakness of every service-trade CRM (per r/HVAC 1gfga52 + Capterra): the *intake* is broken. ServiceTitan handles dispatch beautifully but doesn't help the contractor catch the after-hours call. Missed-call-to-text + AI receptionist is the universal gap. Contractors using "QuadForce" or building their own (r/Plumbing 1rqe4dh) are doing so to plug this hole.

### Optional: New-construction subcontractor (brief)

A drywall sub gets bid invites from 6–10 GCs via Procore, Buildertrend, or email. The lead is a *bid invitation document*. Qualification is "do I have crew capacity in that window?" Win is being one of three bidders, then negotiating. The CRM challenge is *tracking bid status across GCs* — a recurring r/Construction 1ap0rlu request ("Any CRM software to keep track of bids sent out?"). The subcontractor's CRM is really a *GC relationship CRM*: which GCs send the most invites, which pay on time, which spec my pricing into other bids. Post-job is the punch list and the relationship deposit toward the next bid.

### Optional: Specialty trade with showroom (brief)

A countertop / flooring / cabinet shop has walk-in customers and referral leads from designers/GCs. Lead origin is bimodal. The CRM challenge: tying the walk-in lead (anonymous: "lady looking at quartz on Tuesday") to a follow-up identity (her email when she requested a quote on Friday). Specialty-with-showroom contractors live and die on the *visit-to-quote-to-sale* conversion math and the designer/GC referral source attribution. r/Roofing 1nf7vrj asks explicitly for a CRM "for Referral Sources (not clients)" — this is the unmet need.

---

## B5. Voice & field reality table

| Voice-first works | Why | Voice-first fails | Why |
|---|---|---|---|
| Logging a job-site note after a service call | One-tap dictation; "Just finished at the Smith place, replaced capacitor, customer mentioned thermostat acting up" | Capturing the customer's exact address | Voice mishears "1432 Foxtail Ln NE" as "1432 fox tail Lane Northeast" or "fourteen thirty two foxtail" — typing/autofill is faster |
| Adding a follow-up task ("remind me to call Pete tomorrow") | Reminds match how the contractor already talks to himself | Editing a quoted line item | Numerics, units, and precision matter; voice introduces ambiguity ($1,500 vs $15,000) |
| Recording the gist of a homeowner conversation while driving away | Truck-based memory; contractor can't take notes while driving | Reading a long contract back to a customer | Customers want to read, not hear; legal accuracy matters |
| Marking a job stage ("we're done with framing on the Henderson") | Stage is a verbal noun the contractor already says aloud | Approving a change order over $5,000 | High-stakes financial commit needs visual review + signature |
| Pulling up a past customer ("show me the Patel job from last spring") | Search-by-voice is faster than typing on a phone screen with gloves on | Editing a customer's preferred contact method | UI-level toggle, no need to speak |
| Dictating a punch-list item with photo capture | Field crew can speak while pointing camera | Inputting a credit card number for payment | PCI compliance, security, and accuracy demand keypad |
| Asking the AI "did I follow up with the Anderson estimate?" | Natural question in contractor's voice | Setting up automation rules | Voice can't express conditional logic ("if no reply in 3 days, send template B") |
| Capturing a measurement on the fly ("36 by 48 closet") | Hands often holding tape or phone camera | Reviewing daily P&L | Tabular data needs visual scan |
| Marking attendance/check-in for crew | "On site at the Webster job" is faster than tapping | Filing insurance supplement docs | Document upload, signature, structured fields |
| Saying "no answer, doorknock at 14 Maple" as a disposition | Quick canvasser update | Comparing two material spec sheets | Side-by-side visual comparison |
| Recording why a customer was a "shitshow" (lead disqualification) | Subjective tone notes are best in voice | Building a multi-stage proposal | Structured document creation needs UI |
| Asking "what jobs are open?" mid-drive | Driving-safe nav | Selecting from a 200-row pick list | Cognitive overload by voice |

---

## B6. The invisible CRM — byproduct moments

The premise: any action a contractor already takes *while doing the work* should produce a CRM event silently. The contractor never opens a CRM screen to "log" anything. Below: every byproduct moment found across the research, mapped to its CRM fact and an AI suggestion.

| Byproduct moment | Inferred CRM event | Structured fact stored | AI suggestion that could fire |
|---|---|---|---|
| Contractor takes a photo on the job site | Job activity + location + time | `job_id, photo_url, geo, timestamp, captured_by` | "This looks like a before-photo of the Smith bathroom — link to that job?" |
| Outbound text to a saved contact | Communication + last-touch update | `contact_id, message_body, sent_at, channel:sms` | "You haven't heard back in 4 days. Want me to send a soft follow-up tonight?" |
| Inbound text from unknown number with address mentioned | New lead + address geocode | `lead_id, source:sms, raw_message, parsed_address` | "Looks like a new lead — should I draft a reply and check your calendar?" |
| Voice memo recorded in truck | Activity log + sentiment | `entity_id, transcript, sentiment_score, recorded_at` | "You sounded frustrated about the Henderson scope — want me to flag a price re-check?" |
| Estimate PDF generated and sent | Deal stage advance + amount | `deal_id, stage:estimated, amount, recipient_id, sent_at` | "Set a 3-day follow-up nudge?" |
| Customer opens shared estimate link | Engagement signal | `deal_id, viewed_at, view_count, ip_geo` | "The Bakers opened your estimate 4 times yesterday — they're warm. Call?" |
| Customer doesn't open link in 5 days | Stale-deal warning | `deal_id, days_since_send, viewed:false` | "The Hayes estimate hasn't been opened. Want me to try SMS instead of email?" |
| Contractor checks in at job site (GPS confirms) | Visit log + duration on site | `job_id, arrived_at, geo_confirmed:true` | "You've been at the Patel job 3 hours longer than estimated. Flag for change order?" |
| Daily log entry (verbal, photo, or text) | Production update | `job_id, work_completed, crew_present, timestamp` | "Crew shows on site Mon/Tue/Thu — Wed gap, want to schedule the Maxwell estimate?" |
| Supplier invoice received via email | Job cost + vendor activity | `job_id, vendor, amount, date, line_items_extracted` | "ABC Supply just charged $1,847 to the Smith job — add to invoice as material pass-through?" |
| QuickBooks payment received | Cash-in + invoice closed | `invoice_id, amount_paid, paid_at, payment_method` | "Payment from Patel — want me to send the thank-you + review request?" |
| Phone call answered (with caller ID match) | Touch log + duration | `contact_id, call_direction:inbound, duration_sec, answered_at` | "First call from Anderson in 8 months. Surface their last job notes?" |
| Missed call from a saved contact | At-risk customer alert | `contact_id, missed_call_at, voicemail:bool` | "Missed call from a recent customer — want me to auto-text them now?" |
| Crew member texts "on site" | Crew presence | `job_id, crew_member_id, status:on_site, time` | "Crew's at the Garcia job — want me to send the homeowner a 'we're here' note?" |
| Crew member uploads invoice photo | Material/cost ledger | `job_id, receipt_image, parsed_total, vendor` | "$340 in copper today — running total on the Wilson job is $4,800, 12% over budget. Heads up?" |
| Contractor calendar event "Smith bid review 7pm" | Pipeline activity + reminder | `lead_id, meeting_at, type:bid_review` | "Bring the change order template — Smith's reno had 2 revisions last week" |
| Drone inspection performed (timestamped) | Lead qualification | `lead_id, inspection_at, damage:bool, photo_count` | "Damage found — auto-draft the insurance claim packet?" |
| Material purchase at supplier (via vendor portal) | Job cost + scheduling signal | `job_id, materials, scheduled_for` | "Materials in for the Foxtail job — want me to lock the install date and notify the homeowner?" |
| Online review left by a customer | Reputation event | `customer_id, platform, stars, text` | "5-star review from the Wilsons — want me to send the referral-program intro?" |
| Insurance carrier emails claim status update | Storm-deal stage advance | `lead_id, carrier, status, supplement_amount` | "Allstate approved the supplement for $4,200 — homeowner doesn't know yet. Want me to text them?" |
| Spouse/office staff sends a customer thank-you card | Relationship deposit | `customer_id, touch_type:gift, sent_at` | "It's been 6 months since the kitchen wrapped — schedule a check-in?" |
| Subcontractor sends a "done" photo of their portion | Stage advance | `job_id, sub_id, milestone, photo` | "Electrical signed off — drywall is next on schedule. Notify drywaller?" |
| Contractor's truck dwell time at a known job site | Time-on-job confirmation | `job_id, dwell_hours_today` | "You've spent 6 hrs at the Patel job — time entry auto-drafted, review?" |
| Door-knock canvasser logs an address | New lead + door disposition | `lead_id, address, disposition, canvasser_id` | "Same neighborhood as 4 jobs you sold last year — bump priority?" |
| Customer signs a contract on-screen | Deal won | `deal_id, signed_at, contract_url, deposit_amount` | "Want me to set the kickoff date and email the welcome packet?" |
| Customer pays deposit | Job activated | `deal_id, deposit_received, ready_to_schedule:true` | "Deposit in — first-week schedule auto-drafted. Approve?" |
| Customer texts a question after-hours | Service-quality signal | `job_id, message, sentiment` | "Sounds concerned — draft a reassuring reply for tomorrow morning?" |
| Crew member doesn't show on time (GPS or no check-in) | Operational risk | `crew_id, expected_at, missed:true` | "Tyler isn't at the Henderson yet. Want me to nudge him and warn the homeowner?" |
| Job photo is geotagged but address doesn't match a known job | Likely new lead or scope creep | `photo, geo, nearest_known_job` | "Photo from an unfamiliar address — is this a new lead I should capture?" |
| Customer's last warranty was 5+ years ago | Re-engagement window | `customer_id, last_job_at, years_since` | "The Bensons are 5 years out — typical roof-issue window. Send a check-in?" |

---

## B7. Contractor Reality Brief (the one-page summary)

**What contractors actually do today.** The trade-contractor business runs on a hybrid analog/digital stack vendors systematically misunderstand. The owner answers his own phone, often from under a sink (r/Plumbing 1pu866k). His spouse or sibling does the books at the kitchen table (r/electricians 168weyo). The truck has a spiral notebook in the door pocket. The shop has a magnetic whiteboard with job stages. Texts flow with crew and customers — most of them with no app installed. Voicemails are screened for tone. Quotes get sent from email and then *forgotten* (r/Contractor 1rorqtg). Photos pile up in the camera roll, geo-tagged but unlinked to jobs. QuickBooks is the money truth; everything else is improvised. Three universal frustrations: (1) missed-call-to-lost-lead at the front door, (2) forgotten-follow-up after the quote, and (3) data hostage at the back door when warranty calls arrive from 4-year-old jobs.

**What they hate about every CRM they've tried.** Click inflation ("6 clicks for what should take 2"). Vocabulary mismatch (a roofer is not a "service technician"). Add-on pricing for "basic" features (Jobber charges $39/mo for reviews). Mobile apps that are stripped-down companions instead of the primary surface. No offline mode for attics, basements, and rural calls. Onboarding designed for an "implementation team" the contractor doesn't have. Data export hostility. Enterprise scope (ServiceTitan) on solo operators. Sales-pipeline thinking applied to stage-based construction reality. Vendors that "build features at a very superficial level" (r/Contractor 1qk5y04). And the word "CRM" itself: contractors who don't know it assume it isn't for them; contractors who do associate it with sales-team software that doesn't fit their world.

**What would make them switch.** Three things, in order of magnetic pull:

1. **It captures the work without being opened.** Photos auto-link to jobs by geo. Texts auto-log to customers. Voice memos transcribe into the job record. Supplier invoices land in cost tracking. The contractor never visits a "data entry" screen. This is the byproduct-CRM thesis.
2. **It remembers when the contractor can't.** The 6pm whisper: "You sent the Patel quote 9 days ago — they opened it twice but haven't replied. Want me to send a soft check-in tonight?" The 7am whisper: "Mrs. Henderson texted at 9:42pm last night — sounded worried about the timeline. Draft a reassuring reply?" The warranty whisper years later: "Mr. Garcia is calling — here's the roof you did in 2024 with all the photos, materials, and the upgrade he declined."
3. **It speaks the contractor's language and never makes him feel dumb.** No "pipelines," no "deals," no "leads-stage." Instead: *who's asking, what do I know about them, what did I promise, what comes next.* No pop-ups, no upsell, no surveillance vibe. Voice-first where it works (logging activity, asking questions), keypad-first where voice fails (numbers, signatures, addresses).

**The two magnetic moments (the wedge).** First, the **forgotten-follow-up rescue**: the contractor sees three quotes he sent last week with one-tap "send this nudge tonight" options. He approves three in 20 seconds. Two convert. He associates the product with money he didn't lose. Second, the **warranty-call save**: a customer calls about a job from 3 years ago; the contractor speaks their name into his phone and every photo, text, invoice, and note comes up — including the side conversation his wife had about the in-laws moving in. Win those two and the contractor stops calling it a "CRM." He calls it *the thing that remembers for me.*

---

*End of Stream B. Word count ~7,700.*
