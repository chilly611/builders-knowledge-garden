// CLIENTS PAGE
'use client';
import { useState, useEffect } from 'react';
import KillerAppNav from '@/components/KillerAppNav';

const CLIENTS_FEATURES = [
  { icon: '🧠', title: 'AI-enriched lead scoring', desc: 'Every new lead is auto-enriched with project history, typical budget range, and likelihood to close — from your knowledge engine.' },
  { icon: '📝', title: 'Proposal generator', desc: 'Select a client + project type → AI generates a full proposal with your pricing, relevant code refs, and timeline.' },
  { icon: '🔁', title: 'Full lifecycle CRM', desc: 'Lead → Proposal → Contract → Active Project → Warranty. One view. Never lose track of where a relationship stands.' },
  { icon: '🌐', title: 'Client portal', desc: 'Branded client view of their project: progress, photos, schedule, invoices. They never need to call for an update.' },
  { icon: '📊', title: 'Win/loss analytics', desc: 'Which project types do you win? Which clients are most profitable? AI surfaces the patterns you miss.' },
  { icon: '🔔', title: 'Repeat client radar', desc: '"Sarah last built 3 years ago. Her neighborhood is booming. Time to reach out?" — AI-triggered relationship alerts.' },
];

export function ClientsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const DEMO_CLIENTS = [
    { name: 'Westfield Developments', type: 'Multi-family developer', projects: 3, value: '$12.7M', stage: 'Active Client', temp: '🔥' },
    { name: 'Angela Washington', type: 'Data center owner-rep', projects: 1, value: '$18.5M', stage: 'Proposal Out', temp: '🔥' },
    { name: 'Tom Nguyen GC', type: 'General contractor', projects: 4, value: '$4.2M', stage: 'Active Client', temp: '🟡' },
    { name: 'Jennifer Park', type: 'Homeowner / DIY', projects: 1, value: '$450K', stage: 'Dream Stage', temp: '🔵' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #ffffff)', color: 'var(--fg, #111111)', fontFamily: 'var(--font-archivo), sans-serif' }}>
      <KillerAppNav />
      <div style={{ paddingTop: 48 }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(127,119,221,0.1) 0%, transparent 60%)', borderBottom: '1px solid rgba(127,119,221,0.15)', padding: '32px 32px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 28 }}>👥</span>
                <div>
                  <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Clients</h1>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--fg-secondary, #555555)' }}>AEC-native CRM · proposals · client portal</p>
                </div>
              </div>
              <p style={{ fontSize: 15, color: '#666', maxWidth: 520, lineHeight: 1.6, margin: '12px 0 0' }}>
                A CRM that knows building codes. Every client relationship connected to real project data, real knowledge, and AI that understands construction.
              </p>
            </div>
            <div style={{ background: 'rgba(127,119,221,0.08)', border: '1px solid rgba(127,119,221,0.2)', borderRadius: 12, padding: '16px 20px', minWidth: 180, textAlign: 'center' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#7F77DD', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 4px' }}>Coming</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>Q3 2026</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', minHeight: 'calc(100vh - 200px)' }}>
          <div style={{ padding: '24px 28px', borderRight: '1px solid #e5e5e0' }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 14px' }}>Client Pipeline Preview</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {DEMO_CLIENTS.map((c, i) => (
                <div key={i} style={{ background: '#F5F5F0', border: '1px solid #e5e5e0', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', margin: '0 0 2px' }}>{c.temp} {c.name}</p>
                    <p style={{ fontSize: 11, color: '#999', margin: 0 }}>{c.type} · {c.projects} project{c.projects > 1 ? 's' : ''}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: '0 0 3px' }}>{c.value}</p>
                    <span style={{ fontSize: 9, fontWeight: 600, color: '#7F77DD', background: 'rgba(127,119,221,0.1)', border: '1px solid rgba(127,119,221,0.2)', borderRadius: 4, padding: '2px 6px' }}>{c.stage}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 10 }}>
              {CLIENTS_FEATURES.map((f, i) => (
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
            <div style={{ background: 'rgba(127,119,221,0.06)', border: '1px solid rgba(127,119,221,0.15)', borderRadius: 12, padding: '14px', marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#7F77DD', margin: '0 0 6px' }}>vs. Salesforce, HubSpot</p>
              <p style={{ fontSize: 11, color: '#888', margin: 0, lineHeight: 1.5 }}>Generic CRMs don't know a draw schedule from a change order. Ours does. Your proposals auto-reference live cost data and jurisdiction requirements.</p>
            </div>
            <input placeholder="your@email.com" style={{ width: '100%', boxSizing: 'border-box', background: '#F0F0EB', border: '1px solid #e5e5e0', borderRadius: 8, padding: '8px 12px', color: '#1a1a1a', fontSize: 12, marginBottom: 10, fontFamily: 'inherit', outline: 'none' }} />
            <button style={{ width: '100%', background: '#7F77DD', border: 'none', borderRadius: 8, padding: '10px 0', color: '#1a1a1a', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>👥 Notify me</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClientsPage;
