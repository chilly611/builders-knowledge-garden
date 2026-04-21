'use client';

import { useState, useEffect } from 'react';
import LearningBadge from '@/components/LearningBadge';
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
 * ResourceCardGrid — Editorial vendor card gallery with W7.C polish.
 *
 * Design improvements:
 * 1. Editorial card hero: 4:3 image area with faded trace underlay
 * 2. Vendor name: brass, small-caps, letterspaced
 * 3. Product title: large graphite (16px), bold, magazine feel
 * 4. Price: large graphite number with "from $" prefix
 * 5. Rating: mini brass star-glyphs
 * 6. Distance: monospace-style mile indicator
 * 7. "Why this?" popover: pull-quote, serif-adjacent, brass quote-glyph, hover-reveal
 * 8. Verified ring: Robin's Egg 2px border with "Verified" micro-label (peak moment)
 * 9. CTA: brass button (NOT orange — orange reserved for s11-5)
 * 10. Loading state: blueprint skeleton with "Drafting vendor brief…"
 * 11. Empty state: helpful prompt "Try a different search"
 * 12. Error state: graceful fallback with "showing recent vendors"
 *
 * Peak-pair preservation (immutable):
 * - --robin (#7FCFCB): Verified vendor ring (2px, unmistakable)
 * - --orange (#D9642E): s11-5 Place Order CTA only (NOT used here)
 *
 * Color tokens (all via var() references):
 * - --navy, --trace, --graphite, --faded-rule, --brass, --redline, --robin, --orange
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleToggleSelect = (id: string) => {
    const newIds = new Set(selectedIds);
    if (newIds.has(id)) {
      newIds.delete(id);
    } else {
      newIds.add(id);
    }
    onSelectionChange(newIds);
  };

  // Loading state: blueprint-field skeleton with narrative
  if (loading) {
    return <BrokerLoadingState />;
  }

  // Error state: graceful fallback with demo note
  if (error) {
    return <BrokerErrorState error={error} />;
  }

  // Empty state: helpful prompt to broaden query
  if (results.length === 0) {
    return <BrokerEmptyState />;
  }

  return (
    <div style={styles.container}>
      <style>{`
        ${styles.globalCss}
      `}</style>
      <div style={{ paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--graphite)', fontFamily: 'var(--font-archivo)' }}>
        This search logged · <LearningBadge variant="query" />
      </div>
      <div
        style={{
          ...styles.grid,
          gridTemplateColumns: isMobile
            ? 'repeat(auto-fill, minmax(140px, 1fr))'
            : 'repeat(auto-fill, minmax(200px, 1fr))',
        }}
      >
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
            isMobile={isMobile}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * BrokerLoadingState — Blueprint-field skeleton with gentle animation.
 * Shows architectural linework, not generic pulse bars.
 */
function BrokerLoadingState() {
  return (
    <div style={styles.container}>
      <style>{`
        @keyframes broker-skeleton-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        .broker-loading-svg {
          animation: broker-skeleton-pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .broker-loading-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
          margin-top: 20px;
        }
        .broker-skeleton-card {
          background: white;
          border: 2px solid var(--faded-rule);
          border-radius: 4px;
          overflow: hidden;
          height: 320px;
          display: flex;
          flex-direction: column;
        }
        .broker-skeleton-image {
          width: 100%;
          aspect-ratio: 4 / 3;
          background: var(--trace);
          position: relative;
        }
        .broker-skeleton-content {
          padding: 12px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .broker-skeleton-title {
          height: 14px;
          background: var(--faded-rule);
          border-radius: 2px;
          width: 80%;
        }
        .broker-skeleton-vendor {
          height: 11px;
          background: var(--faded-rule);
          border-radius: 2px;
          width: 60%;
          opacity: 0.5;
        }
        .broker-skeleton-price {
          height: 18px;
          background: var(--faded-rule);
          border-radius: 2px;
          width: 40%;
          margin-top: 4px;
        }
      `}</style>
      <div style={styles.emptyState}>
        <svg
          width="100"
          height="100"
          viewBox="0 0 100 100"
          className="broker-loading-svg"
          style={{
            marginBottom: '20px',
            stroke: 'var(--navy)',
            fill: 'none',
            strokeWidth: 0.8,
          }}
        >
          {/* Blueprint elevation schematic */}
          <g opacity="0.7">
            <line x1="15" y1="25" x2="85" y2="25" strokeDasharray="3,2" />
            <line x1="15" y1="40" x2="85" y2="40" strokeDasharray="3,2" />
            <line x1="15" y1="55" x2="85" y2="55" strokeDasharray="3,2" />
            <line x1="15" y1="70" x2="85" y2="70" strokeDasharray="3,2" />
            <line x1="25" y1="15" x2="25" y2="85" strokeDasharray="3,2" />
            <line x1="50" y1="15" x2="50" y2="85" strokeDasharray="3,2" />
            <line x1="75" y1="15" x2="75" y2="85" strokeDasharray="3,2" />
          </g>
          {/* Center crosshair */}
          <line x1="50" y1="35" x2="50" y2="65" strokeWidth="1.2" />
          <line x1="40" y1="50" x2="60" y2="50" strokeWidth="1.2" />
        </svg>
        <p style={styles.emptyText}>Drafting vendor brief…</p>
        <p style={{ ...styles.emptyText, fontSize: '12px', opacity: 0.6, marginTop: '8px' }}>
          Searching, reasoning, and ranking resources
        </p>
      </div>

      {/* Optional: show skeleton cards in background */}
      <div className="broker-loading-cards">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="broker-skeleton-card">
            <div className="broker-skeleton-image" />
            <div className="broker-skeleton-content">
              <div className="broker-skeleton-title" />
              <div className="broker-skeleton-vendor" />
              <div className="broker-skeleton-price" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * BrokerEmptyState — When no results found, show helpful prompt.
 */
function BrokerEmptyState() {
  return (
    <div style={styles.container}>
      <div style={styles.emptyState}>
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          style={{ marginBottom: '16px' }}
        >
          <rect
            x="15"
            y="20"
            width="50"
            height="40"
            fill="none"
            stroke="var(--faded-rule)"
            strokeWidth="2"
            rx="2"
          />
          <circle cx="30" cy="32" r="3" fill="var(--faded-rule)" />
          <path
            d="M 15 55 L 35 40 L 50 48 L 65 30"
            fill="none"
            stroke="var(--faded-rule)"
            strokeWidth="2"
          />
        </svg>
        <p style={styles.emptyText}>No vendors found</p>
        <p
          style={{
            ...styles.emptyText,
            fontSize: '13px',
            opacity: 0.6,
            marginTop: '8px',
            maxWidth: '300px',
          }}
        >
          Try a different search or broaden your query terms.
        </p>
      </div>
    </div>
  );
}

/**
 * BrokerErrorState — Graceful fallback when broker fails.
 */
function BrokerErrorState({ error }: { error: string }) {
  return (
    <div style={styles.container}>
      <div style={styles.errorState}>
        <svg
          width="60"
          height="60"
          viewBox="0 0 60 60"
          style={{ marginBottom: '16px' }}
        >
          <circle
            cx="30"
            cy="30"
            r="28"
            fill="none"
            stroke="var(--redline)"
            strokeWidth="2"
          />
          <line x1="22" y1="22" x2="38" y2="38" stroke="var(--redline)" strokeWidth="2" />
          <line x1="38" y1="22" x2="22" y2="38" stroke="var(--redline)" strokeWidth="2" />
        </svg>
        <p style={styles.errorText}>{error}</p>
        <p style={{ ...styles.errorText, fontSize: '12px', opacity: 0.6, marginTop: '8px' }}>
          Live search paused — showing recent vendors
        </p>
        <button
          onClick={() => window.location.reload()}
          style={styles.retryButton}
        >
          Retry Search
        </button>
      </div>
    </div>
  );
}

/**
 * ResourceCard — Editorial vendor card with W7.C design treatment.
 *
 * Hero treatment:
 * - 4:3 image area with heritage trace underlay
 * - Vendor name: brass, small-caps, 11px, 0.15em letter-spacing
 * - Product title: large graphite, 16px, bold
 * - Price: graphite 20px bold with "from $" prefix (11px)
 * - Rating: mini brass star-glyphs (★), up to 3 stars
 * - Distance: monospace-style mile indicator
 * - "Why this?" popover: pull-quote, serif, inset, brass quote-glyph
 * - Verified ring: Robin's Egg 2px with "Verified" micro-label (peak)
 * - CTA: brass button (not orange)
 */
function ResourceCard({
  result,
  selected,
  onToggleSelect,
  popoverActive,
  onPopoverToggle,
  isMobile,
}: {
  result: ResourceResult;
  selected: boolean;
  onToggleSelect: () => void;
  popoverActive: boolean;
  onPopoverToggle: (active: boolean) => void;
  isMobile: boolean;
}) {
  const isVerified = result.tags?.includes('verified');
  const starCount = result.rating ? Math.min(Math.floor(result.rating.stars / 1.5), 3) : 0;

  return (
    <div
      style={{
        ...styles.card,
        border: `2px solid ${isVerified ? 'var(--robin)' : 'var(--faded-rule)'}`,
        backgroundColor: selected ? 'var(--trace)' : '#FFFFFF',
        position: 'relative',
      }}
    >
      {/* Verified vendor micro-label — unmistakable robin's egg callout */}
      {isVerified && (
        <div
          style={{
            position: 'absolute',
            top: '-11px',
            left: '8px',
            fontSize: '9px',
            fontWeight: 700,
            color: 'var(--robin)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            backgroundColor: '#FFFFFF',
            padding: '0 4px',
            zIndex: 5,
          }}
        >
          Verified
        </div>
      )}

      {/* 4:3 Image area with heritage trace underlay */}
      <div style={styles.cardImage}>
        {result.imageUrl ? (
          <img
            src={result.imageUrl}
            alt={result.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          // Heritage SVG placeholder: graph paper with trace background
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
                  stroke="var(--navy)"
                  strokeWidth="0.5"
                  opacity="0.12"
                />
              </pattern>
            </defs>
            <rect width="160" height="120" fill="var(--trace)" />
            <rect
              width="160"
              height="120"
              fill={`url(#grid-${result.id})`}
            />
            <text
              x="80"
              y="60"
              textAnchor="middle"
              dy="0.3em"
              style={{
                fontSize: '13px',
                fill: 'var(--graphite)',
                fontFamily: 'system-ui, sans-serif',
                opacity: 0.4,
              }}
            >
              {result.kind}
            </text>
          </svg>
        )}
      </div>

      {/* Card metadata — editorial treatment */}
      <div style={styles.cardContent}>
        {/* Vendor name: brass, small-caps, letterspaced */}
        <p
          style={{
            margin: '0 0 4px 0',
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--brass)',
            fontFamily: 'system-ui, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
          }}
        >
          {result.vendor || 'Unknown'}
        </p>

        {/* Product title: large graphite, bold, magazine feel */}
        <h3
          style={{
            margin: '0 0 8px 0',
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--graphite)',
            fontFamily: 'system-ui, sans-serif',
            lineHeight: 1.2,
          }}
        >
          {result.title}
        </h3>

        {/* Price: large graphite number with "from $" prefix */}
        {result.priceDisplay && (
          <div
            style={{
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'baseline',
              gap: '4px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                color: 'var(--graphite)',
                opacity: 0.6,
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              from
            </span>
            <span
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--graphite)',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              {result.priceDisplay}
            </span>
          </div>
        )}

        {/* Rating: mini brass star-glyphs */}
        {result.rating && (
          <div
            style={{
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span
              style={{
                fontSize: '13px',
                color: 'var(--brass)',
                letterSpacing: '1px',
              }}
            >
              {'★'.repeat(starCount)}
              {'☆'.repeat(3 - starCount)}
            </span>
            <span
              style={{
                fontSize: '10px',
                color: 'var(--graphite)',
                opacity: 0.5,
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              ({result.rating.count})
            </span>
          </div>
        )}

        {/* Distance: monospace-style mile indicator */}
        {result.distance && (
          <p
            style={{
              margin: '0 0 8px 0',
              fontSize: '11px',
              color: 'var(--graphite)',
              fontFamily: 'monospace',
              fontWeight: 500,
              opacity: 0.7,
              letterSpacing: '0.05em',
            }}
          >
            {result.distance.miles.toFixed(1)} mi
          </p>
        )}

        {/* "Why this?" popover — pull-quote styling, hover-reveal */}
        <div style={{ marginBottom: '8px', position: 'relative' }}>
          <button
            onMouseEnter={() => onPopoverToggle(true)}
            onMouseLeave={() => onPopoverToggle(false)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--brass)',
              fontSize: '11px',
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline',
              fontFamily: 'system-ui, sans-serif',
              fontWeight: 500,
            }}
            title="Why this vendor matches your search"
          >
            Why this?
          </button>
          {popoverActive && result.reasoning && (
            <div
              style={{
                ...(isMobile ? styles.popoverInline : styles.popoverPullQuote),
                position: isMobile ? 'static' : 'absolute',
                bottom: isMobile ? 'auto' : '100%',
                marginBottom: isMobile ? 8 : 4,
                marginTop: isMobile ? 8 : 0,
              }}
            >
              {!isMobile && (
                <span style={{ color: 'var(--brass)', fontSize: '16px', marginRight: '4px' }}>
                  "
                </span>
              )}
              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  lineHeight: 1.4,
                  color: 'var(--graphite)',
                  fontStyle: 'italic',
                  fontFamily: "'Georgia', 'Fraunces', serif, system-ui",
                }}
              >
                {result.reasoning}
              </p>
            </div>
          )}
        </div>

        {/* Per-card CTA: brass token (NOT orange — orange is reserved for s11-5 Place Order) */}
        <button
          onClick={onToggleSelect}
          style={{
            ...styles.ctaButton,
            backgroundColor: selected ? 'var(--brass)' : '#FFFFFF',
            color: selected ? '#FFFFFF' : 'var(--brass)',
            borderColor: 'var(--brass)',
          }}
        >
          {selected ? 'Added' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}

/**
 * Design system tokens as CSS variables and computed styles.
 * Per moodboard v2: BKG heritage palette with peak-pair preservation.
 * All colors use var(--token) references from globals.css.
 */
const styles = {
  globalCss: `
    :root {
      --navy: #1B3B5E;
      --navy-deep: #0E2A47;
      --trace: #F4F0E6;
      --graphite: #2E2E30;
      --faded-rule: #C9C3B3;
      --brass: #B6873A;
      --redline: #A1473A;
      --robin: #7FCFCB;
      --orange: #D9642E;
    }
  `,
  container: {
    padding: '20px',
    backgroundColor: 'var(--trace)',
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
    paddingBottom: '75%',
    position: 'relative',
    backgroundColor: 'var(--trace)',
    overflow: 'hidden',
  } as React.CSSProperties,
  cardContent: {
    padding: '12px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  } as React.CSSProperties,
  ctaButton: {
    flex: 1,
    padding: '8px 12px',
    border: '1.5px solid var(--brass)',
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
    color: 'var(--graphite)',
    fontFamily: 'system-ui, sans-serif',
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
    color: 'var(--redline)',
    fontFamily: 'system-ui, sans-serif',
    margin: '0 0 12px 0',
  } as React.CSSProperties,
  retryButton: {
    padding: '8px 16px',
    backgroundColor: 'var(--redline)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '2px',
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: 'system-ui, sans-serif',
    fontWeight: 600,
    transition: 'all 0.2s ease',
  } as React.CSSProperties,
  // "Why this?" popover — pull-quote styling (desktop)
  popoverPullQuote: {
    backgroundColor: '#FFFFFF',
    border: '1.5px solid var(--faded-rule)',
    borderRadius: '2px',
    padding: '10px 8px',
    zIndex: 10,
    boxShadow: '0 4px 12px rgba(27, 59, 94, 0.15)',
    display: 'flex',
    gap: '4px',
    animation: 'popoverFadeIn 150ms ease-out',
  } as React.CSSProperties,
  // "Why this?" popover — inline styling (mobile)
  popoverInline: {
    backgroundColor: 'var(--trace)',
    border: '1.5px solid var(--faded-rule)',
    borderRadius: '2px',
    padding: '8px',
    zIndex: 10,
    boxShadow: 'none',
  } as React.CSSProperties,
} as const;
