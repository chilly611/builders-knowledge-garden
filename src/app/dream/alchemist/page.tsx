'use client';

import dynamic from 'next/dynamic';

const AlchemistCrucible = dynamic(() => import('@/components/AlchemistCrucible'), {
  ssr: false,
});

export default function AlchemistPage() {
  return <AlchemistCrucible />;
}
