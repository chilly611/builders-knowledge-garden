'use client';

import dynamic from 'next/dynamic';

const PlatformDashboard = dynamic(
  () => import('@/components/PlatformDashboard'),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#fafafa',
          padding: '2rem',
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
          }}
        >
          {/* Header skeleton */}
          <div
            style={{
              height: '2.5rem',
              backgroundColor: '#e0e0e0',
              borderRadius: '0.5rem',
              marginBottom: '2rem',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />

          {/* Grid of card skeletons */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem',
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                style={{
                  height: '200px',
                  backgroundColor: '#e0e0e0',
                  borderRadius: '0.5rem',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>

          {/* Large section skeleton */}
          <div
            style={{
              height: '300px',
              backgroundColor: '#e0e0e0',
              borderRadius: '0.5rem',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}</style>
      </div>
    ),
  }
);

export default function DashboardPage() {
  return <PlatformDashboard />;
}
