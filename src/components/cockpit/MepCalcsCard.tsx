'use client';

/**
 * MepCalcsCard — cockpit surface for the MEP calc generators.
 *
 * Shown only when `shouldSurfaceMepCalcs` flags the project as
 * commercial / TI / etc. (see `src/lib/mep-calc-router.ts`). Three
 * button-links into the deterministic generators, plus a quiet
 * pointer at the headless /api/v1/load-calc endpoint for integrators.
 *
 * Style mirrors the cockpit band: brass border, Trace-cream paper,
 * navy ink, system-serif label tracking. Card is keyboard-accessible —
 * each button is a real Link, the "API" entry is a button with a
 * tooltip via `title` for hover and aria-describedby for AT.
 */

import Link from 'next/link';

const BRASS = '#B6873A';
const TRACE = '#F4F0E6';
const NAVY = '#1B3B5E';
const INK = '#2E2E30';

export interface MepCalcsCardProps {
  projectId?: string | null;
  /** When `compact`, render with tighter padding for the mobile drawer. */
  variant?: 'desktop' | 'compact';
}

function buildHref(base: string, projectId?: string | null): string {
  return projectId
    ? `${base}?project=${encodeURIComponent(projectId)}`
    : base;
}

export default function MepCalcsCard({ projectId, variant = 'desktop' }: MepCalcsCardProps) {
  const compact = variant === 'compact';

  const apiTooltip =
    'Pro tip: hit /api/v1/load-calc directly for headless integrations';

  return (
    <section
      data-testid="mep-calcs-card"
      aria-label="MEP calcs available"
      style={{
        background: TRACE,
        border: `1px solid ${BRASS}`,
        borderRadius: 6,
        padding: compact ? '12px 14px' : '16px 18px',
        margin: compact ? '12px 0' : '16px auto',
        maxWidth: compact ? '100%' : 1100,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxShadow: '0 1px 0 rgba(0,0,0,0.02)',
      }}
    >
      <header style={{ marginBottom: compact ? 8 : 10 }}>
        <p
          style={{
            margin: 0,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: BRASS,
          }}
        >
          MEP calcs available
        </p>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 12,
            color: INK,
            opacity: 0.75,
          }}
        >
          Deterministic NEC / UPC / ASHRAE math — no LLM in the loop.
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: compact
            ? '1fr'
            : 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 8,
        }}
      >
        <Link
          href={buildHref('/killerapp/workflows/panel-schedule', projectId)}
          style={{
            display: 'block',
            padding: '10px 12px',
            background: '#FFFFFF',
            border: `1px solid ${BRASS}55`,
            borderLeft: `3px solid ${BRASS}`,
            borderRadius: 4,
            textDecoration: 'none',
            color: NAVY,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Calculate panel + service amps
          <span style={{ display: 'block', fontSize: 11, fontWeight: 400, color: INK, opacity: 0.7, marginTop: 2 }}>
            NEC 220 service-load
          </span>
        </Link>

        <Link
          href={buildHref('/killerapp/workflows/equipment-schedule', projectId)}
          style={{
            display: 'block',
            padding: '10px 12px',
            background: '#FFFFFF',
            border: `1px solid ${BRASS}55`,
            borderLeft: `3px solid ${BRASS}`,
            borderRadius: 4,
            textDecoration: 'none',
            color: NAVY,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Equipment + HVAC tonnage
          <span style={{ display: 'block', fontSize: 11, fontWeight: 400, color: INK, opacity: 0.7, marginTop: 2 }}>
            ASHRAE 90.1 + UPC 422.1
          </span>
        </Link>

        <button
          type="button"
          title={apiTooltip}
          aria-label={`View load-calc API. ${apiTooltip}`}
          // No-op button: this card surfaces the headless integration
          // path. Future iterations can pop a modal with a curl example.
          onClick={(e) => {
            e.preventDefault();
            // Surface the tip via the native tooltip + a transient hint.
            // Intentionally no navigation; the API is consumed by integrators.
          }}
          style={{
            display: 'block',
            padding: '10px 12px',
            background: '#FFFFFF',
            border: `1px dashed ${BRASS}55`,
            borderLeft: `3px solid ${BRASS}`,
            borderRadius: 4,
            cursor: 'help',
            textAlign: 'left',
            color: NAVY,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'inherit',
            width: '100%',
          }}
        >
          View load-calc API
          <span style={{ display: 'block', fontSize: 11, fontWeight: 400, color: INK, opacity: 0.7, marginTop: 2 }}>
            /api/v1/load-calc · headless
          </span>
        </button>
      </div>

      <p
        style={{
          margin: compact ? '10px 0 0' : '12px 0 0',
          fontSize: 10,
          color: INK,
          opacity: 0.55,
          letterSpacing: '0.02em',
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
        }}
      >
        NEC Article 220 · UPC 422.1 · ASHRAE 90.1
      </p>
    </section>
  );
}
