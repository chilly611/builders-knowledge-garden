'use client';

/**
 * OpenItems
 * =========
 * Typographic numbered list with priority glyph.
 * Ordered high → med → low.
 */

import type { CSSProperties } from 'react';

interface OpenItem {
  priority: 'high' | 'med' | 'low';
  label: string;
  dueBy?: string;
}

interface OpenItemsProps {
  items: OpenItem[];
}

export default function OpenItems({ items }: OpenItemsProps) {
  if (!items || items.length === 0) return null;

  const sorted = items.sort((a, b) => {
    const priorityOrder: Record<string, number> = { high: 0, med: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

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

  const listStyle: CSSProperties = {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high':
        return 'var(--brass)';
      case 'med':
        return 'var(--graphite)';
      case 'low':
        return 'var(--graphite)';
      default:
        return 'var(--graphite)';
    }
  };

  const getPriorityOpacity = (priority: string): number => {
    switch (priority) {
      case 'high':
        return 1;
      case 'med':
        return 0.8;
      case 'low':
        return 0.6;
      default:
        return 1;
    }
  };

  const formatDueDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return 'overdue';
    if (days === 0) return 'today';
    if (days === 1) return 'tomorrow';
    if (days <= 7) return `${days}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={containerStyle} className="bkg-fade-up bkg-stagger-3">
      <div style={titleStyle}>What&apos;s Open</div>
      <ul style={listStyle}>
        {sorted.map((item, index) => {
          const color = getPriorityColor(item.priority);
          const opacity = getPriorityOpacity(item.priority);

          const itemStyle: CSSProperties = {
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '12px 0',
            borderBottom: index < sorted.length - 1 ? '1px solid var(--faded-rule)' : 'none',
          };

          const numberStyle: CSSProperties = {
            fontSize: '13px',
            fontWeight: 600,
            color,
            fontFamily: 'var(--font-archivo)',
            minWidth: '20px',
            opacity,
          };

          const labelStyle: CSSProperties = {
            flex: 1,
            fontSize: '14px',
            color: 'var(--graphite)',
            fontFamily: 'var(--font-archivo)',
            lineHeight: 1.4,
            opacity: opacity * 1.2,
            fontWeight: 500,
          };

          const dueDateStyle: CSSProperties = {
            fontSize: '11px',
            color: 'var(--brass)',
            fontFamily: 'var(--font-archivo)',
            letterSpacing: '0.03em',
            whiteSpace: 'nowrap',
            opacity: 0.7,
          };

          return (
            <li key={`${item.label}-${index}`} style={itemStyle}>
              <span style={numberStyle}>{index + 1}</span>
              <span style={labelStyle}>{item.label}</span>
              {item.dueBy && <span style={dueDateStyle}>{formatDueDate(item.dueBy)}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
