'use client';

import KillerAppNav from '@/components/KillerAppNav';
import { GreenFlashProvider } from '@/components/GreenFlashProvider';

export default function KillerAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <GreenFlashProvider>
      <KillerAppNav />
      <div style={{ paddingTop: 48 }}>
        {children}
      </div>
    </GreenFlashProvider>
  );
}
