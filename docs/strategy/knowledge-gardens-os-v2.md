# Knowledge Gardens — Operating System

**Version:** 2.0 · 2026-05-25
**Scope:** Platform-level architecture. The companion to `FRONTIER_MAP_PORTABLE.md` (the canonical garden roster).
**Read at session start in every garden** — BKG, OKG, TKG, HKG, MKG, and every garden that follows.

---

## The moat — lead every doc with this paragraph

**The RSI Heartbeat is the platform.** One self-improving knowledge graph per garden, ingesting source data on a domain cadence (HKG monthly · PKG weekly · BKG continuous from contractor activity), re-verifying every entity, surfacing freshness on every claim, learning from use. The platform doesn't hold knowledge — it improves itself in public. Every other platform in our space holds static data and ages. We get more right every week. **That is the moat in the AI era.**

This paragraph leads every doc, every project instruction, every onboarding brief, every investor narrative.

---

## The OS thesis (one paragraph)

The Knowledge Gardens is a domain-agnostic knowledge intelligence platform. One architecture — **four lanes × three surfaces × one self-improving knowledge graph** — deployed across 55 domains where knowledge is fragmented and verification is non-negotiable. Three gardens are live (OKG / BKG / TKG), two are building (HKG / MKG), ten industry verticals are scoped post-seed, forty research-grade Frontier gardens sit parked behind a strict gate: **frontier gardens do not get built until HKG and BKG generate MRR.** Every garden inherits the same skeleton; the skin changes per domain. The investor line is *"the ground truth AI needs to survive."* The internal line is *"the pattern that builds products."*

---

## The architecture

### 4 lanes (audience — universal across every garden)

| Lane | Primary surface | What it sells |
|---|---|---|
| **Administrator** | Red — Killer App | Mandatory compliance · credentialing · operations SaaS — *the cash engine* |
| **Professional** | Green — Knowledge Garden | Subscriptions + marketplace · CME · career tools |
| **Public** | Gold — Dream Machine | Free gravity-well tools · premium consumer subscriptions |
| **Machine** | Cross-surface | API · MCP server · data licensing · JSON-LD citations |

Per-garden sub-lanes nest inside these four. BKG has 8 (GC, DIY, Specialty, Supplier, Equipment, Service, Worker, Robot). HKG has its own set (Hospital admin, Provider, Patient, Researcher, Agent). Every garden defines its own sub-lanes; the four umbrella lanes are universal.

### 3 surfaces (mindset)

| Surface | Vibe | Cardinal feature |
|---|---|---|
| **Gold · Dream Machine** | Aspirational · concierge · warm gradients · generous whitespace | Emotional Arc |
| **Green · Knowledge Garden** | Scientific · verified · cool palette · citation-rich | TrustStrip + Three-Source Rule |
| **Red · Killer App** | Operational · urgent · high-contrast · status-aware | Tempo Adapt |

Every garden manifests as one or more of these three surfaces. Some gardens ship all three (BKG); some are surface-specific (MKG is Patient-Lane-only, sub-brand under HKG).

### 1 self-improving knowledge graph per garden

Fed by the RSI Heartbeat. Cadence varies by domain. Every entity JSON-LD addressable. Every claim cites ≥ 3 sources. Every garden serves `llms.txt` + a namespaced MCP server endpoint.

### 55 gardens (see FRONTIER_MAP_PORTABLE.md for the full roster)

3 deployed · 2 building · 10 industry-scoped post-seed · 40 frontier (5 tiers, gated until HKG + BKG MRR).

---

## The Pattern Language (20 pieces — all in for 2026)

### 7 constitutional primitives *(existing — see `design-constitution.md` in the BKG repo)*
Invitation Card · Emotional Arc · Whisper · Time Machine · Ask Anything · Pro Toggle · Progressive Reveal.

### 4 platform primitives *(baked into every garden by federation contract)*
**TrustStrip** — source count + freshness + contested-claim indicator on every primary claim · **Three-Source Rule** — ≥ 3 sources or it doesn't render as authoritative · **Federation Contract** — umbrella header/footer + parchment + Cormorant/Space Mono + cross-link + JSON-LD + llms.txt + MCP endpoint · **Machine-Legible Everything** — the Machine Lane is never an afterthought.

### 9 dimensional renderings *(new for 2026)*
Pro Toggle · Infinite Descent · Modality Mirror · Tempo Adapt · Cultural Render · Accessibility Adapt · Cross-Surface Bridge · Lifecycle Memory · Trust Posture Adapt.

### Stance Card *(operational mechanism)*
Structured user-state snapshot covering 14 axes: domain · surface · stage · lane · skill_signal · modality · device · tempo · emotional_signal · locale · accessibility · economic_signal · time_horizon · trust_posture. Every primitive reads it. Every agent reads it. This is what "all four lanes always" means in code.

---

## Brand spine (non-negotiable — from `02_BRANDING.md`)

- **Background.** Parchment `#F5F0E8` or `#EFE8DC`. Never dark, except Garden Wars and BKG Killer App.
- **Type.** Cormorant Garamond display · Space Mono technical. Never Inter / Roboto / SF Pro / Arial.
- **Metals.** Copper `#B87333` primary · Steel `#71797E` secondary. Never brass/gold for UI chrome.
- **Per-garden accent.** Each garden gets a primary + accent + personality (see frontier map for the table).
- **Brand test.** *"Would a curator at the Royal Botanic Gardens AND a staff engineer at Stripe both respect this?"* If no, back to the drawing board.

---

## Voice spine

**Do say.** *"Evidence suggests..."* · *"Verified against 3 sources"* · *"Updated 4 hours ago"* · *"The knowledge graph connects..."* · *"Ground truth for..."*

**Don't say.** *"We think..."* · *"Trust us"* · *"Disrupting [industry]"* · *"Our AI believes..."*

In marketing: lead with the problem · then the pattern · then the proof · end with an invitation. In product: lead with the answer · then the verification · then the source · never make the user hunt for credibility.

BKG-specific addendum: `02_BRANDING_AIKIDO_ADDENDUM.md` for the `#aikidotheAI` voice philosophy.

---

## Domain portability — what survives, what varies

**Survives every garden:** the constitution, the 20 Pattern Language pieces, the Stance Card, the RSI Heartbeat mechanism, auth + security, federation contract, brand spine, the wisdom-of-the-ages reference set.

**Varies per garden:** knowledge graph schema (codes vs species vs compounds vs case law) · lifecycle stage names (BKG: Size Up → Reflect; OKG: Identify → Cultivate → Bloom; TKG: Exposure → Diagnose → Treat → Monitor) · workflow atoms · marketplace structure · regulatory authorities · accent palette · sub-lane definitions.

**Negotiable per garden:** the number and identity of sub-lanes within the four umbrella lanes. Every garden defines its own; the pattern of having sub-lanes is universal.

---

## How to use this doc

1. **At the start of every garden session** (BKG, OKG, TKG, HKG, MKG, future), read this doc first, then `FRONTIER_MAP_PORTABLE.md`, then the garden's own `PROJECT_STATE.md` and `architecture.md`.
2. **Before designing a new workflow in any garden,** state which primitives and renderings it composes from. Use the Stance Card to think through what each of the four umbrella lanes sees at Floor 0.
3. **Before shipping a new surface,** walk the constitution's ten goals plus the relevant dimensional renderings. If any fails, the surface is not ready.
4. **When a design choice is ambiguous,** the constitution breaks ties at the goal level; this doc breaks ties at the pattern level; the garden's own PROJECT_STATE breaks ties at the domain level.
5. **Changes to this doc** require an explicit umbrella-level session scoped as a platform revision. Do not amend in passing.

---

## Wisdom-of-the-ages — eight teachers

Christopher Alexander · Edward Tufte · Donald Norman · Bret Victor · Frank Lloyd Wright · Mister Rogers · Toyota Lean · Steve Jobs and Jony Ive. Each names a load-bearing principle. Full citations in `lane-stance-strategy-v3.md` in the BKG repo.

---

## Current focus

**Active build (May 2026):** BKG Killer App UX rehaul. Tool: Claude Design (subject to enablement verification) or Cowork with parallel agents on the existing Next.js codebase. Pattern Language application: every rebuilt surface composes from the 20-piece language. Every workflow answers the four umbrella lanes' Floor 0 questions before code.

**Adjacent:** HKG MLP build · Patient Lane gravity well · MKG integration with HKG Supabase · OKG Orrery navigation · BKG paywall to first 10 paying contractors.

---

## Source documents

| File | What it gives you |
|---|---|
| `FRONTIER_MAP_PORTABLE.md` | The 55-garden roster, federation contract, brand system |
| `PROJECT_STATE.md` | Current state across all gardens · founders · partners · committed strategy |
| `02_BRANDING.md` + `02_BRANDING_AIKIDO_ADDENDUM.md` | Full brand system · per-garden palettes · voice playbook |
| `THE_KNOWLEDGE_GARDENS_MASTERDOC.pdf` | Consolidated single-doc reference |
| `KG_Strategic_Playbook.md` | Go-to-market playbook · path to $1T narrative |
| `12_GARDEN_PLAYBOOK.md` | Brief template every garden follows |
| `tasks.lessons.md` | Accumulated process lessons (read at every session start) |
| `lane-stance-strategy-v3.md` *(BKG repo)* | The v3 strategy memo and the 14-dimension state space |
| `design-constitution.md` *(BKG repo)* | The seven primitives and ten goals — the design law |

— end —
