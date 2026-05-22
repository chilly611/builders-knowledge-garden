'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LIFECYCLE_STAGES, STAGE_WORKFLOWS, WORKFLOW_TO_STAGE } from '@/lib/lifecycle-stages';
import { colors, fonts, fontSizes, fontWeights, spacing, radii } from '../tokens';
import { stageAccent } from '../tokens/stage-accents';

// Map workflow id → live URL path. Mirrors LIVE_WORKFLOWS from
// src/app/killerapp/page.tsx — kept inline here so this primitive
// doesn't depend on the page module's internals.
// Workflows not in this map have no live route yet ("coming soon").
const LIVE_WORKFLOW_PATHS: Record<string, string> = {
  q1: '/killerapp/workflows/bid-risk',
  q2: '/killerapp/workflows/estimating',
  q3: '/killerapp/workflows/client-lookup',
  q4: '/killerapp/workflows/contract-templates',
  q5: '/killerapp/workflows/code-compliance',
  q6: '/killerapp/workflows/job-sequencing',
  q7: '/killerapp/workflows/worker-count',
  q8: '/killerapp/workflows/permit-applications',
  q9: '/killerapp/workflows/sub-management',
  q10: '/killerapp/workflows/equipment',
  q11: '/killerapp/workflows/supply-ordering',
  q12: '/killerapp/workflows/services-todos',
  q13: '/killerapp/workflows/hiring',
  q14: '/killerapp/workflows/weather-scheduling',
  q15: '/killerapp/workflows/daily-log',
  q16: '/killerapp/workflows/osha-toolbox',
  q17: '/killerapp/workflows/expenses',
  q18: '/killerapp/workflows/outreach',
  q19: '/killerapp/workflows/compass-nav',
  // Sequence-open (2026-05-22): q20-q27 paths added so stage 5/6/7
  // transitions resolve to real workflows. Inline preview banners on
  // q21/q22/q25 disclose "under construction" without hiding the route.
  q20: '/killerapp/workflows/change-orders',
  q21: '/killerapp/workflows/draw-requests',
  q22: '/killerapp/workflows/lien-waivers',
  q23: '/killerapp/workflows/payroll-check',
  q24: '/killerapp/workflows/final-walk-through',
  q25: '/killerapp/workflows/retainage-tracker',
  q26: '/killerapp/workflows/warranty-handoff',
  q27: '/killerapp/workflows/project-review',
  // 2026-05-22 — architect-of-record concierge form (stage 2 / Lock).
  'q-aor': '/killerapp/workflows/architect-of-record',
  // 2026-05-22 — running punch list (stage 4 / Build). Separate surface
  // from q24's final walk-through.
  'q-punch': '/killerapp/workflows/punch-list',
  // 2026-05-22 — RFIs (stage 4 / Build). UI over /api/v1/rfis.
  'q-rfi': '/killerapp/workflows/rfis',
  // 2026-05-22 — OWNER-LANE approvals inbox (stage 5 / Adapt).
  'q-approvals': '/killerapp/workflows/approvals',
  // 2026-05-22 — MEP scheduling generators (stage 3 / Plan).
  // Deterministic NEC / ASHRAE / UPC math — no LLM.
  'q-panel-schedule': '/killerapp/workflows/panel-schedule',
  'q-equipment-schedule': '/killerapp/workflows/equipment-schedule',
  'q-load-calc': '/killerapp/workflows/panel-schedule',
  // 2026-05-22 — SUBBID-FLOW: lane-gated bid surfaces (stage 3 / Plan).
  'q-sub-bid-submit': '/killerapp/workflows/sub-bid-submit',
  'q-sub-bid-inbox': '/killerapp/workflows/sub-bid-inbox',
  // 2026-05-22 — BOOKKEEPER-UI: vendor master (stage 3), AR/AP ledger
  // (stage 6 / Collect), QuickBooks export + audit trail (stage 7 / Reflect).
  'q-vendors':     '/killerapp/workflows/vendor-master',
  'q-ledger':      '/killerapp/workflows/ar-ap-ledger',
  'q-qbexport':    '/killerapp/workflows/quickbooks-export',
  'q-audit-trail': '/killerapp/workflows/audit-trail',
  // 2026-05-22 — DIY-LANE: GC matching concierge form (stage 2 / Lock).
  'q-find-gc':        '/killerapp/workflows/find-a-gc',
  // 2026-05-22 — DIY-LANE: plain-English budget walkthrough (stage 1 / Size Up).
  'q-cost-explainer': '/killerapp/workflows/cost-explainer',
};

/**
 * NextWorkflowCard — Stage-exit card with 3 next-step options
 * ============================================================
 *
 * Renders at the bottom of a workflow showing:
 * - Headline acknowledging completion or progress
 * - Primary CTA: Continue to next workflow in stage, or move to next stage
 * - Secondary CTA: Jump to a different stage (grid picker)
 * - Tertiary CTA: Ask AI what to do next
 *
 * Accepts workflow IDs and stage IDs to determine which stage/workflow comes next.
 * Uses stage-accent tinted border and Trace background.
 */

export interface NextWorkflowCardProps {
  currentWorkflowId: string;
  currentStageId: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  stepsComplete?: boolean;
  className?: string;
}

// Map q-IDs to workflow labels for display
const WORKFLOW_LABELS: Record<string, string> = {
  q1: 'Should you take this bid?',
  q2: 'Estimating',
  q3: 'Budget baseline',
  q4: 'Contract Templates',
  q5: 'Code Compliance',
  q6: 'Job Sequencing',
  q7: 'Worker Count',
  q8: 'Permit Applications',
  q9: 'Sub-Management',
  q10: 'Equipment',
  q11: 'Supply Ordering',
  q12: 'Services & Todos',
  q13: 'Hiring',
  q14: 'Weather Scheduling',
  q15: 'Daily Log',
  q16: 'OSHA Toolbox',
  q17: 'Expenses',
  q18: 'Outreach',
  q19: 'Compass Nav',
  // q20-q27: opened in LIVE_WORKFLOW_PATHS as of 2026-05-22. Labels mirror
  // docs/workflows.json and are used both for stage-transition copy
  // ("Move to Adapt: Manage scope changes") and the picker rows.
  q20: 'Manage scope changes',
  q21: 'Request payment draws',
  q22: 'Collect lien waivers',
  q23: 'Payroll check',
  q24: 'Final walk-through',
  q25: 'Collect retainage',
  q26: 'Warranty handoff',
  q27: 'What we learned',
  // 2026-05-22 — architect-of-record concierge form (stage 2 / Lock).
  'q-aor': 'Find an architect of record',
  // 2026-05-22 — running punch list (stage 4 / Build).
  'q-punch': 'Running punch list',
  // 2026-05-22 — RFIs (stage 4 / Build).
  'q-rfi': 'Submit RFIs',
  // 2026-05-22 — OWNER-LANE approvals inbox (stage 5 / Adapt).
  'q-approvals': 'Approvals inbox',
  // 2026-05-22 — MEP scheduling generators (stage 3 / Plan).
  'q-panel-schedule': 'Panel schedule (NEC 220)',
  'q-equipment-schedule': 'Equipment schedule (HVAC + plumbing)',
  'q-load-calc': 'Electrical load calc',
  // 2026-05-22 — SUBBID-FLOW (stage 3 / Plan).
  'q-sub-bid-submit': 'Submit a bid (sub lane)',
  'q-sub-bid-inbox': 'Sub-bid inbox (GC lane)',
  // 2026-05-22 — BOOKKEEPER-UI bookkeeper-must-haves.
  'q-vendors':     'Vendor master',
  'q-ledger':      'AR / AP ledger',
  'q-qbexport':    'QuickBooks export',
  'q-audit-trail': 'Audit trail',
  // 2026-05-22 — DIY-LANE.
  'q-find-gc':        'Find a vetted GC',
  'q-cost-explainer': 'Why does it cost what it does?',
};

export default function NextWorkflowCard({
  currentWorkflowId,
  currentStageId,
  stepsComplete = false,
  className = '',
}: NextWorkflowCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');
  const [showStagePicker, setShowStagePicker] = useState(false);
  const accent = stageAccent(currentStageId);
  const currentWorkflowLabel = WORKFLOW_LABELS[currentWorkflowId] || 'This workflow';
  const currentStageName = LIFECYCLE_STAGES.find((s) => s.id === currentStageId)?.name || 'the current stage';

  // Determine next workflow in current stage
  const currentStageWorkflows = STAGE_WORKFLOWS[currentStageId] || [];
  const currentIndex = currentStageWorkflows.indexOf(currentWorkflowId);
  const isLastInStage = currentIndex === -1 || currentIndex === currentStageWorkflows.length - 1;

  let nextCTALabel = 'Continue to next workflow';
  let nextStageId: number | null = null;
  let nextWorkflowId: string | null = null;

  if (isLastInStage) {
    // Move to next stage
    nextStageId = currentStageId < 7 ? currentStageId + 1 : null;
    if (nextStageId) {
      const nextStageName = LIFECYCLE_STAGES.find((s) => s.id === nextStageId)?.name || `Stage ${nextStageId}`;
      const nextStageWorkflows = STAGE_WORKFLOWS[nextStageId] || [];
      nextWorkflowId = nextStageWorkflows[0] ?? null;
      const nextWorkflowLabel = nextWorkflowId
        ? WORKFLOW_LABELS[nextWorkflowId] || 'next workflow'
        : 'next workflow';
      nextCTALabel = `Move to ${nextStageName}: ${nextWorkflowLabel}`;
    } else {
      nextCTALabel = 'You\'ve completed the journey';
    }
  } else {
    // Continue within stage
    nextWorkflowId = currentStageWorkflows[currentIndex + 1];
    const nextLabel = WORKFLOW_LABELS[nextWorkflowId] || 'next workflow';
    nextCTALabel = `Continue to ${nextLabel}`;
  }

  // Compute the actual destination URL for the primary CTA.
  // Preserves ?project=<id> so the project context follows the user.
  // Falls back to /killerapp if the next workflow has no live route yet.
  const nextLivePath = nextWorkflowId
    ? LIVE_WORKFLOW_PATHS[nextWorkflowId]
    : undefined;
  const nextHref = nextLivePath
    ? projectId
      ? `${nextLivePath}?project=${encodeURIComponent(projectId)}`
      : nextLivePath
    : projectId
      ? `/killerapp?project=${encodeURIComponent(projectId)}`
      : '/killerapp';
  const isComingSoon = nextWorkflowId && !nextLivePath;
  const handlePrimaryCTA = () => {
    router.push(nextHref);
  };

  const handleAIFab = () => {
    if (typeof window !== 'undefined') {
      // Pre-fill the AI fab with a contextual question so the user
      // doesn't land on an empty input. GlobalAiFab listens for this
      // event's detail.prompt and seeds its textarea.
      const prompt = `I'm working on ${currentWorkflowLabel}. What's the most useful next step here?`;
      window.dispatchEvent(
        new CustomEvent('bkg:ai-fab:open', { detail: { prompt } })
      );
    }
  };

  const handleStageSelect = (selectedStageId: number) => {
    setShowStagePicker(false);
    const workflows = STAGE_WORKFLOWS[selectedStageId] || [];
    const firstId = workflows[0];
    const livePath = firstId ? LIVE_WORKFLOW_PATHS[firstId] : undefined;
    // Land on the first live workflow in the chosen stage; fall back to
    // /killerapp if nothing in that stage is wired up yet. Preserve
    // ?project=<id> so the project context follows.
    const target = livePath
      ? projectId
        ? `${livePath}?project=${encodeURIComponent(projectId)}`
        : livePath
      : projectId
        ? `/killerapp?project=${encodeURIComponent(projectId)}`
        : '/killerapp';
    router.push(target);
  };

  return (
    <div className={className}>
      <div
        style={{
          borderTop: `2px solid ${accent.hex}`,
          backgroundColor: colors.trace,
          borderRadius: radii.md,
          padding: spacing[6],
          marginTop: spacing[8],
        }}
      >
        {/* Headline */}
        <h2
          style={{
            fontFamily: fonts.heading,
            fontSize: fontSizes.xl,
            fontWeight: fontWeights.bold,
            color: colors.navy,
            margin: `0 0 ${spacing[6]} 0`,
          }}
        >
          {stepsComplete
            ? `Nice. That's ${currentStageName} in the books.`
            : `Making progress on ${currentStageName}.`}
        </h2>

        {/* Button group */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: spacing[3],
          }}
        >
          {/* Primary CTA */}
          <button
            onClick={handlePrimaryCTA}
            style={{
              backgroundColor: colors.brass,
              color: 'white',
              fontFamily: fonts.body,
              fontSize: fontSizes.md,
              fontWeight: fontWeights.semibold,
              padding: `${spacing[3]} ${spacing[4]}`,
              borderRadius: radii.md,
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
              opacity: isComingSoon ? 0.65 : 1,
            }}
            title={isComingSoon ? `${nextCTALabel} — coming soon (returning to summary)` : undefined}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#9E6F2F';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = colors.brass;
            }}
          >
            {nextCTALabel}
          </button>

          {/* Secondary CTA - Stage Picker Toggle */}
          <button
            onClick={() => setShowStagePicker(!showStagePicker)}
            style={{
              backgroundColor: 'transparent',
              border: `1px solid ${colors.fadedRule}`,
              color: colors.graphite,
              fontFamily: fonts.body,
              fontSize: fontSizes.md,
              fontWeight: fontWeights.semibold,
              padding: `${spacing[3]} ${spacing[4]}`,
              borderRadius: radii.md,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = colors.graphite;
              (e.currentTarget as HTMLElement).style.color = colors.navy;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = colors.fadedRule;
              (e.currentTarget as HTMLElement).style.color = colors.graphite;
            }}
          >
            Jump to a different stage
          </button>

          {/* Tertiary CTA - AI Fab */}
          <button
            onClick={handleAIFab}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: colors.graphite,
              fontFamily: fonts.body,
              fontSize: fontSizes.md,
              textDecoration: 'underline',
              padding: `${spacing[2]} ${spacing[1]}`,
              cursor: 'pointer',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = colors.navy;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = colors.graphite;
            }}
          >
            Ask the AI what to do next
          </button>
        </div>

        {/* Stage Picker Modal - 2-row grid of 7 stages */}
        {showStagePicker && (
          <div
            style={{
              marginTop: spacing[6],
              padding: spacing[4],
              backgroundColor: colors.trace,
              border: `1px solid ${colors.fadedRule}`,
              borderRadius: radii.md,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: spacing[3],
              }}
            >
              {LIFECYCLE_STAGES.map((stage) => {
                const isCurrentStage = stage.id === currentStageId;
                const stageAccentColor = stageAccent(stage.id as 1 | 2 | 3 | 4 | 5 | 6 | 7);
                return (
                  <button
                    key={stage.id}
                    onClick={() => handleStageSelect(stage.id)}
                    disabled={isCurrentStage}
                    style={{
                      backgroundColor: isCurrentStage ? colors.fadedRule : 'white',
                      border: `2px solid ${stageAccentColor.hex}`,
                      color: colors.navy,
                      fontFamily: fonts.body,
                      fontSize: fontSizes.sm,
                      fontWeight: fontWeights.semibold,
                      padding: `${spacing[3]} ${spacing[2]}`,
                      borderRadius: radii.md,
                      cursor: isCurrentStage ? 'default' : 'pointer',
                      opacity: isCurrentStage ? 0.6 : 1,
                      transition: 'all 0.2s ease',
                      textAlign: 'center',
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrentStage) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = '#F0EBE0';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCurrentStage) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'white';
                      }
                    }}
                  >
                    <div style={{ marginBottom: spacing[1] }}>{stage.emoji}</div>
                    <div>{stage.name}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
