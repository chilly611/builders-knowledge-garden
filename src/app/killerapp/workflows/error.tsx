'use client';

import BKGErrorFallback from '@/components/BKGErrorFallback';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function WorkflowsError({ error, reset }: ErrorProps) {
  // Log to console for dev debugging
  if (process.env.NODE_ENV !== 'production') {
    console.error('Workflow error:', error);
  }

  return (
    <BKGErrorFallback
      title="This workflow hit a snag"
      message="Pick another — or try this one again in a minute."
      actions={[
        {
          label: 'Try again',
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
