'use client';

/**
 * Build stage — "Build" (lifecycle stage 4).
 *
 * Functional: voice field reporting (Web Speech → structured daily-log entry
 * → DB); plain-speak SF code lookup (build/inspection framing); photo upload
 * to the project. WordPress'd (clearly alpha): drone progress, robot
 * coordination, IoT sensors — tucked in a collapsible "Coming soon" section.
 *
 * Renders inside the persistent StageShell chrome (JourneyRow + BudgetRibbon +
 * ProToggle + sticky primary action).
 */

import { useEffect } from 'react';
import { StageShell, useStageChrome } from '@/components/stage-shell';
import { AlphaStub, CodeLookup, VoiceFieldReport, FirstEncounterWhisper } from '@/components/stage-kit';
import AttachmentSection from '@/components/AttachmentSection';
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

const STAGE_ACCENT = '#E05E4B'; // stage 4 (coral)

// ── Static previews for the WordPress'd stubs ──────────────────────────────

function DronePreview() {
  return (
    <div
      style={{
        width: '100%', maxWidth: 240, height: 110, borderRadius: 8, position: 'relative',
        background: 'linear-gradient(135deg, #8FAE8F 0%, #6E8C72 60%, #5C7860 100%)',
        overflow: 'hidden', border: `1px solid ${colors.paper.border}`,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      <div style={{ position: 'absolute', top: 8, right: 10, fontSize: 22 }}>🚁</div>
      <div style={{ position: 'absolute', left: 14, bottom: 12, width: 70, height: 40, border: '2px solid rgba(255,255,255,0.7)', borderRadius: 3 }} />
    </div>
  );
}

function RobotPreview() {
  return (
    <div style={{ width: '100%', maxWidth: 240, height: 110, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, background: colors.paper.white, border: `1px solid ${colors.paper.border}` }}>
      <span style={{ fontSize: 34 }}>🤖</span>
      <span aria-hidden style={{ width: 40, height: 2, background: colors.fadedRule }} />
      <span style={{ fontSize: 28 }}>🧱</span>
    </div>
  );
}

function IoTPreview() {
  const dots = [
    { x: 18, y: 20 }, { x: 90, y: 14 }, { x: 150, y: 40 }, { x: 50, y: 64 }, { x: 130, y: 78 },
  ];
  return (
    <div style={{ width: '100%', maxWidth: 240, height: 110, position: 'relative', borderRadius: 8, background: colors.paper.white, border: `1px solid ${colors.paper.border}` }}>
      {dots.map((d, i) => (
        <span key={i} style={{ position: 'absolute', left: d.x, top: d.y, width: 10, height: 10, borderRadius: '50%', background: STAGE_ACCENT, boxShadow: `0 0 0 4px ${STAGE_ACCENT}33` }} />
      ))}
      <span style={{ position: 'absolute', right: 8, bottom: 6, fontSize: 18 }}>📡</span>
    </div>
  );
}

const sectionCard: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  padding: 14,
  borderRadius: 12,
  background: colors.paper.white,
  border: `1px solid ${colors.paper.border}`,
};

const sectionHeading: React.CSSProperties = {
  margin: '0 0 8px',
  fontFamily: fonts.display,
  fontSize: 16,
  fontWeight: 700,
  color: colors.navy,
};

function BuildStageBody() {
  const { setBudget, proMode } = useStageChrome();

  // Contract total holds steady; show the planned timeline for continuity.
  useEffect(() => {
    const s = computeSchedule(MARIN_PLAN_PHASES);
    setBudget({ total: MARIN_BUDGET_TOTAL, timelineWeeks: s.totalWeeks });
  }, [setBudget]);

  return (
    <div
      className="build-root"
      style={{
        flex: 1,
        minHeight: 0,
        width: '100%',
        overflowY: 'auto',
        padding: 'clamp(12px, 2vw, 20px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <FirstEncounterWhisper id="build-voice" text="Just talk — we turn your spoken update into a structured daily log and save it to the project." />

      <div className="build-cols" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 5fr) minmax(320px, 6fr)', gap: 14, alignItems: 'start' }}>
        {/* Voice field reporting (functional hero) */}
        <section style={{ ...sectionCard, minHeight: 360 }}>
          <h2 style={sectionHeading}>Voice field report</h2>
          <div style={{ flex: 1, minHeight: 0 }}>
            <VoiceFieldReport projectId={MARIN_PROJECT_ID} projectType={MARIN_PROJECT.project_type} />
          </div>
        </section>

        {/* Code lookup + photos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
          <section style={{ ...sectionCard, minHeight: 220 }}>
            <h2 style={sectionHeading}>Plain-speak code lookup</h2>
            <div style={{ flex: 1, minHeight: 150 }}>
              <CodeLookup phase="build" proMode={proMode} projectType={MARIN_PROJECT.project_type} />
            </div>
          </section>

          <section style={sectionCard}>
            <h2 style={sectionHeading}>Project photos</h2>
            <AttachmentSection
              projectId={MARIN_PROJECT_ID}
              workflowId="q15"
              stepId="stage-build-progress-photos"
              title="Upload progress photos"
              subtitle="Tagged to this project and visible in the daily log."
            />
          </section>
        </div>
      </div>

      {/* Coming soon — WordPress'd, collapsible */}
      <details className="alpha-section" open>
        <summary
          style={{
            cursor: 'pointer', listStyle: 'none', fontFamily: fonts.body, fontSize: 12,
            fontWeight: 700, color: colors.brass, textTransform: 'uppercase', letterSpacing: 0.5,
            padding: '4px 0',
          }}
        >
          ▸ Coming soon
        </summary>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, minHeight: 150, marginTop: 8 }} className="build-stubs">
          <AlphaStub compact title="Drone progress" description="Weekly aerial scans auto-compared to the schedule." icon="🚁" preview={<DronePreview />} />
          <AlphaStub compact title="Robot coordination" description="Dispatch layout & masonry bots from the daily plan." icon="🤖" preview={<RobotPreview />} />
          <AlphaStub compact title="IoT sensors" description="Live moisture, temp & concrete-cure telemetry." icon="📡" preview={<IoTPreview />} />
        </div>
      </details>

      {/* Insight card — directly above the sticky action bar */}
      <div
        style={{
          marginTop: 'auto',
          padding: '12px 14px',
          borderRadius: 12,
          background: `${STAGE_ACCENT}12`,
          borderLeft: `4px solid ${STAGE_ACCENT}`,
          border: `1px solid ${STAGE_ACCENT}55`,
        }}
      >
        <div style={{ fontFamily: fonts.display, fontSize: 16, fontWeight: 700, color: colors.navy }}>
          62% complete · framing inspection passed
        </div>
        <div style={{ marginTop: 3, fontSize: 12.5, color: colors.graphite }}>
          $312K of $1.65M spent · $268K committed to interior finishes next · hold change orders to protect the $347K headroom
        </div>
      </div>

      <style>{`
        .alpha-section > summary::-webkit-details-marker { display: none; }
        @media (max-width: 860px) {
          .build-cols { grid-template-columns: 1fr; }
        }
        @media (max-width: 560px) {
          .build-stubs { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

export default function BuildStagePage() {
  useEffect(() => {
    ensureMarinActive();
    seedMarinBudget();
  }, []);

  return (
    <StageShell
      stageId={4}
      stageTitle="Build"
      projectId={MARIN_PROJECT_ID}
      projectName={MARIN_PROJECT.name}
      projectMeta={`${MARIN_PROJECT.sqft} sqft · ${MARIN_PROJECT.jurisdiction}`}
      initialBudget={MARIN_BUDGET_TOTAL}
      budgetSpent={MARIN_BUDGET_SPENT}
      primaryAction={{}}
    >
      <BuildStageBody />
    </StageShell>
  );
}
