'use client';

/**
 * WorkflowEntryCard — verb-leading entry into a workflow.
 * ========================================================
 *
 * SHARED Section-A primitive (B6 on the Builder lane). Ported from the
 * design-system kit's `WorkflowCard`: an accent marker bar, an engraved
 * "PHASE · {phase}" eyebrow, an Archivo-Black title, an editorial-italic
 * blurb, and a mono verb + arrow that slides on hover. Tokens only.
 *
 * Accent follows the surface/flag palette via a `tone` (no hard-coded hex).
 * Renders as a real <Link> when `href` is given (SPA nav, project context
 * preserved by the caller), else a <button>. `comingSoon` dims it + swaps the
 * verb to "Soon" without hiding the affordance.
 */

import Link from 'next/link';
import './specimen.css';

export type WorkflowTone = 'teal' | 'rust' | 'sage' | 'amber' | 'brass';

export interface WorkflowEntryCardProps {
  title: string;
  blurb?: string;
  /** CTA verb, e.g. "Open", "Resume", "Start". */
  verb?: string;
  /** Engraved phase eyebrow, e.g. "build". */
  phase?: string;
  /** Accent colour → marker bar + CTA. */
  tone?: WorkflowTone;
  comingSoon?: boolean;
  href?: string;
  onClick?: () => void;
}

export default function WorkflowEntryCard({
  title,
  blurb,
  verb = 'Open',
  phase,
  tone = 'teal',
  comingSoon = false,
  href,
  onClick,
}: WorkflowEntryCardProps) {
  const inner = (
    <>
      <div className="we-marker" />
      <div className="we-body">
        {phase && <div className="eng-label we-phase">PHASE · {phase.toUpperCase()}</div>}
        <div className="we-title">{title}</div>
        {blurb && <div className="we-blurb">{blurb}</div>}
      </div>
      <div className="we-cta">
        <span>{comingSoon ? 'Soon' : verb}</span>
        <span className="we-arrow" aria-hidden="true">→</span>
      </div>
    </>
  );

  const className = `we we--${tone}${comingSoon ? ' is-soon' : ''}`;

  if (href && !comingSoon) {
    return (
      <Link href={href} className={className} onClick={onClick}>
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={className}
      onClick={comingSoon ? undefined : onClick}
      aria-disabled={comingSoon || undefined}
      title={comingSoon ? `${title} — coming soon` : undefined}
    >
      {inner}
    </button>
  );
}
