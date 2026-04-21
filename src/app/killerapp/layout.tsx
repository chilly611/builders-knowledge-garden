'use client';

import { usePathname } from 'next/navigation';
import KillerAppNav from '@/components/KillerAppNav';
import { GreenFlashProvider } from '@/components/GreenFlashProvider';
import GlobalJourneyMapHeader from '@/components/GlobalJourneyMapHeader';

export default function KillerAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';

  // W7.O: the picker route itself has no project context, so mounting the
  // journey strip there rendered misleading demo-data chrome that
  // dominated first-screen composition. Gate it OFF `/killerapp` (picker
  // only — still ON for every nested /killerapp/projects/* and
  // /killerapp/workflows/* route where project context exists).
  //
  // This is tactical, not the creative redesign. W7.P will rethink the
  // journey strip + "Time Machine" scrub + budget timeline as a single
  // integrated surface. Until then the picker renders clean.
  const showJourneyStrip = pathname !== '/killerapp';

  return (
    <GreenFlashProvider>
      <KillerAppNav />
      <div style={{ paddingTop: 48 }}>
        {showJourneyStrip && <GlobalJourneyMapHeader />}
        {children}
      </div>
    </GreenFlashProvider>
  );
}
