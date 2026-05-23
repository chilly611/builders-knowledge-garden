'use client';

/**
 * PostHogProvider — OBSERVABILITY-WIRE (2026-05-23)
 * =================================================
 * Initializes posthog-js on the client side and wires it to the
 * Supabase auth context so we can identify users with their stable
 * user.id once they're signed in.
 *
 * Graceful no-key: if NEXT_PUBLIC_POSTHOG_KEY is absent, this provider
 * mounts as a pass-through and does nothing. No console noise, no
 * thrown errors.
 *
 * PII rule: we identify by user.id ONLY. We do NOT call
 * posthog.identify(user.id, { email }) — emails belong in your CRM,
 * not in product analytics. If product later needs cohort-by-email
 * segmentation, do it server-side in PostHog with a CRM-sourced
 * persons import.
 */
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { useAuth } from '@/lib/auth';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com';

let posthogInitialized = false;

function initPostHogOnce(): boolean {
  if (typeof window === 'undefined') return false;
  if (!POSTHOG_KEY) return false;
  if (posthogInitialized) return true;
  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      // We trigger pageviews manually in the effect below so Next.js's
      // soft route changes are also captured (router doesn't fire a
      // hard page load).
      capture_pageview: false,
      // person_profiles=identified_only keeps unauth'd visitors from
      // chewing up MAU quota.
      person_profiles: 'identified_only',
    });
    posthogInitialized = true;
    return true;
  } catch {
    return false;
  }
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize once on mount.
  useEffect(() => {
    initPostHogOnce();
  }, []);

  // Identify on auth state change. PII rule: id-only.
  useEffect(() => {
    if (!posthogInitialized) return;
    try {
      if (user?.id) {
        posthog.identify(user.id);
      } else {
        // Signed out — clear the persisted identity so a subsequent
        // signup doesn't carry the previous user's distinct_id.
        posthog.reset();
      }
    } catch {
      // Swallow — analytics failures must not crash the app.
    }
  }, [user?.id]);

  // Manual pageview tracking for client-side route changes.
  useEffect(() => {
    if (!posthogInitialized) return;
    if (!pathname) return;
    try {
      const qs = searchParams?.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      posthog.capture('$pageview', { $current_url: url });
    } catch {
      // Swallow.
    }
  }, [pathname, searchParams]);

  return <>{children}</>;
}

export default PostHogProvider;
