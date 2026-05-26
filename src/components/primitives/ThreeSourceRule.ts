/**
 * Three-Source Rule (Pattern Language #09, Platform Primitive).
 *
 * Category: Platform Primitive (from the 4 baked into every garden via the
 *           frontier map).
 * Axes touched: trust_posture (primary), lane (active — administrators get
 *               stricter rendering), domain (active — some domains have
 *               jurisdiction-specific authoritative sources).
 *
 * Every claim cites ≥ 3 sources or it doesn't render as authoritative. This is
 * a pure helper — no React, no JSX — so any caller (server or client, route
 * handler or component) can run the verdict in one line.
 *
 * The RSI Heartbeat is the moat. We get more right every week because every
 * claim's freshness is re-checked on a cadence. Three-Source Rule is the
 * guard at render time: even if the heartbeat hasn't caught a stale source,
 * the rule refuses to call a single-source claim "verified."
 */

import type { StanceCard } from './StanceCard.types';

export interface SourceCitation {
  /** Human-readable name, e.g. "California Building Code Title 24, Part 6" */
  name: string;
  /** Canonical URL when available. Falls back to nothing for primary records. */
  url?: string;
  /** ISO 3166-2 region or organization slug. Optional. */
  jurisdiction?: string;
  /** When the platform last re-verified this source. Required for freshness UI. */
  lastVerified?: Date | string;
}

export type ClaimVerdict =
  | { tier: 'authoritative'; sources: SourceCitation[] }
  | { tier: 'corroborated'; sources: SourceCitation[]; missing: number }
  | { tier: 'single'; sources: SourceCitation[] }
  | { tier: 'unsourced'; sources: SourceCitation[] };

/**
 * Apply the Three-Source Rule. Returns the verdict tier and the same source
 * list back. Callers decide how to render each tier — see TrustStrip for the
 * canonical visual treatment.
 *
 * Admin lane gets a stricter bar: corroborated requires ≥ 2, authoritative
 * still needs ≥ 3. Public lane sees the same tiers; we don't soften the truth
 * for non-experts.
 */
export function verifyThreeSource(
  sources: SourceCitation[] | undefined,
  _stance?: StanceCard,
): ClaimVerdict {
  const list = sources ?? [];
  if (list.length === 0) return { tier: 'unsourced', sources: list };
  if (list.length === 1) return { tier: 'single', sources: list };
  if (list.length === 2)
    return { tier: 'corroborated', sources: list, missing: 1 };
  return { tier: 'authoritative', sources: list };
}

/**
 * Boolean shortcut for `verifyThreeSource(sources).tier === 'authoritative'`.
 * Use as a render gate in component code:
 *   if (!isAuthoritative(sources)) return <TrustStrip variant="badge" ... />;
 */
export function isAuthoritative(
  sources: SourceCitation[] | undefined,
): boolean {
  return verifyThreeSource(sources).tier === 'authoritative';
}

/**
 * Human-readable verdict label for use in chrome and tooltips. Plain language
 * by default, technical when the lane is professional or machine.
 */
export function verdictLabel(
  verdict: ClaimVerdict,
  lane: StanceCard['lane'] = 'public',
): string {
  if (lane === 'machine') {
    return `${verdict.tier}:${verdict.sources.length}`;
  }
  const proLabel = lane === 'professional' || lane === 'administrator';
  switch (verdict.tier) {
    case 'authoritative':
      return proLabel
        ? `Verified across ${verdict.sources.length} sources`
        : `Checked against ${verdict.sources.length} sources`;
    case 'corroborated':
      return proLabel
        ? `Two sources agree (need ${verdict.missing} more for full verification)`
        : `Two sources agree`;
    case 'single':
      return proLabel
        ? `Single source — corroboration pending`
        : `One source so far`;
    case 'unsourced':
      return proLabel ? `Unsourced — do not rely on` : `We're checking on this`;
  }
}
