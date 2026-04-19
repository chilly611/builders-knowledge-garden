'use client';

import KillerAppNav from '@/components/KillerAppNav';
import { GreenFlashProvider } from '@/components/GreenFlashProvider';
import GlobalJourneyMapHeader from '@/components/GlobalJourneyMapHeader';

export default function KillerAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <GreenFlashProvider>
      <KillerAppNav />
      {/* Journey Map chip strip: mounted here so it's ever-present across
          /killerapp AND every nested /killerapp/workflows/* route. Reads
          from the active project's journey state (localStorage) and
          highlights the current stage based on pathname. */}
      <div style={{ paddingTop: 48 }}>
        <GlobalJourneyMapHeader />
        {children}
      </div>
    </GreenFlashProvider>
  );
}
