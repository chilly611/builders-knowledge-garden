'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import CopilotPanel from '@/components/CopilotPanel';
import { getImageForEntityType } from '@/lib/image-service';

const Marketplace = dynamic(() => import('@/components/Marketplace'), { ssr: false });
const InvoiceModule = dynamic(() => import('@/components/InvoiceModule'), { ssr: false });

interface Material {
  id: string; slug: string; title: string; summary: string;
  tags: string[]; metadata?: Record<string, unknown>;
}

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState('products');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    async function load() {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!url || !key) { setLoading(false); return; }
        const res = await fetch(
          `${url}/rest/v1/knowledge_entities?entity_type=eq.material&status=eq.published&select=id,slug,title,summary,tags,category,metadata&order=category.asc&limit=100`,
          { headers: { apikey: key, Authorization: `Bearer ${key}` } }
        );
        const data = await res.json();
        if (Array.isArray(data)) {
          setMaterials(data.map((e: Record<string, unknown>) => ({
            ...e,
            title: typeof e.title === 'object' ? (e.title as Record<string,string>).en || '' : e.title,
            summary: typeof e.summary === 'object' ? (e.summary as Record<string,string>).en || '' : e.summary,
          })) as Material[]);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const categories = ['all', ...Array.from(new Set(materials.map(m => (m.metadata as Record<string,string>)?.csi_division || 'general')))];
  const filtered = materials.filter(m => {
    if (category !== 'all' && (m.metadata as Record<string,string>)?.csi_division !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return m.title.toLowerCase().includes(q) || m.summary.toLowerCase().includes(q) || (m.tags||[]).some(t => t.includes(q));
    }
    return true;
  });

  const tabs = [
    { id: 'products', label: 'Products' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'transactions', label: 'Transactions' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Photo Hero */}
      <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1400&q=80&fit=crop)',
          backgroundSize: 'cover', backgroundPosition: 'center',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', alignItems: 'flex-end', padding: '0 24px 20px', maxWidth: 960, margin: '0 auto' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Image src="/logo/b_transparent_512.png" alt="B" width={32} height={32} style={{ borderRadius: 8 }} />
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0 }}>Marketplace</h1>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
              {materials.length} materials · Suppliers, pricing & RFQ coming soon
            </p>
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
        {activeTab === 'products' && (
          <>
            {/* Coming soon banner */}
            <div style={{
              padding: '16px 20px', borderRadius: 14, marginBottom: 16,
              background: 'linear-gradient(135deg, #378ADD10, #1D9E7510)',
              border: '1px solid #378ADD25',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 28 }}>🚀</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Supplier marketplace launching soon</div>
                <div style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>
                  Below: every material in our knowledge engine. Soon: real suppliers, pricing, RFQ, and Stripe Connect transactions.
                </div>
              </div>
            </div>

            <input type="text" placeholder="Search materials by name, CSI division, or tag..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 12,
                border: '1px solid var(--border, #e5e5e5)', background: 'var(--bg, #fff)',
                fontSize: 14, color: 'var(--fg)', outline: 'none', marginBottom: 14,
              }}
            />

            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--fg-tertiary)' }}>Loading materials...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                {filtered.map(mat => {
                  const meta = (mat.metadata || {}) as Record<string, unknown>;
                  const cost = meta.cost_per_sf || meta.cost_per_ft || meta.cost_per_unit || meta.installed_cost_range || meta.cost_per_gallon || meta.cost_per_square || meta.cost_per_sheet || meta.cost_per_lf || meta.cost_per_bf || meta.cost_range || '';
                  const csi = meta.csi_division || '';
                  const grade = meta.sustainability_grade || '';
                  return (
                    <Link key={mat.id} href={`/knowledge/${mat.slug}`} style={{
                      borderRadius: 14, textDecoration: 'none', color: 'inherit', overflow: 'hidden',
                      border: '1px solid var(--border, #e5e5e5)', background: 'var(--bg, #fff)',
                      transition: 'all 0.2s', display: 'block',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#378ADD'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(55,138,221,0.12)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border, #e5e5e5)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                    >
                      {/* Material texture image */}
                      <div style={{
                        height: 80, position: 'relative', overflow: 'hidden',
                        backgroundImage: `url(${getImageForEntityType('material').url})`,
                        backgroundSize: 'cover', backgroundPosition: 'center',
                      }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 30%, rgba(55,138,221,0.7) 100%)' }} />
                        {csi && <div style={{ position: 'absolute', bottom: 6, left: 10, zIndex: 2 }}>
                          <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.9)', color: '#378ADD', fontWeight: 600 }}>CSI {String(csi)}</span>
                        </div>}
                      </div>
                      <div style={{ padding: '12px 16px 14px' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>{mat.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-secondary)', lineHeight: 1.5, marginBottom: 8,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>{mat.summary}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {cost && <span style={{ fontSize: 12, fontWeight: 600, color: '#378ADD' }}>{String(cost)}</span>}
                        {csi && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 6, background: '#378ADD12', color: '#378ADD' }}>CSI {String(csi)}</span>}
                        {grade && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 6,
                          background: grade === 'A' ? '#22C55E18' : grade === 'B' ? '#60A5FA18' : grade === 'C' ? '#F59E0B18' : '#EF444418',
                          color: grade === 'A' ? '#22C55E' : grade === 'B' ? '#60A5FA' : grade === 'C' ? '#F59E0B' : '#EF4444',
                          fontWeight: 600,
                        }}>🌱 {String(grade)}</span>}
                      </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 11, color: 'var(--fg-tertiary)' }}>
              {filtered.length} of {materials.length} materials · Supplier listings + RFQ coming Q2 2026
            </div>
          </>
        )}

        {activeTab === 'invoices' && (
          <InvoiceModule />
        )}

        {activeTab === 'transactions' && (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--fg-secondary)' }}>
            <p style={{ fontSize: 14, fontWeight: 500 }}>Transaction history and summaries coming soon</p>
          </div>
        )}
      </div>
      <CopilotPanel />
    </div>
  );
}
