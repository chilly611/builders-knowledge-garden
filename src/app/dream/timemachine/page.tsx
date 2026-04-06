'use client';

import dynamic from 'next/dynamic';

const TimeMachine = dynamic(() => import('@/components/TimeMachine'), {
  ssr: false,
});

export default function TimeMachinePage() {
  return <TimeMachine />;
}
