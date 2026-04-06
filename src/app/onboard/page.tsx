'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

const ProgressiveProfiler = dynamic(() => import('@/components/ProgressiveProfiler'), {
  ssr: false,
});

export default function OnboardPage() {
  const router = useRouter();

  const handleComplete = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  const handleSkip = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  return <ProgressiveProfiler onComplete={handleComplete} onSkip={handleSkip} />;
}
