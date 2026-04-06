'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface AttentionItem {
  id: string;
  project_id: string;
  client_name: string;
  project_name: string;
  why_it_needs_attention: string;
  suggested_action: string;
  urgency_level: 'celebration' | 'good_news' | 'heads_up' | 'needs_you';
  action_type: 'send_followup' | 'schedule_call' | 'review_proposal' | 'check_timeline';
}

interface MetricsData {
  active_projects_count: number;
  active_projects_trend: number;
  pipeline_value: number;
  pipeline_trend: number;
  win_rate: number;
  win_rate_trend: number;
  average_project_duration_days: number;
  duration_trend: number;
  revenue_this_month: number;
  revenue_trend: number;
}

interface TimelineEntry {
  id: string;
  date: string;
  client: string;
  project: string;
  type: 'call' | 'email' | 'meeting' | 'site_visit';
  notes: string;
  insight?: string;
}

interface PipelineStage {
  stage: string;
  label: string;
  count: number;
  total_value: number;
  overdue_count: number;
}

// Brand colors
const COLORS = {
  green: '#1D9E75',
  gold: '#D85A30',
  red: '#E8443A',
  purple: '#7F77DD',
  blue: '#378ADD',
  orange: '#BA7517',
  light_bg: '#FAFAF8',
  border: '#E8E8E6',
  text_dark: '#1A1A1A',
  text_light: '#666666',
};

const URGENCY_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  celebration: {
    bg: '#FFF4E6',
    text: COLORS.gold,
    icon: '🎉',
  },
  good_news: {
    bg: '#E8F5E9',
    text: COLORS.green,
    icon: '✨',
  },
  heads_up: {
    bg: '#FFF3E0',
    text: COLORS.orange,
    icon: '⚠️',
  },
  needs_you: {
    bg: '#FFEBEE',
    text: COLORS.red,
    icon: '🔴',
  },
};

const INTERACTION_ICONS: Record<string, string> = {
  call: '📞',
  email: '📧',
  meeting: '👥',
  site_visit: '📍',
};

// Metric Card Component
const MetricCard: React.FC<{
  label: string;
  value: string | number;
  trend?: number;
  unit?: string;
  color?: string;
}> = ({ label, value, trend, unit, color = COLORS.green }) => {
  const isPositive = trend ? trend >= 0 : false;
  const trendColor = isPositive ? COLORS.green : COLORS.red;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        background: COLORS.light_bg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '8px',
        padding: '16px',
        flex: 1,
        minWidth: '160px',
      }}
    >
      <div style={{ fontSize: '12px', color: COLORS.text_light, marginBottom: '8px' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
        <div style={{ fontSize: '24px', fontWeight: '700', color: COLORS.text_dark }}>
          {value}
        </div>
        {unit && (
          <div style={{ fontSize: '12px', color: COLORS.text_light }}>
            {unit}
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div style={{ fontSize: '12px', color: trendColor, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>{isPositive ? '↑' : '↓'}</span>
          <span>{Math.abs(trend)}% vs last period</span>
        </div>
      )}
    </motion.div>
  );
};

// Attention Queue Item Component
const AttentionQueueItem: React.FC<{
  item: AttentionItem;
  onAction: (action: string, itemId: string) => void;
  onResolve: (itemId: string) => void;
}> = ({ item, onAction, onResolve }) => {
  const urgencyStyle = URGENCY_COLORS[item.urgency_level];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      style={{
        background: urgencyStyle.bg,
        border: `2px solid ${urgencyStyle.text}`,
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '12px',
      }}
    >
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{ fontSize: '24px', minWidth: '32px' }}>
          {urgencyStyle.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: COLORS.text_dark, marginBottom: '4px' }}>
            {item.client_name} — {item.project_name}
          </div>
          <div style={{ fontSize: '13px', color: COLORS.text_dark, marginBottom: '8px', lineHeight: '1.4' }}>
            {item.why_it_needs_attention}
          </div>
          <div style={{ fontSize: '12px', color: COLORS.text_light, marginBottom: '12px', fontStyle: 'italic' }}>
            Suggested: {item.suggested_action}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onAction('send_followup', item.id)}
              style={{
                padding: '8px 12px',
                background: urgencyStyle.text,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              {item.action_type === 'send_followup' && '📧 Send Follow-up'}
              {item.action_type === 'schedule_call' && '📞 Schedule Call'}
              {item.action_type === 'review_proposal' && '📋 Review Proposal'}
              {item.action_type === 'check_timeline' && '⏳ Check Timeline'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onResolve(item.id)}
              style={{
                padding: '8px 12px',
                background: 'transparent',
                color: urgencyStyle.text,
                border: `1px solid ${urgencyStyle.text}`,
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Resolve
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Timeline Component
const ClientTimeline: React.FC<{
  entries: TimelineEntry[];
  selectedFilter?: string;
}> = ({ entries, selectedFilter }) => {
  const filtered = selectedFilter
    ? entries.filter((e) => e.type === selectedFilter)
    : entries;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      style={{
        flex: 1,
      }}
    >
      <div style={{ fontSize: '14px', fontWeight: '700', color: COLORS.text_dark, marginBottom: '16px' }}>
        Client Timeline ({filtered.length})
      </div>
      <div
        style={{
          position: 'relative',
          paddingLeft: '24px',
        }}
      >
        {/* Vertical line */}
        <div
          style={{
            position: 'absolute',
            left: '6px',
            top: 0,
            bottom: 0,
            width: '2px',
            background: COLORS.border,
          }}
        />

        {filtered.map((entry, index) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            style={{
              marginBottom: '20px',
              position: 'relative',
            }}
          >
            {/* Timeline dot */}
            <div
              style={{
                position: 'absolute',
                left: '-24px',
                top: '2px',
                width: '16px',
                height: '16px',
                background: COLORS.light_bg,
                border: `3px solid ${COLORS.blue}`,
                borderRadius: '50%',
              }}
            />

            {/* Entry card */}
            <div
              style={{
                background: COLORS.light_bg,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '6px',
                padding: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: COLORS.text_dark }}>
                  {INTERACTION_ICONS[entry.type]} {entry.client} • {entry.project}
                </div>
                <div style={{ fontSize: '11px', color: COLORS.text_light }}>
                  {new Date(entry.date).toLocaleDateString()}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: COLORS.text_dark, marginBottom: '6px' }}>
                {entry.notes}
              </div>
              {entry.insight && (
                <div
                  style={{
                    fontSize: '11px',
                    color: COLORS.orange,
                    fontStyle: 'italic',
                    padding: '6px',
                    background: '#FFF3E0',
                    borderRadius: '4px',
                  }}
                >
                  💡 {entry.insight}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// Pipeline Tracker Component
const PipelineTracker: React.FC<{
  stages: PipelineStage[];
}> = ({ stages }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.15 }}
      style={{
        marginTop: '24px',
        background: COLORS.light_bg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '8px',
        padding: '20px',
      }}
    >
      <div style={{ fontSize: '14px', fontWeight: '700', color: COLORS.text_dark, marginBottom: '16px' }}>
        Lead-to-Warranty Pipeline
      </div>
      <div
        style={{
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          paddingBottom: '8px',
        }}
      >
        {stages.map((stage, index) => (
          <motion.div
            key={stage.stage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            style={{
              minWidth: '140px',
              background: 'white',
              border: `2px solid ${COLORS.border}`,
              borderRadius: '8px',
              padding: '12px',
              textAlign: 'center',
              cursor: 'grab',
              position: 'relative',
            }}
          >
            {stage.overdue_count > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  background: COLORS.red,
                  color: 'white',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '700',
                }}
              >
                {stage.overdue_count}
              </div>
            )}
            <div style={{ fontSize: '12px', fontWeight: '600', color: COLORS.text_dark, marginBottom: '8px' }}>
              {stage.label}
            </div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: COLORS.green, marginBottom: '4px' }}>
              {stage.count}
            </div>
            <div style={{ fontSize: '11px', color: COLORS.text_light }}>
              ${(stage.total_value / 1000).toFixed(0)}k
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// Quick Actions Bar Component
const QuickActionsBar: React.FC<{
  onLogInteraction: () => void;
  onGenerateProposal: () => void;
  onScheduleFollowup: () => void;
}> = ({ onLogInteraction, onGenerateProposal, onScheduleFollowup }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        marginBottom: '24px',
      }}
    >
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onLogInteraction}
        style={{
          padding: '12px 16px',
          background: COLORS.green,
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        📝 Log Interaction
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onGenerateProposal}
        style={{
          padding: '12px 16px',
          background: COLORS.blue,
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        ✨ Generate Proposal
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onScheduleFollowup}
        style={{
          padding: '12px 16px',
          background: COLORS.purple,
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        📅 Schedule Follow-up
      </motion.button>
    </motion.div>
  );
};

// Main CRM Dashboard Component
export default function CRMDashboard() {
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedItems, setResolvedItems] = useState<Set<string>>(new Set());
  const [timelineFilter, setTimelineFilter] = useState<string | undefined>();

  useEffect(() => {
    fetchCRMData();
  }, []);

  const fetchCRMData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch attention queue
      const attentionRes = await fetch('/api/v1/crm/attention');
      if (!attentionRes.ok) throw new Error('Failed to fetch attention queue');
      const attentionData = await attentionRes.json();
      setAttentionItems(attentionData.items || []);

      // Fetch metrics
      const metricsRes = await fetch('/api/v1/crm/metrics');
      if (!metricsRes.ok) throw new Error('Failed to fetch metrics');
      const metricsData = await metricsRes.json();
      setMetrics(metricsData);

      // Fetch timeline
      const timelineRes = await fetch('/api/v1/crm/timeline');
      if (!timelineRes.ok) throw new Error('Failed to fetch timeline');
      const timelineData = await timelineRes.json();
      setTimeline(timelineData.timeline || []);

      // Fetch pipeline
      const pipelineRes = await fetch('/api/v1/crm/pipeline');
      if (!pipelineRes.ok) throw new Error('Failed to fetch pipeline');
      const pipelineData = await pipelineRes.json();
      setPipeline(pipelineData.pipeline || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveItem = async (itemId: string) => {
    setResolvedItems((prev) => new Set(prev).add(itemId));
    setAttentionItems((prev) => prev.filter((item) => item.id !== itemId));

    try {
      await fetch('/api/v1/crm/attention', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attention_id: itemId }),
      });
    } catch (err) {
      console.error('Failed to resolve item:', err);
    }
  };

  const handleAction = (action: string, itemId: string) => {
    console.log(`Action: ${action}, Item: ${itemId}`);
    // Implement action handlers
  };

  const handleLogInteraction = () => {
    console.log('Log interaction clicked');
    // Open modal for logging interaction
  };

  const handleGenerateProposal = () => {
    console.log('Generate proposal clicked');
    // Open proposal generation modal
  };

  const handleScheduleFollowup = () => {
    console.log('Schedule followup clicked');
    // Open scheduling modal
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '400px',
          color: COLORS.text_light,
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1 }}
        >
          ⚙️
        </motion.div>
        <span style={{ marginLeft: '8px' }}>Loading CRM Dashboard...</span>
      </div>
    );
  }

  return (
    <div
      style={{
        background: COLORS.light_bg,
        minHeight: '100vh',
        padding: '32px',
        fontFamily: 'Archivo, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          marginBottom: '32px',
        }}
      >
        <h1 style={{ fontSize: '32px', fontWeight: '800', color: COLORS.text_dark, margin: '0 0 8px 0' }}>
          Command Center
        </h1>
        <p style={{ fontSize: '14px', color: COLORS.text_light, margin: 0 }}>
          AI-powered CRM with real-time attention queue
        </p>
      </motion.div>

      {/* Quick Actions */}
      <QuickActionsBar
        onLogInteraction={handleLogInteraction}
        onGenerateProposal={handleGenerateProposal}
        onScheduleFollowup={handleScheduleFollowup}
      />

      {/* AI Attention Queue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        style={{
          marginBottom: '32px',
        }}
      >
        <div style={{ fontSize: '16px', fontWeight: '700', color: COLORS.text_dark, marginBottom: '16px' }}>
          🤖 AI Attention Queue
        </div>
        <div style={{ fontSize: '13px', color: COLORS.text_light, marginBottom: '16px' }}>
          Here's what needs your attention today
        </div>

        {attentionItems.length === 0 ? (
          <div
            style={{
              background: 'white',
              border: `1px solid ${COLORS.border}`,
              borderRadius: '8px',
              padding: '24px',
              textAlign: 'center',
              color: COLORS.text_light,
            }}
          >
            ✨ All clear! No items requiring immediate attention.
          </div>
        ) : (
          <AnimatePresence>
            {attentionItems
              .filter((item) => !resolvedItems.has(item.id))
              .map((item) => (
                <AttentionQueueItem
                  key={item.id}
                  item={item}
                  onAction={handleAction}
                  onResolve={handleResolveItem}
                />
              ))}
          </AnimatePresence>
        )}
      </motion.div>

      {/* Business Pulse Metrics */}
      {metrics && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          style={{
            marginBottom: '32px',
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: '700', color: COLORS.text_dark, marginBottom: '16px' }}>
            📊 Business Pulse
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '12px',
            }}
          >
            <MetricCard
              label="Active Projects"
              value={metrics.active_projects_count}
              trend={metrics.active_projects_trend}
              color={COLORS.green}
            />
            <MetricCard
              label="Pipeline Value"
              value={`$${(metrics.pipeline_value / 1000).toFixed(0)}k`}
              trend={metrics.pipeline_trend}
              color={COLORS.blue}
            />
            <MetricCard
              label="Win Rate"
              value={`${metrics.win_rate.toFixed(1)}%`}
              trend={metrics.win_rate_trend}
              color={COLORS.gold}
            />
            <MetricCard
              label="Avg Duration"
              value={metrics.average_project_duration_days}
              trend={metrics.duration_trend}
              unit="days"
              color={COLORS.purple}
            />
            <MetricCard
              label="Revenue (Month)"
              value={`$${(metrics.revenue_this_month / 1000).toFixed(0)}k`}
              trend={metrics.revenue_trend}
              color={COLORS.orange}
            />
          </div>
        </motion.div>
      )}

      {/* Main Content Area */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 300px',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Timeline */}
        <ClientTimeline entries={timeline} selectedFilter={timelineFilter} />

        {/* Sidebar */}
        <div>
          {/* Timeline Filter */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            style={{
              marginBottom: '20px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: '600', color: COLORS.text_light, marginBottom: '8px' }}>
              Filter by Type
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { value: undefined, label: 'All' },
                { value: 'call', label: '📞 Calls' },
                { value: 'email', label: '📧 Emails' },
                { value: 'meeting', label: '👥 Meetings' },
                { value: 'site_visit', label: '📍 Site Visits' },
              ].map((filter) => (
                <motion.button
                  key={filter.label}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setTimelineFilter(filter.value as any)}
                  style={{
                    padding: '8px 12px',
                    background: timelineFilter === filter.value ? COLORS.green : 'white',
                    color: timelineFilter === filter.value ? 'white' : COLORS.text_dark,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {filter.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Pipeline Tracker */}
      {pipeline.length > 0 && <PipelineTracker stages={pipeline} />}

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            background: '#FFEBEE',
            border: `1px solid ${COLORS.red}`,
            borderRadius: '8px',
            padding: '16px',
            marginTop: '24px',
            color: COLORS.red,
            fontSize: '13px',
          }}
        >
          ⚠️ Error: {error}
        </motion.div>
      )}
    </div>
  );
}
