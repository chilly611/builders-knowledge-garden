"use client";

import { Suspense } from "react";
import { AuthProvider } from "@/lib/auth";
import { AuthModalProvider } from "@/components/AuthModal";
import { PostHogProvider } from "@/components/PostHogProvider";
// Garden-engine seam (CODE-2, Phase 2): wire the BKG garden's lifecycle +
// path→stage resolver into the engine so generic chrome (design-system stage
// components) reads them from context instead of importing the construction
// modules directly. This file is the app's garden-wiring point — allowed to
// know the garden; the design-system layer is not. See docs/garden-engine/.
import { LifecycleProvider } from "@/garden/runtime/LifecycleProvider";
import { buildersLifecycle, buildersStageFromPath } from "@/garden/builders";

export default function Providers({ children }: { children: React.ReactNode }) {
  // PostHogProvider lives INSIDE AuthProvider so it can call useAuth().
  // It's wrapped in Suspense because PostHogProvider reads
  // useSearchParams (Next.js requirement for hooks that participate
  // in route-aware rendering). Graceful no-key behavior is enforced
  // inside the provider — when NEXT_PUBLIC_POSTHOG_KEY is absent it's
  // a transparent pass-through.
  return (
    <AuthProvider>
      <LifecycleProvider
        lifecycle={buildersLifecycle}
        resolveStageFromPath={buildersStageFromPath}
      >
        <AuthModalProvider>
          <Suspense fallback={null}>
            <PostHogProvider>{children}</PostHogProvider>
          </Suspense>
        </AuthModalProvider>
      </LifecycleProvider>
    </AuthProvider>
  );
}
