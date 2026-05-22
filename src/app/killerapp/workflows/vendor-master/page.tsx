import { Suspense } from 'react';
import VendorMasterClient from './VendorMasterClient';

export const metadata = {
  title: 'Vendor Master',
  description: 'Vendor master list — legal name, CSLB#, W-9 status, payment terms.',
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <VendorMasterClient />
    </Suspense>
  );
}
