'use client';

/**
 * ProjectContextBanner (Project Spine v1, 2026-05-03).
 *
 * Renders at the top of each project-aware workflow page (Estimating,
 * Code Compliance, Contract Templates) when ?project=<id> is present.
 * Shows the user's original raw_input and a short AI-derived summary,
 * plus quick links to peer workflows so the user can move sideways
 * without retyping.
 */

import Link from 'next/link';
import type { ProjectContext } from '@/lib/hooks/useProjectWorkflowState';

type WorkflowId =
  | 'estimating'
  | 'code-compliance'
  | 'contract-templates'
  | 'permit-applications'
  | 'daily-log'
  | 'supply-ordering';

interface Props {
  project: ProjectContext | null;
  selfWorkflow: WorkflowId;
}

const PEER_LINKS: Array<{
  id: WorkflowId;
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

export default function ProjectContextBanner({ project, selfWorkflow }: Props) {
  if (!project) return null;

  const rawInput = project.raw_input?.trim();
  const aiSummary = project.ai_summary?.trim();
  const summaryPreview =
    aiSummary && aiSummary.length > 220
      ? `${aiSummary.slice(0, 217).trimEnd()}…`
      : aiSummary;

  const factsRow: string[] = [];
  if (project.project_type) factsRow.push(project.project_type);
  if (project.jurisdiction) factsRow.push(project.jurisdiction);
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
          {rawInput}
        </p>
      )}

      {factsRow.length > 0 && (
        <p
          style={{
            margin: '0 0 12px',
            fontSize: 13,
            color: 'var(--graphite, #2E2E30)',
            opacity: 0.7,
          }}
        >
          {factsRow.join(' · ')}
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
          {summaryPreview}
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
                padding: '6px 12px',
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
