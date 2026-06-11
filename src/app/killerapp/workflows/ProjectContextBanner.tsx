'use client';

/**
 * ProjectContextBanner (Project Spine v1, 2026-05-03).
 *
 * Renders at the top of each project-aware workflow page (Estimating,
 * Code Compliance, Contract Templates) when ?project=<id> is present.
 * Shows the user's original raw_input and a short AI-derived summary,
 * plus quick links to peer workflows so the user can move sideways
 * without retyping.
 *
 * Staleness handling: when project.ai_summary was generated for a
 * different location than the current project.jurisdiction, the banner
 * fires POST /api/v1/projects/summarize (authenticated — the route 401s
 * without a Bearer token) to regenerate it. The stale text is shown while
 * the request is in-flight, then swapped for the fresh summary. If the
 * refresh FAILS we say so inline with a Retry button instead of silently
 * leaving the stale take up — the silent version was P0 symptom (b):
 * users saved field=X and kept reading an AI narrative describing Y.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { authedFetch } from '@/lib/authed-fetch';
import type { ProjectContext } from '@/lib/hooks/useProjectWorkflowState';
import { applyJurisdictionOverride } from '@/lib/project-display';
import CostPerSquareFootBadge from '@/design-system/components/CostPerSquareFootBadge';
import { useUserLane } from '@/lib/use-user-lane';
import { wrapGlossaryTerms } from '@/lib/glossary-render';

// PEER_LINKS is the curated set of "Move to" buttons we surface in the
// banner. Keep it small (6 items) so the row stays scannable. New
// workflows can pass any slug as `selfWorkflow` — if it doesn't match a
// PEER_LINKS entry, the banner just doesn't dim a self-button (the rest
// of the row still works, the user navigates back via the breadcrumb).
type PeerWorkflowId =
  | 'estimating'
  | 'code-compliance'
  | 'contract-templates'
  | 'permit-applications'
  | 'daily-log'
  | 'supply-ordering';

interface Props {
  project: ProjectContext | null;
  // Accept any workflow slug. PEER_LINKS only dims/dimensions the curated set.
  selfWorkflow: PeerWorkflowId | string;
  // Optional extra facts surfaced by individual workflow clients (e.g. sqft
  // from estimating_state when there is no dedicated DB column for it yet).
  sqft?: string | null;
}

const PEER_LINKS: Array<{
  id: PeerWorkflowId;
  label: string;
  href: (projectId: string) => string;
}> = [
  {
    id: 'estimating',
    label: 'Estimate',
    href: (id) => `/killerapp/workflows/estimating?project=${encodeURIComponent(id)}`,
  },
  {
    id: 'code-compliance',
    label: 'Codes',
    href: (id) =>
      `/killerapp/workflows/code-compliance?project=${encodeURIComponent(id)}`,
  },
  {
    id: 'permit-applications',
    label: 'Permits',
    href: (id) =>
      `/killerapp/workflows/permit-applications?project=${encodeURIComponent(id)}`,
  },
  {
    id: 'contract-templates',
    label: 'Contracts',
    href: (id) =>
      `/killerapp/workflows/contract-templates?project=${encodeURIComponent(id)}`,
  },
  {
    id: 'supply-ordering',
    label: 'Supply',
    href: (id) =>
      `/killerapp/workflows/supply-ordering?project=${encodeURIComponent(id)}`,
  },
  {
    id: 'daily-log',
    label: 'Daily log',
    href: (id) =>
      `/killerapp/workflows/daily-log?project=${encodeURIComponent(id)}`,
  },
];

export default function ProjectContextBanner({ project, selfWorkflow, sqft }: Props) {
  const [liveSummary, setLiveSummary] = useState<string | null>(null);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const regeneratedRef = useRef(false);
  // DIY-LANE (2026-05-22): when the active lane is `diy`, the AI Take and
  // raw_input paragraphs run through wrapGlossaryTerms so jargon ("CSI",
  // "RFI", "lien waiver") becomes a hover-able TermTooltip. For pro lanes
  // wrapGlossaryTerms is a passthrough — same string, no extra DOM nodes.
  const { effectiveLane } = useUserLane();

  // Only rewrite the location in raw_input when the saved jurisdiction is
  // consistent with the description — same guard as EstimatingClient.
  const jCity = project?.jurisdiction?.replace(/,.*$/, '').trim().toLowerCase() ?? '';
  const jurisdictionConsistent =
    !!jCity && !!project?.raw_input && project.raw_input.toLowerCase().includes(jCity);
  const rawInput =
    jurisdictionConsistent && project?.raw_input
      ? applyJurisdictionOverride(project.raw_input.trim(), project.jurisdiction!)
      : project?.raw_input?.trim();

  const storedSummary = project?.ai_summary?.trim() ?? null;
  const displaySummary = liveSummary ?? storedSummary;
  const summaryPreview =
    displaySummary && displaySummary.length > 220
      ? `${displaySummary.slice(0, 217).trimEnd()}…`
      : displaySummary;

  // Regenerate when the stored AI Take doesn't mention the current
  // jurisdiction city. Shows the stale text while the request is in-flight,
  // then swaps it for the fresh summary. On ANY failure (401/403/5xx/network)
  // we flip refreshFailed so the user sees the take is out of date — the
  // earlier silent-ignore version is what let saves look successful while
  // the AI narrative quietly described the old project.
  const aiTakeIsStale =
    !!jCity && !!storedSummary && !storedSummary.toLowerCase().includes(jCity);

  const projectId = project?.id;
  const regenerate = useCallback(async () => {
    if (!projectId) return;
    setRefreshing(true);
    setRefreshFailed(false);
    try {
      const res = await authedFetch('/api/v1/projects/summarize', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId }),
      });
      const data = (await res.json().catch(() => ({}))) as { ai_summary?: string };
      if (res.ok && data.ai_summary) {
        setLiveSummary(data.ai_summary);
      } else {
        setRefreshFailed(true);
      }
    } catch {
      setRefreshFailed(true);
    } finally {
      setRefreshing(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!aiTakeIsStale || !projectId || regeneratedRef.current) return;
    regeneratedRef.current = true;
    void regenerate();
  }, [aiTakeIsStale, projectId, regenerate]);

  if (!project) return null;

  const factsRow: string[] = [];
  if (project.project_type) factsRow.push(project.project_type);
  if (project.jurisdiction) factsRow.push(project.jurisdiction);
  if (sqft) factsRow.push(`${Number(sqft).toLocaleString()} sq ft`);
  if (project.estimated_cost_low && project.estimated_cost_high) {
    factsRow.push(
      `$${project.estimated_cost_low.toLocaleString()}–$${project.estimated_cost_high.toLocaleString()}`
    );
  }

  return (
    <section
      data-testid="project-context-banner"
      style={{
        maxWidth: 900,
        margin: '0 auto 24px',
        padding: '20px 24px',
        background: 'var(--trace, #F4F0E6)',
        border: '0.5px solid var(--faded-rule, #C9C3B3)',
        borderRadius: 12,
        fontFamily: 'var(--font-archivo), sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: 'var(--brass, #B6873A)',
          }}
        >
          Your project
        </span>
        <Link
          href={`/killerapp?project=${encodeURIComponent(project.id)}`}
          style={{
            fontSize: 12,
            color: 'var(--graphite, #2E2E30)',
            opacity: 0.55,
            textDecoration: 'none',
          }}
        >
          ← back to summary
        </Link>
      </div>

      {rawInput && (
        <p
          style={{
            margin: '0 0 12px',
            fontSize: 16,
            lineHeight: 1.45,
            color: 'var(--graphite, #2E2E30)',
            fontWeight: 500,
          }}
        >
          {wrapGlossaryTerms(rawInput, effectiveLane)}
        </p>
      )}

      {factsRow.length > 0 && (
        <p
          style={{
            margin: '0 0 12px',
            fontSize: 13,
            color: 'var(--graphite, #2E2E30)',
            opacity: 0.7,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>{factsRow.join(' · ')}</span>
          {/* COCKPIT-FIXES Pain 1 (2026-05-22): derived $/sf so the badge
              always agrees with the live cost-range × sqft math. AI prose
              no longer claims a $/sf figure — this is the canonical UI. */}
          <CostPerSquareFootBadge
            costLow={project.estimated_cost_low ?? null}
            costHigh={project.estimated_cost_high ?? null}
            sqft={sqft ?? project.sqft ?? null}
          />
        </p>
      )}

      {summaryPreview && (
        <p
          style={{
            margin: '0 0 14px',
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--graphite, #2E2E30)',
            opacity: 0.75,
          }}
        >
          <span
            style={{
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: 'var(--brass, #B6873A)',
              marginRight: 8,
            }}
          >
            AI take
          </span>
          {wrapGlossaryTerms(summaryPreview, effectiveLane)}
          {refreshFailed && (
            <span
              data-testid="ai-take-refresh-failed"
              role="status"
              style={{
                display: 'block',
                marginTop: 6,
                fontSize: 12,
                color: 'var(--redline, #A53A2D)',
              }}
            >
              This AI take may be out of date — refresh failed.{' '}
              <button
                type="button"
                onClick={() => void regenerate()}
                disabled={refreshing}
                style={{
                  font: 'inherit',
                  color: 'inherit',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  textDecoration: 'underline',
                  cursor: refreshing ? 'wait' : 'pointer',
                }}
              >
                {refreshing ? 'Retrying…' : 'Retry'}
              </button>
            </span>
          )}
        </p>
      )}

      <nav
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          paddingTop: 12,
          borderTop: '1px solid var(--faded-rule, #C9C3B3)',
        }}
      >
        <span
          style={{
            fontSize: 11,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: 'var(--graphite, #2E2E30)',
            opacity: 0.55,
            marginRight: 4,
            alignSelf: 'center',
          }}
        >
          Move to
        </span>
        {PEER_LINKS.map((p) => {
          const isSelf = p.id === selfWorkflow;
          return (
            <Link
              key={p.id}
              href={p.href(project.id)}
              aria-current={isSelf ? 'page' : undefined}
              style={{
                padding: '8px 12px',
                minHeight: 44,
                minWidth: 44,
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: 12,
                border: '0.5px solid var(--faded-rule, #C9C3B3)',
                borderRadius: 6,
                background: isSelf ? 'rgba(182, 135, 58, 0.08)' : 'transparent',
                color: 'var(--graphite, #2E2E30)',
                opacity: isSelf ? 0.5 : 1,
                textDecoration: 'none',
                pointerEvents: isSelf ? 'none' : undefined,
              }}
            >
              {p.label}
              {isSelf ? ' ●' : ' →'}
            </Link>
          );
        })}
      </nav>
    </section>
  );
}
