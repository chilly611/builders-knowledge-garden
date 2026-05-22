import { Suspense } from 'react';
import ArApLedgerClient from './ArApLedgerClient';

export const metadata = {
  title: 'AR / AP Ledger',
  description: 'Money in (AR) and money out (AP). Grouped by project / vendor, with payment history.',
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ArApLedgerClient />
    </Suspense>
  );
}
