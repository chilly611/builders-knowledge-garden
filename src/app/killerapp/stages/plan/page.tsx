'use client';

/**
 * Plan stage — "Plan it out" (lifecycle stage 3).
 *
 * Functional: drag-drop job sequencing (framer-motion Reorder) that updates
 * the BudgetRibbon's timeline + general-conditions overhead live on every
 * move; plain-speak SF code lookup; an AI sequencing sanity-check.
 * WordPress'd (clearly alpha): scheduling calendar + whiteboard.
 *
 * Everything renders inside the persistent StageShell chrome (JourneyRow +
 * BudgetRibbon + ProToggle).
 */

import { useEffect, useMemo, useState } from 'react';
import { Reorder } from 'framer-motion';
import { StageShell, useStageChrome } from '@/components/stage-shell';
import { AlphaStub, CodeLookup, FirstEncounterWhisper } from '@/components/stage-kit';
import { runSequencingCheck } from '@/lib/specialists/plan';
import {
  MARIN_PROJECT,
  MARIN_PROJECT_ID,
  MARIN_BUDGET_BASE_TOTAL,
  MARIN_PLAN_PHASES,
  WEEKLY_OVERHEAD,
  computeSchedule,
  ensureMarinActive,
  seedMarinBudget,
  type PlanPhase,
} from '@/lib/demo/marin-4000';
import { colors, fonts } from '@/design-system/tokens';

const STAGE_ACCENT = '#2E9E9A'; // stage 3 (teal)

function fmtMoney(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

// ── Static previews for the WordPress'd stubs ──────────────────────────────

function CalendarPreview() {
  const days = Array.from({ length: 35 }, (_, i) => i - 2); // offset so it starts mid-week
  return (
    <div style={{ width: '100%', maxWidth: 320 }}>
      <div style={{ textAlign: 'center', fontFamily: fonts.display, fontWeight: 700, color: colors.navy, marginBottom: 6 }}>
        June 2026
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: colors.brass }}>{d}</div>
        ))}
        {days.map((d, i) => (
          <div
            key={i}
            style={{
              aspectRatio: '1', borderRadius: 4, fontSize: 9, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: d > 0 && d < 29 ? (d % 9 === 0 ? `${STAGE_ACCENT}44` : colors.paper.white) : 'transparent',
              border: `1px solid ${colors.paper.border}`,
              color: colors.graphite,
            }}
          >
            {d > 0 && d < 29 ? d : ''}
          </div>
        ))}
      </div>
    </div>
  );
}

function WhiteboardPreview() {
  const notes = [
    { x: 8, y: 14, c: '#FCE38A', t: 'Move MEP up' },
    { x: 120, y: 30, c: '#A8E6CF', t: 'Crane wk 9' },
    { x: 60, y: 92, c: '#FFD3B6', t: 'Inspections' },
  ];
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 320, height: 150, background: '#fff', borderRadius: 8, border: `1px solid ${colors.paper.border}` }}>
      {notes.map((n, i) => (
        <div
          key={i}
          style={{
            position: 'absolute', left: n.x, top: n.y, width: 84, height: 52,
            background: n.c, borderRadius: 3, boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
            fontSize: 10, padding: 6, color: '#3a3a3a', transform: `rotate(${i % 2 ? 3 : -2}deg)`,
          }}
        >
          {n.t}
        </div>
      ))}
    </div>
  );
}

// ── Sequencing list ─────────────────────────────────────────────────────────

function PhaseRow({ phase, concurrent }: { phase: PlanPhase; concurrent: boolean }) {
  return (
    <Reorder.Item
      value={phase}
      whileDrag={{ scale: 1.02, boxShadow: '0 8px 24px rgba(27,58,92,0.18)' }}
      style={{
        listStyle: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 11px',
        marginBottom: 6,
        borderRadius: 10,
        background: '#fff',
        border: `1.5px solid ${concurrent ? STAGE_ACCENT : colors.paper.border}`,
        cursor: 'grab',
      }}
    >
      <span aria-hidden style={{ color: colors.fadedRule, fontSize: 16, lineHeight: 1, cursor: 'grab' }}>⠿</span>
      <span aria-hidden style={{ fontSize: 18 }}>{phase.icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: fonts.body, fontSize: 13.5, fontWeight: 700, color: colors.navy }}>
          {phase.name}
        </span>
        <span style={{ fontSize: 11, color: colors.graphite }}>{phase.trade}</span>
      </span>
      {concurrent && (
        <span
          title="Runs concurrently with the adjacent same-trade phase"
          style={{ fontSize: 10, fontWeight: 700, color: STAGE_ACCENT, background: `${STAGE_ACCENT}1A`, padding: '2px 7px', borderRadius: 999 }}
        >
          ∥ concurrent
        </span>
      )}
      <span style={{ fontFamily: fonts.mono, fontSize: 12, fontWeight: 700, color: colors.navy, flex: '0 0 auto' }}>
        {phase.weeks} wk
      </span>
    </Reorder.Item>
  );
}

function PlanStageBody() {
  const { setBudget, proMode } = useStageChrome();
  const [phases, setPhases] = useState<PlanPhase[]>(MARIN_PLAN_PHASES);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  const schedule = useMemo(() => computeSchedule(phases), [phases]);

  // Push the live total + timeline into the chrome on every reorder.
  useEffect(() => {
    setBudget({
      total: MARIN_BUDGET_BASE_TOTAL + schedule.overheadCost,
      timelineWeeks: schedule.totalWeeks,
    });
  }, [schedule, setBudget]);

  // Which rows are part of an adjacent same-group concurrent run?
  const concurrentIds = useMemo(() => {
    const ids = new Set<string>();
    for (let i = 0; i < phases.length; i++) {
      const g = phases[i].parallelGroup;
      if (!g) continue;
      const prevSame = i > 0 && phases[i - 1].parallelGroup === g;
      const nextSame = i < phases.length - 1 && phases[i + 1].parallelGroup === g;
      if (prevSame || nextSame) ids.add(phases[i].id);
    }
    return ids;
  }, [phases]);

  async function aiCheck() {
    setAiBusy(true);
    try {
      const res = await runSequencingCheck({
        phaseNames: phases.map((p) => p.name),
        totalWeeks: schedule.totalWeeks,
        projectType: MARIN_PROJECT.project_type,
        jurisdiction: MARIN_PROJECT.jurisdiction,
      });
      const n = (res.narrative || '').trim();
      setAiNote(n.length > 30 ? n : 'Sequence looks workable. Keep the MEP rough-ins clustered so they run concurrently, and don’t start drywall until rough inspections pass.');
    } catch {
      setAiNote('Keep the MEP rough-ins clustered so they run concurrently, and hold drywall until rough inspections pass.');
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        width: '100%',
        overflowY: 'auto',
        padding: 'clamp(12px, 2vw, 20px)',
        display: 'grid',
        gap: 16,
        gridTemplateColumns: 'minmax(300px, 5fr) minmax(320px, 6fr)',
        alignContent: 'start',
      }}
      className="plan-grid"
    >
      {/* LEFT — Sequencing (functional hero) */}
      <section style={{ display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
        <FirstEncounterWhisper id="plan-sequencing" text="Drag any phase to reorder. The budget & timeline update live as work overlaps." />
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
          <h2 style={{ margin: 0, fontFamily: fonts.display, fontSize: 17, fontWeight: 700, color: colors.navy }}>
            Job sequencing
          </h2>
          <span style={{ fontSize: 11.5, color: colors.graphite }}>drag to reorder</span>
        </div>

        <Reorder.Group axis="y" values={phases} onReorder={setPhases} style={{ margin: 0, padding: 0 }}>
          {phases.map((p) => (
            <PhaseRow key={p.id} phase={p} concurrent={concurrentIds.has(p.id)} />
          ))}
        </Reorder.Group>

        {/* Live budget-impact callout */}
        <div
          style={{
            marginTop: 'auto',
            padding: '10px 12px',
            borderRadius: 10,
            background: `${STAGE_ACCENT}12`,
            border: `1.5px solid ${STAGE_ACCENT}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12.5, color: colors.navy }}>
            <span><b>{schedule.totalWeeks} wk</b> timeline</span>
            <span>GC overhead <b>{fmtMoney(schedule.overheadCost)}</b></span>
          </div>
          <div style={{ marginTop: 4, fontSize: 11.5, color: colors.graphite }}>
            {schedule.weeksSavedByParallel > 0 ? (
              <>Running trades concurrently saves <b style={{ color: '#0E7C66' }}>{schedule.weeksSavedByParallel} wk</b> (≈{fmtMoney(schedule.weeksSavedByParallel * WEEKLY_OVERHEAD)} in overhead).</>
            ) : (
              <>Cluster the MEP rough-ins together to run them concurrently and cut overhead.</>
            )}
          </div>
          <button
            type="button"
            onClick={aiCheck}
            style={{
              marginTop: 8, padding: '5px 10px', borderRadius: 999, border: `1.5px solid ${colors.robin}`,
              background: `${colors.robin}26`, color: colors.navy, fontFamily: fonts.body, fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
            }}
          >
            <span aria-hidden>✨</span> {aiBusy ? 'Checking…' : 'AI sequencing check'}
          </button>
          {aiNote && (
            <div style={{ marginTop: 6, fontSize: 11.5, lineHeight: 1.4, color: colors.graphite, whiteSpace: 'pre-wrap', maxHeight: 96, overflowY: 'auto' }}>
              {aiNote}
            </div>
          )}
        </div>
      </section>

      {/* RIGHT — Code lookup (functional) + two stubs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
        <section
          style={{
            display: 'flex', flexDirection: 'column', minHeight: 0, flex: '1 1 auto',
            padding: 14, borderRadius: 12, background: colors.paper.white, border: `1px solid ${colors.paper.border}`,
          }}
        >
          <h2 style={{ margin: '0 0 8px', fontFamily: fonts.display, fontSize: 17, fontWeight: 700, color: colors.navy }}>
            Plain-speak code lookup
          </h2>
          <div style={{ flex: 1, minHeight: 160 }}>
            <CodeLookup phase="plan" proMode={proMode} projectType={MARIN_PROJECT.project_type} />
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, minHeight: 170 }} className="plan-stubs">
          <AlphaStub
            title="Scheduling calendar"
            description="A full calendar view of the sequence — drag phases onto dates, see crew load per week."
            icon="📅"
            preview={<CalendarPreview />}
          />
          <AlphaStub
            title="Planning whiteboard"
            description="A shared canvas to sketch the site plan and pin notes with the crew."
            icon="🧮"
            preview={<WhiteboardPreview />}
          />
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .plan-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .plan-stubs { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

export default function PlanStagePage() {
  // Seed the Marin demo so the chrome + budget read the same numbers.
  useEffect(() => {
    ensureMarinActive();
    seedMarinBudget();
  }, []);

  const initialSchedule = computeSchedule(MARIN_PLAN_PHASES);

  return (
    <StageShell
      stageId={3}
      stageTitle="Plan it out"
      projectId={MARIN_PROJECT_ID}
      projectName={MARIN_PROJECT.name}
      projectMeta={`${MARIN_PROJECT.sqft} sqft · ${MARIN_PROJECT.jurisdiction}`}
      initialBudget={MARIN_BUDGET_BASE_TOTAL + initialSchedule.overheadCost}
    >
      <PlanStageBody />
    </StageShell>
  );
}
