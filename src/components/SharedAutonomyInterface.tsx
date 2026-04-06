'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

type AutonomyMode = 'watch' | 'assist' | 'autonomous';
type ActionStatus = 'pending' | 'success' | 'denied' | 'error';
type ProposalStatus = 'awaiting_approval' | 'approved' | 'rejected' | 'escalated';

interface AgentAction {
  id: string;
  agent_id: string;
  agent_name: string;
  action_type: string;
  timestamp: string;
  status: ActionStatus;
  autonomy_mode: AutonomyMode;
  description: string;
  reasoning?: string;
  source_citations?: string[];
  impact_estimate?: string;
  xp_earned?: number;
}

interface AgentProposal {
  id: string;
  agent_id: string;
  agent_name: string;
  proposal_text: string;
  reasoning: string;
  estimated_impact: string;
  created_at: string;
  status: ProposalStatus;
  escalation_time_remaining?: number;
}

interface AgentStats {
  actions_today: number;
  success_rate: number;
  xp_earned: number;
  total_agents_active: number;
}

interface AnomalyPattern {
  agent_id: string;
  agent_name: string;
  pattern_type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  detected_at: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const AUTONOMY_MODE_COLORS: Record<AutonomyMode, string> = {
  watch: '#378ADD',      // Blue
  assist: '#D85A30',     // Gold
  autonomous: '#7F77DD', // Purple
};

const STATUS_COLORS: Record<ActionStatus, string> = {
  success: '#1D9E75',    // Green
  denied: '#E8443A',     // Red
  error: '#E8443A',      // Red
  pending: '#D85A30',    // Gold
};

const ESCALATION_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// HOOK: Agent Activity Feed
// ============================================================================

const useAgentActivityFeed = () => {
  const [activities, setActivities] = useState<AgentAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async (filters?: {
    agent_id?: string;
    mode?: AutonomyMode;
    limit?: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters?.agent_id) params.append('agent_id', filters.agent_id);
      if (filters?.mode) params.append('mode', filters.mode);
      params.append('limit', String(filters?.limit || 50));

      const res = await fetch(`/api/v1/agents/activity?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to fetch activities: ${res.statusText}`);
      const data = await res.json();
      setActivities(data.activities || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error fetching activities:', message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(() => fetchActivities(), 3000);
    return () => clearInterval(interval);
  }, [fetchActivities]);

  return { activities, loading, error, refetch: fetchActivities };
};

// ============================================================================
// HOOK: Agent Proposals
// ============================================================================

const useAgentProposals = () => {
  const [proposals, setProposals] = useState<AgentProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/agents/proposals');
      if (!res.ok) throw new Error(`Failed to fetch proposals: ${res.statusText}`);
      const data = await res.json();
      setProposals(data.proposals || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error fetching proposals:', message);
    } finally {
      setLoading(false);
    }
  }, []);

  const respondToProposal = useCallback(
    async (proposalId: string, approved: boolean, feedback?: string) => {
      try {
        const res = await fetch(`/api/v1/agents/proposals/${proposalId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approved, feedback }),
        });
        if (!res.ok) throw new Error(`Failed to respond to proposal: ${res.statusText}`);
        await fetchProposals();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Error responding to proposal:', message);
        throw err;
      }
    },
    [fetchProposals],
  );

  useEffect(() => {
    fetchProposals();
    const interval = setInterval(() => fetchProposals(), 2000);
    return () => clearInterval(interval);
  }, [fetchProposals]);

  return { proposals, loading, error, respondToProposal, refetch: fetchProposals };
};

// ============================================================================
// COMPONENT: Activity Feed Entry
// ============================================================================

interface ActivityFeedEntryProps {
  action: AgentAction;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const ActivityFeedEntry: React.FC<ActivityFeedEntryProps> = ({
  action,
  isExpanded,
  onToggleExpand,
}) => {
  const modeColor = AUTONOMY_MODE_COLORS[action.autonomy_mode];
  const statusColor = STATUS_COLORS[action.status];
  const time = new Date(action.timestamp).toLocaleTimeString();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="mb-3 border-l-4 bg-white p-3 rounded-r-md shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      style={{ borderColor: modeColor }}
      onClick={onToggleExpand}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-gray-900">{action.agent_name}</span>
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: statusColor }}
              title={action.status}
            />
            <span className="text-xs text-gray-500">{time}</span>
          </div>
          <p className="text-sm text-gray-700 mt-1">{action.action_type}</p>
          <p className="text-xs text-gray-600 mt-1">{action.description}</p>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          className="text-gray-500 ml-2 flex-shrink-0"
        >
          ▼
        </motion.div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-gray-200"
          >
            {action.reasoning && (
              <div className="mb-2">
                <p className="text-xs font-semibold text-gray-700 mb-1">Reasoning:</p>
                <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">{action.reasoning}</p>
              </div>
            )}
            {action.source_citations && action.source_citations.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-semibold text-gray-700 mb-1">Sources:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {action.source_citations.map((citation, i) => (
                    <li key={i} className="bg-gray-50 p-1 rounded">
                      • {citation}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {action.impact_estimate && (
              <p className="text-xs text-gray-600">
                <strong>Impact:</strong> {action.impact_estimate}
              </p>
            )}
            {action.xp_earned && (
              <p className="text-xs font-semibold" style={{ color: '#D85A30' }}>
                +{action.xp_earned} XP
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============================================================================
// COMPONENT: Watch Mode Panel
// ============================================================================

interface WatchModePanelProps {
  activities: AgentAction[];
  loading: boolean;
}

const WatchModePanel: React.FC<WatchModePanelProps> = ({ activities, loading }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const watchActivities = activities.filter((a) => a.autonomy_mode === 'watch');
  const filtered =
    selectedAgent && selectedAgent !== 'all'
      ? watchActivities.filter((a) => a.agent_id === selectedAgent)
      : watchActivities;

  const agents = Array.from(new Set(watchActivities.map((a) => a.agent_id)));

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
        <h3 className="font-bold text-gray-900 mb-1">What is this agent doing?</h3>
        <p className="text-sm text-gray-700">
          Observing agent actions in real-time. All decisions are logged with full reasoning chains
          and source citations.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setSelectedAgent(null)}
          className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
            selectedAgent === null
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Agents
        </button>
        {agents.map((agentId) => (
          <button
            key={agentId}
            onClick={() => setSelectedAgent(agentId)}
            className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
              selectedAgent === agentId
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {agentId}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-gray-500">Loading...</p>}

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500">No watch mode activities yet.</p>
        ) : (
          filtered.map((action) => (
            <ActivityFeedEntry
              key={action.id}
              action={action}
              isExpanded={expandedId === action.id}
              onToggleExpand={() => setExpandedId(expandedId === action.id ? null : action.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENT: Assist Mode Panel
// ============================================================================

interface AssistModePanelProps {
  proposals: AgentProposal[];
  loading: boolean;
  onRespond: (id: string, approved: boolean) => Promise<void>;
}

const AssistModePanel: React.FC<AssistModePanelProps> = ({ proposals, loading, onRespond }) => {
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);

  const pending = proposals.filter((p) => p.status === 'awaiting_approval');
  const escalated = pending.filter((p) => {
    if (!p.escalation_time_remaining) return false;
    return p.escalation_time_remaining > 0 && p.escalation_time_remaining <= 60;
  });

  const handleRespond = async (proposalId: string, approved: boolean) => {
    setRespondingId(proposalId);
    try {
      await onRespond(proposalId, approved);
      setSelectedProposalId(null);
      setFeedback('');
    } catch (err) {
      console.error('Error responding to proposal:', err);
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded">
        <h3 className="font-bold text-gray-900 mb-1">Pending Approvals</h3>
        <p className="text-sm text-gray-700">
          Review agent proposals and approve or reject them. Proposals awaiting more than 5 min are
          highlighted.
        </p>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading proposals...</p>}

      {pending.length === 0 ? (
        <p className="text-sm text-gray-500">No pending proposals.</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {pending.map((proposal) => {
            const isEscalated = escalated.some((p) => p.id === proposal.id);
            return (
              <motion.div
                key={proposal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border-2 rounded-lg p-3 ${
                  isEscalated
                    ? 'border-amber-400 bg-amber-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-sm text-gray-900">{proposal.agent_name}</p>
                    <p className="text-sm text-gray-700 mt-1">{proposal.proposal_text}</p>
                    <p className="text-xs text-gray-600 mt-2">
                      <strong>Why:</strong> {proposal.reasoning}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      <strong>Impact:</strong> {proposal.estimated_impact}
                    </p>
                    {isEscalated && (
                      <p className="text-xs font-semibold text-amber-700 mt-2">
                        ⚠️ Awaiting approval for {proposal.escalation_time_remaining}+ seconds
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      setSelectedProposalId(
                        selectedProposalId === proposal.id ? null : proposal.id,
                      )
                    }
                    className="text-gray-500 hover:text-gray-700 ml-2 flex-shrink-0"
                  >
                    {selectedProposalId === proposal.id ? '✕' : '→'}
                  </button>
                </div>

                <AnimatePresence>
                  {selectedProposalId === proposal.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-gray-200 space-y-2"
                    >
                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Optional feedback..."
                        className="w-full text-xs p-2 border border-gray-200 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRespond(proposal.id, true)}
                          disabled={respondingId === proposal.id}
                          className="flex-1 px-3 py-2 text-xs font-bold text-white rounded bg-green-500 hover:bg-green-600 disabled:opacity-50"
                        >
                          {respondingId === proposal.id ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleRespond(proposal.id, false)}
                          disabled={respondingId === proposal.id}
                          className="flex-1 px-3 py-2 text-xs font-bold text-white rounded bg-red-500 hover:bg-red-600 disabled:opacity-50"
                        >
                          {respondingId === proposal.id ? 'Processing...' : 'Reject'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// COMPONENT: Autonomous Mode Dashboard
// ============================================================================

interface AutonomousDashboardProps {
  activities: AgentAction[];
  stats: AgentStats;
  anomalies: AnomalyPattern[];
  loading: boolean;
}

const AutonomousDashboard: React.FC<AutonomousDashboardProps> = ({
  activities,
  stats,
  anomalies,
  loading,
}) => {
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);

  const autonomousActions = activities.filter((a) => a.autonomy_mode === 'autonomous');
  const successRate = Math.round(stats.success_rate * 100);

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded"
        >
          <p className="text-xs text-gray-600">Today's Actions</p>
          <p className="text-2xl font-bold text-purple-700">{stats.actions_today}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-green-50 border-l-4 border-green-400 p-4 rounded"
        >
          <p className="text-xs text-gray-600">Success Rate</p>
          <p className="text-2xl font-bold text-green-700">{successRate}%</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded"
        >
          <p className="text-xs text-gray-600">XP Earned</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.xp_earned}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded"
        >
          <p className="text-xs text-gray-600">Active Agents</p>
          <p className="text-2xl font-bold text-blue-700">{stats.total_agents_active}</p>
        </motion.div>
      </div>

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded space-y-2">
          <p className="font-bold text-amber-900">Anomalies Detected</p>
          {anomalies.map((anomaly) => (
            <div key={`${anomaly.agent_id}-${anomaly.pattern_type}`} className="text-sm">
              <p className="font-semibold text-amber-800">{anomaly.agent_name}</p>
              <p className="text-xs text-amber-700">{anomaly.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Action Timeline */}
      <div className="space-y-2">
        <h4 className="font-bold text-gray-900">Completed Actions</h4>
        {loading && <p className="text-sm text-gray-500">Loading...</p>}
        {autonomousActions.length === 0 ? (
          <p className="text-sm text-gray-500">No autonomous actions yet.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {autonomousActions.map((action) => (
              <ActivityFeedEntry
                key={action.id}
                action={action}
                isExpanded={expandedActionId === action.id}
                onToggleExpand={() =>
                  setExpandedActionId(expandedActionId === action.id ? null : action.id)
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENT: Kill Switch Modal
// ============================================================================

interface KillSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isProcessing: boolean;
}

const KillSwitchModal: React.FC<KillSwitchModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isProcessing,
}) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-lg p-6 max-w-sm shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900 mb-2">Emergency Kill Switch</h2>
        <p className="text-sm text-gray-700 mb-4">
          This will immediately revoke all agent permissions and halt all autonomous actions. This
          action cannot be undone.
        </p>
        <p className="text-sm font-semibold text-red-600 mb-6">Are you absolutely sure?</p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 text-sm font-bold text-gray-700 rounded border-2 border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 text-sm font-bold text-white rounded bg-red-600 hover:bg-red-700 disabled:opacity-50"
          >
            {isProcessing ? 'Revoking...' : 'Revoke All'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SharedAutonomyInterface: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<AutonomyMode>('watch');
  const [showKillSwitch, setShowKillSwitch] = useState(false);
  const [killSwitchProcessing, setKillSwitchProcessing] = useState(false);

  const { activities, loading: activitiesLoading, refetch: refetchActivities } =
    useAgentActivityFeed();
  const { proposals, loading: proposalsLoading, respondToProposal: onRespond } = useAgentProposals();

  // Mock stats and anomalies (in production, fetch these)
  const stats: AgentStats = {
    actions_today: activities.length,
    success_rate: activities.length > 0
      ? activities.filter((a) => a.status === 'success').length / activities.length
      : 0,
    xp_earned: activities.reduce((sum, a) => sum + (a.xp_earned || 0), 0),
    total_agents_active: new Set(activities.map((a) => a.agent_id)).size,
  };

  const anomalies: AnomalyPattern[] = []; // Mock: would fetch from API

  const handleKillSwitch = async () => {
    setKillSwitchProcessing(true);
    try {
      const res = await fetch('/api/v1/agents/kill', { method: 'POST' });
      if (!res.ok) throw new Error(`Kill switch failed: ${res.statusText}`);
      setShowKillSwitch(false);
      await refetchActivities();
    } catch (err) {
      console.error('Kill switch error:', err);
      alert('Kill switch failed. Please try again.');
    } finally {
      setKillSwitchProcessing(false);
    }
  };

  const tabs: Array<{ id: AutonomyMode; label: string }> = [
    { id: 'watch', label: 'Watch' },
    { id: 'assist', label: 'Assist' },
    { id: 'autonomous', label: 'Autonomous' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Shared Autonomy Interface</h1>
            <p className="text-sm text-gray-600 mt-1">Observe, approve, and manage AI agent actions</p>
          </div>
          <motion.button
            onClick={() => setShowKillSwitch(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-3 text-sm font-bold text-white rounded-lg bg-red-600 hover:bg-red-700 shadow-md"
          >
            🛑 Kill Switch
          </motion.button>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Tabs & Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Tab Navigation */}
            <div className="flex gap-2 border-b-2 border-gray-200">
              {tabs.map((tab) => (
                <motion.button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`px-4 py-3 text-sm font-bold transition-colors relative ${
                    currentTab === tab.id
                      ? 'text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                  {currentTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                    />
                  )}
                </motion.button>
              ))}
            </div>

            {/* Tab Content */}
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
            >
              {currentTab === 'watch' && (
                <WatchModePanel activities={activities} loading={activitiesLoading} />
              )}
              {currentTab === 'assist' && (
                <AssistModePanel
                  proposals={proposals}
                  loading={proposalsLoading}
                  onRespond={onRespond}
                />
              )}
              {currentTab === 'autonomous' && (
                <AutonomousDashboard
                  activities={activities}
                  stats={stats}
                  anomalies={anomalies}
                  loading={activitiesLoading}
                />
              )}
            </motion.div>
          </div>

          {/* Right Panel: Activity Feed */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 max-h-screen overflow-hidden flex flex-col">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-900">Real-time Activity</h3>
              <p className="text-xs text-gray-500">All agent actions</p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {activitiesLoading && activities.length === 0 ? (
                <p className="text-xs text-gray-500">Loading activities...</p>
              ) : activities.length === 0 ? (
                <p className="text-xs text-gray-500">No activities yet.</p>
              ) : (
                activities.slice(0, 20).map((action) => (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="pb-2 border-b border-gray-100 last:border-b-0"
                  >
                    <p className="text-xs font-semibold text-gray-900">{action.agent_name}</p>
                    <p className="text-xs text-gray-600 truncate">{action.action_type}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: AUTONOMY_MODE_COLORS[action.autonomy_mode] }}
                      />
                      <span className="text-xs text-gray-500">
                        {new Date(action.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Kill Switch Modal */}
      <AnimatePresence>
        <KillSwitchModal
          isOpen={showKillSwitch}
          onClose={() => setShowKillSwitch(false)}
          onConfirm={handleKillSwitch}
          isProcessing={killSwitchProcessing}
        />
      </AnimatePresence>
    </div>
  );
};

export default SharedAutonomyInterface;
