'use client';

import type { VendorQuote } from '@/lib/resource-broker/vendors/types';

interface CostMatrixProps {
  quotes: VendorQuote[];
  cheapest: VendorQuote | null;
  fastest: VendorQuote | null;
  bestValue: VendorQuote | null;
}

/**
 * CostMatrix — Renders vendor quotes as a responsive table/card matrix.
 *
 * Design:
 * - Desktop: Full table with columns (Vendor, SKU, Unit Price, Ext Price, Availability, Lead Time, Delivery Fee, Quality, Confidence)
 * - Mobile: Stacked cards per vendor
 * - Highlighting: drafting-brass left border for cheapest, robin's egg check for fastest, crown for bestValue
 * - Confidence badges: solid = observed, dashed = web-search, muted = estimated
 * - Empty state: "No quotes returned — try broadening the query"
 */
export default function CostMatrix({
  quotes,
  cheapest,
  fastest,
  bestValue,
}: CostMatrixProps) {
  if (quotes.length === 0) {
    return (
      <div style={styles.emptyContainer}>
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
        <p style={styles.emptyText}>No quotes returned</p>
        <p style={styles.emptySubtext}>
          Try broadening your search, or these vendors don't stock this item.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{`
        ${styles.globalCss}
        @media (max-width: 768px) {
          .cost-matrix-table {
            display: none;
          }
          .cost-matrix-cards {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
        }
        @media (min-width: 769px) {
          .cost-matrix-table {
            display: table;
            width: 100%;
            border-collapse: collapse;
          }
          .cost-matrix-cards {
            display: none;
          }
        }
      `}</style>

      {/* Desktop: Table view */}
      <table className="cost-matrix-table" style={styles.table}>
        <thead>
          <tr style={styles.headerRow}>
            <th style={{ ...styles.headerCell, width: '12%' }}>Vendor</th>
            <th style={{ ...styles.headerCell, width: '18%' }}>SKU / Description</th>
            <th style={{ ...styles.headerCell, width: '10%', textAlign: 'right' }}>Unit Price</th>
            <th style={{ ...styles.headerCell, width: '10%', textAlign: 'right' }}>Ext Price</th>
            <th style={{ ...styles.headerCell, width: '12%' }}>Availability</th>
            <th style={{ ...styles.headerCell, width: '10%', textAlign: 'right' }}>Lead Time</th>
            <th style={{ ...styles.headerCell, width: '10%', textAlign: 'right' }}>Delivery</th>
            <th style={{ ...styles.headerCell, width: '12%' }}>Quality</th>
            <th style={{ ...styles.headerCell, width: '6%' }}>✓</th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((quote) => (
            <QuoteRow
              key={`${quote.vendor}-${quote.sku}`}
              quote={quote}
              isCheapest={cheapest?.vendor === quote.vendor && cheapest?.sku === quote.sku}
              isFastest={fastest?.vendor === quote.vendor && fastest?.sku === quote.sku}
              isBestValue={bestValue?.vendor === quote.vendor && bestValue?.sku === quote.sku}
            />
          ))}
        </tbody>
      </table>

      {/* Mobile: Card view */}
      <div className="cost-matrix-cards">
        {quotes.map((quote) => (
          <QuoteCard
            key={`${quote.vendor}-${quote.sku}`}
            quote={quote}
            isCheapest={cheapest?.vendor === quote.vendor && cheapest?.sku === quote.sku}
            isFastest={fastest?.vendor === quote.vendor && fastest?.sku === quote.sku}
            isBestValue={bestValue?.vendor === quote.vendor && bestValue?.sku === quote.sku}
          />
        ))}
      </div>
    </div>
  );
}

function QuoteRow({
  quote,
  isCheapest,
  isFastest,
  isBestValue,
}: {
  quote: VendorQuote;
  isCheapest: boolean;
  isFastest: boolean;
  isBestValue: boolean;
}) {
  const borderColor = isCheapest ? 'var(--brass)' : 'var(--faded-rule)';
  const bgColor = isCheapest ? 'rgba(182, 135, 58, 0.02)' : '#FFFFFF';
  const confidenceBorder =
    quote.confidence === 'web-search'
      ? '1px dashed var(--graphite)'
      : quote.confidence === 'estimated'
        ? '1px solid var(--faded-rule)'
        : '1px solid var(--graphite)';

  const leadTimeDisplay = quote.leadTimeDays === 0 ? 'In stock' : quote.leadTimeDays ? `${quote.leadTimeDays}d` : '—';
  const totalPrice = (quote.extendedPrice || 0) + (quote.deliveryFee || 0);

  return (
    <tr
      style={{
        ...styles.tableRow,
        backgroundColor: bgColor,
        borderLeft: `4px solid ${borderColor}`,
        borderBottom: `1px solid var(--faded-rule)`,
      }}
    >
      <td style={styles.tableCell}>
        <strong>{quote.vendor}</strong>
      </td>
      <td style={styles.tableCell}>
        <div style={{ fontSize: '12px' }}>{quote.sku}</div>
        <div style={{ fontSize: '11px', opacity: 0.7 }}>{quote.description}</div>
      </td>
      <td style={{ ...styles.tableCell, textAlign: 'right' }}>
        ${quote.unitPrice.toFixed(2)}
      </td>
      <td style={{ ...styles.tableCell, textAlign: 'right', fontWeight: 600 }}>
        ${totalPrice.toFixed(2)}
      </td>
      <td style={styles.tableCell}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: quote.availability === 'backordered' ? 'var(--redline)' : 'var(--graphite)',
          }}
        >
          {quote.availability}
        </span>
      </td>
      <td style={{ ...styles.tableCell, textAlign: 'right' }}>
        <span style={{ fontSize: '12px', fontWeight: isFastest ? 600 : 400 }}>
          {isFastest && '✓ '}
          {leadTimeDisplay}
        </span>
      </td>
      <td style={{ ...styles.tableCell, textAlign: 'right' }}>
        ${(quote.deliveryFee || 0).toFixed(2)}
      </td>
      <td style={styles.tableCell}>
        <div
          style={{
            fontSize: '10px',
            padding: '2px 4px',
            border: confidenceBorder,
            borderRadius: '2px',
            opacity: quote.confidence === 'estimated' ? 0.5 : 1,
          }}
        >
          {quote.qualityNotes || quote.confidence}
        </div>
      </td>
      <td style={{ ...styles.tableCell, textAlign: 'center' }}>
        {isBestValue && '👑'}
      </td>
    </tr>
  );
}

function QuoteCard({
  quote,
  isCheapest,
  isFastest,
  isBestValue,
}: {
  quote: VendorQuote;
  isCheapest: boolean;
  isFastest: boolean;
  isBestValue: boolean;
}) {
  const borderColor = isCheapest ? 'var(--brass)' : 'var(--faded-rule)';
  const totalPrice = (quote.extendedPrice || 0) + (quote.deliveryFee || 0);
  const leadTimeDisplay = quote.leadTimeDays === 0 ? 'In stock' : quote.leadTimeDays ? `${quote.leadTimeDays} days` : '—';

  return (
    <div
      style={{
        ...styles.card,
        borderLeft: `4px solid ${borderColor}`,
        backgroundColor: isCheapest ? 'rgba(182, 135, 58, 0.02)' : '#FFFFFF',
      }}
    >
      <div style={styles.cardHeader}>
        <h4 style={{ margin: 0, color: 'var(--navy)', fontSize: '14px', fontWeight: 600 }}>
          {quote.vendor}
        </h4>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isFastest && <span title="Fastest lead time">⚡</span>}
          {isBestValue && <span title="Best value">👑</span>}
        </div>
      </div>

      <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '8px' }}>
        {quote.sku}
      </div>

      <div style={{ fontSize: '12px', marginBottom: '12px' }}>{quote.description}</div>

      <div style={styles.cardRow}>
        <span>Unit Price:</span>
        <strong>${quote.unitPrice.toFixed(2)}</strong>
      </div>

      <div style={{ ...styles.cardRow, fontWeight: 600, fontSize: '14px' }}>
        <span>Total:</span>
        <strong>${totalPrice.toFixed(2)}</strong>
      </div>

      <div style={styles.cardRow}>
        <span>Availability:</span>
        <span style={{ color: quote.availability === 'backordered' ? 'var(--redline)' : 'var(--graphite)' }}>
          {quote.availability}
        </span>
      </div>

      <div style={styles.cardRow}>
        <span>Lead Time:</span>
        <span style={{ fontWeight: isFastest ? 600 : 400 }}>{leadTimeDisplay}</span>
      </div>

      <div style={styles.cardRow}>
        <span>Delivery Fee:</span>
        <span>${(quote.deliveryFee || 0).toFixed(2)}</span>
      </div>

      {quote.qualityNotes && (
        <div style={styles.cardRow}>
          <span>Quality:</span>
          <span>{quote.qualityNotes}</span>
        </div>
      )}

      <div style={{ marginTop: '8px', fontSize: '9px', opacity: 0.5, textTransform: 'uppercase' }}>
        {quote.confidence === 'observed' && 'Verified'}
        {quote.confidence === 'web-search' && 'Web-sourced — confirm at checkout'}
        {quote.confidence === 'estimated' && 'Estimated'}
      </div>
    </div>
  );
}

const styles = {
  globalCss: `
    :root {
      --navy: #1B3B5E;
      --trace: #F4F0E6;
      --graphite: #2E2E30;
      --faded-rule: #C9C3B3;
      --brass: #B6873A;
      --redline: #A1473A;
      --robin: #7FCFCB;
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
  } as React.CSSProperties,
  table: {
    backgroundColor: '#FFFFFF',
    borderCollapse: 'collapse' as const,
    marginTop: '12px',
  } as React.CSSProperties,
  headerRow: {
    borderBottom: '2px solid var(--navy)',
    backgroundColor: 'var(--trace)',
  } as React.CSSProperties,
  headerCell: {
    padding: '12px',
    textAlign: 'left' as const,
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--navy)',
    textTransform: 'uppercase' as const,
    borderBottom: '2px solid var(--navy)',
  } as React.CSSProperties,
  tableRow: {
    transition: 'background-color 0.2s ease',
  } as React.CSSProperties,
  tableCell: {
    padding: '12px',
    fontSize: '12px',
    color: 'var(--graphite)',
    borderBottom: '1px solid var(--faded-rule)',
    textAlign: 'left' as const,
  } as React.CSSProperties,
  card: {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--faded-rule)',
    borderRadius: '4px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(27, 59, 94, 0.1)',
  } as React.CSSProperties,
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  } as React.CSSProperties,
  cardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    marginBottom: '8px',
    color: 'var(--graphite)',
  } as React.CSSProperties,
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    backgroundColor: '#FFFFFF',
    borderRadius: '4px',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  emptyText: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--graphite)',
    margin: 0,
  } as React.CSSProperties,
  emptySubtext: {
    fontSize: '13px',
    color: 'var(--graphite)',
    opacity: 0.6,
    margin: '8px 0 0 0',
    maxWidth: '300px',
  } as React.CSSProperties,
} as const;
