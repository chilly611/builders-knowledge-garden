'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';

const MODULES = [
  { id: 'crm',       label: 'Command Center', icon: '⚡', href: '/killerapp',       status: 'live', color: '#E8443A', hint: 'Your AI COO war room' },
  { id: 'launch',    label: 'Projects',       icon: '🚀', href: '/launch',    status: 'live', color: '#E8443A', hint: 'Launch & manage projects' },
  { id: 'field',     label: 'Field Ops',      icon: '🦺', href: '/field',     status: 'beta', color: '#F59E0B', hint: 'Voice logs, safety, progress' },
  { id: 'finances',  label: 'Finances',       icon: '💰', href: '/finances',  status: 'soon', color: '#22C55E', hint: 'Invoices, job costing, AIA' },
  { id: 'clients',   label: 'Clients',        icon: '👥', href: '/clients',   status: 'soon', color: '#7F77DD', hint: 'CRM, proposals, pipeline' },
  { id: 'documents', label: 'Documents',      icon: '📋', href: '/documents', status: 'soon', color: '#378ADD', hint: 'RFIs, submittals, as-builts' },
  { id: 'site',      label: 'Site Intel',     icon: '🔭', href: '/site',      status: 'soon', color: '#BA7517', hint: 'Drone, photos, digital twin' },
];

const STATUS_DOT: Record<string, string> = {
  live: '#22C55E',
  beta: '#F59E0B',
  soon: 'rgba(255,255,255,0.2)',
};
const STATUS_LABEL: Record<string, string> = {
  live: '',
  beta: 'BETA',
  soon: 'SOON',
};

export default function KillerAppNav() {
  const pathname = usePathname();
  const [xp] = useState(2840);
  const [streak] = useState(7);
  const [hovered, setHovered] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const activeId = MODULES.find(m => pathname === m.href || (m.href !== '/' && pathname.startsWith(m.href)))?.id;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 64, right: 0, height: 48,
      zIndex: 99,
      background: 'rgba(255,255,255,0.97)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(232,68,58,0.18)',
      display: 'flex',
      alignItems: 'center',
      paddingLeft: 16,
      paddingRight: 16,
      gap: 0,
      fontFamily: 'var(--font-archivo), sans-serif',
    }}>
      {/* App label */}
      <div style={{
        fontSize: 10, fontWeight: 800, letterSpacing: '1.5px',
        textTransform: 'uppercase', color: '#E8443A',
        marginRight: 20, flexShrink: 0,
      }}>
        ⚡ KILLER APP
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 24, background: 'var(--border, #e2e4e8)', marginRight: 12, flexShrink: 0 }} />

      {/* Module pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {MODULES.map(mod => {
          const isActive = activeId === mod.id;
          const isHovered = hovered === mod.id;
          return (
            <Link key={mod.id} href={mod.href} style={{ textDecoration: 'none' }}>
              <div
                onMouseEnter={() => setHovered(mod.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: 8,
                  background: isActive
                    ? 'rgba(232,68,58,0.15)'
                    : isHovered ? 'rgba(255,255,255,0.06)' : 'transparent',
                  border: isActive
                    ? '1px solid rgba(232,68,58,0.3)'
                    : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontSize: 13 }}>{mod.icon}</span>
                <span style={{
                  fontSize: 12, fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#fff' : 'var(--fg-secondary, #555555)',
                  transition: 'color 0.15s',
                }}>
                  {mod.label}
                </span>
                {/* Status badge */}
                {STATUS_LABEL[mod.status] && (
                  <span style={{
                    fontSize: 8, fontWeight: 700, letterSpacing: '0.5px',
                    color: STATUS_DOT[mod.status],
                    border: `1px solid ${STATUS_DOT[mod.status]}40`,
                    borderRadius: 4, padding: '1px 4px',
                    lineHeight: 1.2,
                  }}>
                    {STATUS_LABEL[mod.status]}
                  </span>
                )}
                {/* Active underline */}
                {isActive && (
                  <div style={{
                    position: 'absolute', bottom: -6, left: '20%', right: '20%',
                    height: 2, borderRadius: 2, background: '#E8443A',
                  }} />
                )}
                {/* Hover tooltip */}
                {isHovered && !isActive && (
                  <div style={{
                    position: 'absolute', top: 38, left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--bg-secondary, #f8f9fa)', border: `1px solid var(--border, #e2e4e8)`,
                    borderRadius: 6, padding: '4px 8px',
                    fontSize: 10, color: 'var(--fg-secondary, #555555)',
                    whiteSpace: 'nowrap', zIndex: 200,
                    pointerEvents: 'none',
                  }}>
                    {mod.hint}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Right side: actions + XP */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 8 }}>
        {/* Voice button */}
        <Link href="/field" style={{ textDecoration: 'none' }}>
          <button style={{
            background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 7, padding: '5px 10px',
            color: '#F59E0B', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            fontFamily: 'inherit',
          }}>
            <span>🎤</span>
            <span style={{ fontSize: 11 }}>Voice</span>
          </button>
        </Link>

        {/* Copilot */}
        <Link href="/knowledge" style={{ textDecoration: 'none' }}>
          <button style={{
            background: 'rgba(127,119,221,0.12)', border: '1px solid rgba(127,119,221,0.25)',
            borderRadius: 7, padding: '5px 10px',
            color: '#7F77DD', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            fontFamily: 'inherit',
          }}>
            <span>🤖</span>
            <span style={{ fontSize: 11 }}>Copilot</span>
          </button>
        </Link>

        {/* XP + Streak */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--bg-secondary, #f8f9fa)',
          border: `1px solid var(--border, #e2e4e8)`,
          borderRadius: 7, padding: '4px 10px',
        }}>
          <span style={{ fontSize: 11 }}>⚡</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg, #111111)' }}>
            {xp.toLocaleString()} XP
          </span>
          <span style={{ width: 1, height: 12, background: 'var(--border, #e2e4e8)' }} />
          <span style={{ fontSize: 11 }}>🔥</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B' }}>{streak}</span>
        </div>
      </div>
    </div>
  );
}
