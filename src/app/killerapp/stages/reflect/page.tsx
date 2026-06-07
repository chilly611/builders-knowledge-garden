'use client';

// TODO: full implementation post-demo. Demo stub only — no interactive content beyond the action button.

/**
 * Reflect stage — lifecycle stage 7 (final). Demo stub so the 7-stage journey
 * completes without dead-ending. Real workflows (warranty, lessons learned,
 * portfolio, referrals) land post-demo.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StageShell, useStageChrome } from '@/components/stage-shell';
import {
  MARIN_PLAN_PHASES,
  computeSchedule,
  seedMarinBudget,
} from '@/lib/demo/marin-4000';
import { useStageProject } from '@/lib/hooks/useStageProject';
import { colors, fonts } from '@/design-system/tokens';

const ACCENT = '#5E4B7C'; // stage 7 (dusk purple)

function ReflectBody() {
  const { setBudget } = useStageChrome();
  const sp = useStageProject();
  useEffect(() => {
    const s = computeSchedule(MARIN_PLAN_PHASES);
    setBudget({ total: sp.budgetTotal ?? 0, timelineWeeks: s.totalWeeks });
  }, [setBudget, sp.budgetTotal]);

  return (
    <div style={{ flex: 1, minHeight: 0, width: '100%', overflowY: 'auto', padding: 'clamp(12px, 2vw, 20px)', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <section style={{ flex: 1, minHeight: 180, padding: 18, borderRadius: 12, background: colors.paper.white, border: `1px solid ${colors.paper.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 8 }}>
        <div aria-hidden style={{ fontSize: 30 }}>📖</div>
        <h2 style={{ margin: 0, fontFamily: fonts.display, fontSize: 18, fontWeight: 700, color: colors.navy }}>Reflect — close out & learn</h2>
        <p style={{ margin: 0, maxWidth: 420, fontSize: 13, color: colors.graphite }}>
          Warranty management, lessons learned, portfolio update, and referrals will live here.
        </p>
        <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.brass, background: `${colors.brass}1A`, padding: '3px 9px', borderRadius: 999 }}>
          alpha — coming soon
        </span>
      </section>
      <div style={{ marginTop: 'auto', padding: '12px 14px', borderRadius: 12, background: `${ACCENT}12`, borderLeft: `4px solid ${ACCENT}`, border: `1px solid ${ACCENT}55` }}>
        <div style={{ fontFamily: fonts.display, fontSize: 16, fontWeight: 700, color: colors.navy }}>Close-out summary lands here when the build wraps</div>
        <div style={{ marginTop: 3, fontSize: 12.5, color: colors.graphite }}>Capture lessons learned and add the Marin Farmhouse to the portfolio.</div>
      </div>
    </div>
  );
}

export default function ReflectStagePage() {
  const router = useRouter();
  const sp = useStageProject();
  useEffect(() => {
    if (sp.isCanonicalDemo) seedMarinBudget();
  }, [sp.isCanonicalDemo]);

  // Stage 7 has no next stage — close the 7-stage journey by returning to
  // the active project's view so the walk doesn't dead-end on a "wrapped" message.
  return (
    <StageShell
      stageId={7}
      stageTitle="Reflect"
      projectId={sp.projectId}
      projectName={sp.projectName}
      projectMeta={sp.projectMeta}
      initialBudget={sp.budgetTotal}
      budgetSpent={sp.budgetSpent}
      primaryAction={{
        onActivate: () => {
          setTimeout(
            () => router.push(sp.projectId ? `/projects/${sp.projectId}` : '/killerapp/projects'),
            350,
          );
        },
      }}
    >
      <ReflectBody />
    </StageShell>
  );
}
