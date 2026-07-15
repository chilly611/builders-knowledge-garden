## 2026-06-02 (overnight 06-01 → 06-02) — Seal rollout shipped, prod verified, homepage rebuilt (PR open), infra drift surfaced

**Interface:** Chat (strategy/coordination hub) + parallel Claude Code / Cowork / Design streams.

### Shipped to main (main = 4fa7839)
- **Seal trilogy merged.** PR #13 (`feat/viver-seal`) → canonical BKG Viver mark (hammer+roots) wired into the app-shell `<Seal>` (motion MP4 + static emblem poster + reduced-motion branch; umbrella kept as parent KG/switcher mark). PR #16 (`feat/seal-rollout`) → `brand/Logo.tsx` repointed + all 7 direct `b_transparent_512` refs swept across 5 files (`/knowledge`, `/launch`, `/profile`, `/presentation` ×2, `SplashIntro` ×2). PR #15 (`fix/social-card-seal`) → iMessage/social card + favicons. **Old "B" is extinct in `src/`.**
- Seal assets now live in `brand_assets` (first BKG-scoped rows): `assets/bkg/hammer-roots-mark-motion.mp4` + `assets/bkg/hammer-roots-emblem.png`. brand_assets is now BKG's brand source of truth.

### Open, NOT merged
- **`feat/homepage-rebuild` PR** (2 commits, off `ef54dd3`). New herbarium "/" : live counts server-rendered (entities **2,256**, jurisdictions **44**, $17T, 7 stages — kills the $0 counter bug at root), GC-clarity messaging, 9 lanes + 7 stages, ask-the-garden FAB kept, CompassBloom suppressed on `/`, no dark/red/#fff/CRM/"coming soon", "AI COO" dropped on the page. **Blocked on founder decisions (see below).** Now behind main by the seal commits — will need rebase before merge; homepage seal should swap to the shared `<Seal>` now that #13 is merged.

### Prod verification (anonymous, real browser, 44 screenshots — `prod-verify-2026-06-01/`)
- **PASS:** `/killerapp` (herbarium shell, 4 strips, rectangle next-move compass — no radial-emoji wheel); `/killerapp/projects/demo-project` (Willow Creek ADU, $116K of $340K, budget river sums clean); mobile 375px (ribbon stacks clean); **magic button** (one launcher, opens on single click, **real streamed Claude answer → ANTHROPIC_API_KEY is live in prod**, two-button bug NOT present).
- **FAIL / demo-blockers:**
  - **`/john` is a 404 — never built** (exists in no worktree, no doc). If that's tomorrow's demo URL the demo dies at step 1.
  - **All 7 stage pages FAIL for demo** — Marin-bound ($312K/$1.65M/37wk) + self-contradictory (Reflect "complete, −$8,300 variance" while Build mid-flight; Lock prefills $1,650,000 + "Harwell Family"; Plan/Build code lookup pinned to "San Francisco, CA"; Adapt/Collect/Reflect are "ALPHA — COMING SOON" with fake KPI banners).
  - killerapp header still shows the ornate **"B" monogram, not the Viver seal** (seal only appears as the small floating button).
  - Demo project page: chrome says **62%**, body Status says **55%** (two numbers, one screen); AI Attention #2 cites "Marin County DPW" on a **Napa** job.
  - anon `/killerapp` hangs forever on "AI TAKE — Running the numbers…" (401s); React **#418 hydration error** in console; auto-appends `?project=demo-san-diego-adu` while chrome says Willow Creek and name-chip says "Untitled project."
  - Magic-button answers are real but **context-blind** for anon ("I don't have your project details") — signed-in project-awareness unverified (founder rule-#7 checklist outstanding).

### Demo-data drift (the real demo blocker)
"Show me the demo" opens canonical Marin row `55730cd3…` but the row has drifted and surfaces read different fields: `raw_input` = "1,800 sf…", `budget_amount` = $2,320,300, page chip = "4,950 sq ft / $0 left of $914K" — vs canon **4,000 sf / $1.65M**. Plus **2 duplicate farmhouse rows** from old intakes. Meanwhile the killerapp shell is wired to **Willow Creek ADU** and a stray **San Diego ADU** query param floats around. **Founder + project-instructions canon = Marin 4,000 sf / $1.65M everywhere.** Cleanup pending (needs blurb wording).

### Infra events
- Team-project env vars **wiped and restored** (4 vars, store-backed) tonight — cause unidentified.
- Custom domain `builders.theknowledgegardens.com` **drifted off the git-wired team project to a personal `app` project** at 23:43 mid-rollout (second unexplained act on that scope after the env wipe). A repoint attempt caused a ~2–3 min outage because `theknowledgegardens.com` DNS is hosted off-Vercel and the API can't add the verify record. **Permanent fix = one DNS TXT record** (`_vercel.theknowledgegardens.com → vc-domain-verify=builders.theknowledgegardens.com,c0d1665cac`) added wherever the DNS lives.
- Sign-in works on the prod domain. The `edveg5jj3…vercel.app` **preview** (homepage branch) shows "Auth service is not configured" + 0 entities because preview-scope env vars are missing — **preview-only, not a prod outage.**

### Decisions needed from founder (unblock homepage PR + downstream)
Lanes **8** (project-instructions: Owner/GC/Sub/Architect/Lender/Supplier/Worker/Service-Provider) vs **9** (code `LANE_SLUGS`: Owner/GC/DIY-Builder/Sub/Worker/Supplier/Equipment-Provider/Service-Provider/Robot-AI) · Fonts **Cormorant Garamond + Space Mono** (used, per memory) vs canonical **EB Garamond + JetBrains Mono** (constitution → Orchids treatment) · Pricing numbers (homepage currently number-free; old `/pricing` still dark $49/$199/$499) · Retire "AI COO" platform-wide (still in `layout.tsx` + constitution:279)? · Lead **GC** (MLP decision) vs **Owner** (code says Owner-first ship order) · "System of record" boldness (softened to "grows into").

### Hygiene
`VERCEL_TOKEN` and a GitHub PAT were pasted in-session → now in plaintext transcripts. **Rotate both.** PR-only work doesn't need the Vercel token.

## 2026-06-12 — Emblem prompt program: copy-paste board (v1 → v2 iconic cut)
- Built a click-to-copy Midjourney prompt board (`public/_design-preview/midjourney-board.html`) + completed the truncated `docs/design/midjourney-emblem-prompts.md` (v1 had stopped mid-Tier-2; Tiers 3–5 were missing).
- Founder redirect same session → **v2 "iconic cut"**: pure-white backgrounds (for cutout → transparent PNGs; parchment plates made every mark read as a square), simpler one-idea subjects, lighter voice. 54 marks + 4 optional re-cuts of the originals (BKG/OKG/TKG/HKG — flagged optional, old "do not regenerate" rule noted).
- Generator lives at `docs/design/midjourney-emblem-prompts.gen.mjs` — single source for both artifacts; `node` it to regenerate.
- White-bg exception is **artwork pipeline only** (founder's call, 2026-06-12); product UI keeps the no-pure-white constitution rule. Board UI itself stays parchment.
- Also: added `static-preview` config to `.claude/launch.json` (python http.server :8137) to verify in a real browser. Verified: 58 cards, sref-append 58/58, filter, copy handlers, no console errors.

## 2026-06-12 (later) — Emblem prompts v3: back on brand
- Founder reviewed v2 (white-bg iconic) generations: **too off-brand, retired.** Approved plate: automaton bust w/ rust poppies (`~/Downloads/social_chillyd_antique_scientific_botanical_plate_Victorian_herbariu_b2a7be40-...mp4`) — generated from the v1 shared style block (filename = its first words; confirmed visually via extracted frame).
- v3 = v1 antique-plate style block + brief subjects restored verbatim; dropped v2's optional re-cut group; **new RKG 1c** prompt reverse-engineered from the approved plate (starred on the board). 55 prompts total.
- Board sref field reframed as the anchor move: paste the approved plate's MJ image URL → `--sref` on all 55.
- Verified in browser: 55/55 carry the plate block, 0 white-bg leftovers, param line exact v1.
- Lesson appended to tasks_lessons_APPEND.md (probe batches before full restyles; approved assets are the spec).

## 2026-06-12 (later still) — Second approved plate; assets staged into kg-root
- Founder approved a second plate: **FshKG dress-form** (`chillyd_A_tailors_dress-form_..._3.mp4`) — generated from the v3 prompt verbatim; v3 language confirmed working.
- Recon of `~/Developer/knowledge-gardens-root`: asset convention is `{code}-{name}-anim.mp4` + `{code}-{name}-poster.jpg` in `assets/gardens/`; registry lives in `site.js` GARDENS array; Robot card (Garden 05) currently a placeholder `svg: SVG_ROBOT`; Fashion has no card yet. kg-root tree clean (untracked only) — staged **additive untracked files only**, no tracked-file edits (respecting one-WRITE-lane).
- Staged: `rkg-automaton-anim.mp4` + `rkg-automaton-poster.jpg`, `fshkg-fashion-anim.mp4` + `fshkg-fashion-poster.jpg`. Posters are qlmanage frames via sips (stopgap — extract proper frames + ~60–800KB WebM transcodes once ffmpeg is installed; not present on this machine).
- Robot wiring one-liner (for the kg-root lane): replace `svg: SVG_ROBOT,` with `poster: A + "gardens/rkg-automaton-poster.jpg", video: A + "gardens/rkg-automaton-anim.mp4",`.
- Board updated: RKG 1c + FshKG starred as approved; status box tracks staging locations. 55 prompts unchanged.

## 2026-06-12 (cont.) — v4 PROBE: twelve divergent RKG marks
- Founder: v3 outputs also not landing ("I don't like these either"); wants v1 DNA × simple white bg × less busy, and asked Claude to author ~a dozen REALLY different robot variations "from your perspective and what you think other machines would like," then converge.
- Board/MD regenerated as **v4 probe batch**: 12 RKG probes up top (each = distinct subject × distinct technique × machine's-note why-line; shared lean probe base: white field + muted palette + restraint + --no clutter list), v3 55-prompt library kept below as reference. 67 prompts total. De-starred RKG 1c / FshKG ("earlier picks", not "approved"); status box reframed to probe-phase.
- Probe directions: handshake/copperplate · gardener/etching · stipple portrait · exploded hand/patent · sanguine study · one-continuous-line · root network/hairline · seed packet/specimen · clockwork heart/jeweler's · listening dish/line+wash · engraver-engraving-itself/intaglio · orrery mind.
- Probe protocol on the board: generate all 12 WITHOUT --sref; pick 2–3; re-cut family from common ground. Memory updated (direction = converging, not locked; probe-batch method is how founder wants taste directed).
- Verified in browser: 67/67 cards, 12 probe cards w/ notes, probe prompts carry white base + --no list, library still carries plate block, 0 stars.

## 2026-06-14 (later) — SF Fourplex portal-imagery seed set generated (parallel to Marin)
- Built `stage-sf-fourplex-assets.mjs` — the SF parallel to `stage-fidelity-assets.mjs`: same brand render-register (constant), SF infill subject from `docs/design/sf-fourplex-seed-spec.md` (variable layer), distinct seeds (430017/430042, 780301-303, 661101-103) and `-sf-`-namespaced slugs so both sets coexist in `brand-assets/assets/bkg/fidelity/` with no collision.
- **Safety change vs the Marin script:** LOCAL-ONLY by default. Bucket upload is opt-in behind `--upload` (shared-prod write = supervised/founder-run); catalog still gated behind `--upload --catalog --schema-confirmed`. Never promotes.
- Generated all **8** (2 hero 16:9 flux-1.1-pro · 3 study 4:5 flux-dev · 3 thumb 1:1) to `./fidelity-out-sf/` (gitignored). Token lives in `~/Developer/bkg-main/.env` (sourced via `--env-file`, never read into the session); rendered via Replicate. All draft, local-only, NOT uploaded, NOT cataloged.
- Visual QA on all 8 (read each PNG): on-brand herbarium register, no pure-white backgrounds, no red — **one** minor exception: a small red speck on the middle massing block in `study-sf-massing-options` (slipped past the flux-dev negative prompt; regen with a fresh seed before promotion if it matters).
- Spec updated: added the **Visual seed set** section (slug/kind/seed/use table + regenerate/promote commands) to `docs/design/sf-fourplex-seed-spec.md` → now at Marin parity (data + visuals). Built `fidelity-out-sf/contact-sheet.html` (herbarium board) for review.
- Open/founder-run: promote = `--upload`, then `--catalog --schema-confirmed` after confirming `public.brand_assets` columns; add the SF table to `docs/design/seed-and-portals.md` §5 when `feat/killer-app-fidelity` lands. None of this committed yet (working-tree changes on `docs/component-fidelity-spec`).

## 2026-07-08 — External project session: "The Call" landing (not bkg work)
Built standalone repo `~/Developer/the-call` (stealth waitlist landing, Next 14 + Supabase service-role). No bkg files changed except a temporary `.claude/launch.json` preview entry, since removed. No shared Supabase touched — verified against a local embedded Postgres rig. Founder must create a fresh Supabase project for it (NOT vlezoyalutexenbnzzui).

## 2026-07-08 — K2: Founding Member slice for The Call (separate repo)
Cowork session (bkg cwd, work in `~/Developer/the-call`). Detected the K1
session building the same repo concurrently — backed off, drafted in
scratchpad against its conventions, integrated after it went idle.
Landed f8ee4a9 on top of K1's three commits: /founding ($99 one-time,
cap 1,000, live counter), signature-verified Stripe webhook as sole
writer via atomic `claim_founding()` (counter-row lock; sold-out →
auto-refund + apology flag), /welcome-founder gold-ring reveal.
Proven: 24-check concurrency suite on local PG 16 (scripts/
verify-founding.sh), prod build green, all UI states browser-verified.
Founder to do: apply migration 0001+0002 to The Call's own Supabase
project (NOT vlezoyalutexenbnzzui), create $99 one-time price, set
STRIPE_* env (.env.example append was permission-blocked; README env
table is complete), run the Stripe CLI loop per README.
