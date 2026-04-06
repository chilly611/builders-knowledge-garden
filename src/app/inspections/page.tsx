'use client';

import dynamic from 'next/dynamic';

const InspectionCheckpoints = dynamic(
  () => import('@/components/InspectionCheckpoints'),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '2rem',
        }}
      >
        {/* Header skeleton */}
        <div
          style={{
            height: '2.5rem',
            width: '40%',
            backgroundColor: '#e0e0e0',
            borderRadius: '0.5rem',
            marginBottom: '2rem',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />

        {/* Filters/controls skeleton */}
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: '2.5rem',
                width: '150px',
                backgroundColor: '#e0e0e0',
                borderRadius: '0.5rem',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>

        {/* Inspection cards skeleton */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                height: '250px',
                backgroundColor: '#e0e0e0',
                borderRadius: '0.5rem',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                animationDelay: `${i * 0.08}s`,
              }}
            />
          ))}
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

export default function InspectionsPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#fafafa',
        padding: '2rem 0',
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 2rem',
        }}
      >
        <h1
          style={{
            fontFamily: 'Archivo Black, sans-serif',
            fontSize: '2rem',
            fontWeight: 900,
            color: '#1a1a1a',
            marginBottom: '1.5rem',
          }}
        >
          Inspection Checkpoints
        </h1>
        <InspectionCheckpoints projectId="default" />
      </div>
    </div>
  );
}
