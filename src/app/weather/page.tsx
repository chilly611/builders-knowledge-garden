'use client';

import dynamic from 'next/dynamic';

const WeatherImpact = dynamic(() => import('@/components/WeatherImpact'), {
  ssr: false,
});

export default function WeatherPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAF7',
      fontFamily: 'var(--font-archivo), sans-serif',
    }}>
      {/* Header */}
      <header style={{
        padding: '24px 32px',
        borderBottom: '1px solid rgba(29,158,117,0.1)',
        background: 'linear-gradient(135deg, rgba(29,158,117,0.04), rgba(216,90,48,0.02))',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h1 style={{
            fontSize: 32,
            fontWeight: 800,
            margin: 0,
            color: '#1D9E75',
            letterSpacing: '-0.5px',
          }}>
            Weather Impact
          </h1>
          <p style={{
            fontSize: 14,
            color: 'rgba(0,0,0,0.5)',
            margin: '4px 0 0',
          }}>
            Construction-Aware Forecast — Real-time weather intelligence for building operations
          </p>
        </div>
      </header>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px' }}>
        <WeatherImpact />
      </div>

      {/* Footer link */}
      <footer style={{
        padding: '24px 32px',
        borderTop: '1px solid rgba(0,0,0,0.05)',
        textAlign: 'center',
        color: 'rgba(0,0,0,0.4)',
        fontSize: 12,
      }}>
        <a href="/dream" style={{
          color: '#1D9E75',
          textDecoration: 'none',
          fontWeight: 600,
        }}>
          ← Back to Dream Machine
        </a>
      </footer>
    </div>
  );
}
