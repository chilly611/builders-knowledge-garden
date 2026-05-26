/**
 * /killerapp/projects-v3 — WS3 Project Pipeline (v3 rehaul).
 *
 * The RSI Heartbeat is the platform. One self-improving knowledge graph per
 * garden, ingesting source data on a domain cadence, re-verifying every
 * entity, surfacing freshness on every claim, learning from use. The platform
 * doesn't hold knowledge — it improves itself in public. Every other platform
 * in our space holds static data and ages. We get more right every week.
 * That is the moat in the AI era.
 *
 * Mounted at /killerapp/projects-v3 to preserve the existing /killerapp/projects
 * surface until founder dogfood approval. Once approved, this rebuild moves
 * to /killerapp/projects via redirect/replace.
 *
 * Pattern Language composition:
 *   - InvitationCard      (Floor 0 — "What's next on which project?")
 *   - ProToggle           (human cards vs. Gantt critical-path)
 *   - CrossSurfaceBridge  (Dream sketches anchor here; KG citations propagate
 *                          to Code Compliance worksheets)
 *   - LifecycleMemory     (Size Up → Lock → Plan → Build → Adapt → Collect → Reflect)
 *   - TrustStrip          (budget + schedule claims sourced)
 *   - InfiniteDescent     (F0 "what's happening?" → F4 AIA pay app line-item
 *                          variance → F6 agent payload)
 *   - TempoAdapt          (focused default; urgent when behind schedule)
 *   - useStanceCard()     (every primitive on the page)
 *
 * Four-lane Floor 0:
 *   Administrator: "Which projects are at risk this week?"
 *   Professional:  "What's blocking me right now?"
 *   Public:        "Where is my house at?"
 *   Machine:       project state as JSON at /api/v1/projects
 */

'use client';

import * as React from 'react';
import { useState } from 'react';
import { BRAND_COLORS, BRAND_FONTS } from '@/lib/brand-tokens';
import { useStanceCard, persistStanceOverride } from '@/lib/stance-card';
import {
  InvitationCard,
  ProToggle,
  CrossSurfaceBridge,
  LifecycleMemory,
  TrustStrip,
  InfiniteDescent,
  TempoAdapt,
  type StanceLane,
  type SourceCitation,
  type BridgePayload,
} from '@/components/primitives';

interface Project {
  id: string;
  humanName: string;
  proName: string;
  client: string;
  stage: string;
  status: 'on-track' | 'at-risk' | 'blocked';
  blocker?: string;
  budgetClaim: { committed: number; spent: number; sources: SourceCitation[]; lastVerified: string };
  scheduleClaim: { dueDate: string; daysOfFloat: number; sources: SourceCitation[]; lastVerified: string };
  homeownerNarrative: string;
}

const PROJECTS: Project[] = [
  {
    id: 'proj-001',
    humanName: 'Bayview Kitchen Renovation',
    proName: 'P-2026-014 · Chen Residence Kitchen + Pantry Remodel · CSI Div 06+09+11',
    client: 'Marisol & James Chen',
    stage: 'build',
    status: 'at-risk',
    blocker: 'Tile delivery slipped 4 days — cabinet install rescheduled.',
    budgetClaim: {
      committed: 84500,
      spent: 62300,
      sources: [
        { name: 'AIA G702 pay app #4', lastVerified: '2026-05-24' },
        { name: 'QuickBooks ledger', lastVerified: '2026-05-26' },
        { name: 'Subcontractor invoices', lastVerified: '2026-05-25' },
      ],
      lastVerified: '2026-05-26',
    },
    scheduleClaim: {
      dueDate: '2026-06-30',
      daysOfFloat: 6,
      sources: [
        { name: 'Master schedule v7', lastVerified: '2026-05-25' },
        { name: 'Inspection calendar (City of SD)', lastVerified: '2026-05-23' },
        { name: 'Sub coordination log', lastVerified: '2026-05-26' },
      ],
      lastVerified: '2026-05-26',
    },
    homeownerNarrative: 'Cabinets are about to install. Tile arrived this morning. We should be plating dinner here by July 4.',
  },
  {
    id: 'proj-002',
    humanName: 'Hillcrest ADU Build',
    proName: 'P-2026-019 · 580sqft Detached ADU · CalGreen Tier 1 · CBC 2022',
    client: 'Patel Family',
    stage: 'plan',
    status: 'on-track',
    budgetClaim: {
      committed: 312000,
      spent: 41000,
      sources: [
        { name: 'Signed AIA A101', lastVerified: '2026-05-10' },
        { name: 'CSLB bond verification', lastVerified: '2026-05-20' },
        { name: 'Lender draw schedule', lastVerified: '2026-05-22' },
      ],
      lastVerified: '2026-05-22',
    },
    scheduleClaim: {
      dueDate: '2027-02-15',
      daysOfFloat: 21,
      sources: [
        { name: 'Permit application (City of SD)', lastVerified: '2026-05-18' },
        { name: 'Master schedule v2', lastVerified: '2026-05-20' },
      ],
      lastVerified: '2026-05-20',
    },
    homeownerNarrative: 'Permits filed. Structural engineer signed off last week. Foundation pour scheduled for August.',
  },
  {
    id: 'proj-003',
    humanName: 'Encinitas Roof Replacement',
    proName: 'P-2026-025 · Tear-off + Class A composition shingle · 28sq',
    client: 'Reyes',
    stage: 'size-up',
    status: 'on-track',
    budgetClaim: {
      committed: 18400,
      spent: 0,
      sources: [
        { name: 'Pre-bid estimate v1', lastVerified: '2026-05-25' },
        { name: 'Vendor quote (ABC Supply)', lastVerified: '2026-05-25' },
      ],
      lastVerified: '2026-05-25',
    },
    scheduleClaim: {
      dueDate: '2026-07-10',
      daysOfFloat: 14,
      sources: [
        { name: 'Pre-bid timeline', lastVerified: '2026-05-25' },
        { name: 'Crew availability calendar', lastVerified: '2026-05-26' },
      ],
      lastVerified: '2026-05-26',
    },
    homeownerNarrative: 'Estimate landing this week. Likely 6 days of work once material arrives.',
  },
];

const lifecycleStages = [
  { id: 'size-up', label: 'Size Up', complete: false, summary: 'Estimate + risk score; decide whether to bid.' },
  { id: 'lock', label: 'Lock', complete: false, summary: 'Signed AIA contract + bond + insurance verified.' },
  { id: 'plan', label: 'Plan', complete: false, summary: 'Permits, code compliance, sub commitments, supply orders.' },
  { id: 'build', label: 'Build', complete: false, summary: 'Daily field log, weather, change orders, inspections.' },
  { id: 'adapt', label: 'Adapt', complete: false, summary: 'Punch list, re-inspections, warranty work prep.' },
  { id: 'collect', label: 'Collect', complete: false, summary: 'Final pay app, retainage release, lien waivers.' },
  { id: 'reflect', label: 'Reflect', complete: false, summary: 'Post-mortem + cost variance feeding RSI loop.' },
];

const mono: React.CSSProperties = {
  fontFamily: BRAND_FONTS.mono,
  fontSize: '0.72rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  margin: 0,
};

function statusColor(status: Project['status']): string {
  if (status === 'on-track') return BRAND_COLORS.greenPrimary;
  if (status === 'at-risk') return BRAND_COLORS.goldWarm;
  return BRAND_COLORS.redPrimary;
}

function ProjectCard({ project, viewMode }: { project: Project; viewMode: 'human' | 'pro' }) {
  return (
    <article
      style={{
        padding: '1rem 1.15rem',
        background: BRAND_COLORS.parchmentWarm,
        border: `1px solid ${BRAND_COLORS.copperLine}`,
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.55rem',
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontWeight: 500 }}>
          {viewMode === 'pro' ? project.proName : project.humanName}
        </h3>
        <span
          style={{
            ...mono,
            color: statusColor(project.status),
            border: `1px solid ${statusColor(project.status)}`,
            padding: '0.15rem 0.5rem',
            borderRadius: '999px',
          }}
        >
          {project.status}
        </span>
      </header>
      <p style={{ margin: 0, color: BRAND_COLORS.steel, fontSize: '0.85rem' }}>
        Client: <strong style={{ color: BRAND_COLORS.forestInk }}>{project.client}</strong> · Stage: {project.stage}
      </p>
      {project.blocker ? (
        <p style={{ margin: 0, color: BRAND_COLORS.redPrimary, fontStyle: 'italic' }}>
          Blocker: {project.blocker}
        </p>
      ) : null}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem' }}>
          Budget ${project.budgetClaim.spent.toLocaleString()} / ${project.budgetClaim.committed.toLocaleString()}
        </span>
        <TrustStrip
          sourceCount={project.budgetClaim.sources.length}
          sources={project.budgetClaim.sources}
          lastVerified={project.budgetClaim.lastVerified}
          variant="badge"
        />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem' }}>
          Due {project.scheduleClaim.dueDate} · {project.scheduleClaim.daysOfFloat}d float
        </span>
        <TrustStrip
          sourceCount={project.scheduleClaim.sources.length}
          sources={project.scheduleClaim.sources}
          lastVerified={project.scheduleClaim.lastVerified}
          variant="badge"
        />
      </div>
    </article>
  );
}

function GanttRow({ project }: { project: Project }) {
  const stageIdx = lifecycleStages.findIndex((s) => s.id === project.stage);
  const pct = ((stageIdx + 1) / lifecycleStages.length) * 100;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <span style={{ width: '18rem', fontFamily: BRAND_FONTS.mono, fontSize: '0.72rem', color: BRAND_COLORS.steel, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {project.humanName}
      </span>
      <div style={{ flex: 1, background: BRAND_COLORS.parchmentDeep, height: '1.25rem', borderRadius: '2px', position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: `${pct}%`,
            background: statusColor(project.status),
            borderRadius: '2px',
            opacity: 0.6,
          }}
        />
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: BRAND_FONTS.mono, fontSize: '0.7rem', color: BRAND_COLORS.forestInk }}>
          {project.stage} · {project.scheduleClaim.daysOfFloat}d float
        </span>
      </div>
    </div>
  );
}

function MachinePayload() {
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: PROJECTS.map((p, idx) => ({
      '@type': 'Project',
      position: idx + 1,
      identifier: p.id,
      name: p.proName,
      stage: p.stage,
      status: p.status,
      budget: { committed: p.budgetClaim.committed, spent: p.budgetClaim.spent, sources: p.budgetClaim.sources },
      schedule: { dueDate: p.scheduleClaim.dueDate, floatDays: p.scheduleClaim.daysOfFloat, sources: p.scheduleClaim.sources },
    })),
    endpoint: '/api/v1/projects',
  };
  return (
    <pre style={{ background: BRAND_COLORS.parchmentDeep, color: BRAND_COLORS.forestDeep, padding: '1rem', fontFamily: BRAND_FONTS.mono, fontSize: '0.72rem', overflowX: 'auto', borderRadius: '4px', margin: 0 }}>
      {JSON.stringify(payload, null, 2)}
    </pre>
  );
}

export default function ProjectsV3Page() {
  const stance = useStanceCard();
  const [lane, setLane] = useState<StanceLane>(stance.lane);
  const [proMode, setProMode] = useState(stance.lane === 'professional' || stance.lane === 'administrator');

  const atRisk = PROJECTS.filter((p) => p.status === 'at-risk' || p.status === 'blocked');
  const blockedNow = PROJECTS.find((p) => p.blocker);
  const homeownerProject = PROJECTS[0];

  // Cross-surface bridge — a Dream Machine sketch anchors here.
  const dreamBridge: BridgePayload<{ sketchId: string; projectId: string }> = {
    bridgeId: 'dream-to-projects-v3',
    origin: 'dream',
    destination: 'killer-app',
    label: 'Continue the Bayview Kitchen sketch in the project pipeline',
    data: { sketchId: 'sketch-bayview-01', projectId: 'proj-001' },
    createdAt: new Date().toISOString(),
  };

  // Floor 0 content per lane
  const adminF0 = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p style={{ ...mono, color: BRAND_COLORS.steel }}>Administrator · Which projects are at risk this week</p>
      {atRisk.length === 0 ? <p>Nothing at risk — full breath.</p> : atRisk.map((p) => <ProjectCard key={p.id} project={p} viewMode="pro" />)}
    </div>
  );

  const proF0 = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p style={{ ...mono, color: BRAND_COLORS.steel }}>Professional · What&apos;s blocking me right now</p>
      {blockedNow ? (
        <ProjectCard project={blockedNow} viewMode="pro" />
      ) : (
        <p>No active blockers — pick the next critical-path item.</p>
      )}
    </div>
  );

  const publicF0 = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p style={{ ...mono, color: BRAND_COLORS.steel }}>Public · Where is my house at?</p>
      <article style={{ padding: '1.15rem', background: BRAND_COLORS.parchmentWarm, border: `1px solid ${BRAND_COLORS.copperLine}`, borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h3 style={{ margin: 0 }}>{homeownerProject.humanName}</h3>
        <p style={{ margin: 0 }}>{homeownerProject.homeownerNarrative}</p>
        <TrustStrip
          sourceCount={homeownerProject.scheduleClaim.sources.length}
          sources={homeownerProject.scheduleClaim.sources}
          lastVerified={homeownerProject.scheduleClaim.lastVerified}
          variant="inline"
        />
      </article>
    </div>
  );

  const machineF0 = <MachinePayload />;

  const floor0Content =
    lane === 'administrator' ? adminF0 :
    lane === 'professional' ? proF0 :
    lane === 'machine' ? machineF0 : publicF0;

  return (
    <main style={{ minHeight: '100vh', background: BRAND_COLORS.parchment, color: BRAND_COLORS.forestInk, fontFamily: BRAND_FONTS.display, padding: '2.5rem 1.5rem 4rem' }}>
      <div style={{ maxWidth: '60rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ ...mono, color: BRAND_COLORS.steel, marginBottom: '0.3rem' }}>Killer App · Project Pipeline (v3)</p>
            <h1 style={{ margin: 0, fontWeight: 500, fontSize: '2rem' }}>Every claim sourced. Every schedule verified.</h1>
          </div>
          <ProToggle
            initialPro={proMode}
            humanLabel="Cards"
            proLabel="Gantt"
            onChange={(isPro) => setProMode(isPro)}
          />
        </header>

        <CrossSurfaceBridge payload={dreamBridge} variant="banner" />

        <section aria-label="Lane selector" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {(['administrator', 'professional', 'public', 'machine'] as StanceLane[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => { setLane(l); persistStanceOverride({ lane: l }); }}
              aria-pressed={lane === l}
              style={{
                padding: '0.3rem 0.7rem',
                border: `1px solid ${lane === l ? BRAND_COLORS.copper : BRAND_COLORS.copperLine}`,
                background: lane === l ? BRAND_COLORS.parchmentWarm : 'transparent',
                color: lane === l ? BRAND_COLORS.copper : BRAND_COLORS.steel,
                fontFamily: BRAND_FONTS.mono,
                fontSize: '0.72rem',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                borderRadius: '999px',
              }}
            >
              {l}
            </button>
          ))}
        </section>

        <InvitationCard
          question="What's next on which project?"
          proSubtitle={`${atRisk.length} at risk · ${PROJECTS.length - atRisk.length} on track`}
          primaryLabel={blockedNow ? `Unblock ${blockedNow.humanName}` : 'Pick a critical-path next step'}
          stance={stance}
          helper={blockedNow?.blocker}
        />

        <TempoAdapt
          leisurely={floor0Content}
          focused={floor0Content}
          urgent={blockedNow ? <ProjectCard project={blockedNow} viewMode={proMode ? 'pro' : 'human'} /> : floor0Content}
          emergency={
            blockedNow ? (
              <InvitationCard
                question={`Resolve: ${blockedNow.blocker}`}
                primaryLabel="Take action"
                emphasis="ceremonial"
                stance={{ ...stance, tempo: 'emergency' }}
              />
            ) : floor0Content
          }
        />

        <InfiniteDescent
          stance={{ ...stance, lane }}
          floors={[
            { floor: 0, label: 'plain', content: floor0Content },
            {
              floor: 2,
              label: 'all projects',
              content: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {proMode ? PROJECTS.map((p) => <GanttRow key={p.id} project={p} />) : PROJECTS.map((p) => <ProjectCard key={p.id} project={p} viewMode={proMode ? 'pro' : 'human'} />)}
                </div>
              ),
            },
            {
              floor: 4,
              label: 'pay-app variance',
              content: (
                <article style={{ padding: '1rem', background: BRAND_COLORS.parchmentWarm, border: `1px solid ${BRAND_COLORS.copperLine}`, borderRadius: '4px' }}>
                  <p style={{ ...mono, color: BRAND_COLORS.steel, marginBottom: '0.5rem' }}>AIA Pay App #4 · Bayview Kitchen</p>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem' }}>
                    <li>Cabinets: $18,400 / $19,200 budgeted (under by $800)</li>
                    <li>Tile: $4,250 / $3,800 budgeted (over by $450 — supply shortage upcharge)</li>
                    <li>Electrical: $7,100 / $7,000 budgeted (over by $100)</li>
                    <li>Labor: $32,550 / $34,000 budgeted (under by $1,450)</li>
                  </ul>
                  <TrustStrip
                    sourceCount={PROJECTS[0].budgetClaim.sources.length}
                    sources={PROJECTS[0].budgetClaim.sources}
                    lastVerified={PROJECTS[0].budgetClaim.lastVerified}
                    variant="inline"
                  />
                </article>
              ),
            },
            { floor: 6, label: 'agent payload', content: machineF0 },
          ]}
        />

        <LifecycleMemory stages={lifecycleStages} currentStageId={PROJECTS[0].stage} />

        <footer style={{ ...mono, color: BRAND_COLORS.steel, paddingTop: '1.5rem', borderTop: `1px solid ${BRAND_COLORS.copperLine}` }}>
          API · GET /api/v1/projects (WS3 wires this to Supabase)
        </footer>
      </div>
    </main>
  );
}
