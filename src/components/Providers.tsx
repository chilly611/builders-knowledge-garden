"use client";

import { Suspense } from "react";
import { AuthProvider } from "@/lib/auth";
import { AuthModalProvider } from "@/components/AuthModal";
import { PostHogProvider } from "@/components/PostHogProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  // PostHogProvider lives INSIDE AuthProvider so it can call useAuth().
  // It's wrapped in Suspense because PostHogProvider reads
  // useSearchParams (Next.js requirement for hooks that participate
  // in route-aware rendering). Graceful no-key behavior is enforced
  // inside the provider — when NEXT_PUBLIC_POSTHOG_KEY is absent it's
  // a transparent pass-through.
  return (
    <AuthProvider>
      <AuthModalProvider>
        <Suspense fallback={null}>
          <PostHogProvider>{children}</PostHogProvider>
        </Suspense>
      </AuthModalProvider>
    </AuthProvider>
  );
}
