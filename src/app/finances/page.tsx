'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import KillerAppNav from '@/components/KillerAppNav';

const BudgetModule = dynamic(() => import('@/components/BudgetModule'), { ssr: false });
const InvoiceModule = dynamic(() => import('@/components/InvoiceModule'), { ssr: false });
const ProposalGenerator = dynamic(() => import('@/components/ProposalGenerator'), { ssr: false });

export default function FinancesPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('budget');

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const tabs = [
    { id: 'budget', label: 'Budget' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'proposals', label: 'Proposals' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #ffffff)', color: 'var(--fg, #111111)', fontFamily: 'var(--font-archivo), sans-serif' }}>
      <KillerAppNav />
      <div style={{ paddingTop: 48 }}>

        {/* Hero */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.03) 60%, transparent)',
          borderBottom: '1px solid rgba(34,197,94,0.12)',
          padding: '32px 32px 28px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, maxWidth: 960, margin: '0 auto' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 28 }}>💰</span>
                <div>
                  <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Finances</h1>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>AIA billing · job costing · cash flow · lien waivers</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px' }}>
          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid var(--border, #e5e5e5)' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 20px',
                  background: 'none',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  color: activeTab === tab.id ? '#1D9E75' : 'var(--fg-secondary)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'color 0.2s',
                  fontFamily: 'inherit',
                }}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div style={{
                    position: 'absolute',
                    bottom: -1,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: '#1D9E75',
                    borderRadius: '3px 3px 0 0',
                  }} />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'budget' && <BudgetModule />}
          {activeTab === 'invoices' && <InvoiceModule />}
          {activeTab === 'proposals' && <ProposalGenerator />}
        </div>
      </div>
    </div>
  );
}
