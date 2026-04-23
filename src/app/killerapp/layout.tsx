'use client';

import { usePathname } from 'next/navigation';
import KillerAppNav from '@/components/KillerAppNav';
import { GreenFlashProvider } from '@/components/GreenFlashProvider';
import { NavigatorProvider } from '@/components/navigator/NavigatorContext';
import IntegratedNavigator from '@/components/IntegratedNavigator';
import LegalFooter from '@/components/LegalFooter';

export default function KillerAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';

  // W9 — Navigator renders on every /killerapp route including the picker.
  // Founder feedback: picker needs the journey context, not hides from it.
  // The picker route just gets no active stageId, which the Navigator handles via the "not_started" state.
  //
  // Navigator starts in 'compact' collapse state by default — single horizontal strip.
  // User toggles to 'expanded' for full journey + time-machine + budget stack.

  return (
    <GreenFlashProvider>
      <NavigatorProvider initialCollapseState="compact">
        <KillerAppNav />
        <div style={{ paddingTop: 48 }}>
          <IntegratedNavigator projectId={null} activeStageId={null} />
          {children}
          {/* W8.6: Thin legal footer — Terms / Privacy / Disclaimer + one-line advisory copy. */}
          <LegalFooter />
        </div>
      </NavigatorProvider>
    </GreenFlashProvider>
  );
}
