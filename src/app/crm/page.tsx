'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/* ─── Types ─── */
type ProjectPhase = 'DREAM' | 'DESIGN' | 'PLAN' | 'BUILD' | 'DELIVER' | 'GROW';
type Urgency = 'red' | 'yellow' | 'green';

interface Project {
  id: string;
  name: string;
  phase: ProjectPhase;
  progress: number;
  budget: string;
  budgetStatus: 'on-track' | 'over' | 'ahead';
  riskLevel: 'low' | 'medium' | 'high';
  nextMilestone: string;
  daysUntil: number;
  thumbnail: string;
}

interface AttentionItem {
  id: string;
  urgency: Urgency;
  title: string;
  project: string;
  body: string;
  options?: string[];
}

interface UpcomingEvent {
  day: string;
  time: string;
  project: string;
  type: string;
  icon: string;
}

interface PaymentItem {
  label: string;
  amount: string;
  direction: 'in' | 'out';
  date: string;
}

/* ─── Constants ─── */
const PHASE_COLORS: Record<ProjectPhase, string> = {
  DREAM: '#D85A30',
  DESIGN: '#7F77DD',
  PLAN: '#1D9E75',
  BUILD: '#378ADD',
  DELIVER: '#BA7517',
  GROW: '#639922',
};

const URGENCY_COLORS: Record<Urgency, string> = {
  red: '#EF4444',
  yellow: '#F59E0B',
  green: '#22C55E',
};

const URGENCY_EMOJI: Record<Urgency, string> = {
  red: '🔴',
  yellow: '🟡',
  green: '🟢',
};

/* ─── Demo Data ─── */
const PROJECTS: Project[] = [
  {
    id: 'p-ocean', name: 'Oceanview Residence', phase: 'BUILD', progress: 62,
    budget: '$1.2M', budgetStatus: 'on-track', riskLevel: 'medium',
    nextMilestone: 'Framing inspection', daysUntil: 4,
    thumbnail: '🏠',
  },
  {
    id: 'p-downtown', name: 'Downtown Mixed-Use', phase: 'PLAN', progress: 15,
    budget: '$8.5M', budgetStatus: 'over', riskLevel: 'high',
    nextMilestone: 'Permit submission', daysUntil: 12,
    thumbnail: '🏢',
  },
  {
    id: 'p-hill', name: 'Hillside Renovation', phase: 'DESIGN', progress: 30,
    budget: '$420K', budgetStatus: 'on-track', riskLevel: 'low',
    nextMilestone: 'Client design review', daysUntil: 7,
    thumbnail: '🏡',
  },
  {
    id: 'p-tech', name: 'Tech Campus Phase 2', phase: 'BUILD', progress: 85,
    budget: '$24M', budgetStatus: 'ahead', riskLevel: 'low',
    nextMilestone: 'Mechanical rough-in', daysUntil: 2,
    thumbnail: '🏗️',
  },
  {
    id: 'p-beach', name: 'Beachfront Duplex', phase: 'DELIVER', progress: 95,
    budget: '$680K', budgetStatus: 'on-track', riskLevel: 'low',
    nextMilestone: 'Final walkthrough', daysUntil: 3,
    thumbnail: '🏖️',
  },
];

const ATTENTION_ITEMS: AttentionItem[] = [
  {
    id: 'a1', urgency: 'red', title: 'Steel delivery delayed 2 weeks',
    project: 'Oceanview Residence',
    body: 'Impact: 5-day schedule slip. Supplier flagged port congestion.',
    options: ['Expedite (+$2,400)', 'Substitute material', 'Adjust sequence'],
  },
  {
    id: 'a2', urgency: 'yellow', title: 'Permit expiring in 5 days',
    project: 'Downtown Mixed-Use',
    body: 'Building permit renewal required. Extension application ready to submit.',
  },
  {
    id: 'a3', urgency: 'yellow', title: 'Change order unsigned — 4 days',
    project: 'Hillside Renovation',
    body: 'Client has not responded to CO #3 (kitchen layout revision, +$12K).',
  },
  {
    id: 'a4', urgency: 'green', title: 'Inspection passed',
    project: 'Tech Campus Phase 2',
    body: 'Electrical rough-in passed. Ready for drywall phase.',
  },
  {
    id: 'a5', urgency: 'red', title: 'Budget variance alert — 12% over',
    project: 'Downtown Mixed-Use',
    body: 'Concrete costs $102K over estimate. Price escalation + quantity overrun.',
    options: ['VE options', 'Renegotiate', 'Client approval'],
  },
  {
    id: 'a6', urgency: 'yellow', title: 'Weather alert — rain Thursday',
    project: 'Oceanview Residence',
    body: 'Foundation pour scheduled Thursday. 80% chance of rain.',
    options: ['Reschedule to Friday', 'Proceed with tarp', 'Delay 1 week'],
  },
  {
    id: 'a7', urgency: 'green', title: 'Payment received — $68K',
    project: 'Beachfront Duplex',
    body: 'Draw #4 cleared. All project payments current.',
  },
];

const UPCOMING_EVENTS: UpcomingEvent[] = [
  { day: 'Mon', time: '9:00 AM', project: 'Tech Campus', type: 'Safety meeting', icon: '🦺' },
  { day: 'Tue', time: '10:30 AM', project: 'Oceanview', type: 'Steel delivery', icon: '🚛' },
  { day: 'Wed', time: '2:00 PM', project: 'Hillside', type: 'Client meeting', icon: '🤝' },
  { day: 'Thu', time: '8:00 AM', project: 'Oceanview', type: 'Foundation pour', icon: '🏗️' },
  { day: 'Fri', time: '11:00 AM', project: 'Beachfront', type: 'Final walkthrough', icon: '✅' },
];

const WEATHER_FORECAST = [
  { day: 'Mon', icon: '☀️', high: 72, condition: 'Clear' },
  { day: 'Tue', icon: '⛅', high: 68, condition: 'Partly cloudy' },
  { day: 'Wed', icon: '☀️', high: 74, condition: 'Sunny' },
  { day: 'Thu', icon: '🌧️', high: 61, condition: 'Rain — 80%' },
  { day: 'Fri', icon: '⛅', high: 66, condition: 'Clearing' },
];

const PAYMENTS: PaymentItem[] = [
  { label: 'Beachfront draw #5', amount: '$72K', direction: 'in', date: 'Apr 2' },
  { label: 'Tech Campus draw #8', amount: '$180K', direction: 'in', date: 'Apr 5' },
  { label: 'Oceanview draw #4', amount: '$95K', direction: 'in', date: 'Apr 8' },
  { label: 'Concrete supplier', amount: '$48K', direction: 'out', date: 'Apr 1' },
  { label: 'Steel order (Oceanview)', amount: '$32K', direction: 'out', date: 'Apr 3' },
  { label: 'Electrical sub', amount: '$28K', direction: 'out', date: 'Apr 7' },
];

/* ─── Utility Components ─── */
function MetricCard({ label, value, sub, trend }: {
  label: string; value: string; sub?: string; trend?: 'up' | 'down' | 'neutral';
}) {
  const trendColor = trend === 'up' ? '#22C55E' : trend === 'down' ? '#EF4444' : '#94A3B8';
  return (
    <div style={{
      flex: '1 1 0',
      minWidth: 140,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: '16px 18px',
    }}>
      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, fontWeight: 600 }}>
        {label}
      </p>
      <p style={{ fontSize: '28px', fontWeight: 800, margin: '6px 0 0', color: '#fff', letterSpacing: '-1px' }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: '12px', margin: '4px 0 0', color: trendColor, fontWeight: 600 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div style={{
      width: '100%', height: 6, borderRadius: 3,
      background: 'rgba(255,255,255,0.08)',
      overflow: 'hidden',
    }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{
          height: '100%', borderRadius: 3,
          background: `linear-gradient(90deg, ${color}, ${color}CC)`,
        }}
      />
    </div>
  );
}

function PhaseIndicator({ phase }: { phase: ProjectPhase }) {
  const phases: ProjectPhase[] = ['DREAM', 'DESIGN', 'PLAN', 'BUILD', 'DELIVER', 'GROW'];
  const idx = phases.indexOf(phase);
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {phases.map((p, i) => (
        <div key={p} style={{
          width: i <= idx ? 16 : 8,
          height: 4,
          borderRadius: 2,
          background: i <= idx ? PHASE_COLORS[p] : 'rgba(255,255,255,0.1)',
          transition: 'all 0.3s ease',
        }} />
      ))}
      <span style={{
        fontSize: '10px', fontWeight: 700, color: PHASE_COLORS[phase],
        marginLeft: 6, letterSpacing: '0.5px',
      }}>
        {phase}
      </span>
    </div>
  );
}

/* ─── Main Page ─── */
export default function CommandCenterPage() {
  const [expandedAttention, setExpandedAttention] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const redCount = ATTENTION_ITEMS.filter(i => i.urgency === 'red').length;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
      fontFamily: 'var(--font-archivo), sans-serif',
    }}>
      {/* ─── Hero Header ─── */}
      <header style={{
        background: 'linear-gradient(135deg, rgba(232,68,58,0.15) 0%, rgba(232,68,58,0.05) 50%, transparent 100%)',
        borderBottom: '1px solid rgba(232,68,58,0.15)',
        padding: '24px 32px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{
              fontSize: '26px', fontWeight: 800, margin: 0,
              background: 'linear-gradient(135deg, #E8443A, #FF7A6E)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.5px',
            }}>
              Command Center
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
              Monday, March 30 · Your AI COO
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {redCount > 0 && (
              <span style={{
                background: '#EF4444', color: '#fff', borderRadius: 12,
                padding: '4px 10px', fontSize: '12px', fontWeight: 700,
              }}>
                {redCount} urgent
              </span>
            )}
          </div>
        </div>

        {/* ─── ZONE 1: Business Pulse ─── */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <MetricCard label="Active Projects" value="5" sub="2 in BUILD" trend="neutral" />
          <MetricCard label="Monthly Revenue" value="$142K" sub="↑ 5% vs projected" trend="up" />
          <MetricCard label="Cash Position" value="$89K" sub="Available" trend="neutral" />
          <MetricCard label="Overdue Items" value="3" sub="2 critical" trend="down" />
          <MetricCard label="Win Rate" value="68%" sub="Trailing 6 months" trend="up" />
        </div>
      </header>

      {/* ─── Main Grid: 3 columns ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '300px 1fr 280px',
        gap: 0,
        minHeight: 'calc(100vh - 200px)',
      }}>
        {/* ─── ZONE 2: AI Attention Queue (Left) ─── */}
        <div style={{
          borderRight: '1px solid rgba(255,255,255,0.06)',
          padding: '20px 16px',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 200px)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 16,
          }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'rgba(255,255,255,0.8)' }}>
              Needs Your Attention
            </h2>
            <span style={{
              background: 'rgba(232,68,58,0.15)',
              color: '#E8443A',
              borderRadius: 10,
              padding: '2px 8px',
              fontSize: '12px',
              fontWeight: 700,
            }}>
              {ATTENTION_ITEMS.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ATTENTION_ITEMS.map((item, i) => {
              const isExpanded = expandedAttention === item.id;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setExpandedAttention(isExpanded ? null : item.id)}
                  style={{
                    background: isExpanded ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isExpanded ? `${URGENCY_COLORS[item.urgency]}30` : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: 10,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ fontSize: '12px', marginTop: 2 }}>{URGENCY_EMOJI[item.urgency]}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: '#fff', lineHeight: 1.3 }}>
                        {item.title}
                      </p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: '3px 0 0' }}>
                        {item.project}
                      </p>
                    </div>
                  </div>

                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      style={{ marginTop: 10, paddingLeft: 20 }}
                    >
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, margin: '0 0 10px' }}>
                        {item.body}
                      </p>
                      {item.options && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {item.options.map(opt => (
                            <button key={opt} style={{
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.12)',
                              borderRadius: 6,
                              padding: '5px 10px',
                              fontSize: '11px',
                              color: 'rgba(255,255,255,0.7)',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}>
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ─── ZONE 3: Active Project Cards (Center) ─── */}
        <div style={{
          padding: '20px 24px',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 200px)',
        }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 16px', color: 'rgba(255,255,255,0.8)' }}>
            Active Projects
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 14,
          }}>
            {PROJECTS.map((project, i) => {
              const budgetColors = {
                'on-track': '#22C55E',
                'over': '#EF4444',
                'ahead': '#3B82F6',
              };
              const budgetLabels = {
                'on-track': 'On Track',
                'over': 'Over Budget',
                'ahead': 'Under Budget',
              };
              const riskColors = {
                low: '#22C55E',
                medium: '#F59E0B',
                high: '#EF4444',
              };

              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -4, boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 14,
                    padding: '18px 18px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <span style={{
                      fontSize: '28px',
                      width: 44, height: 44,
                      borderRadius: 10,
                      background: `${PHASE_COLORS[project.phase]}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {project.thumbnail}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#fff' }}>
                        {project.name}
                      </p>
                      <PhaseIndicator phase={project.phase} />
                    </div>
                  </div>

                  {/* Progress */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Progress</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: PHASE_COLORS[project.phase] }}>{project.progress}%</span>
                    </div>
                    <ProgressBar percent={project.progress} color={PHASE_COLORS[project.phase]} />
                  </div>

                  {/* Stats row */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 8, marginBottom: 12,
                  }}>
                    <div>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>Budget</p>
                      <p style={{ fontSize: '14px', fontWeight: 700, margin: '2px 0 0', color: '#fff' }}>{project.budget}</p>
                      <span style={{
                        fontSize: '10px', fontWeight: 600,
                        color: budgetColors[project.budgetStatus],
                      }}>
                        {budgetLabels[project.budgetStatus]}
                      </span>
                    </div>
                    <div>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>Risk</p>
                      <span style={{
                        fontSize: '12px', fontWeight: 700,
                        color: riskColors[project.riskLevel],
                        textTransform: 'capitalize',
                      }}>
                        {project.riskLevel === 'low' ? '● ' : project.riskLevel === 'medium' ? '◐ ' : '◉ '}
                        {project.riskLevel}
                      </span>
                    </div>
                    <div>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>Next</p>
                      <p style={{ fontSize: '11px', fontWeight: 600, margin: '2px 0 0', color: 'rgba(255,255,255,0.7)' }}>
                        {project.daysUntil}d
                      </p>
                    </div>
                  </div>

                  {/* Next milestone */}
                  <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 8,
                    padding: '8px 10px',
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.5)',
                  }}>
                    📍 {project.nextMilestone} — {project.daysUntil} days
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ─── ZONE 4: Upcoming & Weather (Right) ─── */}
        <div style={{
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          padding: '20px 16px',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 200px)',
        }}>
          {/* This Week */}
          <h2 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px', color: 'rgba(255,255,255,0.8)' }}>
            This Week
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
            {UPCOMING_EVENTS.map((evt, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <span style={{ fontSize: '16px' }}>{evt.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '12px', fontWeight: 600, margin: 0, color: '#fff' }}>{evt.type}</p>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>
                    {evt.project} · {evt.day} {evt.time}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Weather */}
          <h2 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px', color: 'rgba(255,255,255,0.8)' }}>
            Weather Impact
          </h2>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {WEATHER_FORECAST.map(w => (
              <div key={w.day} style={{
                flex: 1, textAlign: 'center',
                background: w.condition.includes('Rain') ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${w.condition.includes('Rain') ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 8, padding: '8px 4px',
              }}>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>{w.day}</p>
                <p style={{ fontSize: '20px', margin: '4px 0' }}>{w.icon}</p>
                <p style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: '#fff' }}>{w.high}°</p>
              </div>
            ))}
          </div>
          <div style={{
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.15)',
            borderRadius: 8, padding: '8px 10px',
            fontSize: '11px', color: 'rgba(239,68,68,0.8)',
            marginBottom: 24,
          }}>
            ⚠️ Rain Thursday — 2 active projects affected
          </div>

          {/* Payment Timeline */}
          <h2 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px', color: 'rgba(255,255,255,0.8)' }}>
            Payment Timeline
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {PAYMENTS.map((p, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 10px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8,
              }}>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 600, margin: 0, color: '#fff' }}>{p.label}</p>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>{p.date}</p>
                </div>
                <span style={{
                  fontSize: '13px', fontWeight: 700,
                  color: p.direction === 'in' ? '#22C55E' : '#EF4444',
                }}>
                  {p.direction === 'in' ? '+' : '-'}{p.amount}
                </span>
              </div>
            ))}
          </div>

          {/* Net Cash Flow */}
          <div style={{
            marginTop: 12,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: '12px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Net 2-Week Cash Flow
            </p>
            <p style={{ fontSize: '24px', fontWeight: 800, margin: '6px 0 0', color: '#22C55E' }}>
              +$239K
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
