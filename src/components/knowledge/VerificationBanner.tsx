/**
 * VerificationBanner — the honest trust treatment for a served knowledge fact
 * (LOOP 2 / Slice B "B3", docs/code-ingestion-hitl.md §5 Option B + §3 flags).
 *
 * The dogfood verdict: "a citation plus a freshness stamp reads as 'someone
 * checked this.' No one did." This banner closes that gap at the point a fact
 * is served. It gates the confident treatment on `manually_verified_at` and
 * renders honest, plain-language provisional copy otherwise — so a
 * published-but-unverified row never reads as human-confirmed.
 *
 * Pure/presentational, design-system tokens, herbarium-locked (no #E8443A, no
 * pure white, no emoji, sentence case, mono UPPERCASE label). Reusable — the
 * knowledge entity page wires it first; the compliance/code-lookup surfaces
 * and the TrustStrip primitive adopt it next (so the "no false-verified badge
 * anywhere" bar fully closes).
 */

import { colors } from '@/design-system';

export type VerificationLevel = 'manually_verified' | 'auto_verified' | 'unverified';

/**
 * Derive the level from the row's columns — mirrors `toVerification` in
 * compliance-lookup.ts (manual wins; auto counts only when not flagged).
 */
export function verificationLevelOf(e: {
  manually_verified_at?: string | null;
  auto_verified_at?: string | null;
  auto_verification_flagged?: boolean | null;
}): VerificationLevel {
  if (e.manually_verified_at) return 'manually_verified';
  if (e.auto_verified_at && !e.auto_verification_flagged) return 'auto_verified';
  return 'unverified';
}

const SAGE = '#5E7A56'; // flag green (visual-first-and-flags.md §3)

interface Treatment {
  bar: string;
  label: string;
  headline: string;
  body: string;
}

function treatmentFor(level: VerificationLevel, source?: string | null, verifiedAt?: string | null): Treatment {
  const on = verifiedAt ? ` on ${new Date(verifiedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}` : '';
  const src = source ? ` against ${source}` : '';
  switch (level) {
    case 'manually_verified':
      return {
        bar: SAGE,
        label: 'Human-verified',
        headline: 'A reviewer confirmed this against an authoritative source.',
        body: `Checked${src}${on}. Still confirm the adopted edition with your AHJ before relying on it.`,
      };
    case 'auto_verified':
      return {
        bar: colors.orange, // amber — watch
        label: 'AI-cross-checked',
        headline: 'Reviewed by an automated cross-check — not yet human-verified.',
        body: 'A model with no stake in the outcome saw the same content and did not flag it. Confirm against the cited source and your AHJ.',
      };
    default:
      return {
        bar: colors.orange, // amber — provisional/watch (not a hard risk, so not rust)
        label: 'Not yet human-verified',
        headline: 'AI-assembled reference, awaiting human review.',
        body: 'No reviewer has confirmed this against the source yet. Treat it as a starting point — verify with your AHJ and the cited source before relying on it.',
      };
  }
}

export interface VerificationBannerProps {
  level: VerificationLevel;
  /** Licensed source the human checked, when manually verified. */
  source?: string | null;
  /** ISO timestamp of the human attestation. */
  verifiedAt?: string | null;
}

export function VerificationBanner({ level, source, verifiedAt }: VerificationBannerProps) {
  const t = treatmentFor(level, source, verifiedAt);
  return (
    <aside
      data-verification={level}
      aria-label={`Verification status: ${t.label}`}
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        background: colors.paper.warm, // vellum — never pure white
        border: `1px solid ${colors.trace}`,
        borderLeft: `4px solid ${t.bar}`,
        borderRadius: 10,
        padding: '12px 16px',
        margin: '0 0 20px',
        fontFamily: 'var(--font-archivo), system-ui, sans-serif',
        color: colors.graphite,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--bp-font-mono, ui-monospace, monospace)',
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: t.bar,
            marginBottom: 4,
          }}
        >
          {t.label}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35 }}>{t.headline}</div>
        <div style={{ fontSize: 13.5, color: '#5A5141', marginTop: 3, lineHeight: 1.5 }}>{t.body}</div>
      </div>
    </aside>
  );
}
