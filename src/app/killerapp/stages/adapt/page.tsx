'use client';

// TODO: full implementation post-demo. Demo stub only — no interactive content beyond the action button.

/**
 * Adapt stage — lifecycle stage 5. Demo stub so the 7-stage journey walks
 * without dead-ending. Real workflows (change orders, RFIs, submittals,
 * schedule adjustments) land post-demo.
 */

import { useEffect } from 'react';
import { StageShell, useStageChrome } from '@/components/stage-shell';
import {
  MARIN_PROJECT,
  MARIN_PROJECT_ID,
  MARIN_BUDGET_TOTAL,
  MARIN_BUDGET_SPENT,
  MARIN_PLAN_PHASES,
  computeSchedule,
  ensureMarinActive,
  seedMarinBudget,
} from '@/lib/demo/marin-4000';
import { colors, fonts } from '@/design-system/tokens';

const ACCENT = '#B23A7F'; // stage 5 (magenta)

function AdaptBody() {
  const { setBudget } = useStageChrome();
  useEffect(() => {
    const s = computeSchedule(MARIN_PLAN_PHASES);
    setBudget({ total: MARIN_BUDGET_TOTAL, timelineWeeks: s.totalWeeks });
  }, [setBudget]);

  return (
    <div style={{ flex: 1, minHeight: 0, width: '100%', overflowY: 'auto', padding: 'clamp(12px, 2vw, 20px)', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <section style={{ flex: 1, minHeight: 180, padding: 18, borderRadius: 12, background: colors.paper.white, border: `1px solid ${colors.paper.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 8 }}>
        <div aria-hidden style={{ fontSize: 30 }}>🔄</div>
        <h2 style={{ margin: 0, fontFamily: fonts.display, fontSize: 18, fontWeight: 700, color: colors.navy }}>Adapt — in-flight changes</h2>
        <p style={{ margin: 0, maxWidth: 420, fontSize: 13, color: colors.graphite }}>
          Change orders, RFIs, submittals, and schedule adjustments will live here.
        </p>
        <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.brass, background: `${colors.brass}1A`, padding: '3px 9px', borderRadius: 999 }}>
          alpha — coming soon
        </span>
      </section>
      <div style={{ marginTop: 'auto', padding: '12px 14px', borderRadius: 12, background: `${ACCENT}12`, borderLeft: `4px solid ${ACCENT}`, border: `1px solid ${ACCENT}55` }}>
        <div style={{ fontFamily: fonts.display, fontSize: 16, fontWeight: 700, color: colors.navy }}>3 changes this week · +$4,200 cost · +1 wk schedule</div>
        <div style={{ marginTop: 3, fontSize: 12.5, color: colors.graphite }}>Settle the open changes and roll them into the next pay application.</div>
      </div>
    </div>
  );
}

export default function AdaptStagePage() {
  useEffect(() => {
    ensureMarinActive();
    seedMarinBudget();
  }, []);

  return (
    <StageShell
      stageId={5}
      stageTitle="Adapt"
      projectId={MARIN_PROJECT_ID}
      projectName={MARIN_PROJECT.name}
      projectMeta={`${MARIN_PROJECT.sqft} sqft · ${MARIN_PROJECT.jurisdiction}`}
      initialBudget={MARIN_BUDGET_TOTAL}
      budgetSpent={MARIN_BUDGET_SPENT}
      primaryAction={{}}
    >
      <AdaptBody />
    </StageShell>
  );
}
