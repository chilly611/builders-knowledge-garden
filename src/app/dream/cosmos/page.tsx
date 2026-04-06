'use client';

import dynamic from 'next/dynamic';

const ConstructionCosmos = dynamic(() => import('@/components/ConstructionCosmos'), {
  ssr: false,
});

export default function CosmosPage() {
  return <ConstructionCosmos />;
}
