'use client';

import { Seal } from '@/components/app-shell';
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
        {/* Local static plate → bulletproof on the error page (no remote/bucket
            dependency); header variant skips the heavy video. */}
        <Seal size={64} variant="header" poster="/brand/bkg-mark.png" />
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
