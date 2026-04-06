'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

const DemoMode = dynamic(
  () => import('@/components/DemoMode').then((mod) => ({ default: mod.DemoMode })),
  { ssr: false }
);

export default function DemoPage() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFAF8' }}>
      <DemoMode
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onDemoComplete={() => setIsOpen(false)}
      />
      {!isOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem' }}>
          <h1 style={{ fontFamily: 'Archivo Black', fontSize: '2rem', color: '#1a1a1a' }}>Demo Complete</h1>
          <button
            onClick={() => setIsOpen(true)}
            style={{ padding: '0.75rem 2rem', backgroundColor: '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'Archivo', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
          >
            Restart Demo
          </button>
        </div>
      )}
    </div>
  );
}
