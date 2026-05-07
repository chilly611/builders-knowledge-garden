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
import AuthAndProjectIndicator from './AuthAndProjectIndicator';
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
  q24: 'Walk the job — punch list. *(Final walk-through)*',
  q25: 'Follow up on retainage. *(Retainage tracker)*',
  q26: 'Log warranties. *(Warranty handoff)*',
  q27: 'What went well — and what didn\'t? *(Project review)*',
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
      {/* Auth + project-saved indicators in the top-right corner.
          User feedback 2026-05-06 — visible trust signals so the user
          always knows they're signed in and the project is saved. */}
      <Suspense fallback={null}>
        <AuthAndProjectIndicator />
      </Suspense>

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
            Ask anything — type or talk. Describe a scope and we&apos;ll route you to the right tool.
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

      {/* Stage groups: typographic TOC treatment */}
      <main className={styles.mainContent}>
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
