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
import Link from 'next/link';
import Logomark from '@/components/Logomark';
import WorkflowPickerSearchBox from './WorkflowPickerSearchBox';
import styles from './landing.module.css';

export const metadata: Metadata = {
  title: 'Workflows — Builder\'s Knowledge Garden',
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
  q2: '/killerapp/workflows/estimating',
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
};

// Short human-readable blurbs per workflow. Keeps the picker scannable
// without forcing each workflow route to export its own metadata yet.
const WORKFLOW_BLURBS: Record<string, string> = {
  q1: 'Red, yellow, or green light on the bid. Why you should or shouldn\'t bid.',
  q2: 'Get a rough number from the plans. Sanity-check before you quote the client.',
  q3: 'Who you\'re working for. Past projects, how they pay, what you know about them.',
  q4: 'Six templates — contract, sub agreement, liens, NDA, change order. Filled and ready to sign.',
  q5: 'Which codes matter here. Structural, electrical, plumbing, fire, egress.',
  q6: 'Who works when. Demo, framing, MEP, drywall, paint. Who can run at the same time.',
  q7: 'How many people you need, per phase. And when you\'ll peak.',
  q8: 'Applications ready to submit. From the scope you already wrote.',
  q9: 'Bids side-by-side. Electrical, plumbing, framing. Same categories, easy to compare.',
  q10: 'Scissor lift, dumpster, scaffolding. Rent it or own it. Total cost.',
  q11: 'Order the materials. Lead times, suppliers, best prices, inventory check.',
  q12: 'Utility locates, dumpster, portable toilet, inspections. Who to call, when.',
  q13: 'Find the crew. Screen candidates. Send offers. Lock dates.',
  q14: 'Schedule around rain and cold. Sensitive phases get flagged. 10-day forecast.',
  q15: 'Speak it. We log it. Structured, tagged, searchable.',
  q16: 'Weekly safety talk. OSHA-sourced. Tailored to what your crew is doing.',
  q17: 'Receipts coded by category. Budget vs. actual. Overages flagged.',
  q18: 'Mass outreach to vendors. RFQ in bulk. Responses tracked.',
  q19: 'Snapshot of where you are. Estimate, schedule, tasks. Save it. Resume later.',
  q20: 'Scope change? Draft the CO. Cost and schedule impact. Ready for signature.',
  q21: 'Draw request auto-filled. Lender format. Track percent complete and payment status.',
  q22: 'Who needs to waive and when. Conditional, final. Check who\'s signed.',
  q23: 'Employee vs. 1099. Classification review. Flag edge cases.',
  q24: 'Photos in. Punch list out. Drywall gaps, paint drips, trim misses.',
  q25: 'Retainage reminder sequence. Track who owes. Escalate if needed.',
  q26: 'Warranty log. When they expire. Owner reminders on your schedule.',
  q27: 'What worked. What didn\'t. Cost variance. Crew feedback. Lessons for next time.',
};

function loadWorkflows(): WorkflowsJson {
  const path = resolve(process.cwd(), 'docs/workflows.json');
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw) as WorkflowsJson;
}

const STAGE_COLORS: Record<number, string> = {
  1: '#D85A30', // Size Up
  2: '#7F77DD', // Lock
  3: '#1D9E75', // Plan
  4: '#378ADD', // Build
  5: '#F59E0B', // Adapt
  6: '#BA7517', // Collect
  7: '#639922', // Reflect
};

export default function KillerAppPage() {
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
            <h1 className={styles.heroHeading}>
              The operating system for your build.
            </h1>

            <p className={styles.heroSubhead}>
              Every tool a builder needs. Talking to each other. Learning as
              you go.
            </p>
          </div>
        </div>

        {/* Natural-language entry: styled as engraved field */}
        <div className={styles.searchBoxWrapper}>
          <WorkflowPickerSearchBox />
        </div>
      </header>

      {/* Stage groups: typographic TOC treatment */}
      <main className={styles.mainContent}>
        {stages.map((stage) => {
          const list = (byStage.get(stage.id) ?? []).sort((a, b) =>
            a.id.localeCompare(b.id, undefined, { numeric: true })
          );
          const color = STAGE_COLORS[stage.id] ?? '#555';
          if (list.length === 0) return null;

          return (
            <section key={stage.id} className={styles.stageSection}>
              {/* Stage header: small-caps brass tracking */}
              <header className={styles.stageHeader}>
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

                  const rowContent = (
                    <div
                      className={`${styles.workflowRow} ${
                        isSupplyOrdering ? styles.workflowRowPeakMoment : ''
                      }`}
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
                        <p className={styles.workflowBlurb}>{blurb ?? ' '}</p>
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
                    return (
                      <Link
                        key={wf.id}
                        href={href}
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
            </section>
          );
        })}
      </main>

      {/* Footer rail — subtle, minimal */}
      <footer className={styles.footer}>
        <div>Builder&rsquo;s Knowledge Garden · v0.1</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <Link href="/compass" style={{ textDecoration: 'none', color: 'inherit', fontWeight: 500 }}>
            View your project Compass →
          </Link>
          <div style={{ fontSize: '9px', color: 'inherit', opacity: 0.6, maxWidth: 180, textAlign: 'right', lineHeight: 1.4 }}>
            Your one-page project map. Open it any time.
          </div>
        </div>
      </footer>
    </div>
  );
}
