'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import KillerAppNav from '@/components/KillerAppNav';
import { GreenFlashProvider } from '@/components/GreenFlashProvider';
import { NavigatorProvider } from '@/components/navigator/NavigatorContext';
import IntegratedNavigator from '@/components/IntegratedNavigator';
import LegalFooter from '@/components/LegalFooter';
import StageBackdrop from '@/design-system/components/StageBackdrop';
import VoiceCommandNav from '@/design-system/components/VoiceCommandNav';
import CommandPalette from '@/design-system/components/CommandPalette';
import { stageFromPathname } from '@/lib/stage-from-pathname';
import { autoSeedDemoOnFirstVisit } from '@/lib/demo-seed';
import '@/design-system/animations/scroll-timeline.css';

export default function KillerAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const stageId = stageFromPathname(pathname);

  // W9.D.3: Auto-seed demo project on first visit (investor demo)
  useEffect(() => {
    autoSeedDemoOnFirstVisit();
  }, []);

  // W9 — Navigator renders on every /killerapp route including the picker.
  // Founder feedback: picker needs the journey context, not hides from it.
  // The picker route just gets no active stageId, which the Navigator handles via the "not_started" state.
  //
  // Navigator starts in 'compact' collapse state by default — single horizontal strip.
  // User toggles to 'expanded' for full journey + time-machine + budget stack.

  // W9.D: Voice command handler — routes workflow/nav intents via router.push
  const handleVoiceNavigate = (intent: any) => {
    if (intent.type === 'workflow' || intent.type === 'nav') {
      router.push(intent.href);
    }
    // ui:close_overlay is handled by VoiceCommandNav itself; do nothing here
  };

  return (
    <GreenFlashProvider>
      <NavigatorProvider initialCollapseState="compact">
        <StageBackdrop stage={stageId} />
        <KillerAppNav />
        <div style={{ paddingTop: 48 }}>
          <IntegratedNavigator projectId={null} activeStageId={null} />
          {children}
          {/* W8.6: Thin legal footer — Terms / Privacy / Disclaimer + one-line advisory copy. */}
          <LegalFooter />
        </div>
        <VoiceCommandNav onNavigate={handleVoiceNavigate} />
        <CommandPalette />
        {/* TODO(W9.D-W2): mount StageWelcome once project/workflow context is stable. */}
      </NavigatorProvider>
    </GreenFlashProvider>
  );
}
