'use client';

/**
 * Build stage — "Build" (lifecycle stage 4).
 *
 * Functional: voice field reporting (Web Speech → structured daily-log entry
 * → DB); plain-speak SF code lookup (build/inspection framing); photo upload
 * to the project. WordPress'd (clearly alpha): drone progress, robot
 * coordination, IoT sensors.
 *
 * Renders inside the persistent StageShell chrome.
 */

import { useEffect } from 'react';
import { StageShell, useStageChrome } from '@/components/stage-shell';
import { AlphaStub, CodeLookup, VoiceFieldReport, FirstEncounterWhisper } from '@/components/stage-kit';
import AttachmentSection from '@/components/AttachmentSection';
import {
  MARIN_PROJECT,
  MARIN_PROJECT_ID,
  MARIN_BUDGET_BASE_TOTAL,
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

function BuildStageBody() {
  const { setBudget, proMode } = useStageChrome();

  // Build doesn't drive the budget from sequencing; show the planned total +
  // timeline so the ribbon reads consistently with the Plan stage.
  useEffect(() => {
    const s = computeSchedule(MARIN_PLAN_PHASES);
    setBudget({ total: MARIN_BUDGET_BASE_TOTAL + s.overheadCost, timelineWeeks: s.totalWeeks });
  }, [setBudget]);

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
      className="build-grid"
    >
      {/* LEFT — Voice field reporting (functional hero) */}
      <section
        style={{
          display: 'flex', flexDirection: 'column', minHeight: 360, position: 'relative',
          padding: 14, borderRadius: 12, background: colors.paper.white, border: `1px solid ${colors.paper.border}`,
        }}
      >
        <FirstEncounterWhisper id="build-voice" text="Just talk. We turn your spoken update into a structured daily log and save it to the project." />
        <h2 style={{ margin: '0 0 8px', fontFamily: fonts.display, fontSize: 17, fontWeight: 700, color: colors.navy }}>
          Voice field report
        </h2>
        <div style={{ flex: 1, minHeight: 0 }}>
          <VoiceFieldReport projectId={MARIN_PROJECT_ID} projectType={MARIN_PROJECT.project_type} />
        </div>
      </section>

      {/* RIGHT — code lookup + photos + alpha stubs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
        <section
          style={{
            display: 'flex', flexDirection: 'column', minHeight: 200, flex: '1 1 auto',
            padding: 14, borderRadius: 12, background: colors.paper.white, border: `1px solid ${colors.paper.border}`,
          }}
        >
          <h2 style={{ margin: '0 0 8px', fontFamily: fonts.display, fontSize: 17, fontWeight: 700, color: colors.navy }}>
            Plain-speak code lookup
          </h2>
          <div style={{ flex: 1, minHeight: 150 }}>
            <CodeLookup phase="build" proMode={proMode} projectType={MARIN_PROJECT.project_type} />
          </div>
        </section>

        <section
          style={{ padding: 14, borderRadius: 12, background: colors.paper.white, border: `1px solid ${colors.paper.border}` }}
        >
          <h2 style={{ margin: '0 0 8px', fontFamily: fonts.display, fontSize: 16, fontWeight: 700, color: colors.navy }}>
            Project photos
          </h2>
          <AttachmentSection
            projectId={MARIN_PROJECT_ID}
            workflowId="q15"
            stepId="stage-build-progress-photos"
            title="Upload progress photos"
            subtitle="Tagged to this project and visible in the daily log."
          />
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, minHeight: 150 }} className="build-stubs">
          <AlphaStub compact title="Drone progress" description="Weekly aerial scans auto-compared to the schedule." icon="🚁" preview={<DronePreview />} />
          <AlphaStub compact title="Robot coordination" description="Dispatch layout & masonry bots from the daily plan." icon="🤖" preview={<RobotPreview />} />
          <AlphaStub compact title="IoT sensors" description="Live moisture, temp & concrete-cure telemetry." icon="📡" preview={<IoTPreview />} />
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .build-grid { grid-template-columns: 1fr; }
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

  const initialSchedule = computeSchedule(MARIN_PLAN_PHASES);

  return (
    <StageShell
      stageId={4}
      stageTitle="Build"
      projectId={MARIN_PROJECT_ID}
      projectName={MARIN_PROJECT.name}
      projectMeta={`${MARIN_PROJECT.sqft} sqft · ${MARIN_PROJECT.jurisdiction}`}
      initialBudget={MARIN_BUDGET_BASE_TOTAL + initialSchedule.overheadCost}
    >
      <BuildStageBody />
    </StageShell>
  );
}
