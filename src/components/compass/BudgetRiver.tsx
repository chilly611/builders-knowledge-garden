'use client';

/**
 * BudgetRiver
 * ===========
 * Horizontal stacked bar showing spent (graphite), committed (brass), remaining (faded-rule outline).
 * Totals labeled above. Category breakdown below as two-column rows with mini progress bars.
 * Total height ≤ 240px.
 */

import type { CSSProperties } from 'react';

interface BudgetCategory {
  label: string;
  spent: number;
  budgeted: number;
}

interface BudgetRiverProps {
  totalBudget: number;
  totalSpent: number;
  totalCommitted: number;
  categories: BudgetCategory[];
}

export default function BudgetRiver({
  totalBudget,
  totalSpent,
  totalCommitted,
  categories,
}: BudgetRiverProps) {
  const remaining = totalBudget - totalCommitted;
  const sortedCats = categories.sort((a, b) => b.spent - a.spent).slice(0, 8);

  const containerStyle: CSSProperties = {
    padding: '0 24px 32px',
    maxWidth: '1200px',
    margin: '0 auto',
  };

  const titleStyle: CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--brass)',
    fontFamily: 'var(--font-archivo)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: '16px',
  };

  const riverWrapperStyle: CSSProperties = {
    marginBottom: '20px',
  };

  const barLabelsStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--graphite)',
    fontFamily: 'var(--font-archivo)',
    letterSpacing: '0.02em',
    marginBottom: '8px',
  };

  const barContainerStyle: CSSProperties = {
    display: 'flex',
    height: '24px',
    borderRadius: '4px',
    overflow: 'hidden',
    gap: '0',
  };

  const formatMoney = (n: number): string => {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}k`;
    return `$${Math.round(n)}`;
  };

  const spentPct = (totalSpent / totalBudget) * 100;
  const committedPct = ((totalCommitted - totalSpent) / totalBudget) * 100;
  const remainingPct = (remaining / totalBudget) * 100;

  return (
    <div style={containerStyle} className="bkg-fade-up bkg-stagger-2">
      <div style={titleStyle}>Budget River</div>

      <div style={riverWrapperStyle}>
        <div style={barLabelsStyle}>
          <span>Spent: {formatMoney(totalSpent)}</span>
          <span>Committed: {formatMoney(totalCommitted)}</span>
          <span>Remaining: {formatMoney(remaining)}</span>
        </div>
        <div style={barContainerStyle}>
          {totalSpent > 0 && (
            <div
              style={{
                flex: `0 0 ${spentPct}%`,
                backgroundColor: 'var(--graphite)',
                minWidth: '2px',
              }}
            />
          )}
          {totalCommitted > totalSpent && (
            <div
              style={{
                flex: `0 0 ${committedPct}%`,
                backgroundColor: 'var(--brass)',
                minWidth: '2px',
              }}
            />
          )}
          {remaining > 0 && (
            <div
              style={{
                flex: `0 0 ${remainingPct}%`,
                border: '1px solid var(--faded-rule)',
                backgroundColor: 'transparent',
              }}
            />
          )}
        </div>
      </div>

      {/* Category breakdown — 2 columns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
        }}
      >
        {sortedCats.map((cat) => {
          const catPct = (cat.spent / cat.budgeted) * 100;
          return (
            <div key={cat.label} style={{ fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span
                  style={{
                    fontWeight: 500,
                    color: 'var(--graphite)',
                    fontFamily: 'var(--font-archivo)',
                  }}
                >
                  {cat.label}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    color: 'var(--brass)',
                    fontFamily: 'var(--font-archivo)',
                    opacity: 0.7,
                  }}
                >
                  {Math.round(catPct)}%
                </span>
              </div>
              <div
                style={{
                  height: '4px',
                  backgroundColor: 'var(--faded-rule)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    backgroundColor: 'var(--graphite)',
                    width: `${Math.min(catPct, 100)}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
