# Repo + folder map

The **only canonical source of truth is GitHub**: `chilly611/builders-knowledge-garden`, branch `main`. Everything below is a local convenience.

---

## Repo layout (in the GitHub repo / on your cloned copy)

The GitHub repo is **flat** — the Next.js app sits at the repo root, not under an `app/` subfolder. Chilly's local machine wraps it in `~/Desktop/The Builder Garden/app/` for historical reasons; on a fresh clone you don't see that wrapper.

```
builders-knowledge-garden/
├── CLAUDE.md                       ← agent instructions
├── tasks.todo.md                   ← current priorities — UPDATE EVERY SESSION
├── tasks.lessons.md                ← patterns / mistakes to avoid — APPEND WHEN LEARNED
├── next.config.ts
├── package.json
├── tsconfig.json
├── eslint.config.mjs
├── docs/
│   ├── session-log.md              ← canonical timeline — APPEND EVERY SESSION
│   ├── onboarding/                 ← Michael's onboarding bundle (you're here)
│   ├── sprint-may17/
│   │   ├── audit/                  ← Lane A audit reports
│   │   └── specs/                  ← Lane B specs (B1–B8)
│   ├── ai-prompts/                 ← per-workflow specialist prompts
│   ├── dream-builder-interface-brainstorm.md
│   └── killer-app-recovery-plan.md
├── supabase/
│   └── migrations/                 ← Supabase schema migrations
├── public/                         ← static assets
├── scripts/                        ← one-off scripts (seeders, batch utils)
└── src/
        ├── app/                    ← Next.js App Router
        │   ├── (root layout, home)
        │   ├── dream/              ← Dream Machine surface
        │   │   ├── oracle/         ← spoken intake → renders + Make This Real
        │   │   └── ...
        │   ├── killerapp/          ← Killer App surface
        │   │   ├── KillerappProjectShell.tsx   ← the project shell wrapper
        │   │   ├── layout.tsx                  ← mounts ProjectProvider + Cockpit
        │   │   ├── page.tsx                    ← landing
        │   │   └── workflows/                  ← the 27 workflows
        │   │       ├── client-lookup/
        │   │       ├── code-compliance/
        │   │       ├── contract-templates/
        │   │       ├── estimating/
        │   │       ├── expenses/
        │   │       ├── permit-applications/
        │   │       ├── sub-management/
        │   │       ├── supply-ordering/
        │   │       └── ... (~19 more)
        │   ├── launch/             ← Dream → KillerApp seam
        │   └── api/v1/             ← REST API routes
        │       ├── projects/       ← POST creates project, GET reads
        │       ├── conversations/  ← Dream Builder chat
        │       └── ...
        ├── components/             ← shared React components
        │   ├── cockpit/            ← ProjectCockpit + JourneyArc + TimeMachineDial + BudgetSnapshot
        │   ├── navigator/          ← (older) integrated navigator
        │   ├── AttachmentSection.tsx
        │   ├── AttachmentUploader.tsx
        │   ├── AttachmentThumbnailGrid.tsx
        │   └── dream/              ← Dream-specific components (MakeThisRealButton, etc.)
        ├── contexts/
        │   └── ProjectContext.tsx  ← THE SPINE — owns active project identity
        ├── design-system/
        │   ├── tokens/             ← colors, type, spacing, radii, borders, transitions
        │   └── components/         ← WorkflowShell, StepCard, etc.
        ├── lib/
        │   ├── time-machine.ts             ← snapshot create/read
        │   ├── use-time-machine-rewind.ts  ← rewind hook
        │   ├── journey-progress.ts         ← per-workflow event store
        │   ├── budget-spine.ts              ← budget read/write
        │   ├── supabase.ts                  ← Supabase client
        │   ├── contract-templates/          ← 6 .md contract bodies + types
        │   ├── pdf/                         ← PDF generation (jsPDF)
        │   ├── hooks/
        │   │   ├── useProject.ts
        │   │   ├── useProjectWorkflowState.ts
        │   │   └── useProjectStateBlob (also in useProjectWorkflowState.ts)
        │   └── knowledge-data.ts            ← jurisdictions + codes seed
        └── ...
```

---

## The local-folder confusion (Chilly's machine)

Chilly has accumulated multiple folders called some variation of "Builder's Knowledge Garden" across his PC laptop, MacBook desktop, and Claude session caches. **Most are stale.** Use this table to identify the real ones.

| Path | What it is | Trust |
|---|---|---|
| `~/Desktop/The Builder Garden/` | The active local working tree | YES (after `git pull`) |
| `~/Desktop/The Builder Garden/app/` | The Next.js app (working copy) | YES (after `git pull`) |
| `~/Desktop/The Builder Garden/Builder's Knowledge Garden/` | Docs + tasks + this onboarding folder | YES (after `git pull`) |
| `~/Library/Application Support/Claude/local-agent-mode-sessions/.../` | Cowork scratch space — temporary | NO — vanishes between sessions |
| `~/Library/Application Support/Claude/projects/*BKG*` (any old PC-laptop or desktop variants) | Stale local clones from before GitHub became canonical | NO — ignore, delete eventually |
| Anything in `~/Downloads`, `~/Documents` with "BKG" or "Builder" in the name | Stale; was once useful | NO |

### How to be sure you're in the right folder
```bash
cd <suspect-folder>
git remote -v
# If it doesn't show `origin  https://github.com/chilly611/builders-knowledge-garden.git`, you are in the wrong folder.
```

### Cleanup plan (post-demo, low priority)
After the Wednesday demo lands, Chilly should:
1. `rm -rf` every "Builder's Knowledge Garden" folder on disk that is **not** at `~/Desktop/The Builder Garden/`.
2. Add a top-level `~/BKG-WORKSPACE.md` note pointing to the one canonical path.
3. Update the Cowork app's project list so only that one folder is mounted.

Until then: when in doubt, `git pull origin main` in the canonical folder. That is the truth.

---

## Live URLs

| What | URL |
|---|---|
| Prod home | https://builders.theknowledgegardens.com/ |
| Killer App landing | https://builders.theknowledgegardens.com/killerapp |
| Dream Builder | https://builders.theknowledgegardens.com/dream/oracle |
| Contracts workflow | https://builders.theknowledgegardens.com/killerapp/workflows/contract-templates |
| Estimating workflow | https://builders.theknowledgegardens.com/killerapp/workflows/estimating |
| Code compliance | https://builders.theknowledgegardens.com/killerapp/workflows/code-compliance |
| Who's asking? (CRM) | https://builders.theknowledgegardens.com/killerapp/who-is-asking |

---

## Service URLs

| Service | URL | How to access |
|---|---|---|
| GitHub | https://github.com/chilly611/builders-knowledge-garden | Sign in as Chilly |
| Vercel dashboard | https://vercel.com/chillyd-2693s-projects/app | Sign in via the same GitHub account |
| Supabase | https://supabase.com/dashboard/project/vlezoyalutexenbnzzui | Login via Chilly's account |
| Clerk (auth) | https://dashboard.clerk.com | Chilly will share credentials |
| Stripe (test mode) | https://dashboard.stripe.com | Chilly will share credentials |

---

## Demo project IDs (in prod Supabase)

Two pre-seeded "Marin custom farmhouse" projects exist. Either works for the demo.

| User | Email | Project UUID |
|---|---|---|
| Chilly | chillyd@gmail.com | (look up via Supabase; named "Marin Custom Modern Farmhouse") |
| Charlie | charlie@xrworkers.com | `55730cd3-5225-493d-8b5c-49086d942565` |

Each is fully populated: 2 Dream conversations, 11 budget line items, 3 CRM contacts, Marin jurisdiction tagged.
