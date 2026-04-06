'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import { ChevronDown, ChevronUp, Shield, AlertCircle, CheckCircle, Download, Filter } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================================================
// Type Definitions
// ============================================================================

interface ProvenanceNode {
  type: 'query' | 'entity' | 'analysis' | 'response';
  label: string;
  timestamp: string;
  source?: string;
  details?: Record<string, any>;
}

interface SourceEntity {
  id: string;
  name: string;
  type: string;
  verified: boolean;
}

interface HallucinationGuardProps {
  sourceCount: number;
  inferenceLevel: 'direct' | 'partial' | 'creative';
  onClick?: () => void;
}

interface DecisionExplainerProps {
  actionId: string;
  expanded?: boolean;
}

interface AuditTrailEntry {
  id: string;
  timestamp: string;
  agent_id: string;
  action_type: string;
  action_details: Record<string, any>;
  entity_references: string[];
  hash_chain: string;
  hash_previous: string;
  chain_valid: boolean;
  confidence_level: 'high' | 'medium' | 'low';
}

interface ProvenanceTrailProps {
  entityId: string;
}

interface AuditTrailViewerProps {
  pageSize?: number;
  onAuditClick?: (entry: AuditTrailEntry) => void;
}

// ============================================================================
// Hallucination Guard Badge Component
// ============================================================================

export function HallucinationGuard({
  sourceCount,
  inferenceLevel,
  onClick,
}: HallucinationGuardProps) {
  const shieldConfig = {
    direct: { color: '#1D9E75', label: 'Fully Sourced', bgColor: 'bg-emerald-50' },
    partial: { color: '#D85A30', label: 'Partially Sourced', bgColor: 'bg-orange-50' },
    creative: { color: '#E8443A', label: 'Creative Generation', bgColor: 'bg-red-50' },
  };

  const config = shieldConfig[inferenceLevel];

  return (
    <motion.button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${config.bgColor} transition-all hover:shadow-md`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Shield size={16} style={{ color: config.color }} fill={config.color} />
      <span style={{ color: config.color }}>{config.label}</span>
      {sourceCount > 0 && (
        <span className="text-xs px-1.5 py-0.5 rounded-full ml-1" style={{ backgroundColor: config.color, color: 'white' }}>
          {sourceCount}
        </span>
      )}
    </motion.button>
  );
}

// ============================================================================
// Provenance Trail Widget Component
// ============================================================================

export function ProvenanceTrail({ entityId }: ProvenanceTrailProps) {
  const [chain, setChain] = useState<ProvenanceNode[]>([]);
  const [entities, setEntities] = useState<SourceEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [trustScore, setTrustScore] = useState(0);

  useEffect(() => {
    if (entityId && expanded) {
      fetchProvenanceChain();
    }
  }, [entityId, expanded]);

  const fetchProvenanceChain = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/context/provenance?entity_id=${encodeURIComponent(entityId)}`);
      if (!response.ok) throw new Error('Failed to fetch provenance');

      const data = await response.json();
      setChain(data.chain || []);
      setEntities(data.entities || []);
      setTrustScore(data.trust_score || 0);
    } catch (error) {
      console.error('Provenance fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [entityId]);

  const verifiedCount = entities.filter((e) => e.verified).length;

  return (
    <motion.div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle size={20} color="#1D9E75" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-gray-900">Provenance Trail</div>
            <div className="text-sm text-gray-600">
              Based on {entities.length} knowledge {entities.length === 1 ? 'entity' : 'entities'}
            </div>
          </div>
        </div>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={20} color="#666" />
        </motion.div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-200 bg-gray-50"
          >
            <div className="p-4 space-y-4">
              {/* Trust Score */}
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="text-sm font-medium text-gray-900 mb-2">Trust Score</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-emerald-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${trustScore * 100}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{Math.round(trustScore * 100)}%</span>
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  {verifiedCount}/{entities.length} sources verified
                </div>
              </div>

              {/* Chain Visualization */}
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="animate-spin w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto" />
                </div>
              ) : (
                <div className="space-y-3">
                  {chain.map((node, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-white border-2 border-emerald-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-emerald-600">
                          {idx + 1}
                        </span>
                      </div>
                      <div className="flex-1 bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-start justify-between mb-1">
                          <div className="font-medium text-gray-900">{node.label}</div>
                          <span className="text-xs text-gray-500">
                            {new Date(node.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">{node.type}</div>
                        {node.source && (
                          <div className="text-xs text-emerald-700 mt-1 bg-emerald-50 px-2 py-1 rounded">
                            Source: {node.source}
                          </div>
                        )}
                      </div>
                      {idx < chain.length - 1 && (
                        <div className="w-0.5 h-8 bg-emerald-300 mx-auto" />
                      )}
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Citation Badges */}
              {entities.length > 0 && (
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-sm font-medium text-gray-900 mb-2">Knowledge Entities</div>
                  <div className="flex flex-wrap gap-2">
                    {entities.map((entity) => (
                      <div
                        key={entity.id}
                        className="text-xs px-2.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-medium flex items-center gap-1.5"
                      >
                        {entity.verified && (
                          <CheckCircle size={12} />
                        )}
                        {entity.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// Decision Explainer Component
// ============================================================================

export function DecisionExplainer({ actionId, expanded: initialExpanded = false }: DecisionExplainerProps) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [explanation, setExplanation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (actionId && expanded) {
      fetchExplanation();
    }
  }, [actionId, expanded]);

  const fetchExplanation = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/context/explain?action_id=${encodeURIComponent(actionId)}`);
      if (!response.ok) throw new Error('Failed to fetch explanation');
      const data = await response.json();
      setExplanation(data);
    } catch (error) {
      console.error('Explanation fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [actionId]);

  const confidenceColor = {
    high: '#1D9E75',
    medium: '#D85A30',
    low: '#E8443A',
  };

  const confidenceBgColor = {
    high: 'bg-emerald-50',
    medium: 'bg-orange-50',
    low: 'bg-red-50',
  };

  return (
    <motion.div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <AlertCircle size={20} color="#7F77DD" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-gray-900">Why This Decision?</div>
            <div className="text-sm text-gray-600">Step-by-step reasoning</div>
          </div>
        </div>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={20} color="#666" />
        </motion.div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-200 bg-gray-50"
          >
            <div className="p-4 space-y-4">
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full mx-auto" />
                </div>
              ) : explanation ? (
                <>
                  {/* Context Window */}
                  {explanation.context_window && (
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="text-sm font-medium text-gray-900 mb-2">Context Window</div>
                      <div className="text-xs text-gray-600 bg-gray-100 rounded p-2 font-mono max-h-32 overflow-y-auto">
                        {explanation.context_window}
                      </div>
                    </div>
                  )}

                  {/* Entities Consulted */}
                  {explanation.entities_consulted && explanation.entities_consulted.length > 0 && (
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="text-sm font-medium text-gray-900 mb-2">Entities Consulted</div>
                      <div className="space-y-1">
                        {explanation.entities_consulted.map((entity: string, idx: number) => (
                          <div key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                            <CheckCircle size={14} color="#1D9E75" />
                            {entity}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reasoning Chain */}
                  {explanation.reasoning_steps && explanation.reasoning_steps.length > 0 && (
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="text-sm font-medium text-gray-900 mb-3">Reasoning Chain</div>
                      <div className="space-y-2">
                        {explanation.reasoning_steps.map((step: string, idx: number) => (
                          <div key={idx} className="text-sm text-gray-700 pl-4 border-l-2 border-purple-300">
                            <span className="font-medium text-purple-700">Step {idx + 1}:</span> {step}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Confidence Level */}
                  {explanation.confidence_level && (
                    <div
                      className={`rounded-lg p-3 border border-gray-200 ${
                        confidenceBgColor[explanation.confidence_level as keyof typeof confidenceBgColor]
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-900">Confidence Level</div>
                        <div
                          className="text-sm font-bold px-3 py-1 rounded-full text-white"
                          style={{
                            backgroundColor:
                              confidenceColor[explanation.confidence_level as keyof typeof confidenceColor],
                          }}
                        >
                          {explanation.confidence_level.toUpperCase()}
                        </div>
                      </div>
                      {explanation.confidence_explanation && (
                        <div className="text-xs text-gray-700 mt-2">{explanation.confidence_explanation}</div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">No explanation available</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// Audit Trail Viewer Component
// ============================================================================

export function AuditTrailViewer({ pageSize = 10, onAuditClick }: AuditTrailViewerProps) {
  const [entries, setEntries] = useState<AuditTrailEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filterType, setFilterType] = useState<string>('');
  const [filterAgent, setFilterAgent] = useState<string>('');
  const [agents, setAgents] = useState<string[]>([]);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchAuditTrail();
  }, [page, filterType, filterAgent]);

  const fetchAuditTrail = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (filterType) params.append('action_type', filterType);
      if (filterAgent) params.append('agent_id', filterAgent);

      const response = await fetch(`/api/v1/context/audit?${params}`);
      if (!response.ok) throw new Error('Failed to fetch audit trail');

      const data = await response.json();
      setEntries(data.entries || []);
      setAgents(data.agents || []);
      setActionTypes(data.action_types || []);
      setHasMore(data.has_more || false);
    } catch (error) {
      console.error('Audit trail fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [page, filterType, filterAgent, pageSize]);

  const handleVerifyChain = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/context/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error('Verification failed');
      await fetchAuditTrail();
    } catch (error) {
      console.error('Verification error:', error);
    }
  }, [fetchAuditTrail]);

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const dataStr = format === 'json'
        ? JSON.stringify(entries, null, 2)
        : [
            ['ID', 'Timestamp', 'Agent', 'Action Type', 'Chain Valid', 'Confidence'],
            ...entries.map((e) => [
              e.id,
              e.timestamp,
              e.agent_id,
              e.action_type,
              e.chain_valid ? 'Yes' : 'No',
              e.confidence_level.toUpperCase(),
            ]),
          ]
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

      const blob = new Blob([dataStr], { type: format === 'json' ? 'application/json' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  return (
    <motion.div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <CheckCircle size={20} color="#7F77DD" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">Audit Trail</div>
              <div className="text-sm text-gray-600">Tamper-evident decision log</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={handleVerifyChain}
              className="px-3 py-1.5 text-sm font-medium bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Verify Chain
            </motion.button>
            <div className="relative group">
              <button className="px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                Export
              </button>
              <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
                <button
                  onClick={() => handleExport('json')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Export as JSON
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-200"
                >
                  Export as CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Filter size={16} color="#666" />
            <span className="text-gray-700 font-medium">Filter:</span>
          </div>
          <select
            value={filterAgent}
            onChange={(e) => {
              setFilterAgent(e.target.value);
              setPage(0);
            }}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Agents</option>
            {agents.map((agent) => (
              <option key={agent} value={agent}>
                {agent}
              </option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setPage(0);
            }}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Action Types</option>
            {actionTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Entries */}
      <div className="divide-y divide-gray-200">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No audit entries found</div>
        ) : (
          entries.map((entry, idx) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onAuditClick?.(entry)}
              className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      entry.chain_valid ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                  />
                  <div>
                    <div className="font-medium text-gray-900">{entry.action_type}</div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      Agent: {entry.agent_id}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded ${
                      entry.confidence_level === 'high'
                        ? 'bg-emerald-100 text-emerald-700'
                        : entry.confidence_level === 'medium'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {entry.confidence_level.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 ml-5">
                <span>{new Date(entry.timestamp).toLocaleString()}</span>
                <span>•</span>
                <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs">
                  {entry.hash_chain.substring(0, 8)}...
                </code>
              </div>
              {entry.chain_valid && (
                <div className="flex items-center gap-1.5 mt-2 ml-5 text-xs text-emerald-700">
                  <CheckCircle size={14} />
                  Chain integrity verified
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      {entries.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page + 1}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={!hasMore}
            className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// Main Context Engine Component (Composite)
// ============================================================================

interface ContextEngineProps {
  entityId?: string;
  actionId?: string;
  showProvenanceTrail?: boolean;
  showDecisionExplainer?: boolean;
  showAuditTrail?: boolean;
  compact?: boolean;
}

export default function ContextEngine({
  entityId,
  actionId,
  showProvenanceTrail = true,
  showDecisionExplainer = true,
  showAuditTrail = true,
  compact = false,
}: ContextEngineProps) {
  return (
    <div className={`space-y-4 ${compact ? 'max-w-md' : 'w-full'}`}>
      {showProvenanceTrail && entityId && (
        <ProvenanceTrail entityId={entityId} />
      )}

      {showDecisionExplainer && actionId && (
        <DecisionExplainer actionId={actionId} />
      )}

      {showAuditTrail && (
        <AuditTrailViewer />
      )}
    </div>
  );
}
