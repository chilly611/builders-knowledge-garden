import type { Page, Locator, BrowserContext } from '@playwright/test';

/**
 * Shared fixtures for the BKG e2e + data-consistency harness.
 *
 * NO app code is touched anywhere in this suite — every handle below is an
 * accessibility role/name, a stable className the app already ships, or a
 * localStorage key the app already reads. The app boots and renders fully
 * unauthenticated (Clerk is unwired; Supabase has placeholder fallbacks), so
 * the entire surface exercised here needs no real backend.
 */

/* ──────────────────────────────────────────────────────────────────────────
 * Projects
 * ────────────────────────────────────────────────────────────────────────── */

export const PROJECTS = {
  /** The only fully-seeded canonical demo (src/lib/seed-data/marin-farmhouse.ts). */
  MARIN: '55730cd3-5225-493d-8b5c-49086d942565',
  /**
   * The literal slug the project router treats as the offline demo
   * (ProjectDashboardClient -> getDemoProject() -> docs/demo-data/demo-project.json).
   * This is the ONE project whose body + ledger render with NO backend, which is
   * why the consistency net targets it: chrome-vs-body is observable, and the
   * post-fix app-shell reads the SAME fixture, so the net flips RED->GREEN
   * without auth. (Real UUIDs are backend-gated: GET /api/v1/budget -> 401.)
   */
  DEMO: 'demo-project',
} as const;

/* ──────────────────────────────────────────────────────────────────────────
 * Ground-truth numbers
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * The hardcoded Marin numbers exactly as the OLD chrome renders them (compact
 * fmtUsd: 1_650_000 -> "$1.65M", 312_400 -> "$312K", ...).
 * Source constants: src/lib/seed-data/marin-farmhouse.ts.
 * Formatting: src/components/killerapp-chrome/SpendBlock.tsx / HeadroomGauge.tsx.
 */
export const MARIN_CHROME = {
  total: '$1.65M', // MARIN_BUDGET_TOTAL 1_650_000
  spent: '$312K', // MARIN_BUDGET_SPENT 312_400
  committed: '$186K', // MARIN_BUDGET_COMMITTED 186_200
  remaining: '$1.15M', // MARIN_BUDGET_REMAINING 1_151_400
  incomeClosed: '$495K', // MARIN_INCOME_RECEIVED 495_000
  incomeProjected: '$1.49M', // 1_485_000
  draws: '5/21 draws',
  // MARIN_STAGE_COMPLETION {1:100,2:100,3:85(Plan),4:42(Build),5:0,6:0,7:0}
  buildPct: 42,
  spendAria: 'Spend $312K of $1.65M, committed $186K',
  incomeAria: 'Income: $495K closed, $1.49M projected',
  headroomAria: 'Headroom $1.15M remaining of $1.65M',
} as const;

/** Compact-USD strings that uniquely identify Marin, for "is the chrome stuck on Marin?" checks. */
export const MARIN_SIGNATURE_NUMBERS = [MARIN_CHROME.total, MARIN_CHROME.spent, MARIN_CHROME.remaining] as const;

/**
 * The demo-project ("Willow Creek ADU") ledger — the single source of truth the
 * body renders and the post-fix chrome must agree with.
 * Source: docs/demo-data/demo-project.json (approved/spent/committed) +
 * ProjectCompass.tsx (remaining = approved - committed; status = spent/approved).
 */
export const DEMO = {
  id: 'demo-project',
  name: 'Willow Creek ADU',
  raw: { approved: 340_000, spent: 187_400, committed: 224_100, remaining: 115_900 },
  stage: 4,
  stageLabel: 'Build',
  stageProgress: 62, // stageProgress[4] — the journey % the fixed chrome shows
  statusPct: 55, // spent/approved (HeroBand "Status") — a DIFFERENT metric; do not equate to journey %
  /**
   * Values PARSED from the compact rendered strings. The body renders lowercase
   * "$116k" and the fixed chrome renders uppercase "$116K" — both normalize to
   * the same magnitude, so the consistency net compares parsed numbers.
   */
  parsed: { total: 340_000, spent: 187_000, committed: 224_000, remaining: 116_000 },
  /** Body render literals (BudgetRiver, lowercase k). */
  body: { spent: '$187k', committed: '$224k', remaining: '$116k', total: '$340k', status: '55%' },
} as const;

/* ──────────────────────────────────────────────────────────────────────────
 * Money parsing — normalize "$1.65M" / "$312K" / "$116k" / "1,151,400" -> dollars
 * ────────────────────────────────────────────────────────────────────────── */

export function parseMoney(input: string | null | undefined): number | null {
  if (!input) return null;
  const m = String(input).match(/\$\s*([\d,]+(?:\.\d+)?)\s*([kKmMbB])?/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ''));
  if (Number.isNaN(n)) return null;
  const suffix = (m[2] ?? '').toLowerCase();
  const scale = suffix === 'k' ? 1_000 : suffix === 'm' ? 1_000_000 : suffix === 'b' ? 1_000_000_000 : 1;
  return Math.round(n * scale);
}

/* ──────────────────────────────────────────────────────────────────────────
 * Deterministic setup (run BEFORE the first goto so they take on every nav)
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Stop the first-visit demo auto-seed (src/lib/demo-seed.ts) from hijacking the
 * active project (it would set bkg-active-project='demo-san-diego-adu' and flip
 * the budget page off the anonymous key). Setting the seed flag short-circuits
 * the guard. Also pin a deterministic lane cookie.
 */
export async function pinAnonymous(context: BrowserContext, baseURL?: string): Promise<void> {
  await context.addInitScript(() => {
    try {
      localStorage.setItem('bkg:demo-seeded', 'v1:demo-san-diego-adu');
    } catch {
      /* storage unavailable */
    }
  });
  if (baseURL) {
    await context.addCookies([{ name: 'bkg-lane', value: 'gc', url: baseURL }]);
  }
}

/** Seed a BudgetClient ledger (the dash key the budget body reads) before navigation. */
export async function seedBudgetLedger(
  context: BrowserContext,
  projectId: string | null,
  lines: ReadonlyArray<Record<string, unknown>>,
): Promise<string> {
  const key = `bkg-budget-${projectId ?? 'anonymous'}`;
  await context.addInitScript(
    ([k, v]) => {
      try {
        localStorage.setItem(k, v);
      } catch {
        /* storage unavailable */
      }
    },
    [key, JSON.stringify(lines)] as [string, string],
  );
  return key;
}

/**
 * Pre-dismiss the per-(project,stage) "stage welcome" modal so it never
 * intercepts pointer events (src/design-system/components/StageWelcome.tsx keys
 * dismissal on `bkg:stage-welcome:<projectId>:<stageId>`).
 */
export async function dismissStageWelcome(context: BrowserContext, projectId: string): Promise<void> {
  await context.addInitScript((pid) => {
    try {
      for (let s = 1; s <= 7; s++) localStorage.setItem(`bkg:stage-welcome:${pid}:${s}`, 'dismissed');
    } catch {
      /* storage unavailable — Escape still dismisses */
    }
  }, projectId);
}

/* ──────────────────────────────────────────────────────────────────────────
 * The persistent chrome — implementation-agnostic readers
 *
 * Today's main renders the OLD chrome (src/components/killerapp-chrome/*): no
 * data-testid, only ARIA role + accessible name. The fix ("Stage 2") swaps in
 * the app-shell (src/components/app-shell/ShellStrips.tsx) which exposes class
 * hooks (.bkg-shell .gstrip-*). The readers below try BOTH, so the same test
 * reads the chrome before and after the fix and the consistency net flips
 * RED->GREEN with no edit.
 * ────────────────────────────────────────────────────────────────────────── */

/** Strongly-typed ARIA handles to the OLD chrome (today's main). */
export function chrome(page: Page) {
  return {
    banner: page.getByRole('banner', { name: 'Project chrome' }),
    budgetRegion: page.getByRole('region', { name: 'Project budget at a glance' }),
    journeyRegion: page.getByRole('region', { name: 'Project journey and timeline' }),
    scheduleList: page.getByRole('list', { name: 'Schedule milestones' }),
    spendBlock: page.getByRole('button', { name: /^Spend .* of .*, committed/ }),
    incomeBlock: page.getByRole('button', { name: /^Income: .* closed, .* projected/ }),
    headroomBlock: page.getByRole('button', { name: /^Headroom .* remaining of/ }),
    stageNode: (label: string) => page.getByRole('button', { name: new RegExp(`^${label}, \\d+ percent complete`) }),
  };
}

/**
 * The persistent chrome region, matching EITHER implementation. Used to scope
 * text/identity/overflow checks without caring which chrome is mounted.
 */
export function chromeRegion(page: Page): Locator {
  return page.locator('[role="banner"][aria-label="Project chrome"], .bkg-shell').first();
}

/** Wait for whichever chrome is mounted to attach (it renders client-side under Suspense). */
export async function waitForChrome(page: Page): Promise<void> {
  await chromeRegion(page).waitFor({ state: 'attached', timeout: 30_000 });
}

export interface ChromeBudget {
  source: 'old-killerapp-chrome' | 'app-shell' | 'none';
  remaining: number | null;
  total: number | null;
  spent: number | null;
  committed: number | null;
  text: string;
}

/** Read the chrome's budget figures regardless of which chrome is mounted. */
export async function readChromeBudget(page: Page): Promise<ChromeBudget> {
  const out: ChromeBudget = { source: 'none', remaining: null, total: null, spent: null, committed: null, text: '' };

  // OLD chrome: the accessible names carry every figure verbatim.
  const headroom = page.locator('[aria-label^="Headroom "]').first();
  const spend = page.locator('[aria-label^="Spend "]').first();
  if ((await headroom.count()) > 0 || (await spend.count()) > 0) {
    out.source = 'old-killerapp-chrome';
    const hAria = (await headroom.count()) ? await headroom.getAttribute('aria-label') : null;
    const hm = hAria?.match(/Headroom\s+(\$[\d.,kKmM]+)\s+remaining\s+of\s+(\$[\d.,kKmM]+)/);
    if (hm) {
      out.remaining = parseMoney(hm[1]);
      out.total = parseMoney(hm[2]);
    }
    const sAria = (await spend.count()) ? await spend.getAttribute('aria-label') : null;
    const sm = sAria?.match(/Spend\s+(\$[\d.,kKmM]+)\s+of\s+(\$[\d.,kKmM]+),\s+committed\s+(\$[\d.,kKmM]+)/);
    if (sm) {
      out.spent = parseMoney(sm[1]);
      out.total = out.total ?? parseMoney(sm[2]);
      out.committed = parseMoney(sm[3]);
    }
  } else {
    // NEW app-shell: budget strip is the non-journey .gstrip; end-big = remaining,
    // end-sub = "left of $<total>".
    const shell = page.locator('.bkg-shell');
    if ((await shell.count()) > 0) {
      out.source = 'app-shell';
      const endBig = shell.locator('.gstrip:not(.gstrip-j) .gstrip-end-big').first();
      const endSub = shell.locator('.gstrip:not(.gstrip-j) .gstrip-end-sub').first();
      if (await endBig.count()) out.remaining = parseMoney(await endBig.innerText());
      if (await endSub.count()) out.total = parseMoney(await endSub.innerText());
    }
  }

  const region = chromeRegion(page);
  if (await region.count()) out.text = (await region.innerText()).replace(/\s+/g, ' ').trim();
  return out;
}

export interface ChromeJourney {
  source: 'old-killerapp-chrome' | 'app-shell' | 'none';
  activeStage: string | null;
  activePct: number | null;
}

/** Read the chrome's active journey stage + its completion %, regardless of chrome. */
export async function readChromeJourney(page: Page): Promise<ChromeJourney> {
  // OLD chrome: the active StageNode carries aria-current="step" and an
  // aria-label like "Build, 42 percent complete, due Nov 20".
  const activeOld = page.locator('[aria-current="step"]').first();
  if (await activeOld.count()) {
    const aria = await activeOld.getAttribute('aria-label');
    const pct = aria?.match(/(\d+)\s+percent complete/);
    const stage = aria?.split(',')[0]?.trim() ?? null;
    return { source: 'old-killerapp-chrome', activeStage: stage, activePct: pct ? Number(pct[1]) : null };
  }
  // NEW app-shell: current node is .jnode.is-cur (.jname); journey % is the
  // journey strip's end-big.
  const shell = page.locator('.bkg-shell');
  if (await shell.count()) {
    const name = shell.locator('.jnode.is-cur .jname').first();
    const pctEl = shell.locator('.gstrip-j .gstrip-end-big').first();
    const stage = (await name.count()) ? (await name.innerText()).trim() : null;
    const pctTxt = (await pctEl.count()) ? await pctEl.innerText() : null;
    const pct = pctTxt?.match(/(\d+)/);
    return { source: 'app-shell', activeStage: stage, activePct: pct ? Number(pct[1]) : null };
  }
  return { source: 'none', activeStage: null, activePct: null };
}

export interface BodyBudget {
  name: string | null;
  spent: number | null;
  committed: number | null;
  remaining: number | null;
  total: number | null;
}

/**
 * Read the demo-project page body (Willow Creek dashboard: ProjectCompass ->
 * BudgetRiver "Spent: $187k / Committed: $224k / Remaining: $116k"). Total is
 * derived (committed + remaining) since the body has no single total figure.
 */
export async function readDemoBody(page: Page): Promise<BodyBudget> {
  const text = (await page.locator('body').innerText()).replace(/ /g, ' ');
  const grab = (label: string): number | null => {
    const m = text.match(new RegExp(`${label}:\\s*(\\$[\\d.,kKmM]+)`));
    return m ? parseMoney(m[1]) : null;
  };
  const spent = grab('Spent');
  const committed = grab('Committed');
  const remaining = grab('Remaining');
  const total = committed != null && remaining != null ? committed + remaining : null;
  const name = text.includes(DEMO.name) ? DEMO.name : null;
  return { name, spent, committed, remaining, total };
}
