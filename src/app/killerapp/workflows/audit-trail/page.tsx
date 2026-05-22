import { Suspense } from 'react';
import AuditTrailClient from './AuditTrailClient';

export const metadata = {
  title: 'Audit trail',
  description: 'Every insert, update, delete on financial tables. Filter by table / user / date.',
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuditTrailClient />
    </Suspense>
  );
}
