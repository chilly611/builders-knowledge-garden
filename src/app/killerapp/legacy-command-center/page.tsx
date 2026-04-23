'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// TODO: W9.C-BR-F — Soft-archived legacy page. Redirects to /killerapp.
// Hard-delete in a later task after confirming no external links reference /legacy-command-center.

export default function LegacyCommandCenterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/killerapp');
  }, [router]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#666',
    }}>
      <div style={{ textAlign: 'center' }}>
        <p>Redirecting to Workflows...</p>
      </div>
    </div>
  );
}
