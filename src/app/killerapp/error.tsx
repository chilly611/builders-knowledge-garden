'use client';

import BKGErrorFallback from '@/components/BKGErrorFallback';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function KillerAppError({ reset }: ErrorProps) {
  return (
    <BKGErrorFallback
      title="This surface didn't load."
      message="Jump back to pick a workflow."
      actions={[
        {
          label: 'Reload',
          onClick: reset,
        },
        {
          label: 'Back to workflows',
          href: '/killerapp',
        },
      ]}
    />
  );
}
