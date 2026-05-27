'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import KillerAppNav from '@/components/KillerAppNav';
import { KillerAppChrome } from '@/components/killerapp-chrome';
import AuthAndProjectIndicator from '@/app/killerapp/AuthAndProjectIndicator';
import { Suspense } from 'react';
import { GreenFlashProvider } from '@/components/GreenFlashProvider';
import { NavigatorProvider } from '@/components/navigator/NavigatorContext';
import { ProjectProvider } from '@/contexts/ProjectContext';
import { ProjectCockpit } from '@/components/cockpit';
import LegalFooter from '@/components/LegalFooter';
import StageBackdrop from '@/design-system/components/StageBackdrop';
import VoiceCommandNav from '@/design-system/components/VoiceCommandNav';
import CommandPalette from '@/design-system/components/CommandPalette';
import CompassWorkflowNav from '@/components/CompassWorkflowNav';
import SaveStatusToast from '@/components/SaveStatusToast';
import StageWelcomeMount from '@/components/StageWelcomeMount';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import { stageFromPathname } from '@/lib/stage-from-pathname';
import { autoSeedDemoOnFirstVisit } from '@/lib/demo-seed';
import '@/design-system/animations/scroll-timeline.css';

// Outer wrapper exists so the useSearchParams call inside the inner layout
// is wrapped in Suspense, which Next 16 requires for any static prerender
// to succeed. Without this, every statically-generated /killerapp/** route
// fails with a "useSearchParams should be wrapped in a Suspense boundary"
// bailout (see Ship 36d which shipped this code without the outer wrap and
// broke `next build` — that's why it was reverted).
export default function KillerAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <KillerAppLayoutInner>{children}</KillerAppLayoutInner>
    </Suspense>
  );
}

function KillerAppLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  // /intro Act 4 embeds /killerapp/budget in an iframe and needs the global
  // chrome (KillerAppNav, AuthAndProjectIndicator, CompassWorkflowNav, etc.)
  // suppressed. ?hideShell=1 renders only the providers + the page body.
  // BudgetClient still needs ProjectContext, so the providers must wrap the
  // children. Auto-seed is also skipped inside the iframe so the embed doesn't
  // touch global localStorage.
  const searchParams = useSearchParams();
  const hideShell = searchParams?.get('hideShell') === '1';
  const stageId = stageFromPathname(pathname);
  // The /killerapp/stages/* routes carry their own full stage chrome
  // (StageShell = JourneyRow + BudgetRibbon + ProToggle). Suppress the
  // layout-level KillerAppChrome there so the page never shows two budget
  // ribbons / two journey rows with different numbers (founder demo fix,
  // 2026-05-27).
  const isStageRoute = pathname.startsWith('/killerapp/stages/');

  // W9.D.3: Auto-seed demo project on first visit (investor demo). Skip inside
  // the /intro iframe — see hideShell note above.
  useEffect(() => {
    if (hideShell) return;
    autoSeedDemoOnFirstVisit();
  }, [hideShell]);

  if (hideShell) {
    return (
      <GreenFlashProvider>
        <Suspense fallback={null}>
          <ProjectProvider>
            <NavigatorProvider initialCollapseState="expanded">
              <div style={{ minHeight: '100vh' }}>{children}</div>
            </NavigatorProvider>
          </ProjectProvider>
        </Suspense>
      </GreenFlashProvider>
    );
  }

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
      <Suspense fallback={null}>
        <ProjectProvider>
          <NavigatorProvider initialCollapseState="expanded">
        <StageBackdrop stage={stageId} />
        <KillerAppNav />
        {/* W11 emergency-batch 2026-05-11: AuthAndProjectIndicator was
            previously only mounted in /killerapp/page.tsx, so the auth
            pill disappeared the moment a user clicked into any workflow.
            Lifted to the layout so it travels with every /killerapp/*
            route. Suspense required: AuthAndProjectIndicator uses
            useSearchParams which Next 16 requires under Suspense. */}
        <Suspense fallback={null}>
          <AuthAndProjectIndicator />
        </Suspense>
        {/* 2026-05-27: KillerAppChrome — persistent BudgetRibbon + JourneyTimeRow.
            Mounted after AuthAndProjectIndicator so it sits below the auth pill
            and above any page content. Suspense-wrapped because StageNode +
            JourneyTimeRow call useSearchParams under the hood. Falls back to
            the Marin Farmhouse seed when no real project is wired through
            ProjectContext yet. */}
        {!isStageRoute && (
          <Suspense fallback={null}>
            <KillerAppChrome />
          </Suspense>
        )}
        {!isStageRoute && <ProjectCockpit />}
        <div style={{ paddingTop: 48 }}>
          {children}
          {/* W8.6: Thin legal footer — Terms / Privacy / Disclaimer + one-line advisory copy. */}
          <LegalFooter />
        </div>
        <VoiceCommandNav onNavigate={handleVoiceNavigate} />
        <CommandPalette />
        <CompassWorkflowNav />
        <SaveStatusToast />
        {/* W9.D-W2 (2026-05-22): StageWelcome mounted via StageWelcomeMount.
            Renders nothing when there is no active project, when we're on
            the picker landing (stageId=0), or when the per-(project,stage)
            dismissal flag is set in localStorage. Re-shows on stage cross-
            ings via `key={projectId}:{stageId}`. See StageWelcomeMount.tsx
            for the full mounting contract. */}
        <StageWelcomeMount />
        {/* ONBOARDING-V1 (2026-05-22): first-run modal. Renders nothing
            unless the user is gc/owner-lane AND has an open onboarding
            state (or ?first_run=1 on a fresh account). Self-contained —
            reads user_metadata via supabase and writes back through the
            auth.updateUser API. See src/components/onboarding/. */}
        <OnboardingModal />
          </NavigatorProvider>
        </ProjectProvider>
      </Suspense>
    </GreenFlashProvider>
  );
}
