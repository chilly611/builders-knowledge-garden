'use client';

// Budget Widget — drop-in component for Command Center project cards
// Shows real budget data from the budget tracking API when available,
// falls back to the project's inline budget fields

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/* ─── Supabase Browser Client ─── */
let browserClient: SupabaseClient | null = null;
function getSupabaseBrowser(): SupabaseClient {
  if (browserClient) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || url.includes('placeholder')) {
    return createClient('https://placeholder.supabase.co', 'placeholder-anon-key');
  }
  browserClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return browserClient;
}

/* ─── Types ─── */
interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  percentUsed: number;
  burnRate: number;
  projectedTotal: number;
  overUnder: number;
  byPhase: Record<string, { spent: number; estimated: number; count: number }>;
}

interface BudgetWidgetProps {
  projectId: string;
  /** Fallback display if API data isn't available */
  fallbackBudget?: string;
  fallbackStatus?: 'on-track' | 'over' | 'ahead';
  compact?: boolean;
}

const STATUS_COLORS = {
  'on-track': '#22C55E',
  over: '#EF4444',
  ahead: '#378ADD',
};

const PHASE_COLORS: Record<string, string> = {
  DREAM: '#D85A30',
  DESIGN: '#7F77DD',
  PLAN: '#1D9E75',
  BUILD: '#378ADD',
  DELIVER: '#BA7517',
  GROW: '#639922',
};

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

export default function BudgetWidget({
  projectId,
  fallbackBudget,
  fallbackStatus = 'on-track',
  compact = false,
}: BudgetWidgetProps) {
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchBudget() {
      try {
        const supabase = getSupabaseBrowser();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/v1/budget?project_id=${projectId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.summary) {
            setSummary(data.summary);
          }
        }
      } catch {
        // Silent fail — fall back to mock data
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBudget();
    return () => { cancelled = true; };
  }, [projectId]);

  // Compact mode: single line for project cards
  if (compact) {
    if (loading || !summary) {
      const color = STATUS_COLORS[fallbackStatus];
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
            {fallbackBudget || '—'}
          </span>
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            color,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {fallbackStatus}
          </span>
        </div>
      );
    }

    const status = summary.overUnder >= 0 ? 'on-track' : 'over';
    const color = STATUS_COLORS[status];

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
          {formatCurrency(summary.totalBudget)}
        </span>
        <span style={{
          fontSize: '10px', fontWeight: 700, color,
          textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
          {summary.percentUsed.toFixed(0)}% used
        </span>
      </div>
    );
  }

  // Full mode: detailed budget breakdown
  if (loading) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 16,
      }}>
        <div style={{
          height: 8, width: '60%', borderRadius: 4,
          background: 'rgba(255,255,255,0.06)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      </div>
    );
  }

  if (!summary) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 16,
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          No budget set
        </p>
        <a
          href={`/budget?project=${projectId}`}
          style={{
            fontSize: '12px', color: '#378ADD',
            textDecoration: 'none', fontWeight: 600,
            display: 'inline-block', marginTop: 8,
          }}
        >
          Set up budget →
        </a>
      </div>
    );
  }

  const isOver = summary.overUnder < 0;
  const statusColor = isOver ? '#EF4444' : '#22C55E';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${isOver ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 12,
        padding: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
          Budget
        </span>
        <span style={{ fontSize: '11px', color: statusColor, fontWeight: 700 }}>
          {isOver ? `${formatCurrency(Math.abs(summary.overUnder))} over` : `${formatCurrency(summary.remaining)} remaining`}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        width: '100%', height: 8, borderRadius: 4,
        background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden', marginBottom: 12,
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(summary.percentUsed, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            height: '100%', borderRadius: 4,
            background: isOver
              ? 'linear-gradient(90deg, #EF4444, #F87171)'
              : `linear-gradient(90deg, #1D9E75, #22C55E)`,
          }}
        />
      </div>

      {/* Metrics row */}
      <div style={{ display: 'flex', gap: 16 }}>
        <div>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', display: 'block' }}>Budget</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
            {formatCurrency(summary.totalBudget)}
          </span>
        </div>
        <div>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', display: 'block' }}>Spent</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
            {formatCurrency(summary.totalSpent)}
          </span>
        </div>
        <div>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', display: 'block' }}>Burn/day</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
            {formatCurrency(summary.burnRate)}
          </span>
        </div>
      </div>

      {/* Phase breakdown mini-bar */}
      {Object.keys(summary.byPhase).length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{
            display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden',
            background: 'rgba(255,255,255,0.04)',
          }}>
            {Object.entries(summary.byPhase).map(([phase, data]) => {
              const pct = summary.totalSpent > 0 ? (data.spent / summary.totalSpent) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={phase}
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: PHASE_COLORS[phase] || '#666',
                  }}
                  title={`${phase}: ${formatCurrency(data.spent)}`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Link to full budget page */}
      <a
        href={`/budget?project=${projectId}`}
        style={{
          display: 'block', marginTop: 10, fontSize: '11px',
          color: '#378ADD', textDecoration: 'none', fontWeight: 600,
        }}
      >
        View full budget →
      </a>
    </motion.div>
  );
}

