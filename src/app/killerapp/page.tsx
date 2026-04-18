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

// The single live workflow today. When W2.3+ wires more, extend this map
// or swap to a manifest file. Kept explicit so "Coming soon" never lies.
const LIVE_WORKFLOWS: Record<string, string> = {
  q5: '/killerapp/workflows/code-compliance',
};

// Short human-readable blurbs per workflow. Keeps the picker scannable
// without forcing each workflow route to export its own metadata yet.
const WORKFLOW_BLURBS: Record<string, string> = {
  q1: 'Score a project for risk before you bid — red/yellow/green with reasons.',
  q2: 'Fast AI estimate from plans, specs, or a photo. Sanity-check before quoting.',
  q3: 'Look up a client: past projects, outstanding balances, notes.',
  q4: 'Contract templates tuned to your trade and jurisdiction.',
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
        background: '#FAFAF8',
        color: '#1a1a1a',
        fontFamily: 'var(--font-archivo), sans-serif',
      }}
    >
      {/* Hero */}
      <header
        style={{
          padding: '40px 28px 24px',
          maxWidth: 1100,
          margin: '0 auto',
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#E8443A',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            margin: 0,
          }}
        >
          Workflows
        </p>
        <h1
          style={{
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: '-0.75px',
            margin: '6px 0 10px',
            lineHeight: 1.15,
          }}
        >
          Pick what you&apos;re working on. Start anywhere.
        </h1>
        <p
          style={{
            fontSize: 15,
            color: '#666',
            maxWidth: 620,
            lineHeight: 1.55,
            margin: '0 0 24px',
          }}
        >
          Twenty-seven builder workflows, grouped by the stage of a project they belong to.
          No levels to unlock, no quests to finish first — jump in wherever the job is today.
        </p>

        <WorkflowPickerSearchBox />
      </header>

      {/* Stage groups */}
      <main style={{ padding: '16px 28px 80px', maxWidth: 1100, margin: '0 auto' }}>
        {stages.map((stage) => {
          const list = (byStage.get(stage.id) ?? []).sort((a, b) =>
            a.id.localeCompare(b.id, undefined, { numeric: true })
          );
          const color = STAGE_COLORS[stage.id] ?? '#555';
          if (list.length === 0) return null;
          return (
            <section key={stage.id} style={{ marginTop: 40 }}>
              <header
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 12,
                  marginBottom: 14,
                  paddingBottom: 8,
                  borderBottom: `1px solid ${color}22`,
                }}
              >
                <span style={{ fontSize: 18 }}>{stage.emoji}</span>
                <h2
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color,
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                    margin: 0,
                  }}
                >
                  {stage.id}. {stage.name}
                </h2>
                <span style={{ fontSize: 12, color: '#aaa' }}>
                  {list.length} workflow{list.length === 1 ? '' : 's'}
                </span>
              </header>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 12,
                }}
              >
                {list.map((wf) => {
                  const href = LIVE_WORKFLOWS[wf.id];
                  const isLive = Boolean(href);
                  const blurb = WORKFLOW_BLURBS[wf.id];
                  const cardBase: React.CSSProperties = {
                    background: '#fff',
                    border: `1px solid ${isLive ? `${color}40` : '#e5e5e0'}`,
                    borderRadius: 12,
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    minHeight: 120,
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    position: 'relative',
                  };
                  const cardInactive: React.CSSProperties = {
                    ...cardBase,
                    opacity: 0.55,
                  };
                  const title = (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            margin: 0,
                            color: '#1a1a1a',
                            lineHeight: 1.3,
                            flex: 1,
                          }}
                        >
                          {wf.label}
                        </h3>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            letterSpacing: '0.8px',
                            color: isLive ? '#22C55E' : '#aaa',
                            border: `1px solid ${isLive ? '#22C55E40' : '#e5e5e0'}`,
                            borderRadius: 4,
                            padding: '2px 5px',
                            lineHeight: 1.2,
                            background: isLive ? 'rgba(34,197,94,0.06)' : 'transparent',
                          }}
                        >
                          {isLive ? 'LIVE' : 'SOON'}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: 12,
                          color: '#666',
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
                          color: '#aaa',
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
                        className="bkg-wf-card-link"
                        style={{ textDecoration: 'none', color: 'inherit' }}
                        data-stage-color={color}
                      >
                        <div className="bkg-wf-card" style={cardBase}>
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

      <style>{`
        .bkg-wf-card-link .bkg-wf-card {
          transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
        }
        .bkg-wf-card-link:hover .bkg-wf-card {
          border-color: #1a1a1a !important;
          box-shadow: 0 4px 14px rgba(0,0,0,0.07);
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}
