'use client';

export default function KillerAppLoading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F4F0E6', // trace
        padding: '32px 24px',
      }}
    >
      {/* Logo bar skeleton at top */}
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            width: '120px',
            height: '28px',
            backgroundColor: '#C9C3B3', // faded-rule
            borderRadius: '4px',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />
      </div>

      {/* Content skeleton bars */}
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: '20px',
              backgroundColor: '#C9C3B3', // faded-rule
              borderRadius: '4px',
              marginBottom: '16px',
              width: i === 3 ? '60%' : '100%',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              animationDelay: `${i * 100}ms`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 0.7;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
