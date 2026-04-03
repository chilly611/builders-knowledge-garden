'use client';
import { useState, useEffect } from 'react';
import KillerAppNav from '@/components/KillerAppNav';

const DOCS_FEATURES = [
  { icon: '❓', title: 'Smart RFIs', desc: 'Request for information auto-routed to the right person, with your knowledge engine providing suggested answers.' },
  { icon: '📦', title: 'Submittals', desc: 'Track every submittal through the approval chain. Automatic reminders. Status visible to all parties.' },
  { icon: '🔄', title: 'Change Orders', desc: 'Create, price, and track change orders with cost impact auto-calculated from your knowledge engine.' },
  { icon: '📐', title: 'Drawing Sets', desc: 'Version-controlled drawing sets with markup, comparison view, and revision history.' },
  { icon: '🔍', title: 'As-Built Docs', desc: 'Auto-assemble as-built documents from field photos, voice logs, and inspection records.' },
  { icon: '🤝', title: 'Contracts & Specs', desc: 'AI-drafted contracts referencing current codes, jurisdiction requirements, and standard construction terms.' },
];

const DEMO_DOCS = [
  { type: 'RFI', id: 'RFI-047', title: 'Waterproofing membrane at grade beam penetration', status: 'Open', assignee: 'Arch.', daysOpen: 3 },
  { type: 'Submittal', id: 'SUB-022', title: 'Structural steel shop drawings — Bay D', status: 'Under Review', assignee: 'SE', daysOpen: 8 },
  { type: 'Change Order', id: 'CO-011', title: 'Added MEP coordination — kitchen layout revision', status: 'Pending Approval', assignee: 'Client', daysOpen: 4 },
  { type: 'Drawing', id: 'A2.1 r3', title: 'Floor plan — Level 2 — Rev 3', status: 'Current', assignee: '—', daysOpen: 0 },
];

const STATUS_COLOR: Record<string, string> = {
  'Open': '#EF4444', 'Under Review': '#F59E0B', 'Pending Approval': '#378ADD', 'Current': '#22C55E',
};

export default function DocumentsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #ffffff)', color: 'var(--fg, #111111)', fontFamily: 'var(--font-archivo), sans-serif' }}>
      <KillerAppNav />
      <div style={{ paddingTop: 48 }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(55,138,221,0.1) 0%, transparent 60%)', borderBottom: '1px solid rgba(55,138,221,0.15)', padding: '32px 32px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 28 }}>📋</span>
                <div>
                  <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Documents</h1>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>RFIs · submittals · change orders · drawings</p>
                </div>
              </div>
              <p style={{ fontSize: 15, color: '#666', maxWidth: 520, lineHeight: 1.6, margin: '12px 0 0' }}>
                Documents that understand construction. RFIs auto-answered by your knowledge engine. Change orders priced in seconds. Submittals routed intelligently.
              </p>
            </div>
            <div style={{ background: 'rgba(55,138,221,0.08)', border: '1px solid rgba(55,138,221,0.2)', borderRadius: 12, padding: '16px 20px', minWidth: 180, textAlign: 'center' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#378ADD', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 4px' }}>Coming</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>Q4 2026</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', minHeight: 'calc(100vh - 200px)' }}>
          <div style={{ padding: '24px 28px', borderRight: '1px solid #e5e5e0' }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 14px' }}>Document Log Preview</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 24 }}>
              {DEMO_DOCS.map((d, i) => (
                <div key={i} style={{ background: '#F5F5F0', border: '1px solid #e5e5e0', borderRadius: 10, padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#378ADD', background: 'rgba(55,138,221,0.1)', border: '1px solid rgba(55,138,221,0.2)', borderRadius: 4, padding: '1px 5px' }}>{d.type}</span>
                      <span style={{ fontSize: 10, color: '#999' }}>{d.id}</span>
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{d.title}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                    <span style={{ fontSize: 9, fontWeight: 600, color: STATUS_COLOR[d.status] || '#fff', background: `${STATUS_COLOR[d.status] || '#fff'}15`, border: `1px solid ${STATUS_COLOR[d.status] || '#fff'}30`, borderRadius: 4, padding: '2px 6px', display: 'block', marginBottom: 3 }}>{d.status}</span>
                    {d.daysOpen > 0 && <span style={{ fontSize: 9, color: '#aaa' }}>{d.daysOpen}d open</span>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 10 }}>
              {DOCS_FEATURES.map((f, i) => (
                <div key={i} style={{ background: '#FAFAF8', border: '1px solid #e5e5e0', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{f.icon}</span>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 3px', color: '#1a1a1a' }}>{f.title}</p>
                      <p style={{ fontSize: 11, color: '#888', margin: 0, lineHeight: 1.4 }}>{f.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: '24px 20px' }}>
            <div style={{ background: 'rgba(55,138,221,0.06)', border: '1px solid rgba(55,138,221,0.15)', borderRadius: 12, padding: '14px', marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#378ADD', margin: '0 0 6px' }}>vs. PlanGrid (Autodesk), Procore Docs</p>
              <p style={{ fontSize: 11, color: '#888', margin: 0, lineHeight: 1.5 }}>PlanGrid is great at storing PDFs. We store documents that KNOW their content — RFIs auto-answered, drawings linked to code requirements, change orders auto-priced.</p>
            </div>
            <input placeholder="your@email.com" style={{ width: '100%', boxSizing: 'border-box', background: '#F0F0EB', border: '1px solid #e5e5e0', borderRadius: 8, padding: '8px 12px', color: '#1a1a1a', fontSize: 12, marginBottom: 10, fontFamily: 'inherit', outline: 'none' }} />
            <button style={{ width: '100%', background: '#378ADD', border: 'none', borderRadius: 8, padding: '10px 0', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>📋 Notify me</button>
          </div>
        </div>
      </div>
    </div>
  );
}
