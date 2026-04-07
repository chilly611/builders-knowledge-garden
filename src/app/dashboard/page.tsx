'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

/* ─── Types ─── */
interface RecentProject {
  id: string;
  name: string;
  interface: string;
  interfaceLabel: string;
  phase: string;
  updatedAt: string;
  progress: number;
  emoji: string;
}

interface ActionItem {
  id: string;
  type: 'permit' | 'invoice' | 'milestone' | 'inspection';
  title: string;
  project: string;
  dueDate: string;
  urgency: 'high' | 'medium' | 'low';
}

interface ActivityEntry {
  id: string;
  action: string;
  detail: string;
  time: string;
  emoji: string;
}

interface TipItem {
  id: string;
  title: string;
  body: string;
  tag: string;
  tagColor: string;
}

/* ─── Design Tokens (CSS var references) ─── */
const T = {
  ink900: 'var(--bp-ink-900, #0B1D33)',
  ink700: 'var(--bp-ink-700, #1B3A5C)',
  ink600: 'var(--bp-ink-600, #24507A)',
  ink500: 'var(--bp-ink-500, #2E6699)',
  ink400: 'var(--bp-ink-400, #4A89BE)',
  ink300: 'var(--bp-ink-300, #7BAAD4)',
  ink200: 'var(--bp-ink-200, #A8CAE8)',
  ink100: 'var(--bp-ink-100, #D4E5F4)',
  ink50: 'var(--bp-ink-50, #EBF2FA)',
  paperCream: 'var(--bp-paper-cream, #FDF8F0)',
  paperWarm: 'var(--bp-paper-warm, #FAF3E8)',
  paperAged: 'var(--bp-paper-aged, #F5EDDF)',
  paperBorder: 'var(--bp-paper-border, #C9BFAA)',
  cyanMain: 'var(--bp-cyan-main, #00B8D4)',
  cyanBright: 'var(--bp-cyan-bright, #00D4E8)',
  cyanDeep: 'var(--bp-cyan-deep, #00796B)',
  amberMain: 'var(--bp-amber-main, #FFA726)',
  amberBright: 'var(--bp-amber-bright, #FFCA28)',
  amberDeep: 'var(--bp-amber-deep, #E65100)',
  success: 'var(--bp-success, #2E7D32)',
  successLight: 'var(--bp-success-light, #E8F5E9)',
  warning: 'var(--bp-warning, #E65100)',
  warningLight: 'var(--bp-warning-light, #FFF3E0)',
  error: 'var(--bp-error, #C62828)',
  errorLight: 'var(--bp-error-light, #FFEBEE)',
  phaseDream: 'var(--bp-phase-dream, #D85A30)',
  phaseDesign: 'var(--bp-phase-design, #7F77DD)',
  phasePlan: 'var(--bp-phase-plan, #1B3A5C)',
  phaseBuild: 'var(--bp-phase-build, #378ADD)',
  phaseDeliver: 'var(--bp-phase-deliver, #BA7517)',
  phaseGrow: 'var(--bp-phase-grow, #2E7D32)',
  shadowSm: 'var(--bp-shadow-sm, 0 1px 3px rgba(11,29,51,0.06))',
  shadowMd: 'var(--bp-shadow-md, 0 4px 6px rgba(11,29,51,0.07))',
  shadowLg: 'var(--bp-shadow-lg, 0 10px 15px rgba(11,29,51,0.08))',
  shadowGlow: 'var(--bp-shadow-glow, 0 0 15px rgba(0,184,212,0.3))',
  radiusMd: 'var(--bp-radius-md, 6px)',
  radiusLg: 'var(--bp-radius-lg, 8px)',
  radiusXl: 'var(--bp-radius-xl, 12px)',
  radius2xl: 'var(--bp-radius-2xl, 16px)',
  fontBody: "var(--bp-font-body, 'Inter', sans-serif)",
  fontMono: "var(--bp-font-mono, 'IBM Plex Mono', monospace)",
  fontDisplay: "var(--bp-font-display, 'Playfair Display', serif)",
  transSmooth: 'var(--bp-transition-smooth, 300ms cubic-bezier(0.4,0,0.2,1))',
};

/* ─── Demo Data ─── */
const DEMO_PROJECTS: RecentProject[] = [
  { id: 'p1', name: 'Oceanview Residence', interface: 'dream-oracle', interfaceLabel: 'Oracle', phase: 'DESIGN', updatedAt: '2 hours ago', progress: 34, emoji: '🏠' },
  { id: 'p2', name: 'Downtown Mixed-Use', interface: 'dream-design', interfaceLabel: 'Design Studio', phase: 'PLAN', updatedAt: 'Yesterday', progress: 18, emoji: '🏢' },
  { id: 'p3', name: 'Garden ADU', interface: 'dream-imagine', interfaceLabel: 'Sandbox', phase: 'DREAM', updatedAt: '3 days ago', progress: 72, emoji: '🌿' },
];

const DEMO_ACTIONS: ActionItem[] = [
  { id: 'a1', type: 'permit', title: 'Building permit review due', project: 'Oceanview Residence', dueDate: 'Apr 10', urgency: 'high' },
  { id: 'a2', type: 'invoice', title: 'Framing subcontractor invoice', project: 'Downtown Mixed-Use', dueDate: 'Apr 14', urgency: 'medium' },
  { id: 'a3', type: 'milestone', title: 'Foundation pour complete', project: 'Garden ADU', dueDate: 'Apr 12', urgency: 'low' },
  { id: 'a4', type: 'inspection', title: 'Electrical rough-in inspection', project: 'Oceanview Residence', dueDate: 'Apr 16', urgency: 'medium' },
];

const DEMO_ACTIVITY: ActivityEntry[] = [
  { id: 'act1', action: 'Saved project', detail: 'Oceanview Residence — Oracle', time: '2h ago', emoji: '💾' },
  { id: 'act2', action: 'Completed quest', detail: 'First Dream Captured (+50 XP)', time: '5h ago', emoji: '⭐' },
  { id: 'act3', action: 'AI Copilot query', detail: '"IRC 2024 deck ledger bolt spacing"', time: 'Yesterday', emoji: '🧠' },
  { id: 'act4', action: 'Budget updated', detail: 'Downtown Mixed-Use — $8.5M revised', time: 'Yesterday', emoji: '💰' },
  { id: 'act5', action: 'New material saved', detail: 'Engineered LVL beam — 24ft span', time: '2 days ago', emoji: '📐' },
];

const DEMO_TIPS: TipItem[] = [
  { id: 't1', title: 'Voice commands now available', body: 'Try speaking your dream description in the Oracle — supports 30+ languages.', tag: 'New', tagColor: '#00B8D4' },
  { id: 't2', title: 'IRC 2024 codes updated', body: '142 jurisdictions now reflect the latest International Residential Code amendments.', tag: 'Knowledge', tagColor: '#2E7D32' },
  { id: 't3', title: 'Pro tip: Cross-interface dreams', body: 'Start in the Oracle, refine in Design Studio, explore in Cosmos. Your DreamEssence travels with you.', tag: 'Tip', tagColor: '#7F77DD' },
];

const DREAM_INTERFACES = [
  { key: 'upload', label: 'Upload Studio', desc: 'Photos & plans → AI dreams', href: '/dream-upload', emoji: '📷', color: '#D85A30', bg: 'rgba(216,90,48,0.06)' },
  { key: 'imagine', label: 'Imagination Sandbox', desc: 'Free-form creative exploration', href: '/dream-imagine', emoji: '✨', color: '#7F77DD', bg: 'rgba(127,119,221,0.06)' },
  { key: 'design', label: 'Design Studio', desc: 'AI-generated buildable designs', href: '/dream-design', emoji: '🎨', color: '#378ADD', bg: 'rgba(55,138,221,0.06)' },
];

const ACTION_TYPE_META: Record<string, { emoji: string; color: string }> = {
  permit: { emoji: '📋', color: '#1B3A5C' },
  invoice: { emoji: '💵', color: '#BA7517' },
  milestone: { emoji: '🏁', color: '#2E7D32' },
  inspection: { emoji: '🔍', color: '#378ADD' },
};

const URGENCY_STYLES: Record<string, { bg: string; border: string; dot: string }> = {
  high: { bg: '#FFEBEE', border: '#C62828', dot: '#EF4444' },
  medium: { bg: '#FFF3E0', border: '#E65100', dot: '#F59E0B' },
  low: { bg: '#E8F5E9', border: '#2E7D32', dot: '#22C55E' },
};

/* ─── Helpers ─── */
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getPhaseColor(phase: string): string {
  const map: Record<string, string> = {
    DREAM: '#D85A30', DESIGN: '#7F77DD', PLAN: '#1B3A5C',
    BUILD: '#378ADD', DELIVER: '#BA7517', GROW: '#2E7D32',
  };
  return map[phase] || '#2E6699';
}

/* ─── Reusable Card Wrapper ─── */
function Card({ children, style, hover = true }: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  hover?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => hover && setHovered(true)}
      onMouseLeave={() => hover && setHovered(false)}
      style={{
        background: '#FEFEFE',
        border: '1px solid rgba(27,58,92,0.12)',
        borderRadius: 12,
        padding: 20,
        transition: 'all 0.2s ease',
        boxShadow: hovered
          ? '0 8px 20px rgba(11,29,51,0.10), 0 0 0 1px rgba(0,184,212,0.15)'
          : '0 1px 3px rgba(11,29,51,0.06)',
        transform: hovered ? 'translateY(-1px)' : 'none',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Section Header ─── */
function SectionHeader({ title, icon, action }: {
  title: string;
  icon: string;
  action?: { label: string; href: string };
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <h2 style={{
        fontFamily: T.fontBody, fontSize: 16, fontWeight: 700,
        color: '#0B1D33', margin: 0, display: 'flex', alignItems: 'center', gap: 8,
        letterSpacing: '-0.01em',
      }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        {title}
      </h2>
      {action && (
        <Link href={action.href} style={{
          fontFamily: T.fontMono, fontSize: 11, fontWeight: 500,
          color: '#00B8D4', textDecoration: 'none', letterSpacing: '0.03em',
          textTransform: 'uppercase',
        }}>
          {action.label} →
        </Link>
      )}
    </div>
  );
}

/* ─── XP Bar ─── */
function XPBar({ current, max, level }: { current: number; max: number; level: number }) {
  const pct = Math.min((current / max) * 100, 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        fontFamily: T.fontMono, fontSize: 11, fontWeight: 600,
        color: '#00B8D4', background: 'rgba(0,184,212,0.08)',
        padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap',
      }}>
        LVL {level}
      </div>
      <div style={{
        flex: 1, height: 6, background: 'rgba(27,58,92,0.08)',
        borderRadius: 3, overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, height: '100%',
          width: `${pct}%`, borderRadius: 3,
          background: 'linear-gradient(90deg, #00B8D4, #00D4E8)',
          transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
      <span style={{
        fontFamily: T.fontMono, fontSize: 10, color: '#4A89BE',
        whiteSpace: 'nowrap',
      }}>
        {current}/{max} XP
      </span>
    </div>
  );
}

/* ─── Progress Ring ─── */
function ProgressRing({ progress, size = 40, color }: { progress: number; size?: number; color: string }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(27,58,92,0.08)" strokeWidth={4} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={4} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: 'center', fontSize: 10, fontWeight: 700, fill: color, fontFamily: 'Inter, sans-serif' }}
      >
        {progress}%
      </text>
    </svg>
  );
}

/* ─── Killer App Metric ─── */
function MetricCard({ label, value, sub, color }: {
  label: string; value: string; sub: string; color: string;
}) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{
        fontFamily: T.fontMono, fontSize: 10, fontWeight: 500,
        color: '#4A89BE', textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: 4,
      }}>{label}</div>
      <div style={{
        fontFamily: T.fontBody, fontSize: 22, fontWeight: 800,
        color, letterSpacing: '-0.02em',
      }}>{value}</div>
      <div style={{
        fontFamily: T.fontMono, fontSize: 10, color: '#7BAAD4', marginTop: 2,
      }}>{sub}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DASHBOARD PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState('');

  useEffect(() => {
    setMounted(true);
    const d = new Date();
    setNow(d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));
  }, []);

  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Builder';
  const greeting = getGreeting();

  // Demo gamification data
  const xp = 1250;
  const xpMax = 2000;
  const level = 4;
  const streak = 7;
  const tier = 'Craftsman';

  if (!mounted) {
    return (
      <div style={{
        minHeight: '100vh', background: '#FDF8F0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: T.fontMono, fontSize: 13, color: '#4A89BE',
          animation: 'pulse 1.5s ease infinite',
        }}>
          Loading launchpad...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FDF8F0',
      backgroundImage: `
        linear-gradient(rgba(27,58,92,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(27,58,92,0.04) 1px, transparent 1px)
      `,
      backgroundSize: '40px 40px',
      fontFamily: T.fontBody,
    }}>
      {/* ─── Top Bar ─── */}
      <header style={{
        background: 'rgba(254,254,254,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(27,58,92,0.1)',
        padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}›Leaf Emoji</span>
          <span style={{
            fontFamily: T.fontDisplay, fontSize: 17, fontWeight: 700,
            color: '#0B1D33', letterSpacing: '-0.01em',
          }}>
            Builder&apos;s Knowledge Garden
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/dream-oracle" style={{
            fontFamily: T.fontMono, fontSize: 11, color: '#4A89BE',
            textDecoration: 'none', padding: '6px 12px', borderRadius: 6,
            border: '1px solid rgba(27,58,92,0.1)', background: 'rgba(27,58,92,0.03)',
          }}>
            🧭 Compass
          </Link>
          {isAuthenticated && (
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #00B8D4, #1B3A5C)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 13, fontWeight: 700,
            }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main style={{
        maxWidth: 1120,
        margin: '0 auto',
        padding: '32px 24px 64px',
      }}>

        {/* ═══ WELCOME BANNER ═══ */}
        <section style={{
          background: 'linear-gradient(135deg, rgba(0,184,212,0.04), rgba(27,58,92,0.03))',
          border: '1px solid rgba(0,184,212,0.12)',
          borderRadius: 16,
          padding: '28px 32px',
          marginBottom: 28,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Subtle corner ornament */}
          <div style={{
            position: 'absolute', top: 0, right: 0, width: 120, height: 120,
            background: 'radial-gradient(circle at top right, rgba(0,184,212,0.06), transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <h1 style={{
                fontFamily: T.fontDisplay, fontSize: 26, fontWeight: 700,
                color: '#0B1D33', margin: '0 0 4px', letterSpacing: '-0.02em',
              }}>
                {greeting}, {displayName}
              </h1>
              <p style={{
                fontFamily: T.fontMono, fontSize: 12, color: '#4A89BE',
                margin: '0 0 16px', letterSpacing: '0.02em',
              }}>
                {now}
              </p>
              <XPBar current={xp} max={xpMax} level={level} />
            </div>

            {/* Streak & Tier badges */}
            <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
              <div style={{
                textAlign: 'center', padding: '12px 18px', borderRadius: 12,
                background: 'rgba(255,167,38,0.08)', border: '1px solid rgba(255,167,38,0.15)',
              }}>
                <div style={{ fontSize: 22, lineHeight: 1 }}>🔥</div>
                <div style={{
                  fontFamily: T.fontBody, fontSize: 18, fontWeight: 800,
                  color: '#E65100', marginTop: 4,
                }}>{streak}</div>
                <div style={{
                  fontFamily: T.fontMono, fontSize: 9, color: '#F57C00',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>day streak</div>
              </div>
              <div style={{
                textAlign: 'center', padding: '12px 18px', borderRadius: 12,
                background: 'rgba(0,184,212,0.06)', border: '1px solid rgba(0,184,212,0.12)',
              }}>
                <div style={{ fontSize: 22, lineHeight: 1 }}>🏗️</div>
                <div style={{
                  fontFamily: T.fontBody, fontSize: 14, fontWeight: 700,
                  color: '#0097A7', marginTop: 4,
                }}>{tier}</div>
                <div style={{
                  fontFamily: T.fontMono, fontSize: 9, color: '#00B8D4',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>rank</div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ TWO-COLUMN LAYOUT ═══ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
          gap: 24,
          alignItems: 'start',
        }}>
          {/* ─── LEFT COLUMN ─── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* CONTINUE WHERE YOU LEFT OFF
F */}
            <section>
              <SectionHeader title="Continue Where You Left Off" icon="📌" action={{ label: 'All Projects', href: '/command-center' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {DEMO_PROJECTS.map((p) => (
                  <Link key={p.id} href={`/${p.interface}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <Card>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <ProgressRing progress={p.progress} color={getPhaseColor(p.phase)} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                            <span style={{ fontSize: 16 }}>{p.emoji}</span>
                            <span style={{
                              fontFamily: T.fontBody, fontSize: 14, fontWeight: 600,
                              color: '#0B1D33',
                            }}>{p.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              fontFamily: T.fontMono, fontSize: 10, fontWeight: 600,
                              color: getPhaseColor(p.phase),
                              background: `${getPhaseColor(p.phase)}10`,
                              padding: '2px 7px', borderRadius: 4,
                              textTransform: 'uppercase', letterSpacing: '0.04em',
                            }}>{p.phase}</span>
                            <span style={{
                              fontFamily: T.fontMono, fontSize: 10, color: '#7BAAD4',
                            }}>via {p.interfaceLabel}</span>
                            <span style={{
                              fontFamily: T.fontMono, fontSize: 10, color: '#A8CAE8',
                            }}>· {p.updatedAt}</span>
                          </div>
                        </div>
                        <span style={{ color: '#A8CAE8', fontSize: 18 }}>→</span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>

            {/* ACTION ITEMS */}
            <section>
              <SectionHeader title="Action Items" icon="⚡" action={{ label: 'View All', href: '/command-center' }} />
              <Card hover={false}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {DEMO_ACTIONS.map((a, i) => {
                    const meta = ACTION_TYPE_META[a.type] || { emoji: '📌', color: '#2E6699' };
                    const urg = URGENCY_STYLES[a.urgency];
                    return (
                      <div key={a.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 0',
                        borderBottom: i < DEMO_ACTIONS.length - 1 ? '1px solid rgba(27,58,92,0.06)' : 'none',
                      }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: urg.dot, flexShrink: 0,
                        }} />
                        <span style={{ fontSize: 16, flexShrink: 0 }}>{meta.emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontFamily: T.fontBody, fontSize: 13, fontWeight: 600,
                            color: '#0B1D33',
                          }}>{a.title}</div>
                          <div style={{
                            fontFamily: T.fontMono, fontSize: 10, color: '#7BAAD4',
                          }}>{a.project}</div>
                        </div>
                        <div style={{
                          fontFamily: T.fontMono, fontSize: 11, fontWeight: 500,
                          color: a.urgency === 'high' ? '#C62828' : '#4A89BE',
                          whiteSpace: 'nowrap',
                        }}>
                          {a.dueDate}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </section>

            {/* KILLER APP QUICK ACCESS */}
            <section>
              <SectionHeader title="Killer App — Command Center" icon="⚡" action={{ label: 'Open', href: '/command-center' }} />
              <Card>
                <div style={{ display: 'flex', gap: 0, marginBottom: 16 }}>
                  <MetricCard label="Active Projects" value="3" sub="1 at risk" color="#0B1D33" />
                  <div style={{ width: 1, background: 'rgba(27,58,92,0.08)', margin: '0 12px' }} />
                  <MetricCard label="This Week" value="12" sub="tasks completed" color="#00B8D4" />
                  <div style={{ width: 1, background: 'rgba(27,58,92,0.08)', margin: '0 12px' }} />
                  <MetricCard label="Budget" value="$9.7M" sub="across portfolio" color="#2E7D32" />
                  <div style={{ width: 1, background: 'rgba(27,58,92,0.08)', margin: '0 12px' }} />
                  <MetricCard label="Team" value="24" sub="members active" color="#BA7517" />
                </div>
                <Link href="/command-center" style={{
                  display: 'block', textAlign: 'center', textDecoration: 'none',
                  fontFamily: T.fontMono, fontSize: 12, fontWeight: 600,
                  color: '#FEFEFE', background: 'linear-gradient(135deg, #1B3A5C, #24507A)',
                  padding: '10px 20px', borderRadius: 8,
                  letterSpacing: '0.03em', transition: 'all 0.15s',
                }}>
                  Open Command Center →
                </Link>
              </Card>
            </section>

          </div>

          {/* ─── RIGHT COLUMN ─── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* DREAM QUICK LAUNCH */}
            <section>
              <SectionHeader title="Dream Builder" icon="💭" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {DREAM_INTERFACES.map((d) => (
                  <Link key={d.key} href={d.href} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <Card style={{ padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 42, height: 42, borderRadius: 10,
                          background: d.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 20, flexShrink: 0,
                          border: `1px solid ${d.color}20`,
                        }}>
                          {d.emoji}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontFamily: T.fontBody, fontSize: 13, fontWeight: 600,
                            color: '#0B1D33',
                          }}>{d.label}</div>
                          <div style={{
                            fontFamily: T.fontMono, fontSize: 10, color: '#7BAAD4',
                          }}>{d.desc}</div>
                        </div>
                        <span style={{ color: d.color, fontSize: 16, opacity: 0.6 }}>→</span>
                      </div>
                    </Card>
                  </Link>
                ))}
                <Link href="/dream-oracle" style={{
                  display: 'block', textAlign: 'center', textDecoration: 'none',
                  fontFamily: T.fontMono, fontSize: 11, fontWeight: 600,
                  color: '#D85A30', background: 'rgba(216,90,48,0.06)',
                  padding: '10px 16px', borderRadius: 8,
                  border: '1px solid rgba(216,90,48,0.12)',
                  letterSpacing: '0.03em',
                }}>
                  🔮 Start with the Oracle →
                </Link>
              </div>
            </section>

            {/* TIPS & NEWS */}
            <section>
              <SectionHeader title="Tips & News" icon="📰" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {DEMO_TIPS.map((tip) => (
                  <Card key={tip.id} style={{ padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{
                        fontFamily: T.fontMono, fontSize: 9, fontWeight: 700,
                        color: '#FEFEFE', background: tip.tagColor,
                        padding: '2px 7px', borderRadius: 4,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>{tip.tag}</span>
                      <span style={{
                        fontFamily: T.fontBody, fontSize: 12, fontWeight: 600, color: '#0B1D33',
                      }}>{tip.title}</span>
                    </div>
                    <p style={{
                      fontFamily: T.fontBody, fontSize: 12, color: '#4A89BE',
                      margin: 0, lineHeight: 1.5,
                    }}>{tip.body}</p>
                  </Card>
                ))}
              </div>
            </section>

            {/* RECENT ACTIVITY */}
            <section>
              <SectionHeader title="Recent Activity" icon="🕐" />
              <Card hover={false} style={{ padding: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {DEMO_ACTIVITY.map((act, i) => (
                    <div key={act.id} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '10px 0',
                      borderBottom: i < DEMO_ACTIVITY.length - 1 ? '1px solid rgba(27,58,92,0.05)' : 'none',
                    }}>
                      <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{act.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: T.fontBody, fontSize: 12, fontWeight: 600,
                          color: '#0B1D33',
                        }}>{act.action}</div>
                        <div style={{
                          fontFamily: T.fontMono, fontSize: 10, color: '#7BAAD4',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{act.detail}</div>
                      </div>
                      <span style={{
                        fontFamily: T.fontMono, fontSize: 10, color: '#A8CAE8',
                        whiteSpace: 'nowrap', flexShrink: 0,
                      }}>{act.time}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </section>

          </div>
        </div>

      </main>

      {/* ─── Responsive ─── */}
      <style>{`
        @media (max-width: 768px) {
          main > div:last-child {
            grid-template-columns: 1fr !important;
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
