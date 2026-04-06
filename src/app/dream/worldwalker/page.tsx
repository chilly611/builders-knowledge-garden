'use client';

import dynamic from 'next/dynamic';

const Worldwalker = dynamic(() => import('@/components/Worldwalker'), {
  ssr: false,
});

export default function WorldwalkerPage() {
  return <Worldwalker />;
}
