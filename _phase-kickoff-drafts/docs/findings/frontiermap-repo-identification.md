# Which repo + deploy path serves frontiermap.theknowledgegardens.com

> **CONFIRMED live via read-only Vercel API — 2026-06-08.** Resolved: **no GitHub repo exists** — frontiermap is a Vercel **CLI deploy** with no Git link. The "Confirmed answer" section is immediately below; the original read-only investigation (which correctly ranked this as outcome #4) follows as the supporting trail.
> *Tier 3 finding · phase-kickoff draft · for founder review*

## Confirmed answer (read-only Vercel API, 2026-06-08)

The domain is served by the Vercel project **`frontiermap`** (`prj_qg864q1QlZoOEUBfS73Wp2FCqZDG`, team `team_4qRqC7dVa1IrrGvTpcptHf4o`). That project's **`link` is `null`** — **no GitHub repository is connected** — and `framework` + `rootDirectory` are null (a plain static bundle). Every deployment is **`source: "cli"`**, created by **`chillydahlgren`**: latest **2026-06-02 18:52 UTC**, with a cluster of earlier pushes on **2026-05-28**. So the "UNIDENTIFIED repo" resolves to a **repo-less, hand-deployed static site** — `vercel deploy` from a local folder on the Mac, with no Git source of truth.

The content is *authored* in the builders repo (the OS page is byte-identical; `/walkthrough` comes from `john walkthrough May 28 files/`), but builders is not the serving project and frontiermap has no repo of its own.

**Recommendation:** if frontiermap should be versioned/reproducible, create a repo (e.g. `frontiermap` / `kg-narrative`), commit the bundle, and connect it to the `frontiermap` Vercel project. Suggested `REPO-AND-WORKTREE-MAP.md` row: *"frontiermap.theknowledgegardens.com → Vercel project `frontiermap`, CLI/no-Git deploy (no repo); bundle authored from builders `docs/strategy/the-knowledge-gardens-os.html` + `john walkthrough May 28 files/`."* And **rotate the Vercel token** that was pasted into chat to run this confirmation.

> Method note: this confirmation used read-only `GET`s to `api.vercel.com` (`/v9/projects`, `/v6/deployments`) with a founder-provided token, this session — no Vercel mutations. The original investigation below used only plain HTTP GETs of the live site plus the public GitHub API.

---

## Executive answer

**The site is a static-HTML site hosted on Vercel — not a Next.js or Vite app.** That part is **high confidence**. Every route is a single pre-built `.html` file served straight off Vercel's static layer, deployed once on **2026-06-02**.

**Which GitHub repo holds those files is *not* resolvable from public signals — most-likely a private repo, confidence low-to-medium.** Every public repo under `chilly611` / `XRWorkers` has been checked and *none* contains the frontiermap file set. The four candidate repos that would fit the theme (`knowledge-gardens-root`, `knowledge-gardens-orchids`, `knowledge-orchid-1.1`, `XRWorkers/TheBloom`) return **404 on the unauthenticated GitHub API**, which for a known-to-exist repo like `knowledge-gardens-root` means **private**, not absent. A private repo is invisible to every probe available here, so the repo name can only be confirmed on the Mac (commands at the bottom).

Ranked shortlist for the **repo identity** (the deploy *mechanism* is settled below):

| Rank | Candidate | Likelihood | Why |
|---|---|---|---|
| 1 | **A private, purpose-built static-site repo** (name unknown; possibly an unlisted repo, or a `frontiermap` / `frontier-*` / `kg-narrative`-type repo not in the candidate list) | ~55% | The served file set (apex + `walkthrough` + `john` + `john/descent` + `theKnowledgeGardensOS` + `llms.txt` + `/animations/*.mp4`) exists in **no** public repo. A private repo explains every 404 and the absence of any web/search footprint. |
| 2 | **`chilly611/knowledge-gardens-root`** (private) | ~20% | Known to exist, currently private (API 404). The map says it 404s these routes *today*, but a separate branch / a since-changed deploy could host them. Lower because the map explicitly already ruled it out on route behaviour. |
| 3 | A private fork/rename of the umbrella narrative (e.g. `XRWorkers/TheBloom`, also API-404/private) | ~15% | XRWorkers is the "Bloom documentary" org; a private static narrative could plausibly live there. No positive evidence, only that it's private and thematically adjacent. |
| 4 | Deployed straight from a Vercel CLI push with **no connected Git repo at all** | ~10% | `npx vercel` can deploy a local folder of static files with no Git link. Given the static-file fingerprint and that the OS page's *source* is authored inside the builders repo (see below) and could simply be copied + `vercel`-pushed, this is live. If true, "the repo" is a local folder, and `vercel project inspect` will show `link: null`. |

Note one concrete, useful fact regardless of repo: **the source HTML for two of the routes is authored inside the builders repo.** `docs/strategy/the-knowledge-gardens-os.html` is **byte-for-byte identical** to what `/theKnowledgeGardensOS` serves (both exactly 230,853 bytes), and `john walkthrough May 28 files/walkthrough.html` is the source for `/walkthrough`. So builders-knowledge-garden is the **authoring** home for that content even though it is **not** the project that serves frontiermap.

---

## Evidence table (route → observed → fingerprint → interpretation)

| Route | HTTP | `<title>` | Static vs JS shell | Fingerprint match | Interpretation |
|---|---|---|---|---|---|
| `/` (apex) | 200, 142,745 B | "The Frontier 59 · The Knowledge Gardens" | **Static.** `content-disposition: inline`, `accept-ranges: bytes`, `x-vercel-cache: HIT`, no `/_next/`, no `__NEXT_DATA__` | The "Frontier Map" itself (the canonical 59-garden roster). No local source file found in builders repo. | The Frontier Map page. Lives only in the frontiermap repo. |
| `/walkthrough` | 200, 32,770 B | "The Walkthrough · Knowledge Gardens" | **Static.** `content-disposition: inline; filename="walkthrough"` | Renders the exact "Four screens. One conversation." control-desk; brand spine (parchment/copper, Cormorant + Space Mono) | Static file. Source = `john walkthrough May 28 files/walkthrough.html` in builders repo. |
| `/john` | 200 | "John's Demo Script · Knowledge Gardens" | **Static.** `content-disposition: inline; filename="john"` | "John's Field Brief", Marin demo numbers ($1.65M etc.); tells presenter to open `frontiermap…/walkthrough.html` | Static file. The route is a file named `john`, not a Next.js segment. |
| `/john/descent` | 200 | "The Knowledge Gardens — Descend" | **Static.** `content-disposition: inline; filename="descent"` | "click anywhere to descend", "fifty-nine domains", links to `/theKnowledgeGardensOS` | Static file `descent` inside a `john/` folder. |
| `/theKnowledgeGardensOS` (lowercase t) | 200, 230,853 B | "The Knowledge Gardens Operating System — Strategy v3" | **Static.** `content-disposition: inline; filename="theKnowledgeGardensOS"` | 13× "Stance Card", 3× "Modality Mirror", 3× "FRONTIER_MAP_PORTABLE.md v2", 3× "improves itself in public" — **byte-identical** to local `docs/strategy/the-knowledge-gardens-os.html` (both 230,853 B) | The 20-piece Pattern Language presentation. Confirms the WS1 handoff's stated deploy target. |
| `/TheKnowledgeGardensOS` (uppercase T) | **404** `NOT_FOUND` | — | — | — | **Case-sensitive.** A Next.js route would normalise/serve this; a static file system 404s the wrong-case path. Strong "static, not Next.js" signal. |
| `/walkthrough.html` | **308** → `/walkthrough` | — | — | — | Vercel's static "clean URLs" rewrite (`.html` → extensionless). Confirms files are named `walkthrough.html` on disk and served clean. |

All `last-modified` headers cluster on **Tue, 02 Jun 2026 18:52–19:39 UTC** — one deploy, all files written together.

---

## Framework / hosting fingerprint

- **Host:** Vercel. `server: Vercel` and `x-vercel-id: sfo1::…` on every response; `x-vercel-error: NOT_FOUND` on misses.
- **Framework:** **none / static ("Other" preset).** No `/_next/` assets, no `__NEXT_DATA__`, no `next/static`, no Vite markers, no `data-reactroot`, no `generator` meta anywhere in the served HTML. The OS page is a single self-contained 230 KB HTML file with inline `<style>` and inline `<svg>` — exactly the local file.
- **Static-file tells:** `content-disposition: inline; filename="<route>"` and `accept-ranges: bytes` on every page (Vercel emits these for files served off the static/output layer, not for SSR/SSG Next.js routes), plus **case-sensitive** paths and the `.html` → clean-URL **308**.
- **Caching:** `cache-control: public, max-age=300, s-maxage=600`, long `age` (~5.5 days) — static assets cached at the edge since the 06-02 deploy.
- **Site files present:** `robots.txt` (200, allows all, points at a sitemap), `llms.txt` (200, bespoke "Frontier Map v3 / Frontier 59" content), `/animations/*.mp4` (referenced by the walkthrough cards). **`sitemap.xml` 404s** despite robots.txt advertising it — a small loose end.
- **Brand fingerprint confirmed live:** parchment `#F5F0E8`/`#F8F3EB`, copper `#B87333`, hairlines `rgba(184,115,51,0.35)`, Cormorant Garamond + Space Mono, forest-ink `#0F2419`, SVG `viewBox="0 0 200 120"`, no gradients/shadows/emoji — matches the documented spine exactly.

---

## Candidate-repo table

| Repo | Public / Private / 404 | Signal observed | Verdict |
|---|---|---|---|
| `chilly611/builders-knowledge-garden` | Public | Next.js app; serves builders.theknowledgegardens.com via Vercel project `app`. **Authoring** home of the OS + walkthrough source HTML, but not the frontiermap deploy. | **Ruled out as the serving repo** (confirmed by prior context + route behaviour). It is the content's source, not the host. |
| `chilly611/knowledge-gardens-root` | **Private** (API + web 404; known to exist per repo map) | Umbrella marketing site; map says it 404s `/john`, `/walkthrough`, etc. today. | **Unknown** — can't inspect (private). Map already ruled it out on routes; kept on shortlist at low odds. |
| `chilly611/bkg-killer-app` | Public | **Only `index.html`** (recursive tree confirms one file), `pushed_at` **2026-04-16**, size 30 KB. None of the frontiermap routes/files. | **Ruled out.** Wrong file set, wrong date (frontiermap is 06-02). Matches the map's "likely deprecated". |
| `chilly611/succulens-app` | Public | **Vite** SPA, 98.5% JavaScript, `vite.config.js` + `vercel.json`. | **Ruled out.** Vite SPA, not a multi-file static narrative; no matching routes. |
| `chilly611/knowledge-gardens-toxicology` | Public | TypeScript / Next.js garden app, `homepage: website-three-steel-12.vercel.app`, 69 MB, pushed 06-07. | **Ruled out.** It's a full garden app (TKG), not a static investor narrative. |
| `chilly611/hkg` | Public | HTML, **only `index.html`**, pushed **2026-04-15**, 6 MB. | **Ruled out.** Single page, wrong date, no routes — a placeholder health-garden page. |
| `chilly611/mkg` | Public | HTML, `homepage: mkg-puce.vercel.app`, pushed **2026-05-11**, 42 MB. | **Ruled out.** Marketing-garden page; wrong date, no frontiermap routes. |
| `chilly611/knowledge-gardens-orchids` | **Private** (API 404) | — | **Unknown** — can't inspect. Thematically an orchid garden, not a narrative; low odds. |
| `chilly611/knowledge-orchid-1.1` | **Private** (API 404) | — | **Unknown** — can't inspect; low odds. |
| `XRWorkers/TheBloom` | **Private** (API 404) | — | **Unknown** — can't inspect; on shortlist at low odds. |
| `XRWorkers/the-bloom-ledger` | Public | Default `create-next-app` skeleton, Geist font, 2 commits, deploys to the-bloom-ledger.vercel.app. | **Ruled out.** Boilerplate Next.js, Geist (not Cormorant); no matching content. |

---

## What's ruled out and why

- **Next.js / any JS framework** — no `/_next/`, no `__NEXT_DATA__`, no Vite, no `generator` meta; pages carry static-file headers (`content-disposition: filename=`, `accept-ranges: bytes`); routes are case-sensitive and `.html` 308-redirects to clean URLs. The site is pre-built static HTML.
- **`builders-knowledge-garden` as the host** — it's the Next.js product on Vercel project `app` at builders.theknowledgegardens.com, and (per prior context) 404s these routes. It is the **source** of the OS + walkthrough HTML, not the **server** of frontiermap.
- **`bkg-killer-app`, `succulens-app`, `knowledge-gardens-toxicology`, `hkg`, `mkg`, `XRWorkers/the-bloom-ledger`** — all public, all inspected, none contains the frontiermap file set; wrong framework and/or wrong dates (frontiermap files are all 2026-06-02; these were last pushed 04-15 / 04-16 / 05-11 / 06-07-as-a-garden).
- **A public repo in general** — the apex "Frontier 59" page and the `/john*` files exist in no public repo and produce no web-search footprint, so the host repo is almost certainly private (or a CLI-only deploy with no Git link).

---

## Definitive confirmation (founder runs on the Mac — read-only)

These are read-only inspections; none deploys or mutates. They resolve the one open question (the repo + the deploy path/root).

**Vercel CLI:**
```
npx vercel --token=$VERCEL_TOKEN projects ls
npx vercel --token=$VERCEL_TOKEN domains inspect frontiermap.theknowledgegardens.com
npx vercel --token=$VERCEL_TOKEN project inspect <project>
```
- `domains inspect frontiermap.theknowledgegardens.com` → shows the **project the domain is bound to**. That project name is the answer to "which Vercel project serves it."
- `project inspect <project>` → its `.link` block names the **Git repo + production branch** (this is the GitHub repo), and `rootDirectory` shows the **deploy path/root** (which subfolder of the repo is the build/output root — e.g. `.` or `apps/frontiermap`).

**REST equivalents (read-only GETs):**
```
GET https://api.vercel.com/v5/domains/frontiermap.theknowledgegardens.com?teamId=team_4qRqC7dVa1IrrGvTpcptHf4o
GET https://api.vercel.com/v9/projects/<projectId>?teamId=team_4qRqC7dVa1IrrGvTpcptHf4o
```
- The **domain GET** returns the domain record including the bound `projectId` — that confirms **which project** serves the site.
- The **project GET** returns:
  - `.link` → `{ type: "github", repo: "<owner>/<name>", productionBranch: "<branch>" }` — **this field confirms the GitHub repo** (and the branch). If `.link` is `null`, the site was deployed by **CLI with no Git connection** (i.e. "the repo" is a local folder).
  - `.rootDirectory` → **this field confirms the deploy path/root** (the directory inside the repo that Vercel builds/serves; `null`/`.` = repo root).

If `.link.repo` comes back as anything other than `builders-knowledge-garden` (it will), record it in `docs/REPO-AND-WORKTREE-MAP.md` to close the "frontiermap repo — UNIDENTIFIED" row.

> **Founder-confirmed 2026-06-08:** this is the blessed sequence — `domains inspect` → `project inspect` → read the `.link.repo` field. Run it verbatim (with `$VERCEL_TOKEN` on the Mac) when live Vercel access returns; `.rootDirectory` gives the deploy path. The canonical route is the lowercase `/theKnowledgeGardensOS`.

---

## Open questions / assumptions

- **Repo identity is unconfirmed** — the host repo is private (or CLI-deployed with no Git link); no read-only probe here can name it. The Vercel commands above are the only way to confirm.
- **Assumed** the served bytes equal the repo's source bytes; verified for the OS page (230,853 B exact match to the local file) but only inferred for the apex/`john`/`descent` files, which have no local counterpart in the builders repo.
- **`sitemap.xml` 404s** though `robots.txt` references it — minor inconsistency, not load-bearing for repo identity.
- **Casing:** the working route is lowercase-initial `/theKnowledgeGardensOS`; the uppercase `/TheKnowledgeGardensOS` (as written in the WS1 handoff and the kickoff brief) **404s**. Links inside the live `/walkthrough` and `/john` pages correctly point at the lowercase form. Worth fixing the handoff doc's casing.
- **One deploy date** (2026-06-02) for all files suggests a single `vercel`/Git deploy of a finished static bundle, consistent with either a private static repo or a CLI push.

---

## Sources

- [frontiermap.theknowledgegardens.com/](https://frontiermap.theknowledgegardens.com/) — apex (Frontier 59)
- [frontiermap.theknowledgegardens.com/walkthrough](https://frontiermap.theknowledgegardens.com/walkthrough)
- [frontiermap.theknowledgegardens.com/john](https://frontiermap.theknowledgegardens.com/john)
- [frontiermap.theknowledgegardens.com/john/descent](https://frontiermap.theknowledgegardens.com/john/descent)
- [frontiermap.theknowledgegardens.com/theKnowledgeGardensOS](https://frontiermap.theknowledgegardens.com/theKnowledgeGardensOS) (uppercase variant 404s)
- [frontiermap.theknowledgegardens.com/robots.txt](https://frontiermap.theknowledgegardens.com/robots.txt) · [llms.txt](https://frontiermap.theknowledgegardens.com/llms.txt) · sitemap.xml (404)
- [github.com/chilly611/bkg-killer-app](https://github.com/chilly611/bkg-killer-app) (+ `api.github.com/repos/chilly611/bkg-killer-app/git/trees/main?recursive=1`)
- [github.com/chilly611/succulens-app](https://github.com/chilly611/succulens-app)
- [github.com/chilly611/knowledge-gardens-toxicology](https://github.com/chilly611/knowledge-gardens-toxicology) · [github.com/chilly611/hkg](https://github.com/chilly611/hkg) · [github.com/chilly611/mkg](https://github.com/chilly611/mkg)
- [github.com/XRWorkers/the-bloom-ledger](https://github.com/XRWorkers/the-bloom-ledger)
- GitHub API 404 (private/inaccessible): `api.github.com/repos/chilly611/knowledge-gardens-root`, `…/knowledge-gardens-orchids`, `…/knowledge-orchid-1.1`, `…/XRWorkers/TheBloom`
- Local repo: `docs/strategy/the-knowledge-gardens-os.html` (byte-identical to live OS page), `john walkthrough May 28 files/walkthrough.html`, `docs/handoff/WS1-PR-description.md`, `docs/findings/deploy-domain-2026-06-02.md`, `git show origin/main:docs/REPO-AND-WORKTREE-MAP.md`
