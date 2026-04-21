'use client';

import Logomark from '@/components/Logomark';
import BKGErrorFallback from '@/components/BKGErrorFallback';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ reset }: ErrorProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 'var(--radius-lg)',
        backgroundColor: 'var(--trace)',
      }}
    >
      <div
        style={{
          marginBottom: '32px',
        }}
      >
        <Logomark size={64} />
      </div>

      <BKGErrorFallback
        title="Something didn't load."
        message="Refresh the page or head back to the workflow picker."
        actions={[
          {
            label: 'Reload',
            onClick: reset,
          },
          {
            label: 'Go to /killerapp',
            href: '/killerapp',
          },
        ]}
      />
    </div>
  );
}
