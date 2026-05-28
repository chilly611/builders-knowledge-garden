/**
 * /killerapp  —  Workflow picker landing (W7.B dramatic hero pass).
 *
 * Per killer-app-direction.md Decisions #1, #3, #11:
 *   - Fluid paths: no quest-driven nav, no level-group headers,
 *     no earn-XP-to-unlock framing.
 *   - Workflow picker IS the primary nav.
 *   - Browse by the 7-stage lifecycle (Size Up → Lock → Plan → Build →
 *     Adapt → Collect → Reflect). Start anywhere.
 *
 * W7.B Redesign:
 *   - Hero section: Large 96-120px display text + oversized Logomark (180px)
 *   - Blueprint grid background (32px, 6% opacity, --faded-rule)
 *   - Typographic TOC treatment: stage headers in small-caps brass tracking,
 *     workflow entries as numbered rows (q2, q4, q11) with 60%-opacity blurbs
 *   - Natural-language entry (SearchBox) styled as engraved field beneath hero
 *
 * Server Component:
 *   - Reads docs/workflows.json at render time.
 *   - Renders static list grouped by stage.
 *   - Only live workflows link out; others render as muted "Coming soon".
 *
 * The old Command Center page moved to /killerapp/legacy-command-center
 * to preserve its project / attention-queue / heartbeat wiring for a
 * later, intentional integration.
 */

import type { Metadata } from 'next';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Suspense } from 'react';
import Link from 'next/link';
import Logomark from '@/components/Logomark';
import ScrollStage from '@/design-system/components/ScrollStage';
import { STAGE_ACCENTS } from '@/design-system/tokens/stage-accents';
import { LIFECYCLE_STAGES } from '@/lib/lifecycle-stages';
import WorkflowPickerSearchBox from './WorkflowPickerSearchBox';
import SearchBoxErrorBoundary from './SearchBoxErrorBoundary';
import KillerappProjectShell from './KillerappProjectShell';
import EmptyStateOrProjectIndicator from './EmptyStateOrProjectIndicator';
import DiyCockpitOverlay from './DiyCockpitOverlay';
import TermTooltip from '@/components/TermTooltip';
import styles from './landing.module.css';

export const metadata: Metadata = {
  title: 'Workflows',
  description: 'Pick the workflow that matches what you\'re working on — code compliance, estimating, supply ordering, contracts, crew, and more. Start anywhere in the 7-stage lifecycle.',
  openGraph: {
    title: 'Workflows — Builder\'s Knowledge Garden',
    description: 'Pick the workflow that matches what you\'re working on.',
    images: [{ url: '/public/og/og-workflows.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Workflows — Builder\'s Knowledge Garden',
    description: 'Pick the workflow that matches what you\'re working on.',
    images: ['/public/og/og-workflows.png'],
  },
};

interface LifecycleStage {
  id: number;
  name: string;
  original_prototype_name?: string;
  emoji: string;
}

interface WorkflowSummary {
  id: string;
  stageId: number;
  label: string;
  totalXp: number;
  steps: unknown[];
}

interface WorkflowsJson {
  lifecycleStages: LifecycleStage[];
  workflows: WorkflowSummary[];
}

// Live, wired workflows. Extend this map as each q-id ships a route.
// Kept explicit so "Coming soon" never lies.
//
// Week 3 farm (W3.7 integrator pass): wired q2 + q6-q19 in one edit per
// docs/week3-integration-worksheet.md.
const LIVE_WORKFLOWS: Record<string, string> = {
  // Week 2
  q4: '/killerapp/workflows/contract-templates',
  q5: '/killerapp/workflows/code-compliance',
  // Week 3 — Size Up
  q1: '/killerapp/workflows/bid-risk',
  q2: '/killerapp/workflows/estimating',
  q3: '/killerapp/workflows/client-lookup',
  // Week 3 — Plan
  q6: '/killerapp/workflows/job-sequencing',
  q7: '/killerapp/workflows/worker-count',
  q8: '/killerapp/workflows/permit-applications',
  q9: '/killerapp/workflows/sub-management',
  q10: '/killerapp/workflows/equipment',
  q11: '/killerapp/workflows/supply-ordering',
  q12: '/killerapp/workflows/services-todos',
  q13: '/killerapp/workflows/hiring',
  // Week 3 — Build
  q14: '/killerapp/workflows/weather-scheduling',
  q15: '/killerapp/workflows/daily-log',
  q16: '/killerapp/workflows/osha-toolbox',
  q17: '/killerapp/workflows/expenses',
  q18: '/killerapp/workflows/outreach',
  q19: '/killerapp/workflows/compass-nav',
  // Sequence-open (2026-05-22): q20-q27 opened so stage 5/6/7 transitions
  // in NextWorkflowCard + StageWelcome CTAs land on real workflows instead
  // of falling back to the picker. q21/q22/q25 carry their own inline
  // "under construction" preview banners — handled at the workflow level,
  // not by hiding them from LIVE_WORKFLOWS.
  q20: '/killerapp/workflows/change-orders',
  q21: '/killerapp/workflows/draw-requests',
  q22: '/killerapp/workflows/lien-waivers',
  q23: '/killerapp/workflows/payroll-check',
  q24: '/killerapp/workflows/final-walk-through',
  q25: '/killerapp/workflows/retainage-tracker',
  q26: '/killerapp/workflows/warranty-handoff',
  q27: '/killerapp/workflows/project-review',
  // Sprint B7 — voice-first lead intake
  'crm-lead-intake': '/killerapp/who-is-asking',
  // 2026-05-22 — architect of record concierge form
  'q-aor': '/killerapp/workflows/architect-of-record',
  // 2026-05-22 — running punch list (field-grade). Build-stage, distinct
  // from q24's final-walk-through closeout.
  'q-punch': '/killerapp/workflows/punch-list',
  // 2026-05-22 — RFIs (Submit RFIs). Build-stage. UI over /api/v1/rfis.
  'q-rfi': '/killerapp/workflows/rfis',
  // 2026-05-22 — MEP scheduling generators (deterministic, no LLM).
  // q-panel-schedule = NEC 220 service-load calc + 40-circuit panel directory.
  // q-equipment-schedule = HVAC tonnage + UPC 422.1 plumbing fixture count.
  // q-load-calc = the underlying /api/v1/load-calc endpoint; surfaced via
  // the panel-schedule UI (no separate page).
  'q-panel-schedule': '/killerapp/workflows/panel-schedule',
  'q-equipment-schedule': '/killerapp/workflows/equipment-schedule',
  'q-load-calc': '/killerapp/workflows/panel-schedule',
  // 2026-05-22 — OWNER-LANE approvals inbox (change orders / draws /
  // lien waivers). LaneGate restricts the visible UI to owner+gc; the
  // /api/v1/signatures endpoint additionally enforces required_signers
  // membership server-side.
  'q-approvals': '/killerapp/workflows/approvals',
  // 2026-05-22 — SUBBID-FLOW: lane-gated bid surfaces. q-sub-bid-submit
  // = sub-lane (specialist/contractor) push-bid form. q-sub-bid-inbox =
  // GC-lane (gc/owner/teammate) review-and-respond. The LaneGate on each
  // client redirects mismatched lanes to the right surface.
  'q-sub-bid-submit': '/killerapp/workflows/sub-bid-submit',
  'q-sub-bid-inbox': '/killerapp/workflows/sub-bid-inbox',
  // 2026-05-22 — BOOKKEEPER-UI: vendor master + AR/AP ledger + QB export +
  // audit-trail viewer. The bookkeeper-must-haves Jenny called out.
  'q-vendors':     '/killerapp/workflows/vendor-master',
  'q-ledger':      '/killerapp/workflows/ar-ap-ledger',
  'q-qbexport':    '/killerapp/workflows/quickbooks-export',
  'q-audit-trail': '/killerapp/workflows/audit-trail',
  // 2026-05-22 — DIY-LANE: GC matching concierge form (q-find-gc, stage 2).
  // Roles: ['diy', 'owner'] — see ROLES below.
  'q-find-gc': '/killerapp/workflows/find-a-gc',
  // 2026-05-22 — DIY-LANE: plain-English budget walkthrough (q-cost-explainer, stage 1).
  'q-cost-explainer': '/killerapp/workflows/cost-explainer',
};

// NOTE: the workflow → roles map moved to `@/lib/workflow-roles` as part
// of the WORKFLOW-ROLES-NAV sprint (2026-05-22). CompassWorkflowNav,
// NextWorkflowCard, and DiyCockpitOverlay all consult the same map so
// the picker never surfaces a tile that would LaneGate-redirect on click.
// Import retained at the top of this file for any future page-level use.

// Short human-readable blurbs per workflow. Keeps the picker scannable
// without forcing each workflow route to export its own metadata yet.
// Dual-label format: plain-English Q first (bold), pro term second (italic/parenthetical).
const WORKFLOW_BLURBS: Record<string, string> = {
  q1: 'Should you bid this job? *(Pre-bid risk score)*',
  q2: 'What might this cost to build? *(Quick estimate)*',
  q3: 'Who are you working for? *(Client lookup)*',
  q4: 'Get paperwork ready. *(Contract templates)*',
  q5: 'Which codes apply here? *(Code compliance)*',
  q6: 'Who works when? *(Sequence the trades)*',
  q7: 'How many crew do you need? *(Crew sizing)*',
  q8: 'What permits do you need? *(Permit checklist)*',
  q9: 'Compare sub bids. *(Bid analysis)*',
  q10: 'Rent or buy equipment? *(Equipment costs)*',
  q11: 'Order the materials. *(Supply ordering)*',
  q12: 'Schedule utilities and services. *(Services to-do)*',
  q13: 'Find and hire crew. *(Hiring)*',
  q14: 'Plan around the weather. *(Weather scheduling)*',
  q15: 'What happened today? *(Daily log)*',
  q16: 'Safety topic for the week. *(Toolbox talk)*',
  q17: 'Track spending on the job. *(Expense report)*',
  q18: 'Reach out to vendors. *(Vendor outreach)*',
  q19: 'Where are you now? *(Project compass)*',
  q20: 'Scope changed — what\'s the cost? *(Change orders)*',
  q21: 'Request your payment draw. *(Draw requests)*',
  q22: 'Collect lien waivers. *(Lien waiver tracker)*',
  q23: 'Are workers classified right? *(Payroll check)*',
  q24: 'Sign off at substantial completion. *(Final walk-through — gates retainage release)*',
  q25: 'Follow up on retainage. *(Retainage tracker)*',
  q26: 'Log warranties. *(Warranty handoff)*',
  q27: 'What went well — and what didn\'t? *(Project review)*',
  'crm-lead-intake': 'Who\'s asking? *(Voice lead intake)*',
  'q-aor': 'Need an architect of record? *(Email us)*',
  'q-punch': 'Field-grade punch list. Add items with photo + voice. Swipe to resolve. *(Running punch list)*',
  'q-rfi': 'Ask the design team a clarification question — with photos, voice, and a response timer. *(Submit RFIs)*',
  'q-approvals': 'Sign off on change orders and draws. *(Approvals inbox — owner lane)*',
  // 2026-05-22 — MEP scheduling generators.
  'q-panel-schedule': 'How big a service do you need? *(Panel schedule — NEC Article 220)*',
  'q-equipment-schedule': 'How many tons and how many toilets? *(Equipment schedule — ASHRAE / UPC 422.1)*',
  'q-load-calc': 'Run the electrical load calc. *(NEC 220 service-load math, no LLM)*',
  // 2026-05-22 — SUBBID-FLOW.
  'q-sub-bid-submit': 'Push a bid to the GC. *(Sub-lane bid form — scope, line items, CSLB, insurance)*',
  'q-sub-bid-inbox': 'Bids your subs pushed. *(GC-lane inbox — review, accept, reject, counter)*',
  // 2026-05-22 — BOOKKEEPER-UI bookkeeper-must-haves.
  'q-vendors':     'Who you pay. *(Vendor master — CSLB#, W-9, insurance, terms)*',
  'q-ledger':      'Money in, money out. *(AR / AP ledger with payment history)*',
  'q-qbexport':    'Hand off to QuickBooks. *(IIF / CSV export for month-end close)*',
  'q-audit-trail': 'Every change, who and when. *(Audit trail — bookkeeper trust)*',
  // 2026-05-22 — DIY-LANE additions.
  'q-find-gc':        'Find a vetted GC for your project. *(GC matching concierge)*',
  'q-cost-explainer': 'Why does it cost what it does? *(Plain-English budget breakdown)*',
};

function loadWorkflows(): WorkflowsJson {
  const path = resolve(process.cwd(), 'docs/workflows.json');
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw) as WorkflowsJson;
}

// Helper to render dual-label blurbs: plain Q + italic pro term
// Format: "Plain question? *(Pro term)*" → JSX with italic styling
function renderBlurb(blurb: string) {
  const match = blurb.match(/^(.+?)\s+\*\(([^)]+)\)\*$/);
  if (match) {
    const [, question, proTerm] = match;
    return (
      <>
        <strong>{question}</strong>{' '}
        <span style={{ fontStyle: 'italic', opacity: 0.7 }}>({proTerm})</span>
      </>
    );
  }
  return blurb;
}

const STAGE_COLORS: Record<number, string> = {
  1: '#C9913F', // Size Up — ochre from STAGE_ACCENTS
  2: '#3E3A6E', // Lock — indigo from STAGE_ACCENTS
  3: '#2E9E9A', // Plan — teal from STAGE_ACCENTS
  4: '#E05E4B', // Build — coral from STAGE_ACCENTS
  5: '#B23A7F', // Adapt — magenta from STAGE_ACCENTS
  6: '#B6873A', // Collect — brass from STAGE_ACCENTS
  7: '#5E4B7C', // Reflect — duskPurple from STAGE_ACCENTS
};

export default async function KillerAppPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project: activeProjectId } = await searchParams;
  const data = loadWorkflows();
  const stages = [...data.lifecycleStages].sort((a, b) => a.id - b.id);
  const byStage = new Map<number, WorkflowSummary[]>();
  for (const w of data.workflows) {
    const list = byStage.get(w.stageId) ?? [];
    list.push(w);
    byStage.set(w.stageId, list);
  }

  return (
    <div className={styles.pageContainer}>
      {/* Auth + project indicator now lives inside KillerAppNav (inline mode)
          so it travels with the nav bar on every /killerapp/* route and
          never overlaps the stage chips. Removed standalone instance here. */}

      {/* Hero with blueprint grid background */}
      <header className={styles.heroSection}>
        {/* Blueprint 32px grid background */}
        <div className={styles.blueprintGrid} />

        {/* Hairline rule — architectural aesthetic */}
        <div className={styles.hairlineRule} />

        {/* Hero content: Logomark + text stack.
            Logomark is one flex column; h1 + subhead stack vertically in
            the second flex column. Without the text-stack wrapper, h1 and
            subhead became siblings of the logomark (3 flex items in a
            row), cramming the h1 into a narrow column and wrapping every
            word with `hyphens: auto` into a vertical mess — cf. the W7.O+
            live-site regression we fixed. */}
        <div className={styles.heroContent}>
          {/* Large Logomark (180px) anchors the hero */}
          <div className={styles.heroLogomark}>
            <Logomark size={180} alt="Builder's Knowledge Garden" />
          </div>

          <div className={styles.heroTextStack}>
            {/* 2026-05-27: Killed the "operating system for your build" tagline
                per chrome build spec. The persistent KillerAppChrome (mounted
                in killerapp/layout.tsx) is the new opening statement —
                budget + journey at a glance. The hero now leads with the
                workflow picker subhead directly. Original copy preserved in
                git history (this commit's parent) and in
                src/components/_archive/2026-05-27/ context notes. */}
            <h1 className={styles.heroHeading}>
              Pick a workflow.
            </h1>

            <p className={styles.heroSubhead}>
              Start anywhere in the 7-stage lifecycle. Every tool wired together.
            </p>
          </div>
        </div>

        {/* Natural-language entry: styled as engraved field */}
        <div className={styles.searchBoxWrapper}>
          <div
            style={{
              fontSize: '13px',
              color: 'var(--graphite)',
              opacity: 0.65,
              marginBottom: '8px',
              fontWeight: 400,
              letterSpacing: '0.2px',
            }}
          >
            Tell us what you&apos;re working on. We&apos;ll point you at the right tool.
          </div>
          <SearchBoxErrorBoundary>
            <WorkflowPickerSearchBox />
          </SearchBoxErrorBoundary>
        </div>
      </header>

      {/*
        Project Spine v1 — when ?project=<id> is present, this client
        island hydrates the project + conversations and renders an
        inline AI response panel above the picker. Otherwise renders
        nothing. Suspense required for useSearchParams.
      */}
      <Suspense fallback={null}>
        <KillerappProjectShell />
      </Suspense>

      {/* DIY-LANE (2026-05-22): when the active lane is `diy`, the overlay
          mounts a 3-column simplified picker (Plan / Hire / Track) AND
          flips a body data-attr that hides the pro lifecycle picker via
          a [data-diy-hide-picker="1"] CSS rule. Non-diy lanes render
          nothing here. The full picker is reachable with ?showAllWorkflows=1. */}
      <Suspense fallback={null}>
        <DiyCockpitOverlay />
      </Suspense>

      {/* Stage groups: typographic TOC treatment */}
      <main className={styles.mainContent} data-diy-hide-picker="1">
        {/* Subtle one-line stage-progress indicator.
            Project Spine v1 (2026-05-05): made context-aware. Hides
            itself when ?project=<id> is present in the URL — the
            project shell renders the active state above the picker. */}
        <Suspense fallback={null}>
          <EmptyStateOrProjectIndicator />
        </Suspense>

        {stages.map((stage) => {
          const list = (byStage.get(stage.id) ?? []).sort((a, b) =>
            a.id.localeCompare(b.id, undefined, { numeric: true })
          );
          const color = STAGE_COLORS[stage.id] ?? '#555';
          if (list.length === 0) return null;

          const stageAccent = STAGE_ACCENTS[stage.id as keyof typeof STAGE_ACCENTS];
          const accentHex = stageAccent?.hex || color;

          return (
            <ScrollStage key={stage.id} stageId={stage.id} className={styles.stageSection}>
              {/* Stage header: small-caps brass tracking */}
              <header
                className={`${styles.stageHeader} scroll-fade-in`}
                style={{
                  '--stage-accent': accentHex,
                } as React.CSSProperties}
              >
                <span className={styles.stageEmoji}>{stage.emoji}</span>
                <h2 className={styles.stageName} style={{ color }}>
                  {stage.id}. {stage.name}
                </h2>
                <span className={styles.stageCount}>
                  {list.length} workflow{list.length === 1 ? '' : 's'}
                </span>
              </header>

              {/* Workflow entries: numbered TOC rows */}
              <div className={styles.workflowList}>
                {list.map((wf) => {
                  const href = LIVE_WORKFLOWS[wf.id];
                  const isLive = Boolean(href);
                  const blurb = WORKFLOW_BLURBS[wf.id];
                  const isSupplyOrdering = wf.id === 'q11';
                  const stageAccent = STAGE_ACCENTS[stage.id as keyof typeof STAGE_ACCENTS];
                  const accentHex = stageAccent?.hex || color;

                  const rowContent = (
                    <div
                      className={`${styles.workflowRow} ${
                        isSupplyOrdering ? styles.workflowRowPeakMoment : ''
                      } scroll-fade-in`}
                      style={{
                        '--stage-accent': accentHex,
                      } as React.CSSProperties}
                    >
                      {/* Workflow ID / code */}
                      <div className={styles.workflowCode}>
                        {wf.id.toUpperCase()}
                      </div>

                      {/* Workflow name and blurb */}
                      <div className={styles.workflowDetails}>
                        <h3 className={styles.workflowName}>
                          {wf.label}
                          {isSupplyOrdering && (
                            <span className={styles.supplyOrderingBadge}>
                              ● broker-powered
                            </span>
                          )}
                        </h3>
                        <p className={styles.workflowBlurb}>
                          {blurb ? renderBlurb(blurb) : ' '}
                        </p>
                        <p className={styles.workflowMeta}>
                          {wf.steps.length} step
                          {wf.steps.length === 1 ? '' : 's'}
                        </p>
                      </div>

                      {/* Live/Soon indicator */}
                      <div className={styles.workflowStatus}>
                        {isLive ? (
                          <>
                            <span className={styles.liveIndicator}>●</span>
                            <span className={styles.liveLabel}>LIVE</span>
                          </>
                        ) : (
                          <>
                            <span className={styles.soonIndicator}>○</span>
                            <span className={styles.soonLabel}>SOON</span>
                          </>
                        )}
                      </div>
                    </div>
                  );

                  if (isLive && href) {
                    // Preserve active project context so the workflow page
                    // hydrates state instead of bouncing back to /killerapp.
                    // Fixes the 2026-05-11 "clicked Check codes → nothing
                    // saved" regression where bare hrefs dropped ?project=.
                    const liveHref = activeProjectId
                      ? `${href}?project=${encodeURIComponent(activeProjectId)}`
                      : href;
                    return (
                      <Link
                        key={wf.id}
                        href={liveHref}
                        className={styles.workflowLink}
                        data-workflow-id={wf.id}
                      >
                        {rowContent}
                      </Link>
                    );
                  }

                  return (
                    <div key={wf.id} className={styles.workflowRowDisabled}>
                      {rowContent}
                    </div>
                  );
                })}
              </div>
            </ScrollStage>
          );
        })}
      </main>

      {/* Footer rail — subtle, minimal */}
      <footer className={styles.footer}>
        <div>Builder&rsquo;s Knowledge Garden · v0.1</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <Link href="/compass" style={{ textDecoration: 'none', color: 'inherit', fontWeight: 500 }}>
            View your project <TermTooltip term="Compass">Compass</TermTooltip> →
          </Link>
          <div style={{ fontSize: '9px', color: 'inherit', opacity: 0.6, maxWidth: 180, textAlign: 'right', lineHeight: 1.4 }}>
            Your one-page project map. Open it any time.
          </div>
        </div>
      </footer>
    </div>
  );
}
