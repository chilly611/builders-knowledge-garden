/**
 * /killerapp  —  Workflow picker landing.
 *
 * Per killer-app-direction.md Decisions #1, #3, #11:
 *   - Fluid paths: no quest-driven nav, no level-group headers,
 *     no earn-XP-to-unlock framing.
 *   - Workflow picker IS the primary nav.
 *   - Browse by the 7-stage lifecycle (Size Up → Lock → Plan → Build →
 *     Adapt → Collect → Reflect). Start anywhere.
 *
 * Server Component:
 *   - Reads docs/workflows.json at render time.
 *   - Renders a static list grouped by stage.
 *   - Only the live workflow (q5 Code Compliance) links out; others
 *     render as muted "Coming soon" cards.
 *
 * The old Command Center page moved to /killerapp/legacy-command-center
 * to preserve its project / attention-queue / heartbeat wiring for a
 * later, intentional integration.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import Link from 'next/link';
import WorkflowPickerSearchBox from './WorkflowPickerSearchBox';

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
  q1: 'Score a project for risk before you bid — red/yellow/green with reasons.',
  q2: 'Fast AI estimate from plans, specs, or a photo. Sanity-check before quoting.',
  q3: 'Look up a client: past projects, outstanding balances, notes.',
  q4: 'Six starter contracts — agreement, sub, lien waivers, NDA, change order — filled and downloaded as PDFs in one pass.',
  q5: 'Structural, electrical, plumbing, fire — which codes apply and where they bite.',
  q6: 'Sequence the job so trades don\'t trip over each other.',
  q7: 'How many workers you need per phase, based on scope and schedule.',
  q8: 'Draft permit applications from the scope you already described.',
  q9: 'Compare subcontractor bids with apples-to-apples line items.',
  q10: 'Rent vs. buy for the equipment this job actually needs.',
  q11: 'Ordering list from the plan, with lead times surfaced.',
  q12: 'Services & utilities to-do list — who to call, when, and for what.',
  q13: 'Find, screen, and onboard workers into a lane on your crew.',
  q14: 'Schedule around the weather forecast for your site.',
  q15: 'Speak your daily log. We\'ll structure it, tag it, and file it.',
  q16: 'Weekly OSHA toolbox talk, tailored to what you\'re actually doing this week.',
  q17: 'Receipt → coded expense, job-costed correctly.',
  q18: 'Outreach to your contacts — mass, tailored, or one-to-one.',
  q19: 'Compass: show me where I am, what\'s next, what I\'m missing.',
  q20: 'Draft the change order with reasons, cost breakdown, and schedule impact.',
  q21: 'Auto-fill the draw request against AIA formats + your GC\'s template.',
  q22: 'Lien waivers: who still owes one, and which form each needs.',
  q23: 'Review 1099 vs W-2 classifications on your current crew.',
  q24: 'Send a jobsite photo; get a punch-list entry with location and trade.',
  q25: 'Chase retainage politely and repeatedly until it shows up.',
  q26: 'Warranty reminders to the owner at the right intervals, in your voice.',
  q27: 'Post-job retrospective — what to do the same and what to change next time.',
};

function loadWorkflows(): WorkflowsJson {
  const path = resolve(process.cwd(), 'docs/workflows.json');
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw) as WorkflowsJson;
}

export const metadata = {
  title: 'Workflows — Builder\'s Knowledge Garden',
  description:
    'Pick the workflow that matches what you\'re working on. Start anywhere in the 7-stage lifecycle.',
};

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
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--trace)',
        color: 'var(--graphite)',
        fontFamily: 'var(--font-archivo), sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Hero */}
      <header
        style={{
          padding: '60px 28px 48px',
          maxWidth: 1100,
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* Blueprint-aesthetic hairline rule */}
        <div
          style={{
            height: '0.5px',
            background: 'var(--faded-rule)',
            marginBottom: 32,
          }}
        />

        {/* Pitch: short, direct */}
        <h1
          style={{
            fontSize: 48,
            fontWeight: 700,
            letterSpacing: '-1px',
            margin: '0 0 16px',
            lineHeight: 1.1,
            color: 'var(--navy)',
          }}
        >
          The operating system for your build.
        </h1>

        {/* Subhead: expands the vision */}
        <p
          style={{
            fontSize: 18,
            color: 'var(--graphite)',
            maxWidth: 620,
            lineHeight: 1.6,
            margin: '0 0 40px',
            fontWeight: 500,
          }}
        >
          Every tool a builder needs. Talking to each other. Learning as you go.
        </p>

        <WorkflowPickerSearchBox />
      </header>

      {/* Stage groups */}
      <main style={{ padding: '0 28px 80px', maxWidth: 1100, margin: '0 auto', width: '100%', flex: 1 }}>
        {stages.map((stage) => {
          const list = (byStage.get(stage.id) ?? []).sort((a, b) =>
            a.id.localeCompare(b.id, undefined, { numeric: true })
          );
          const color = STAGE_COLORS[stage.id] ?? '#555';
          if (list.length === 0) return null;
          return (
            <section key={stage.id} style={{ marginBottom: 56 }}>
              <header
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 12,
                  marginBottom: 24,
                  paddingBottom: 12,
                  borderBottom: '0.5px solid var(--faded-rule)',
                }}
              >
                <span style={{ fontSize: 20 }}>{stage.emoji}</span>
                <h2
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color,
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                    margin: 0,
                  }}
                >
                  {stage.id}. {stage.name}
                </h2>
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--graphite)',
                    opacity: 0.5,
                    marginLeft: 'auto',
                  }}
                >
                  {list.length} workflow{list.length === 1 ? '' : 's'}
                </span>
              </header>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: 12,
                }}
              >
                {list.map((wf) => {
                  const href = LIVE_WORKFLOWS[wf.id];
                  const isLive = Boolean(href);
                  const blurb = WORKFLOW_BLURBS[wf.id];
                  // Supply Ordering (q11) gets special prominence
                  const isSupplyOrdering = wf.id === 'q11';

                  const cardBase: React.CSSProperties = {
                    background: '#fff',
                    border: isSupplyOrdering ? '2px solid var(--robin)' : `1px solid ${isLive ? 'var(--brass)' : 'var(--faded-rule)'}`,
                    borderRadius: 12,
                    padding: isSupplyOrdering ? '20px 16px' : '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    minHeight: isSupplyOrdering ? 140 : 120,
                    transition: 'all 0.15s ease',
                    position: 'relative',
                    gridColumn: isSupplyOrdering ? 'span 2' : 'auto',
                  };
                  const cardInactive: React.CSSProperties = {
                    ...cardBase,
                    opacity: 0.6,
                  };

                  // Left accent line for LIVE workflows
                  const cardWithAccent: React.CSSProperties = {
                    ...cardBase,
                    borderLeft: isSupplyOrdering ? 'none' : '3px solid var(--brass)',
                    paddingLeft: isSupplyOrdering ? undefined : 14,
                  };
                  const title = (
                    <>
                      {isSupplyOrdering && (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.8px',
                            color: 'var(--robin)',
                            textTransform: 'uppercase',
                            marginBottom: 8,
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              background: 'var(--robin)',
                              borderRadius: '50%',
                            }}
                          />
                          New — broker-powered
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <h3
                          style={{
                            fontSize: isSupplyOrdering ? 16 : 14,
                            fontWeight: 700,
                            margin: 0,
                            color: 'var(--navy)',
                            lineHeight: 1.3,
                            flex: 1,
                          }}
                        >
                          {wf.label}
                        </h3>
                        {!isSupplyOrdering && (
                          <span
                            style={{
                              fontSize: 8,
                              fontWeight: 800,
                              letterSpacing: '0.7px',
                              color: isLive ? 'var(--brass)' : 'var(--graphite)',
                              opacity: isLive ? 1 : 0.5,
                              textTransform: 'uppercase',
                              whiteSpace: 'nowrap',
                              paddingTop: 2,
                            }}
                          >
                            {isLive ? '●' : '○'} {isLive ? 'LIVE' : 'SOON'}
                          </span>
                        )}
                      </div>
                      <p
                        style={{
                          fontSize: isSupplyOrdering ? 14 : 12,
                          color: 'var(--graphite)',
                          margin: 0,
                          lineHeight: 1.5,
                          flex: 1,
                        }}
                      >
                        {blurb ?? ' '}
                      </p>
                      <p
                        style={{
                          fontSize: 10,
                          color: 'var(--graphite)',
                          opacity: 0.5,
                          margin: 0,
                          fontWeight: 500,
                          letterSpacing: '0.3px',
                        }}
                      >
                        {wf.id.toUpperCase()} · {wf.steps.length} step
                        {wf.steps.length === 1 ? '' : 's'}
                      </p>
                    </>
                  );

                  if (isLive && href) {
                    return (
                      <Link
                        key={wf.id}
                        href={href}
                        className={isSupplyOrdering ? 'bkg-supply-ordering-link' : 'bkg-wf-card-link'}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                        data-stage-color={color}
                      >
                        <div className="bkg-wf-card" style={isSupplyOrdering ? cardBase : cardWithAccent}>
                          {title}
                        </div>
                      </Link>
                    );
                  }
                  return (
                    <div key={wf.id} style={cardInactive} aria-disabled="true">
                      {title}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>

      {/* Footer rail — subtle, minimal */}
      <footer
        style={{
          padding: '24px 28px',
          maxWidth: 1100,
          margin: '0 auto',
          width: '100%',
          borderTop: '0.5px solid var(--faded-rule)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 10,
          color: 'var(--graphite)',
          opacity: 0.5,
        }}
      >
        <div>Builder&rsquo;s Knowledge Garden · v0.1</div>
        <Link href="/compass" style={{ textDecoration: 'none', color: 'inherit' }}>
          Compass →
        </Link>
      </footer>

      <style>{`
        .bkg-wf-card-link .bkg-wf-card {
          transition: all 0.15s cubic-bezier(0.33, 0.66, 0.66, 1);
        }
        .bkg-wf-card-link:hover .bkg-wf-card {
          border-color: var(--navy) !important;
          box-shadow: 0 4px 14px rgba(27, 59, 94, 0.08);
          transform: translateY(-2px);
        }
        .bkg-supply-ordering-link {
          display: block;
          transition: all 0.15s cubic-bezier(0.33, 0.66, 0.66, 1);
        }
        .bkg-supply-ordering-link:hover {
          text-decoration: none;
        }
        .bkg-supply-ordering-link:hover > div {
          box-shadow: 0 8px 24px rgba(127, 207, 203, 0.12);
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
}
