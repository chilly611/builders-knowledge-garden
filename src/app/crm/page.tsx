'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Types ─── */
type ProjectPhase = 'DREAM' | 'DESIGN' | 'PLAN' | 'BUILD' | 'DELIVER' | 'GROW';
type BudgetStatus = 'on-track' | 'over' | 'ahead';
type RiskLevel = 'low' | 'medium' | 'high';
type Urgency = 'red' | 'yellow' | 'green';
type AlertLevel = 'green' | 'yellow' | 'red';

interface Project {
  id: string; name: string; phase: ProjectPhase; progress: number;
  budget_amount: number | null; budget_status: BudgetStatus; risk_level: RiskLevel;
  next_milestone: string | null; milestone_date: string | null;
  project_type: string | null; location: string | null; client_name: string | null;
  notes: string | null; created_at: string; updated_at: string;
}

interface AttentionItem {
  id: string; project_name: string; urgency: Urgency; title: string;
  body: string; options: string[]; ai_generated: boolean; created_at: string;
}

interface HeartbeatCategory {
  headline: string; status: AlertLevel; details: string; action: string;
}

interface HeartbeatReport {
  id: string; location: string; alert_level: AlertLevel; summary: string;
  created_at: string;
  report_data: {
    summary: string; generated_at: string; location: string;
    alert_level: AlertLevel; alert_reason: string;
    top_actions: string[];
    categories: {
      weather?: HeartbeatCategory; materials?: HeartbeatCategory;
      codes_regulations?: HeartbeatCategory; infrastructure?: HeartbeatCategory;
      labor_market?: HeartbeatCategory; financial?: HeartbeatCategory;
      legal_compliance?: HeartbeatCategory; supply_chain?: HeartbeatCategory;
      safety?: HeartbeatCategory; opportunities?: HeartbeatCategory;
    };
  };
}

interface NewProjectForm {
  name: string; phase: ProjectPhase; progress: string; budget_amount: string;
  budget_status: BudgetStatus; risk_level: RiskLevel; next_milestone: string;
  milestone_date: string; project_type: string; location: string;
  client_name: string; notes: string;
}

/* ─── Constants ─── */
const PHASE_COLORS: Record<ProjectPhase, string> = {
  DREAM: '#D85A30', DESIGN: '#7F77DD', PLAN: '#1D9E75',
  BUILD: '#378ADD', DELIVER: '#BA7517', GROW: '#639922',
};
const URGENCY_COLORS: Record<Urgency, string> = { red: '#EF4444', yellow: '#F59E0B', green: '#22C55E' };
const URGENCY_EMOJI: Record<Urgency, string> = { red: '🔴', yellow: '🟡', green: '🟢' };
const ALERT_COLORS: Record<AlertLevel, string> = { green: '#22C55E', yellow: '#F59E0B', red: '#EF4444' };
const ALERT_BG: Record<AlertLevel, string> = {
  green: 'rgba(34,197,94,0.08)', yellow: 'rgba(245,158,11,0.08)', red: 'rgba(239,68,68,0.08)',
};

const CATEGORY_ICONS: Record<string, string> = {
  weather: '🌤', materials: '🪵', codes_regulations: '📋',
  infrastructure: '🏗', labor_market: '👷', financial: '💰',
  legal_compliance: '⚖️', supply_chain: '🚛', safety: '🦺', opportunities: '🎯',
};
const CATEGORY_LABELS: Record<string, string> = {
  weather: 'Weather', materials: 'Materials', codes_regulations: 'Codes & Regs',
  infrastructure: 'Infrastructure', labor_market: 'Labor', financial: 'Financial',
  legal_compliance: 'Legal', supply_chain: 'Supply Chain', safety: 'Safety', opportunities: 'Opportunities',
};

const PROJECT_TYPES = [
  'Single-Family Residential', 'Multi-Family', 'Commercial', 'Retail',
  'Industrial', 'Data Center', 'Healthcare', 'Education', 'Mixed-Use',
  'Renovation / Remodel', 'Infrastructure', 'Other',
];

const DEFAULT_FORM: NewProjectForm = {
  name: '', phase: 'PLAN', progress: '0', budget_amount: '', budget_status: 'on-track',
  risk_level: 'medium', next_milestone: '', milestone_date: '', project_type: '',
  location: '', client_name: '', notes: '',
};

/* ─── Utility Components ─── */
function MetricCard({ label, value, sub, trend }: {
  label: string; value: string; sub?: string; trend?: 'up' | 'down' | 'neutral';
}) {
  const trendColor = trend === 'up' ? '#22C55E' : trend === 'down' ? '#EF4444' : '#94A3B8';
  return (
    <div style={{ flex: '1 1 0', minWidth: 130, background: '#fff', border: '1px solid #e5e5e0', borderRadius: 12, padding: '14px 16px' }}>
      <p style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, fontWeight: 600 }}>{label}</p>
      <p style={{ fontSize: '26px', fontWeight: 800, margin: '4px 0 0', color: '#1a1a1a', letterSpacing: '-1px' }}>{value}</p>
      {sub && <p style={{ fontSize: '11px', margin: '3px 0 0', color: trendColor, fontWeight: 600 }}>{sub}</p>}
    </div>
  );
}

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div style={{ width: '100%', height: 5, borderRadius: 3, background: '#eaeae5', overflow: 'hidden' }}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${color}, ${color}CC)` }} />
    </div>
  );
}

function PhaseIndicator({ phase }: { phase: ProjectPhase }) {
  const phases: ProjectPhase[] = ['DREAM', 'DESIGN', 'PLAN', 'BUILD', 'DELIVER', 'GROW'];
  const idx = phases.indexOf(phase);
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {phases.map((p, i) => (
        <div key={p} style={{ width: i <= idx ? 14 : 7, height: 4, borderRadius: 2, background: i <= idx ? PHASE_COLORS[p] : 'rgba(255,255,255,0.1)', transition: 'all 0.3s ease' }} />
      ))}
      <span style={{ fontSize: '10px', fontWeight: 700, color: PHASE_COLORS[phase], marginLeft: 6, letterSpacing: '0.5px' }}>{phase}</span>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</label>
      {children}
    </div>
  );
}

const INPUT_STYLE: React.CSSProperties = {
  background: '#f5f5f3', border: '1px solid #e0e0db',
  borderRadius: 8, padding: '9px 12px', color: '#1a1a1a', fontSize: '14px',
  fontFamily: 'var(--font-archivo), sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box',
};
const SELECT_STYLE: React.CSSProperties = { ...INPUT_STYLE, cursor: 'pointer', appearance: 'none' };

/* ─── Morning Briefing Panel ─── */
function MorningBriefing({ report, onRefresh, refreshing }: {
  report: HeartbeatReport | null;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const alertColor = report ? ALERT_COLORS[report.alert_level] : '#94A3B8';
  const alertBg = report ? ALERT_BG[report.alert_level] : 'rgba(255,255,255,0.03)';
  const categories = report?.report_data?.categories || {};
  const topActions = report?.report_data?.top_actions || [];

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 0) return `${h}h ago`;
    return `${m}m ago`;
  };

  return (
    <div style={{
      margin: '0 0 0', background: alertBg,
      border: `1px solid ${alertColor}20`,
      borderLeft: `3px solid ${alertColor}`,
      borderRadius: '0 0 0 0',
    }}>
      {/* Collapsed header — always visible */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 28px', cursor: 'pointer' }}
      >
        <span style={{ fontSize: '16px' }}>
          {report?.alert_level === 'red' ? '🚨' : report?.alert_level === 'yellow' ? '⚠️' : '✅'}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: alertColor, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Morning Briefing
            </span>
            {report && (
              <span style={{ fontSize: '10px', color: '#aaa' }}>
                {timeAgo(report.created_at)}
              </span>
            )}
          </div>
          <p style={{ fontSize: '13px', color: report ? '#fff' : 'rgba(255,255,255,0.4)', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80vw' }}>
            {report ? report.report_data?.summary || report.summary : 'No briefing yet — click to generate your first intelligence report'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {/* Category status pills */}
          {report && Object.entries(categories).slice(0, 5).map(([key, cat]) => (
            <span key={key} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: ALERT_COLORS[(cat as HeartbeatCategory).status],
              flexShrink: 0,
            }} title={`${CATEGORY_LABELS[key]}: ${(cat as HeartbeatCategory).headline}`} />
          ))}
          <button
            onClick={e => { e.stopPropagation(); onRefresh(); }}
            disabled={refreshing}
            style={{
              background: refreshing ? 'rgba(255,255,255,0.05)' : `${alertColor}20`,
              border: `1px solid ${alertColor}30`,
              borderRadius: 6, padding: '4px 10px',
              color: refreshing ? 'rgba(255,255,255,0.3)' : alertColor,
              fontSize: '11px', fontWeight: 700, cursor: refreshing ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {refreshing ? '⏳' : '↻'} {refreshing ? 'Scanning…' : 'Refresh'}
          </button>
          <span style={{ color: '#aaa', fontSize: '12px' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && report && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 28px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>

              {/* Top 3 actions */}
              {topActions.length > 0 && (
                <div style={{ marginTop: 16, marginBottom: 16 }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 10px' }}>
                    Today's Top Actions
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {topActions.map((action, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{
                          flexShrink: 0, width: 20, height: 20, borderRadius: '50%',
                          background: i === 0 ? '#E8443A' : i === 1 ? '#F59E0B' : '#22C55E',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '10px', fontWeight: 700, color: '#1a1a1a',
                        }}>{i + 1}</span>
                        <p style={{ fontSize: '13px', color: '#1a1a1a', margin: 0, lineHeight: 1.4 }}>{action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category grid */}
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '1px', margin: '16px 0 10px' }}>
                Intelligence Categories
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                {Object.entries(categories).map(([key, cat]) => {
                  const c = cat as HeartbeatCategory;
                  const isActive = activeCategory === key;
                  return (
                    <div
                      key={key}
                      onClick={() => setActiveCategory(isActive ? null : key)}
                      style={{
                        background: isActive ? `${ALERT_COLORS[c.status]}15` : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isActive ? ALERT_COLORS[c.status] + '40' : 'rgba(255,255,255,0.07)'}`,
                        borderLeft: `3px solid ${ALERT_COLORS[c.status]}`,
                        borderRadius: '0 8px 8px 0',
                        padding: '10px 12px', cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: '14px' }}>{CATEGORY_ICONS[key]}</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#666' }}>{CATEGORY_LABELS[key]}</span>
                        <span style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: ALERT_COLORS[c.status], flexShrink: 0 }} />
                      </div>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a1a', margin: 0, lineHeight: 1.3 }}>{c.headline}</p>

                      <AnimatePresence>
                        {isActive && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                            <p style={{ fontSize: '11px', color: '#888', margin: '8px 0 6px', lineHeight: 1.5 }}>{c.details}</p>
                            {c.action && (
                              <p style={{ fontSize: '11px', color: ALERT_COLORS[c.status], fontWeight: 600, margin: 0 }}>
                                → {c.action}
                              </p>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {report.report_data?.alert_reason && (
                <p style={{ fontSize: '11px', color: '#aaa', margin: '12px 0 0', fontStyle: 'italic' }}>
                  Alert level: {report.report_data.alert_reason}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Main Page ─── */
export default function CommandCenterPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [heartbeat, setHeartbeat] = useState<HeartbeatReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [refreshingBriefing, setRefreshingBriefing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<NewProjectForm>(DEFAULT_FORM);
  const [expandedAttention, setExpandedAttention] = useState<string | null>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); loadData(); }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, attRes, hbRes] = await Promise.all([
        fetch('/api/v1/projects'),
        fetch('/api/v1/projects/analyze'),
        fetch('/api/v1/heartbeat'),
      ]);
      const [projData, attData, hbData] = await Promise.all([
        projRes.json(), attRes.json(), hbRes.json(),
      ]);
      setProjects(projData.projects || []);
      setAttentionItems(attData.items || []);
      setHeartbeat(hbData.report || null);
    } catch (e) { console.error('Load error:', e); }
    finally { setLoading(false); }
  }, []);

  const runAnalysis = async () => {
    if (!projects.length) return;
    setAnalyzing(true);
    try {
      const res = await fetch('/api/v1/projects/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects }),
      });
      const data = await res.json();
      setAttentionItems(data.items || []);
    } finally { setAnalyzing(false); }
  };

  const refreshBriefing = async () => {
    setRefreshingBriefing(true);
    try {
      const location = projects[0]?.location || 'United States';
      const types = [...new Set(projects.map(p => p.project_type).filter(Boolean))];
      const res = await fetch('/api/v1/heartbeat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location, project_types: types.length ? types : ['residential', 'commercial'] }),
      });
      const data = await res.json();
      if (data.report) setHeartbeat(data.report);
    } finally { setRefreshingBriefing(false); }
  };

  const resolveItem = async (id: string) => {
    setAttentionItems(prev => prev.filter(i => i.id !== id));
    await fetch('/api/v1/projects/analyze', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  };

  const submitProject = async () => {
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/projects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          progress: parseInt(form.progress) || 0,
          budget_amount: form.budget_amount ? parseFloat(form.budget_amount.replace(/,/g, '')) : null,
        }),
      });
      if (res.ok) { setShowAddModal(false); setForm(DEFAULT_FORM); await loadData(); }
    } finally { setSubmitting(false); }
  };

  const deleteProject = async (id: string) => {
    if (!confirm('Delete this project?')) return;
    setProjects(prev => prev.filter(p => p.id !== id));
    await fetch(`/api/v1/projects?id=${id}`, { method: 'DELETE' });
  };

  if (!mounted) return null;

  const totalBudget = projects.reduce((sum, p) => sum + (p.budget_amount || 0), 0);
  const overBudget = projects.filter(p => p.budget_status === 'over').length;
  const highRisk = projects.filter(p => p.risk_level === 'high').length;
  const redItems = attentionItems.filter(i => i.urgency === 'red').length;
  const nowDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const formatBudget = (amt: number | null) => {
    if (!amt) return '—';
    if (amt >= 1_000_000) return `$${(amt / 1_000_000).toFixed(1)}M`;
    if (amt >= 1000) return `$${(amt / 1000).toFixed(0)}K`;
    return `$${amt.toLocaleString()}`;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', color: '#1a1a1a', fontFamily: 'var(--font-archivo), sans-serif' }}>

      {/* ─── MORNING BRIEFING STRIP ─── */}
      <MorningBriefing report={heartbeat} onRefresh={refreshBriefing} refreshing={refreshingBriefing} />

      {/* ─── HERO HEADER ─── */}
      <header style={{
        background: 'linear-gradient(135deg, rgba(232,68,58,0.08) 0%, rgba(232,68,58,0.02) 50%, transparent 100%)',
        borderBottom: '1px solid rgba(232,68,58,0.12)',
        padding: '20px 28px 18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #E8443A, #FF7A6E)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>
              Command Center
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{nowDate} · Your AI COO</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {redItems > 0 && (
              <span style={{ background: '#EF4444', color: '#fff', borderRadius: 12, padding: '3px 10px', fontSize: '12px', fontWeight: 700 }}>
                {redItems} urgent
              </span>
            )}
            <button onClick={() => setShowAddModal(true)} style={{ background: 'linear-gradient(135deg, #E8443A, #c93328)', border: 'none', borderRadius: 9, padding: '9px 18px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
              + Add Project
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <MetricCard label="Active Projects" value={String(projects.length)} sub={projects.length > 0 ? `${projects.filter(p => p.phase === 'BUILD').length} in BUILD` : 'Add your first project'} trend="neutral" />
          <MetricCard label="Total Budget" value={formatBudget(totalBudget)} sub={overBudget > 0 ? `${overBudget} over budget` : 'All on track'} trend={overBudget > 0 ? 'down' : 'up'} />
          <MetricCard label="High Risk" value={String(highRisk)} sub={highRisk === 0 ? 'All risks managed' : 'Need attention'} trend={highRisk > 0 ? 'down' : 'up'} />
          <MetricCard label="Attention Items" value={String(attentionItems.length)} sub={`${redItems} critical today`} trend={redItems > 0 ? 'down' : 'neutral'} />
          <MetricCard label="Near Milestone" value={String(projects.filter(p => p.next_milestone).length)} sub="Projects with milestones" trend="neutral" />
        </div>
      </header>

      {/* ─── MAIN 2-COLUMN GRID ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 0, minHeight: 'calc(100vh - 256px)' }}>

        {/* ─── LEFT: AI Attention Queue ─── */}
        <div style={{ borderRight: '1px solid rgba(255,255,255,0.05)', padding: '18px 14px', overflowY: 'auto', maxHeight: 'calc(100vh - 256px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: '#555' }}>Needs Attention</h2>
            <button onClick={runAnalysis} disabled={analyzing || !projects.length} style={{
              background: analyzing ? 'rgba(255,255,255,0.05)' : 'rgba(232,68,58,0.15)',
              border: `1px solid ${analyzing ? 'rgba(255,255,255,0.08)' : 'rgba(232,68,58,0.3)'}`,
              borderRadius: 8, padding: '4px 10px', color: analyzing ? 'rgba(255,255,255,0.3)' : '#E8443A',
              fontSize: '11px', fontWeight: 700, cursor: projects.length ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
            }}>
              {analyzing ? '⏳ Analyzing…' : '🤖 AI Analyze'}
            </button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map(i => <div key={i} style={{ height: 60, background: '#fff', borderRadius: 8, animation: 'pulse 2s infinite' }} />)}
            </div>
          ) : attentionItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 12px' }}>
              <p style={{ fontSize: '28px', margin: '0 0 8px' }}>🧠</p>
              <p style={{ fontSize: '12px', color: '#aaa', margin: 0, lineHeight: 1.5 }}>
                {projects.length === 0 ? 'Add projects to unlock AI analysis' : 'Click "AI Analyze" to get your AI COO briefing'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <AnimatePresence>
                {attentionItems.map((item, i) => {
                  const isExpanded = expandedAttention === item.id;
                  return (
                    <motion.div key={item.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16, height: 0 }} transition={{ delay: i * 0.04 }}
                      onClick={() => setExpandedAttention(isExpanded ? null : item.id)}
                      style={{ background: isExpanded ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isExpanded ? `${URGENCY_COLORS[item.urgency]}30` : 'rgba(255,255,255,0.06)'}`, borderLeft: `3px solid ${URGENCY_COLORS[item.urgency]}`, borderRadius: '0 8px 8px 0', padding: '10px 12px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                        <span style={{ fontSize: '11px', marginTop: 2, flexShrink: 0 }}>{URGENCY_EMOJI[item.urgency]}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '12px', fontWeight: 700, margin: 0, color: '#1a1a1a', lineHeight: 1.3 }}>{item.title}</p>
                          <p style={{ fontSize: '10px', color: '#aaa', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.project_name}</p>
                        </div>
                      </div>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                            <p style={{ fontSize: '11px', color: '#888', margin: '8px 0 0', lineHeight: 1.5, paddingLeft: 18 }}>{item.body}</p>
                            {item.options?.length > 0 && (
                              <div style={{ paddingLeft: 18, marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                {item.options.map(opt => (
                                  <button key={opt} onClick={e => e.stopPropagation()} style={{ background: '#f5f5f3', border: '1px solid #e5e5e0', borderRadius: 6, padding: '4px 9px', color: '#555', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>{opt}</button>
                                ))}
                              </div>
                            )}
                            <div style={{ paddingLeft: 18, marginTop: 8 }}>
                              <button onClick={e => { e.stopPropagation(); resolveItem(item.id); }} style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, padding: '4px 9px', color: '#22C55E', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>✓ Resolve</button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ─── RIGHT: Projects ─── */}
        <div style={{ padding: '18px 20px', overflowY: 'auto', maxHeight: 'calc(100vh - 256px)' }}>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {[1, 2, 3].map(i => <div key={i} style={{ height: 160, background: '#fff', borderRadius: 12, animation: 'pulse 2s infinite' }} />)}
            </div>
          ) : projects.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, textAlign: 'center', gap: 16 }}>
              <div style={{ fontSize: '64px' }}>🏗️</div>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px', color: '#1a1a1a' }}>Your Command Center is ready</h3>
                <p style={{ fontSize: '14px', color: '#999', margin: '0 0 24px', maxWidth: 340, lineHeight: 1.6 }}>Add your active projects and your AI COO will monitor them, surface risks, and keep you ahead of every deadline.</p>
                <button onClick={() => setShowAddModal(true)} style={{ background: 'linear-gradient(135deg, #E8443A, #c93328)', border: 'none', borderRadius: 10, padding: '12px 28px', color: '#1a1a1a', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>+ Add Your First Project</button>
              </div>
            </motion.div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h2 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: '#555' }}>Active Projects ({projects.length})</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {projects.map((project, i) => {
                  const isExpanded = expandedProject === project.id;
                  const phaseColor = PHASE_COLORS[project.phase];
                  const riskColor = project.risk_level === 'high' ? '#EF4444' : project.risk_level === 'medium' ? '#F59E0B' : '#22C55E';
                  return (
                    <motion.div key={project.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                      onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                      style={{ background: '#fff', border: `1px solid ${isExpanded ? `${phaseColor}30` : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'border-color 0.2s ease' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#1a1a1a', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.name}</p>
                          {project.client_name && <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>{project.client_name}</p>}
                        </div>
                        <span style={{ background: `${riskColor}18`, border: `1px solid ${riskColor}30`, color: riskColor, borderRadius: 5, padding: '2px 7px', fontSize: '10px', fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
                          {project.risk_level.toUpperCase()}
                        </span>
                      </div>
                      <PhaseIndicator phase={project.phase} />
                      <div style={{ marginTop: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: '10px', color: '#aaa' }}>Progress</span>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: phaseColor }}>{project.progress}%</span>
                        </div>
                        <ProgressBar percent={project.progress} color={phaseColor} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                          <p style={{ fontSize: '10px', color: '#aaa', margin: 0 }}>Budget</p>
                          <p style={{ fontSize: '13px', fontWeight: 700, margin: '2px 0 0', color: project.budget_status === 'over' ? '#EF4444' : project.budget_status === 'ahead' ? '#22C55E' : '#fff' }}>
                            {formatBudget(project.budget_amount)}
                            {project.budget_amount && <span style={{ fontSize: '10px', fontWeight: 400, color: '#aaa', marginLeft: 4 }}>{project.budget_status}</span>}
                          </p>
                        </div>
                        {project.next_milestone && (
                          <div style={{ textAlign: 'right', maxWidth: 140 }}>
                            <p style={{ fontSize: '10px', color: '#aaa', margin: 0 }}>Next</p>
                            <p style={{ fontSize: '11px', fontWeight: 600, margin: '2px 0 0', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {project.next_milestone}
                              {project.milestone_date && <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', display: 'block' }}>{new Date(project.milestone_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                            </p>
                          </div>
                        )}
                      </div>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                            <div style={{ paddingTop: 12, marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                              {project.location && <p style={{ fontSize: '11px', color: '#999', margin: '0 0 4px' }}>📍 {project.location}</p>}
                              {project.project_type && <p style={{ fontSize: '11px', color: '#999', margin: '0 0 4px' }}>🏗 {project.project_type}</p>}
                              {project.notes && <p style={{ fontSize: '11px', color: '#999', margin: '4px 0 0', lineHeight: 1.5 }}>{project.notes}</p>}
                              <button onClick={e => { e.stopPropagation(); deleteProject(project.id); }} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 6, padding: '5px 10px', color: 'rgba(239,68,68,0.7)', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', marginTop: 12 }}>Delete</button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── ADD PROJECT MODAL ─── */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => e.target === e.currentTarget && setShowAddModal(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.97 }}
              style={{ background: '#111', border: '1px solid #e5e5e0', borderRadius: 16, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#1a1a1a' }}>Add Project</h2>
                <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#999', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <FormField label="Project Name *">
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Oceanview Residence" style={INPUT_STYLE} autoFocus />
                </FormField>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <FormField label="Phase">
                    <select value={form.phase} onChange={e => setForm(f => ({ ...f, phase: e.target.value as ProjectPhase }))} style={SELECT_STYLE}>
                      {(['DREAM','DESIGN','PLAN','BUILD','DELIVER','GROW'] as ProjectPhase[]).map(p => <option key={p} value={p} style={{ background: '#111' }}>{p}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Progress (%)">
                    <input type="number" min="0" max="100" value={form.progress} onChange={e => setForm(f => ({ ...f, progress: e.target.value }))} style={INPUT_STYLE} />
                  </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <FormField label="Budget ($)">
                    <input value={form.budget_amount} onChange={e => setForm(f => ({ ...f, budget_amount: e.target.value }))} placeholder="e.g., 1200000" style={INPUT_STYLE} />
                  </FormField>
                  <FormField label="Budget Status">
                    <select value={form.budget_status} onChange={e => setForm(f => ({ ...f, budget_status: e.target.value as BudgetStatus }))} style={SELECT_STYLE}>
                      <option value="on-track" style={{ background: '#111' }}>On Track</option>
                      <option value="over" style={{ background: '#111' }}>Over Budget</option>
                      <option value="ahead" style={{ background: '#111' }}>Ahead of Budget</option>
                    </select>
                  </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <FormField label="Risk Level">
                    <select value={form.risk_level} onChange={e => setForm(f => ({ ...f, risk_level: e.target.value as RiskLevel }))} style={SELECT_STYLE}>
                      <option value="low" style={{ background: '#111' }}>Low Risk</option>
                      <option value="medium" style={{ background: '#111' }}>Medium Risk</option>
                      <option value="high" style={{ background: '#111' }}>High Risk</option>
                    </select>
                  </FormField>
                  <FormField label="Project Type">
                    <select value={form.project_type} onChange={e => setForm(f => ({ ...f, project_type: e.target.value }))} style={SELECT_STYLE}>
                      <option value="" style={{ background: '#111' }}>Select type…</option>
                      {PROJECT_TYPES.map(t => <option key={t} value={t} style={{ background: '#111' }}>{t}</option>)}
                    </select>
                  </FormField>
                </div>
                <FormField label="Next Milestone">
                  <input value={form.next_milestone} onChange={e => setForm(f => ({ ...f, next_milestone: e.target.value }))} placeholder="e.g., Framing inspection" style={INPUT_STYLE} />
                </FormField>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <FormField label="Milestone Date">
                    <input type="date" value={form.milestone_date} onChange={e => setForm(f => ({ ...f, milestone_date: e.target.value }))} style={{ ...INPUT_STYLE, colorScheme: 'dark' }} />
                  </FormField>
                  <FormField label="Location">
                    <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g., Austin, TX" style={INPUT_STYLE} />
                  </FormField>
                </div>
                <FormField label="Client Name">
                  <input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="e.g., James & Linda Hoffman" style={INPUT_STYLE} />
                </FormField>
                <FormField label="Notes">
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Key context the AI COO should know about this project…" rows={3} style={{ ...INPUT_STYLE, resize: 'vertical', lineHeight: 1.5 }} />
                </FormField>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button onClick={() => setShowAddModal(false)} style={{ flex: 1, background: '#f5f5f3', border: '1px solid #e5e5e0', borderRadius: 9, padding: '11px 0', color: '#888', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={submitProject} disabled={!form.name.trim() || submitting} style={{ flex: 2, background: form.name.trim() ? 'linear-gradient(135deg, #E8443A, #c93328)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 9, padding: '11px 0', color: form.name.trim() ? '#fff' : 'rgba(255,255,255,0.3)', fontSize: '14px', fontWeight: 700, cursor: form.name.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                  {submitting ? 'Adding…' : 'Add Project'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }
        select option { background: #111 !important; color: #fff !important; }
      `}</style>
    </div>
  );
}
