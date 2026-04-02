'use client';
import { useState, useEffect } from 'react';
import KillerAppNav from '@/components/KillerAppNav';

const DEMO_INVOICES = [
  { id: 'INV-0041', client: 'James & Linda Hoffman', project: 'Oceanview Residence', amount: '$48,000', due: 'Apr 8', status: 'sent', pct: 'Draw #4' },
  { id: 'INV-0040', client: 'Westfield Dev', project: 'Downtown Mixed-Use', amount: '$180,000', due: 'Apr 5', status: 'overdue', pct: 'Draw #8' },
  { id: 'INV-0039', client: 'DataCore Construction', project: 'Tech Campus Ph.2', amount: '$95,000', due: 'Apr 2', status: 'paid', pct: 'Draw #3' },
];

const CASHFLOW = [
  { month: 'Jan', in: 280, out: 210 }, { month: 'Feb', in: 310, out: 240 },
  { month: 'Mar', in: 260, out: 220 }, { month: 'Apr', in: 340, out: 200 },
  { month: 'May', in: 380, out: 230 }, { month: 'Jun', in: 420, out: 260 },
];

const STATUS_COLOR: Record<string, string> = { sent: '#378ADD', overdue: '#EF4444', paid: '#22C55E' };

const FEATURES = [
  { icon: '📄', title: 'AIA Pay Applications', desc: 'G702/G703 auto-generated from your schedule of values. Send with one click. Track payment status.' },
  { icon: '🔄', title: 'Change Order Billing', desc: 'Change order approved → invoice created automatically. No manual entry. No dropped change orders.' },
  { icon: '💹', title: 'Job Costing (live)', desc: 'Real-time budget vs. actual by CSI cost code. See where every dollar is before it becomes a problem.' },
  { icon: '🩺', title: 'Cash Flow Forecast', desc: '90-day rolling cash position based on your draws, payables, and project schedules.' },
  { icon: '⚖️', title: 'Lien Waivers', desc: 'Conditional and unconditional lien waivers auto-generated when payments clear. Jurisdiction-aware.' },
  { icon: '📊', title: 'P&L by Project', desc: 'Revenue, COGS, gross margin, overhead allocation per project. See which jobs make money.' },
];

export default function FinancesPage() {
  const [mounted, setMounted] = useState(false);
  const [progress] = useState(45);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const maxVal = Math.max(...CASHFLOW.map(d => Math.max(d.in, d.out)));

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'var(--font-archivo), sans-serif' }}>
      <KillerAppNav />
      <div style={{ paddingTop: 48 }}>

        {/* Hero */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.03) 60%, transparent)',
          borderBottom: '1px solid rgba(34,197,94,0.12)',
          padding: '32px 32px 28px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 28 }}>💰</span>
                <div>
                  <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Finances</h1>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>AIA billing · job costing · cash flow · lien waivers</p>
                </div>
              </div>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', maxWidth: 560, lineHeight: 1.6, margin: '12px 0 0' }}>
                The first financial tool built specifically for how construction gets paid. AIA pay apps, change order billing, lien waivers — all auto-generated from your project data.
              </p>
            </div>
            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, padding: '16px 20px', minWidth: 200 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#22C55E', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px' }}>Development</p>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #22C55E, #4ADE80)', borderRadius: 3 }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>{progress}% complete</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>Launching Q3 2026</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 0, minHeight: 'calc(100vh - 200px)' }}>
          <div style={{ padding: '24px 28px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>

            {/* Invoice list demo */}
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 14px' }}>Invoice Dashboard Preview</h2>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 16 }}>
                {[{ label: 'Outstanding', val: '$228K', color: '#378ADD' }, { label: 'Overdue', val: '$180K', color: '#EF4444' }, { label: 'Paid (30d)', val: '$95K', color: '#22C55E' }].map((s, i) => (
                  <div key={i}>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: '0 0 2px' }}>{s.label}</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: s.color, margin: 0 }}>{s.val}</p>
                  </div>
                ))}
              </div>
              {DEMO_INVOICES.map((inv, i) => (
                <div key={i} style={{ padding: '12px 16px', borderBottom: i < DEMO_INVOICES.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>{inv.id} · {inv.pct}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{inv.project}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>{inv.amount}</p>
                    <span style={{ fontSize: 9, fontWeight: 700, color: STATUS_COLOR[inv.status], background: `${STATUS_COLOR[inv.status]}15`, border: `1px solid ${STATUS_COLOR[inv.status]}30`, borderRadius: 4, padding: '2px 6px', textTransform: 'uppercase' }}>{inv.status}</span>
                  </div>
                </div>
              ))}
              <div style={{ padding: '10px 16px', background: 'rgba(34,197,94,0.05)', borderTop: '1px solid rgba(34,197,94,0.1)' }}>
                <button style={{ background: 'none', border: '1px dashed rgba(34,197,94,0.3)', borderRadius: 7, padding: '6px 14px', color: '#22C55E', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  + Generate AIA Pay Application
                </button>
              </div>
            </div>

            {/* Cash flow chart */}
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 14px' }}>Cash Flow Preview</h2>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '20px' }}>
              <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 80, marginBottom: 8 }}>
                {CASHFLOW.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, height: `${(d.in / maxVal) * 80}px`, background: 'rgba(34,197,94,0.5)', borderRadius: '3px 3px 0 0' }} />
                    <div style={{ flex: 1, height: `${(d.out / maxVal) * 80}px`, background: 'rgba(239,68,68,0.4)', borderRadius: '3px 3px 0 0' }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {CASHFLOW.map((d, i) => <span key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{d.month}</span>)}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(34,197,94,0.5)' }} /><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Receipts</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(239,68,68,0.4)' }} /><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Payables</span></div>
              </div>
            </div>

            {/* Features grid */}
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', margin: '24px 0 14px' }}>What's included</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 10 }}>
              {FEATURES.map((f, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{f.icon}</span>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 3px', color: '#fff' }}>{f.title}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.4 }}>{f.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: gap analysis + CTA */}
          <div style={{ padding: '24px 20px' }}>
            <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 12, padding: '16px', marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#22C55E', margin: '0 0 8px' }}>The gap nobody fills</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>
                Procore has some financials but they're built for $50M+ firms with accountants. QuickBooks doesn't understand construction billing. Buildertrend's financial tools can't handle AIA applications. Nobody combines PM + AI + construction-native financials in one platform.
              </p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px', marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>Early access</p>
              <input placeholder="your@email.com" style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 12, marginBottom: 10, fontFamily: 'inherit', outline: 'none' }} />
              <button style={{ width: '100%', background: '#22C55E', border: 'none', borderRadius: 8, padding: '10px 0', color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                💰 Notify me when Finances launches
              </button>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>🎮 Unlock Condition</p>
              <p style={{ fontSize: 12, color: '#fff', margin: '0 0 8px' }}>Reach Level 4 Builder to unlock Finances Beta</p>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '28%', background: 'linear-gradient(90deg, #22C55E, #4ADE80)', borderRadius: 3 }} />
              </div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: '4px 0 0' }}>2,840 / 10,000 XP</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
