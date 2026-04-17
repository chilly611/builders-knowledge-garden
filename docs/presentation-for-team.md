# The Killer App — What We Just Figured Out

**A presentation for John Bou and the team.**
**Authored April 17, 2026 by Chilly after a long night with the prototype.**

---

## The Short Version

We have a prototype at `chilly611.github.io/bkg-killer-app/`. It's v3.2. It's gamified like a video game — quests, levels, XP, the whole thing.

**Tonight I read it line by line. Here's what I found:**

The game part is wrong. The content underneath is gold.

Underneath the quest wrapper: **eleven real contractor workflows**, each with 4-6 steps, each with slots for real AI analysis — code compliance, contract templates, estimating, sub management, supply chain, crew sizing, bid comparison. Whoever designed this understood what contractors actually do.

The game wrapper on top — quests, levels, earn-XP-to-unlock — is too linear for how construction actually works. Contractors don't play campaigns. They juggle jobs. They skip around. They work out of order.

**So we're keeping the content, rebuilding the wrapper, and using this as the foundation of a post-revenue Killer App.**

---

## What We Decided

### The Killer App is one of three BKG surfaces — all of them freely navigable

- **Dream** — free tier. Anyone with an idea. Fourteen-ish interfaces we're converging on the best few.
- **Design** — the bridge. Rendered images → blueprints → CAD → 3D digital twins you can walk through.
- **Killer App** — pro tier. Paid. Where work happens.

Pros and workers can visit Dream whenever they want. Dreamers can peek at the Killer App. Nothing is locked.

### The Killer App has a seven-stage lifecycle

```
Size Up  →  Lock  →  Plan  →  Build  →  Adapt  →  Collect  →  Reflect
```

The prototype called stage one "Scout" and opened with risk assessment. Wrong move — that's what lawyers do, not builders. We renamed it **Size Up** so the app opens with estimating and finding good materials, not with figuring out what might go wrong.

### The gamification gets reframed, not deleted

**XP becomes a lifetime tally of real contribution.** Every estimate, every code citation, every photo, every resolved RFI — adds XP forever. No level gates, no "unlock this at 500 XP." XP accumulates and **converts to something real**: BKG certifications, verified profiles, contractor trust scores, public credentials. The gamification serves the user's career, not our engagement metrics.

**Ranks become titles earned through real work.** "Code Scholar." "Estimator." "Template Maker." "Knowledge Contributor." Honors what someone actually did, not how much grinding they did in our game.

### The AI specialists get wired up — and become a product

The prototype has 15+ drafted specialist prompts: code compliance, electrical NEC, estimating, crew sizing, supply chain, bid analysis. They're not wired to a real LLM in the prototype — they're sketches.

We wire them up. We rewrite them with BKG voice and database awareness. And we package them as a product:

**Building Intelligence** — our library of AI specialists, exposed via MCP and REST API, sold to developers building AI agents for construction. Every time someone builds a contech AI tool, they could call BKG's code-compliance specialist, our estimating specialist, our bid-analysis specialist. We become infrastructure.

### The visual language simplifies

- **Muted gray** = not started
- **Warm orange (`#D85A30`)** = in progress (same color as Dream Machine — warm energy)
- **Teal (`#14B8A6`)** = complete (cool, settled, resolved)

The Knowledge Garden green stays as our brand chrome, separate from task status. Cleaner.

---

## The 6-Week Plan to First Paying Customer

This is the part that changes the fundraising conversation. Instead of raising as "pre-revenue," we raise as "we have paying customers in two markets."

### Weeks 1-2 — First paying customer

Ship Code Compliance Lookup (the $55K-mistake use case) and Contract Templates for our trusted contractor. He becomes customer #1 at $99/mo. Real AI, real database, real money.

### Weeks 3-4 — Three paying customers

Ship Size Up (rebuilt estimating + sourcing). Our contractor refers two more. Price at $149/mo. Monthly recurring revenue starts to actually look like a business.

### Weeks 5-6 — First API customer

Launch **Building Intelligence** as an MCP-exposed developer product. Five specialist prompts available. Announce to Claude and OpenAI developer communities. Price: $0.50 per call, $500/mo enterprise. One integration = first API revenue.

**Target by Week 6:** ~$1-2k MRR across both markets. Not huge money, but not zero. The binary flip from pre-revenue to post-revenue is what matters for fundraising.

---

## What I'm Asking You (John, team) to React To

These are the questions where I want your pushback, not your agreement.

**1. Does "Size Up" actually sound right in a contractor's ear?**
My gut says yes — "let me go size this up" is how contractors actually talk. But you know these people. If you think it's wrong, tell me.

**2. Is the XP-to-certification path believable?**
The whole reframe depends on the idea that accumulated XP can convert to credentials contractors actually value. Does that require partnering with AGC, NAHB, a licensing board? Can BKG self-issue something meaningful? Who's the certification authority?

**3. Is 6 weeks to first paying customer too fast, right, or too slow?**
Being post-revenue before fundraising is worth maybe $5-15M in valuation and much better term sheet terms. But it costs build focus. Tell me if the timeline is wrong.

**4. Does "Building Intelligence" as a product name work?**
Triple meaning — the intelligence of building, AI intelligence, and the ongoing act of building intelligence itself. But I haven't trademarked it, haven't checked if someone else uses it, haven't sanity-checked with any developers. Does it land?

**5. Who reviews our contract templates before we sell them?**
The moment we charge money for a contract template, flawed output becomes real liability. Need a lawyer's review or careful framing ("starting point for your attorney's review, not ready-to-sign"). Who handles this?

**6. Is "port all 11+ workflows eventually" the right commitment, or should we trim?**
It's tempting to say every workflow is precious. Some probably aren't. Which ones do you'd cut? Which ones are missing from the prototype that we need?

---

## Where the Full Detail Lives

- **`docs/killer-app-direction.md`** — the engineering-grade inventory, full decisions log, porting sequence, all 18+ locked decisions with technical specs
- **`docs/revenue-plan.md`** — week-by-week build-and-ship plan for the 6-week post-revenue path
- **`docs/design-draft-v0.1.md`** — the BKG design draft (ten goals + Goal 11 about the database moat) — the foundational philosophy this Killer App work sits inside
- **`chilly611.github.io/bkg-killer-app/`** — the prototype itself, live, so you can see what we're porting

---

## The Honest Note

This document was written at 2:30am. I've been making decisions for seven hours straight. The decisions feel right. They'll look different in the morning.

I'd rather you see the raw thinking now than wait for a polished version next week. **Push back freely.** The whole point of sharing this tonight is that nothing here is committed to code yet. Words on a screen are cheap. Let's make them right before we make them real.

— Chilly
