'use client';

/**
 * RecentActivity
 * ==============
 * Typographic timeline with monospace time-ago on left, graphite summaries,
 * brass source-tags on right. Last 4 activities. Each specialist/broker activity
 * gets a trailing LearningBadge.
 */

import type { CSSProperties } from 'react';
import LearningBadge from '../LearningBadge';

interface Activity {
  ts: string;
  summary: string;
  source: string;
  type?: 'specialist' | 'broker-order' | 'other';
}

interface RecentActivityProps {
  activities: Activity[];
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  if (!activities || activities.length === 0) return null;

  const recent = activities.slice(0, 4);

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

  const timelineStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  const getTimeAgo = (ts: string): string => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={containerStyle} className="bkg-fade-up bkg-stagger-4">
      <div style={titleStyle}>Recent Activity</div>
      <div style={timelineStyle}>
        {recent.map((activity, index) => {
          const timeAgo = getTimeAgo(activity.ts);
          const sourceLabel = activity.source.split(' ')[0]; // "q11" from "q11 Supply Ordering"

          const itemStyle: CSSProperties = {
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-start',
            padding: '12px 0',
            borderBottom: index < recent.length - 1 ? '1px solid var(--faded-rule)' : 'none',
          };

          const timeStyle: CSSProperties = {
            flex: '0 0 auto',
            fontSize: '11px',
            fontFamily: "'SF Mono', 'Courier Prime', monospace",
            fontWeight: 500,
            color: 'var(--brass)',
            minWidth: '70px',
            opacity: 0.7,
            letterSpacing: '0.02em',
          };

          const summaryStyle: CSSProperties = {
            flex: 1,
            fontSize: '14px',
            color: 'var(--graphite)',
            fontFamily: 'var(--font-archivo)',
            lineHeight: 1.5,
            fontWeight: 500,
          };

          const sourceStyle: CSSProperties = {
            flex: '0 0 auto',
            fontSize: '9px',
            fontWeight: 600,
            color: 'var(--brass)',
            fontFamily: 'var(--font-archivo)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            opacity: 0.6,
            whiteSpace: 'nowrap',
          };

          const isLogged = activity.type === 'specialist' || activity.type === 'broker-order';

          return (
            <div key={`${activity.ts}-${index}`} style={itemStyle}>
              <div style={timeStyle}>{timeAgo}</div>
              <div style={summaryStyle}>{activity.summary}</div>
              {isLogged && <LearningBadge variant="activity" />}
              <div style={sourceStyle}>{sourceLabel}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
