'use client';

/**
 * MoneyTimeTiers — first-run Principle #3 (docs/first-run-and-onboarding.md):
 * "The first substantive screen renders Budget / Business Class / First-Class
 *  Luxury as visually distinct architectural options — money range + timeline
 *  + flags above the fold. The recommendation is a default, never a lock-in.
 *  Signals are honest: no tier is all-green."
 *
 * The screen the cold user reaches after The One Door. It puts money and time
 * up front, honestly:
 *  - No hallucinated money — every figure is a RANGE with the engine's-read
 *    label, never fabricated precision; cost carries a "verify with your AHJ"
 *    flag (visual-first-and-flags.md §3).
 *  - The flag taxonomy is sage (ease) / amber (watch) / rust (risk); every tier
 *    shows at least one non-green flag — no option is all-green.
 *  - One tier is the recommended default (bright, with a one-line rationale);
 *    the others are visible but recessive. Switching is instant, non-punishing.
 *  - "Go deeper" is the only door to the expert cockpit (Principle #5).
 *
 * Presentational; herbarium-locked via design-system tokens (no #E8443A, no
 * pure white, no emoji, sentence case, mono UPPERCASE labels). Goal-8 machine
 * twin emitted for agents.
 */

import { useState } from 'react';
import { colors } from '@/design-system';
import { type FirstRunRole } from './InferRole';
import { type CostTier, type TierFlag, type FlagKind, type EstimateBasis } from '@/lib/first-run/estimate';

// The canonical definitions now live with the estimate engine; re-export them so
// existing importers (e.g. /start/tiers) keep their import path unchanged.
export type { CostTier, TierFlag, FlagKind };

const SAGE = '#5E7A56'; // flag green / ease (visual-first-and-flags.md §3)
const C = {
  paper: colors.paper.cream, // #F2E9D2 ground
  vellum: colors.paper.warm, // #E8DDB8 cards
  edge: colors.trace, // #C9B98A rules
  ink: colors.graphite, // #2A2620 text
  brass: colors.brass, // #B08D5C accent / recommended
  teal: colors.robin, // #3C7A8A links
  amber: colors.orange, // #C68A3D watch
  rust: colors.redline, // #A53A2D risk
  muted: '#8A7F66',
  body: '#5A5141',
};

const FLAG_COLOR: Record<FlagKind, string> = { ease: SAGE, watch: C.amber, risk: C.rust };

const fmt = (n: number) => {
  if (n >= 1_000_000) return `$${Math.round(n / 100_000) / 10}M`; // one decimal, e.g. $1.3M
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${n}`;
};

/**
 * Fallback sample tiers for an ADU — honest ranges (engine's read, not quotes),
 * each with a non-green flag. Used only when the component renders standalone
 * (e.g. a preview); the live /start/tiers passes a grounded per-project estimate
 * from src/lib/first-run/estimate.
 */
export const SAMPLE_TIERS: CostTier[] = [
  {
    key: 'budget',
    name: 'Budget',
    blurb: 'Get it built, keep it simple.',
    moneyLow: 180000,
    moneyHigh: 240000,
    timeline: '5–7 months',
    flags: [
      { kind: 'ease', headline: 'Fastest to permit', why: 'Standard plans move through most AHJs quickly.' },
      { kind: 'watch', headline: 'Basic finishes', why: 'Upgrades later cost more than choosing them now.' },
      { kind: 'risk', headline: 'Thin contingency', why: 'An overrun hits hard — verify costs with your AHJ.' },
    ],
  },
  {
    key: 'business',
    name: 'Business Class',
    blurb: 'The balance most builds land on.',
    moneyLow: 260000,
    moneyHigh: 330000,
    timeline: '6–9 months',
    recommended: true,
    rationale: 'Best resale-to-cost balance for your area.',
    flags: [
      { kind: 'ease', headline: 'Strong resale return', why: 'Mid-tier finishes recover the most at sale.' },
      { kind: 'watch', headline: 'Timeline assumes no permit delay', why: 'Confirm the review queue with your AHJ.' },
    ],
  },
  {
    key: 'first_class',
    name: 'First-Class Luxury',
    blurb: 'Top finishes, top systems.',
    moneyLow: 380000,
    moneyHigh: 520000,
    timeline: '9–14 months',
    flags: [
      { kind: 'ease', headline: 'Premium throughout', why: 'Custom millwork, high-end systems, designer finishes.' },
      { kind: 'watch', headline: 'Long lead-time materials', why: 'Custom orders can stretch the schedule.' },
      { kind: 'risk', headline: 'Range widens with scope', why: 'Custom scope creep is the top overrun driver.' },
    ],
  },
];

const mono: React.CSSProperties = {
  fontFamily: 'var(--bp-font-mono, ui-monospace, monospace)',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontSize: 11,
};

// Recessive inline input for the optional refine row — underline only, so it
// reads as editable text, never competing with the tier cards (one-thing-brightest).
const refineInput = (width: number): React.CSSProperties => ({
  width,
  border: 'none',
  borderBottom: `1.5px solid ${C.edge}`,
  background: 'transparent',
  color: C.ink,
  fontFamily: 'inherit',
  fontSize: 'inherit',
  fontWeight: 600,
  padding: '1px 3px',
  outline: 'none',
});

export interface MoneyTimeTiersProps {
  /** The user's words from The One Door — echoed back, unedited. */
  intent?: string;
  /** Inferred/confirmed role (Principle #4) — swaps the framing voice only. */
  role?: FirstRunRole;
  tiers?: CostTier[];
  /** Grounded estimate basis (size / jurisdiction the ranges were built from) —
   *  drives the refine row's labels and placeholders. */
  basis?: EstimateBasis;
  /** Light refine row (size / location). Omit to hide it (standalone preview). */
  refine?: {
    value: { sqft: string; location: string };
    onChange: (next: { sqft: string; location: string }) => void;
  };
  onSelect: (key: CostTier['key']) => void;
  onGoDeeper?: () => void;
}

export default function MoneyTimeTiers({ intent, role = 'owner', tiers = SAMPLE_TIERS, basis, refine, onSelect, onGoDeeper }: MoneyTimeTiersProps) {
  const recommendedKey = tiers.find((t) => t.recommended)?.key ?? tiers[0]?.key;
  const [selected, setSelected] = useState<CostTier['key']>(recommendedKey);

  const pick = (k: CostTier['key']) => {
    setSelected(k);
    onSelect(k);
  };

  // Same engine, copy swaps only (Principle #4). Owner reads outcomes ("build");
  // GC reads the working frame ("price the bid"). The numbers don't change.
  const voice =
    role === 'gc'
      ? { label: 'Money & time · scope the bid', verb: 'price', generic: 'Three ways to price it' }
      : { label: 'Money & time · pick a starting point', verb: 'build', generic: 'Three ways to build it' };

  return (
    <main
      data-machine="money_time_tiers"
      style={{
        minHeight: '100vh',
        background: C.paper,
        color: C.ink,
        fontFamily: 'var(--font-archivo), system-ui, sans-serif',
        padding: '40px 24px 64px',
      }}
    >
      <script
        type="application/json"
        data-machine-twin="money_time_tiers"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            type: 'money_time_tiers',
            intent: intent ?? null,
            role,
            recommended: recommendedKey,
            note: 'ranges are the engine read, not quotes',
            source: basis ? 'grounded_estimate' : 'sample',
            ...(basis
              ? {
                  basis: {
                    sqft: basis.sqft,
                    location: basis.location,
                    building_type: basis.buildingType,
                    region_multiplier: basis.regionMultiplier,
                    cost_per_sqft: basis.costPerSqFt,
                    assumed_sqft: basis.assumedSqft,
                    assumed_location: basis.assumedLocation,
                  },
                }
              : {}),
            tiers: tiers.map((t) => ({
              key: t.key,
              money_range: [t.moneyLow, t.moneyHigh],
              timeline: t.timeline,
              flags: t.flags.map((f) => ({ kind: f.kind, headline: f.headline })),
            })),
            actions: ['select', 'go_deeper'],
          }),
        }}
      />

      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <p style={{ ...mono, color: C.brass, margin: '0 0 8px' }}>{voice.label}</p>
        <h1 style={{ fontSize: 'clamp(24px,4vw,34px)', fontWeight: 700, margin: '0 0 6px', lineHeight: 1.15 }}>
          {intent ? <>Three ways to {voice.verb} “{intent}”</> : voice.generic}
        </h1>
        <p style={{ color: C.muted, margin: '0 0 24px', fontSize: 14, lineHeight: 1.5 }}>
          Ranges are the engine&rsquo;s read — a starting estimate, not a quote. Confirm costs, codes, and permits with
          your AHJ. The middle option is our default; it&rsquo;s a suggestion, not a lock-in.
        </p>

        {refine && basis ? (
          <div
            data-machine="tiers_refine"
            style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 6, margin: '-12px 0 22px', fontSize: 13.5, color: C.body }}
          >
            <span style={{ color: C.muted }}>Tuned for your {basis.buildingTypeLabel} —</span>
            <input
              aria-label="Square footage"
              inputMode="numeric"
              value={refine.value.sqft}
              placeholder={basis.sqft.toLocaleString()}
              onChange={(e) => refine.onChange({ ...refine.value, sqft: e.target.value.replace(/[^\d,]/g, '') })}
              style={refineInput(70)}
            />
            <span style={{ color: C.muted }}>sq ft in</span>
            <input
              aria-label="Location, city or county"
              value={refine.value.location}
              placeholder={basis.location}
              onChange={(e) => refine.onChange({ ...refine.value, location: e.target.value })}
              style={refineInput(160)}
            />
            {basis.assumedSqft || basis.assumedLocation ? (
              <span style={{ ...mono, color: C.amber, fontSize: 10.5 }}>assumed — edit for a sharper read</span>
            ) : null}
          </div>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {tiers.map((tier) => {
            const isRec = tier.key === recommendedKey;
            const isSel = tier.key === selected;
            return (
              <section
                key={tier.key}
                style={{
                  background: C.vellum,
                  border: `${isSel ? 2 : 1}px solid ${isSel ? C.brass : C.edge}`,
                  borderRadius: 14,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  position: 'relative',
                }}
              >
                {isRec && (
                  <span
                    style={{
                      ...mono,
                      alignSelf: 'flex-start',
                      color: C.paper,
                      background: C.brass,
                      borderRadius: 6,
                      padding: '3px 8px',
                    }}
                  >
                    Recommended
                  </span>
                )}
                <div>
                  <div style={{ fontSize: 19, fontWeight: 700 }}>{tier.name}</div>
                  <div style={{ fontSize: 13.5, color: C.muted, marginTop: 2 }}>{tier.blurb}</div>
                </div>

                <div>
                  <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.01em' }}>
                    {fmt(tier.moneyLow)}–{fmt(tier.moneyHigh)}
                  </div>
                  <div style={{ ...mono, color: C.muted, marginTop: 2 }}>Estimated range · {tier.timeline}</div>
                </div>

                {isRec && tier.rationale && (
                  <div style={{ fontSize: 13, color: SAGE, fontStyle: 'italic' }}>{tier.rationale}</div>
                )}

                {/* Honest flags — color bar + headline + one-line why (§3) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2 }}>
                  {tier.flags.map((f, i) => (
                    <div key={i} style={{ display: 'flex', gap: 9 }}>
                      <span style={{ width: 4, borderRadius: 2, background: FLAG_COLOR[f.kind], flexShrink: 0 }} aria-hidden />
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: FLAG_COLOR[f.kind] }}>{f.headline}</div>
                        <div style={{ fontSize: 12.5, color: C.body, lineHeight: 1.45 }}>{f.why}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => pick(tier.key)}
                  data-machine-action="select"
                  style={{
                    marginTop: 'auto',
                    border: 'none',
                    borderRadius: 9,
                    padding: '11px 16px',
                    fontSize: 15,
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    color: isSel ? C.paper : C.ink,
                    background: isSel ? C.brass : 'transparent',
                    outline: isSel ? 'none' : `1px solid ${C.edge}`,
                  }}
                >
                  {isSel ? 'Selected' : `Start with ${tier.name}`}
                </button>
              </section>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28 }}>
          <button
            type="button"
            onClick={onGoDeeper}
            data-machine-action="go_deeper"
            style={{
              border: 'none',
              background: 'transparent',
              color: C.teal,
              fontFamily: 'inherit',
              fontSize: 14,
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            Go deeper — see the full breakdown →
          </button>
        </div>
      </div>
    </main>
  );
}
