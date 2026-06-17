# Builder's Knowledge Garden — Full Platform Site Map
*Canonical reference for every destination across the garden ecosystem. Includes live, demo, prototype, hidden, internal, and retired routes — so we always know what exists and why.*

**Last verified:** 2026-06-17 · **Maintainer:** founder + Claude Code sessions
**How to use:** this is the master index. Status reflects best-known state on the date above — **smoke-test green ≠ product works; re-verify in a real browser before any live demo.**

### Status legend
| Mark | Meaning |
|---|---|
| 🟢 | **Live** — built-out, demo-ready |
| 🟡 | **Functional demo** — works, demo-grade data/partial polish |
| 🔵 | **Prototype** — experimental surface, not production |
| ⚪ | **Stub** — placeholder / "coming soon" / scaffold |
| 🔴 | **Hidden** — intentionally de-linked + noindexed (not for demo) |
| 🗄️ | **Archived** — retired, redirects or kept for history |
| 🔒 | **Internal** — admin/ops only, never shown to prospects |
| 🔌 | **API** — machine endpoint, no UI |

### Reviewer tags
🏛️ Investor · 📣 Marketing · ⚖️ Legal · 🎨 UX · 🔨 Contractor (domain accuracy) · ⚙️ Ops · 🧑‍💻 CTO/Eng · ✅ Founder sign-off

---

## A · The garden ecosystem — separate sites (the umbrella / business-plan pitch)

| Status | Destination | What it is | Why it was built | Review |
|---|---|---|---|---|
| 🟢 | **https://theknowledgegardens.com/** | Umbrella landing — cinematic descent through the six core ideas into the living registry / OS / 59-garden atlas | Top-of-funnel vision story (the ground-truth AI infrastructure behind everything) | 🏛️ 📣 |
| 🟢 | **https://frontiermap.theknowledgegardens.com/** | The **Frontier Map** — 59-garden atlas + pattern language + deployment roadmap | The authoritative "what the whole platform becomes" map | 🏛️ |
| 🟢 | https://frontiermap.theknowledgegardens.com/**john** | **John's Field Brief & demo script** | Built as the briefing/demo path for John specifically — *start here for him* | ✅ 🏛️ |
| 🟢 | https://frontiermap.theknowledgegardens.com/**walkthrough** | "Four screens. One conversation" guided narrative | Linear story for a live walkthrough | 🏛️ 📣 |
| 🟢 | https://frontiermap.theknowledgegardens.com/**theKnowledgeGardensOS** | The Knowledge Gardens OS (Strategy v3) deep-dive | The OS/strategy layer for technical+investor audiences | 🏛️ 🧑‍💻 |
| 🟢 | **https://decisionconservatory.com/** | **Decision Conservatory** — interactive strategy herbarium: 5-cluster architecture, MTP "non-toxic spine," 8-rung capital ladder (pick a funding level → plan reshapes), Frontier-59 ring | A living strategic-decision tool for founder/investor conversations | 🏛️ ✅ |
| ❓ | **Investor site(s)** — *founder to confirm URLs* | More than one investor narrative has been built (`umbrella-strategy/investor-site/index.html`, `decision-room.html`, `deploy/index.html`) | Investor pitch variants | 🏛️ ✅ |

**Not deployed (exist as source/assets only):** `knowledge-gardens-experience` (asset bundle) · `founding-contractor-sprint` (sales-enablement docs: access pack, outreach, objection cards, ROI one-pager) · "Knowledge Gardens Design System" (a Claude skill / brand kit, not a URL).

---

## B · BKG app — `builders.theknowledgegardens.com`
*139 page routes. Product surfaces are best shown **signed in** on the canonical demo (Modern Farmhouse Marin).*

### B1 · Marketing & investor surfaces
| Status | Route | What / why | Review |
|---|---|---|---|
| 🟢 | `/` | Homepage — GC value prop (40k+ cited entities, California-first) | 📣 |
| 🟢 | `/presentation` | Full platform architecture deck (MTP, Killer App, lanes, security, RSI, competitive gap) | 🏛️ |
| 🟢 | `/intro` | 5-act cinematic for the SF investor demo, ends in a live Killer App iframe | 🏛️ 🎨 |
| 🟢 | `/rsi` | "How the Garden gets smarter" — the 5 recursive-self-improvement loops (the moat) | 🏛️ |
| 🟢 | `/manifesto` | "Where We Stand" — founder narrative + the 18 locked decisions | 🏛️ ✅ |
| 🟢 | `/umbrella` | Multi-vertical thesis inside the app (Builder live; Health/Orchid/NatureMark in design) | 🏛️ 📣 |
| 🟢 | `/pricing` | 4-tier model (Explorer free / Pro $99 / Team $199 / Enterprise) | 📣 ⚖️ |
| 🟡 | `/launch` | Hands-on "Smart Project Launcher" wizard (let-them-drive demo) | 🎨 🔨 |
| 🟡 | `/cinematic` | Animated brand intro → 3 entry paths (Dream / Build / Supply). **Fixed 2026-06-17:** added Skip + 12s fallback so it can no longer dead-end on the animation; removed forbidden `#E8443A`/pure-white | 🎨 📣 |

### B2 · Onboarding / auth funnel
| Status | Route | What / why | Review |
|---|---|---|---|
| 🟢 | `/start` (+ `/start/role`, `/start/tiers`) | "The One Door" entry → role & tier selection | ⚙️ 🎨 |
| 🟡 | `/welcome`, `/onboard`, `/onboarding` | First-run flows (note: two onboarding paths exist — consolidate) | ⚙️ 🎨 |
| 🟢 | `/signup`, `/login` | Clerk auth | ⚙️ |
| 🟡 | `/dashboard` | Post-login home | ⚙️ |
| 🟡 | `/billing` | Stripe subscription management | ⚙️ ⚖️ |
| 🟡 | `/accept-invite/[token]` | Team-invite acceptance | ⚙️ |

### B3 · Legal
| Status | Route | What / why | Review |
|---|---|---|---|
| 🟡 | `/legal/terms`, `/legal/privacy`, `/legal/disclaimer` | Terms, privacy policy, compliance disclaimer | ⚖️ |

### B4 · The Killer App — product core
| Status | Route | What / why | Review |
|---|---|---|---|
| 🟢 | `/killerapp` | Cockpit — capture-first landing + 7-stage workflow picker | 🔨 🎨 |
| 🟢 | `/killerapp/ask` | Ask-anything copilot | 🔨 |
| 🟢 | `/killerapp/budget` | Budget + estimating (real persisted line items) | 🔨 ⚙️ |
| 🟢 | `/killerapp/projects` · `/killerapp/projects/[id]` | Project list + project home (Owner & GC lanes) | 🔨 ⚙️ |
| 🟡 | `/killerapp/projects/[id]/close-out` | Project close-out flow | 🔨 |
| 🔵 | `/killerapp/projects-v3` | Next-gen project surface prototype | 🧑‍💻 🎨 |
| 🟢 | `/killerapp/sign/[id]` | E-sign flow (mechanism only — no platform-authored contracts, per Rule #11) | ⚖️ |
| 🗄️ | `/killerapp/legacy-command-center` | Retired cockpit → redirects | 🧑‍💻 |
| ⚪ | `/killerapp/{alerts, compliance, credentialing, quick-reply, rewards, who-is-asking}` | Named-but-scaffold surfaces | 🔨 🧑‍💻 |

**7 stages** — `/killerapp/stages/{size-up, lock, plan, build, adapt, collect, reflect}`
🟢 size-up · 🟡 build · 🔵 lock / plan / adapt / collect / reflect *(prototype)* — 🔨 🧑‍💻

**41 workflows** — `/killerapp/workflows/{name}`
- 🟢 **Built-out (demo-ready):** `estimating` · `code-compliance` · `daily-log` · `draw-requests` · `lien-waivers` · `retainage-tracker` · `audit-trail` · `quickbooks-export` · `supply-ordering` · `sub-bid-inbox` · `sub-bid-submit` · `vendor-master` · `ar-ap-ledger` · `punch-list` — 🔨 (domain accuracy)
- ⚖️ **Legal-gated:** `contract-templates` (DRAFT-locked until construction-attorney review) — ⚖️
- 🟡 **Functional / scoped:** `rfis` · `change-orders` · `permit-applications` · `final-walk-through` · `warranty-handoff` · `osha-toolbox` · `weather-scheduling` · `job-sequencing` · `bid-risk` — 🔨
- ⚪ **Scaffold / demo-grade:** `approvals` · `architect-of-record` · `client-lookup` · `compass-nav` · `cost-explainer` · `equipment` · `equipment-schedule` · `expenses` · `find-a-gc` · `hiring` · `outreach` · `panel-schedule` · `payroll-check` · `project-review` · `services-todos` · `sub-management` · `worker-count` — 🔨 🧑‍💻

### B5 · Dream Machine — in-app (imagine → build)
| Status | Route | What / why | Review |
|---|---|---|---|
| 🟢 | `/killerapp/dream` | Project-scoped "what-if" surface (exploration cards + style picker) | 🎨 |
| 🟢 | `/killerapp/dream-studio` | Guided flagship: imagine → concepts → schematic blueprint → "build it" handoff | 🎨 🏛️ |
| 🟡 | `/killerapp/dream-studio-2` | Claude Design "imagine→build pipeline" v2 (5-stage spine). **Prod hydration + image-weight fix merged (#82/#83) 2026-06-17** — was dead-buttons/blank-images before | 🧑‍💻 🎨 ✅ |

### B6 · Dream Machine — standalone R&D lab (`/dream`)
*The interface experiments the in-app flagship was synthesized from. Most are prototypes — keep for reference, not for prospect demos.*
| Status | Routes |
|---|---|
| 🟢 | `/dream` · `/dream/design` · `/dream/explore` |
| 🔵 | `/dream/{imagine, describe, genome, oracle, narrator, inspire, browse, garden, sketch, collider, cosmos, elements, quest, sandbox, sim, timemachine, voice, worldwalker, alchemist, upload}` |
| ⚪ | `/dream/plans` ("Coming Chunk 7") |
| 🔌 | `/dream/shared/[slug]` (share-link render) |
Review: 🎨 (UX) — this is the design playground.

### B7 · Other product / marketplace surfaces
| Status | Route | What / why | Review |
|---|---|---|---|
| 🟡 | `/marketplace` | Integrated marketplace landing — 6 pillars (Supplies live: Home Depot Pro / 84 Lumber / White Cap adapters) | 🔨 📣 |
| 🟡 | `/knowledge` · `/knowledge/[slug]` | Knowledge Garden entity library | 🔨 |
| 🔵 | `/field` · `/finances` · `/inspections` · `/weather` | Role surfaces (field ops, finances, inspections, weather) | 🔨 |
| ⚪ | `/social` · `/challenges` · `/builder` · `/feedback` · `/profile` · `/documents` | Community/profile scaffolds | 🎨 🔨 |
| 🔵 | `/projects/[id]` · `/projects/new` | Legacy (non-killerapp) project routes | 🧑‍💻 |

### B8 · Machine / integrations
| Status | Route | What / why | Review |
|---|---|---|---|
| 🔵 | `/mcp` · `/install-mcp` | MCP server console + install | 🧑‍💻 |
| 🟡 | `/api/docs` | Public API documentation | 🧑‍💻 |

### B9 · 🔴 Hidden / not-for-demo
| Status | Route | What / why | Review |
|---|---|---|---|
| 🔴 | `/clients` | "Pipeline / Clients" preview ("Coming Q3 2026"). **Hidden 2026-06-17:** de-linked from CompassBloom + noindexed. Route kept for internal reference | ✅ 📣 |
| 🔴 | `/site` | "Site Intelligence" preview ("Coming Q4 2026"). **Hidden 2026-06-17:** de-linked + noindexed. Route kept for internal reference | ✅ 📣 |
| 🔒 | `/demo` | Internal DemoMode walkthrough | ⚙️ |

### B10 · 🔒 Internal / admin
`/admin/email-status` · `/admin/healthcheck` · `/admin/review` · `/admin/verify` — ops/eng only. Review: 🔒 ⚙️ 🧑‍💻

### B11 · 🔌 API surface (no UI — not for demo)
`/api/v1/*` (ask, copilot, budget, briefing, crm, dreams, compliance/lookup, cslb-lookup, entities, audit-log, billing, change-orders, agents, …), `/api/garden/capture`, `/api/owner-home/*`, `/api/auth/*`, `/api/v1/cron/*` (rsi-heartbeat, onboarding-reminders, crm-send-flush). Review: 🧑‍💻

---

## C · Reviewer attention matrix — who should check what

| Reviewer | Priority destinations |
|---|---|
| 🏛️ **Investor** | theknowledgegardens.com · frontiermap (+ /john, /walkthrough, /theKnowledgeGardensOS) · decisionconservatory.com · `/presentation` · `/intro` · `/rsi` · `/manifesto` · `/umbrella` · investor-site(s) |
| 📣 **Marketing** | `/` · `/pricing` · `/cinematic` · `/umbrella` · `/marketplace` · **decision on `/clients` + `/site` copy** (now hidden) |
| ⚖️ **Legal** | `contract-templates` (Rule #11 gate) · `/killerapp/sign/[id]` · `/legal/*` · `/pricing` terms · any compliance claims |
| 🎨 **UX** | `/killerapp/dream-studio-2` · all `/dream/*` · stages lock/plan/adapt/collect/reflect · `/cinematic` · onboarding funnel |
| 🔨 **Contractor (domain)** | All `/killerapp/workflows/*` (estimating, code-compliance, draw-requests, lien-waivers, retainage, RFIs, permits…) — validate accuracy with a real GC |
| ⚙️ **Ops** | Onboarding funnel · `/billing` · `/dashboard` · the save→leave→return loop |
| 🧑‍💻 **CTO/Eng** | `projects-v3` · prototype stages · scaffold workflows · `/mcp` · API surface · hydration/perf hardening |
| ✅ **Founder** | Confirm investor-site URLs · approve/hide stubs · merge gate on green Vercel |

---

## D · Curated demo paths

- **John (field brief):** frontiermap.theknowledgegardens.com/john → theknowledgegardens.com → `/presentation` or `/intro` → (signed-in) `/killerapp` on Marin → `/killerapp/dream-studio`.
- **Investor:** theknowledgegardens.com → decisionconservatory.com → frontiermap → `/intro` → `/rsi` → Killer App live.
- **Contractor:** `/` → `/launch` → `/killerapp` → run `estimating` + `code-compliance` + `daily-log` on Marin → `/killerapp/dream-studio`.

---
*Maintenance: when a route's status changes or a route is added/retired, update this file in the same PR. This is the canonical index referenced by CLAUDE.md.*
