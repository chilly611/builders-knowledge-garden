'use client';

import { useState } from 'react';
import type { ResourceResult } from '@/lib/resource-broker';

interface ResourceCardGridProps {
  results: ResourceResult[];
  loading: boolean;
  error: string | null;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onSearch: (stepId: string, query: string, stepInput?: unknown) => Promise<void>;
}

/**
 * ResourceCardGrid — Result card display with design-system integration.
 *
 * Design system tokens applied:
 * - --navy (#1B3B5E): Card border, primary text
 * - --paper (#F4F0E6): Card background
 * - --brass (#B6873A): Per-card CTA hover states, focus rings
 * - --robin (#7FCFCB): Thin ring on verified vendors (trust signal)
 * - --orange (#D9642E): Reserved for final "Place order" ritual crown (NOT here)
 * - --redline (#A1473A): Error states
 * - --graphite (#2E2E30): Secondary text, UI linework
 * - --rule (#C9C3B3): Heritage hairlines, faded grid
 *
 * Background: graph-paper grid at opacity .15 with heritage texture
 * (cultural memory per design moodboard — not pure geometric lattice).
 *
 * Motif: blueprint-elevation hairline as secondary decoration.
 * Animation: stroke-draw for loading state (CSS @keyframes).
 *
 * Card anatomy per contract:
 * - Image (or placeholder SVG if missing)
 * - Title + Vendor
 * - Price + Distance + Availability
 * - "Why this?" popover (trust signal / matching logic)
 * - Per-card CTA ("Add to cart" / "Request quote")
 * - Verified vendor ring (robin's egg) if matched
 */
export default function ResourceCardGrid({
  results,
  loading,
  error,
  selectedIds,
  onSelectionChange,
  onSearch,
}: ResourceCardGridProps) {
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);

  const handleToggleSelect = (id: string) => {
    const newIds = new Set(selectedIds);
    if (newIds.has(id)) {
      newIds.delete(id);
    } else {
      newIds.add(id);
    }
    onSelectionChange(newIds);
  };

  // Loading state: stroke-draw animation with blueprint-elevation SVG
  if (loading) {
    return (
      <div style={styles.container}>
        <style>{`
          @keyframes draw {
            from {
              stroke-dashoffset: 1000;
            }
            to {
              stroke-dashoffset: 0;
            }
          }
          .broker-loading-svg {
            animation: draw 1.4s cubic-bezier(0.4, 0.02, 0.2, 1) forwards;
          }
        `}</style>
        <div style={styles.emptyState}>
          <svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            className="broker-loading-svg"
            style={{ marginBottom: '16px', stroke: '#1B3B5E', fill: 'none', strokeWidth: 0.5 }}
          >
            {/* Blueprint-elevation linework: horizontal and vertical axis lines with dashes */}
            <g opacity="0.6">
              {/* Horizontal lines */}
              <line x1="10" y1="20" x2="110" y2="20" strokeDasharray="4,2" />
              <line x1="10" y1="40" x2="110" y2="40" strokeDasharray="4,2" />
              <line x1="10" y1="60" x2="110" y2="60" strokeDasharray="4,2" />
              <line x1="10" y1="80" x2="110" y2="80" strokeDasharray="4,2" />
              <line x1="10" y1="100" x2="110" y2="100" strokeDasharray="4,2" />
              {/* Vertical lines */}
              <line x1="20" y1="10" x2="20" y2="110" strokeDasharray="4,2" />
              <line x1="40" y1="10" x2="40" y2="110" strokeDasharray="4,2" />
              <line x1="60" y1="10" x2="60" y2="110" strokeDasharray="4,2" />
              <line x1="80" y1="10" x2="80" y2="110" strokeDasharray="4,2" />
              <line x1="100" y1="10" x2="100" y2="110" strokeDasharray="4,2" />
            </g>
            {/* Center origin cross */}
            <line x1="50" y1="40" x2="50" y2="80" strokeWidth="1" />
            <line x1="40" y1="60" x2="80" y2="60" strokeWidth="1" />
          </svg>
          <p style={styles.emptyText}>Dispatching search…</p>
        </div>
      </div>
    );
  }

  // Error state: redline markup with recovery CTA
  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorState}>
          {/* Redline SVG markup overlay */}
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            style={{ marginBottom: '12px' }}
          >
            <circle
              cx="20"
              cy="20"
              r="18"
              fill="none"
              stroke="#A1473A"
              strokeWidth="2"
            />
            <line x1="14" y1="14" x2="26" y2="26" stroke="#A1473A" strokeWidth="2" />
            <line x1="26" y1="14" x2="14" y2="26" stroke="#A1473A" strokeWidth="2" />
          </svg>
          <p style={styles.errorText}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={styles.retryButton}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state: no results
  if (results.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>No results found. Try a different query.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{`
        ${styles.globalCss}
      `}</style>
      <div style={styles.grid}>
        {results.map((result) => (
          <ResourceCard
            key={result.id}
            result={result}
            selected={selectedIds.has(result.id)}
            onToggleSelect={() => handleToggleSelect(result.id)}
            popoverActive={activePopoverId === result.id}
            onPopoverToggle={(active) =>
              setActivePopoverId(active ? result.id : null)
            }
          />
        ))}
      </div>
    </div>
  );
}

/**
 * ResourceCard — Individual supply result card with design tokens.
 *
 * Anatomy:
 * - Image placeholder (heritage SVG if imageUrl missing)
 * - Title + Vendor name
 * - Price, distance, availability
 * - "Why this?" popover trigger
 * - Per-card CTA (brass token, not orange)
 * - Verified vendor ring (robin's egg) if applicable
 */
function ResourceCard({
  result,
  selected,
  onToggleSelect,
  popoverActive,
  onPopoverToggle,
}: {
  result: ResourceResult;
  selected: boolean;
  onToggleSelect: () => void;
  popoverActive: boolean;
  onPopoverToggle: (active: boolean) => void;
}) {
  return (
    <div
      style={{
        ...styles.card,
        // Verified vendor indicator: robin's egg thin ring
        border: `2px solid ${result.tags?.includes('verified') ? '#7FCFCB' : '#C9C3B3'}`,
        backgroundColor: selected ? '#F4F0E6' : '#FFFFFF',
      }}
    >
      {/* Image or placeholder */}
      <div style={styles.cardImage}>
        {result.imageUrl ? (
          <img
            src={result.imageUrl}
            alt={result.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          // Heritage SVG placeholder: graph paper with slight imperfection
          <svg viewBox="0 0 160 120" style={{ width: '100%', height: '100%' }}>
            <defs>
              <pattern
                id={`grid-${result.id}`}
                width="16"
                height="16"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 16 0 L 0 0 0 16"
                  fill="none"
                  stroke="#1B3B5E"
                  strokeWidth="0.5"
                  opacity="0.15"
                />
              </pattern>
            </defs>
            <rect width="160" height="120" fill="#F4F0E6" />
            <rect
              width="160"
              height="120"
              fill={`url(#grid-${result.id})`}
            />
            {/* Center label */}
            <text
              x="80"
              y="60"
              textAnchor="middle"
              dy="0.3em"
              style={{
                fontSize: '12px',
                fill: '#2E2E30',
                fontFamily: 'system-ui, sans-serif',
                opacity: 0.5,
              }}
            >
              {result.kind}
            </text>
          </svg>
        )}
      </div>

      {/* Card metadata */}
      <div style={styles.cardContent}>
        <h3 style={styles.cardTitle}>{result.title}</h3>
        <p style={styles.cardVendor}>{result.vendor || 'Unknown vendor'}</p>

        {/* Price + Distance + Availability row */}
        <div style={styles.cardMeta}>
          {result.priceDisplay && (
            <span style={styles.cardMetaItem}>{result.priceDisplay}</span>
          )}
          {result.distance && (
            <span style={styles.cardMetaItem}>{result.distance.text}</span>
          )}
          {result.availability && (
            <span style={styles.cardMetaItem}>{result.availability}</span>
          )}
        </div>

        {/* "Why this?" popover */}
        <div style={styles.cardActions}>
          <button
            onClick={() => onPopoverToggle(!popoverActive)}
            style={styles.whyButton}
            title="Why this result matches your search"
          >
            Why this?
          </button>
          {popoverActive && (
            <div style={styles.popover}>
              <p>{result.reasoning || 'Matched your query'}</p>
            </div>
          )}
        </div>

        {/* Per-card CTA: brass token, not orange */}
        <button
          onClick={onToggleSelect}
          style={{
            ...styles.ctaButton,
            backgroundColor: selected ? '#B6873A' : '#FFFFFF',
            color: selected ? '#FFFFFF' : '#B6873A',
            borderColor: '#B6873A',
          }}
        >
          {selected ? 'Added' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}

/**
 * Design system tokens as CSS variables (inline for encapsulation).
 * Per moodboard v1: full palette + heritage texture rules.
 */
const styles = {
  globalCss: `
    :root {
      --navy: #1B3B5E;
      --navy-deep: #0E2A47;
      --paper: #F4F0E6;
      --graphite: #2E2E30;
      --rule: #C9C3B3;
      --brass: #B6873A;
      --robin: #7FCFCB;
      --orange: #D9642E;
      --redline: #A1473A;
    }
  `,
  container: {
    padding: '20px',
    backgroundColor: '#F4F0E6',
    backgroundImage: `
      linear-gradient(0deg, transparent 24%, rgba(27, 59, 94, 0.05) 25%, rgba(27, 59, 94, 0.05) 26%, transparent 27%, transparent 74%, rgba(27, 59, 94, 0.05) 75%, rgba(27, 59, 94, 0.05) 76%, transparent 77%, transparent),
      linear-gradient(90deg, transparent 24%, rgba(27, 59, 94, 0.05) 25%, rgba(27, 59, 94, 0.05) 26%, transparent 27%, transparent 74%, rgba(27, 59, 94, 0.05) 75%, rgba(27, 59, 94, 0.05) 76%, transparent 77%, transparent)
    `,
    backgroundSize: '60px 60px',
    minHeight: '400px',
  } as React.CSSProperties,
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
  } as React.CSSProperties,
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '4px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(27, 59, 94, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  } as React.CSSProperties,
  cardImage: {
    width: '100%',
    paddingBottom: '66.666%',
    position: 'relative',
    backgroundColor: '#F4F0E6',
    overflow: 'hidden',
  } as React.CSSProperties,
  cardContent: {
    padding: '12px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  } as React.CSSProperties,
  cardTitle: {
    margin: '0 0 4px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: '#1B3B5E',
    fontFamily: 'system-ui, sans-serif',
  } as React.CSSProperties,
  cardVendor: {
    margin: '0 0 8px 0',
    fontSize: '12px',
    color: '#2E2E30',
    fontFamily: 'system-ui, sans-serif',
    opacity: 0.7,
  } as React.CSSProperties,
  cardMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '8px',
    fontSize: '11px',
    color: '#2E2E30',
  } as React.CSSProperties,
  cardMetaItem: {
    display: 'block',
    fontFamily: 'system-ui, sans-serif',
  } as React.CSSProperties,
  cardActions: {
    marginBottom: '8px',
    position: 'relative',
  } as React.CSSProperties,
  whyButton: {
    background: 'none',
    border: 'none',
    color: '#B6873A',
    fontSize: '11px',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
    fontFamily: 'system-ui, sans-serif',
  } as React.CSSProperties,
  popover: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#1B3B5E',
    color: '#F4F0E6',
    padding: '8px',
    borderRadius: '2px',
    fontSize: '11px',
    marginBottom: '4px',
    zIndex: 10,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
  } as React.CSSProperties,
  ctaButton: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #B6873A',
    borderRadius: '2px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'system-ui, sans-serif',
    transition: 'all 0.2s ease',
  } as React.CSSProperties,
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    textAlign: 'center',
  } as React.CSSProperties,
  emptyText: {
    fontSize: '14px',
    color: '#2E2E30',
    fontFamily: '"Fraunces", serif, system-ui',
    margin: 0,
  } as React.CSSProperties,
  errorState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    textAlign: 'center',
  } as React.CSSProperties,
  errorText: {
    fontSize: '14px',
    color: '#A1473A',
    fontFamily: 'system-ui, sans-serif',
    margin: '0 0 12px 0',
  } as React.CSSProperties,
  retryButton: {
    padding: '8px 16px',
    backgroundColor: '#A1473A',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '2px',
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: 'system-ui, sans-serif',
  } as React.CSSProperties,
} as const;
