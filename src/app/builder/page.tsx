'use client';

import dynamic from 'next/dynamic';

const BuilderDashboard = dynamic(
  () => import('@/components/BuilderDashboard'),
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
              marginBottom: '1rem',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />

          {/* Subtitle skeleton */}
          <div
            style={{
              height: '1rem',
              width: '60%',
              backgroundColor: '#e0e0e0',
              borderRadius: '0.5rem',
              marginBottom: '2rem',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              animationDelay: '0.1s',
            }}
          />

          {/* Two-column layout skeletons */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '2rem',
            }}
          >
            {/* Left column */}
            <div>
              <div
                style={{
                  height: '1.5rem',
                  backgroundColor: '#e0e0e0',
                  borderRadius: '0.5rem',
                  marginBottom: '1rem',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  animationDelay: '0.2s',
                }}
              />
              <div
                style={{
                  height: '300px',
                  backgroundColor: '#e0e0e0',
                  borderRadius: '0.5rem',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  animationDelay: '0.3s',
                }}
              />
            </div>

            {/* Right column */}
            <div>
              <div
                style={{
                  height: '1.5rem',
                  backgroundColor: '#e0e0e0',
                  borderRadius: '0.5rem',
                  marginBottom: '1rem',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  animationDelay: '0.4s',
                }}
              />
              <div
                style={{
                  height: '300px',
                  backgroundColor: '#e0e0e0',
                  borderRadius: '0.5rem',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  animationDelay: '0.5s',
                }}
              />
            </div>
          </div>

          {/* Bottom section skeleton */}
          <div
            style={{
              marginTop: '2rem',
              height: '200px',
              backgroundColor: '#e0e0e0',
              borderRadius: '0.5rem',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              animationDelay: '0.6s',
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

export default function BuilderPage() {
  return <BuilderDashboard />;
}
