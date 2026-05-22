import { Suspense } from 'react';
import QuickbooksExportClient from './QuickbooksExportClient';

export const metadata = {
  title: 'QuickBooks export',
  description: 'Export invoices, payments, vendors as IIF or CSV for QuickBooks import.',
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <QuickbooksExportClient />
    </Suspense>
  );
}
