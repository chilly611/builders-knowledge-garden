/**
 * Smoke test for the contract PDF renderer.
 *
 * Loads the CA HIC § 7159 template, fills in sample data, runs the renderer,
 * and writes the resulting PDF to /tmp/test-contract.pdf so the operator can
 * eyeball compliance formatting (12-point boldface on the five statutory
 * callouts) before shipping a change.
 *
 * Run with:
 *   node --experimental-strip-types src/scripts/test-contract-pdf.ts
 *
 * Or (preferred):
 *   npm run test:contract-pdf
 *
 * The PDF renderer is browser-first (jsPDF), but jsPDF runs cleanly in Node
 * too — it never touches `window` outside the download helper, which this
 * script doesn't exercise. We call `generateContractPdf` directly and write
 * the returned Blob's bytes to disk.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateContractPdf } from '../lib/pdf/contract-pdf.ts';
import { fillTemplate } from '../lib/contract-templates.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(__dirname, '..', 'lib', 'contract-templates');

interface TestCase {
  templateFile: string;
  templateName: string;
  outFile: string;
  fields: Record<string, string>;
}

const SAMPLE_FIELDS_HIC: Record<string, string> = {
  contractDate: '2026-05-22',
  clientName: 'Jane Q. Homeowner',
  clientAddress: '123 Maple Lane\nBerkeley, CA 94703',
  contractorName: 'Pacific Coast Builders, Inc.',
  contractorAddress: '555 Industrial Blvd\nOakland, CA 94601',
  contractorLicense: 'CSLB 1023456',
  contractorBond: 'BND-987654',
  contractorPhone: '(510) 555-1234',
  contractorEmail: 'office@pcbuilders.example',
  projectName: 'Homeowner Residence — Kitchen Remodel',
  projectAddress: '123 Maple Lane, Berkeley, CA 94703',
  scopeOfWork:
    'Full kitchen remodel: demolish existing cabinetry and counters; install new shaker-style cabinetry, quartz counters, undermount sink, recessed LED lighting, and engineered-hardwood flooring. Reroute one gas line for new range location. Painting included.',
  contractAmount: '$125,000.00',
  financeCharge: 'NONE',
  downPayment: '$1,000.00',
  paymentTerms:
    '$1,000 on signing (deposit). 25% at demo + rough-in. 35% at cabinet install. 30% at substantial completion. 10% on punch-list sign-off.',
  startDate: '2026-06-15',
  completionDate: '2026-09-30',
  incorporatedDocuments: 'Plans dated 2026-04-15 by Marin Design Studio; Allowance schedule rev. 2.',
  subcontractorList:
    'Electrical: Bright Wires Co. (CSLB 234567). Plumbing: Flow Right Plumbing (CSLB 345678). Flooring: Hardwood Heroes (CSLB 456789).',
  cglNotice:
    'Pacific Coast Builders, Inc. carries commercial general liability insurance written by State Compensation Insurance Fund. You may call (800) 555-7766 to check the contractor’s insurance coverage.',
  workersCompNotice:
    'Pacific Coast Builders, Inc. carries workers’ compensation insurance for all employees.',
  arbitrationNotice: 'Arbitration not elected.',
};

const CASES: TestCase[] = [
  {
    templateFile: 'client-agreement-ca-hic.md',
    templateName: 'Client Agreement — CA HIC § 7159',
    outFile: '/tmp/test-contract.pdf',
    fields: SAMPLE_FIELDS_HIC,
  },
  // Smoke-check one statutory waiver too — verifies the NOTICE callout
  // renders without crashing, and confirms backward compatibility for a
  // template that has only a single callout block.
  {
    templateFile: 'lien-waiver-progress-conditional.md',
    templateName: 'Lien Waiver — Conditional on Progress Payment (CA § 8132)',
    outFile: '/tmp/test-lien-waiver-conditional.pdf',
    fields: {
      contractorName: 'Pacific Coast Builders, Inc.',
      contractorAddress: '555 Industrial Blvd\nOakland, CA 94601',
      clientName: 'Jane Q. Homeowner',
      clientAddress: '123 Maple Lane\nBerkeley, CA 94703',
      projectAddress: '123 Maple Lane, Berkeley, CA 94703',
      throughDate: '2026-07-31',
      progressPaymentAmount: '43,750.00',
      exceptions: 'NONE',
      contractorSignature: 'Sam Reyes',
      signatureDate: '2026-08-02',
    },
  },
  // Smoke-check a non-HIC template (no callouts) to confirm we didn't
  // regress anything for the generic Client Agreement or NDA.
  {
    templateFile: 'nda.md',
    templateName: 'Mutual NDA',
    outFile: '/tmp/test-nda.pdf',
    fields: {
      contractDate: '2026-05-22',
      contractorName: 'Pacific Coast Builders, Inc.',
      contractorAddress: '555 Industrial Blvd\nOakland, CA 94601',
      clientName: 'Jane Q. Homeowner',
      clientAddress: '123 Maple Lane\nBerkeley, CA 94703',
      scopeOfWork: 'Discussion of preliminary pricing and methods for the Homeowner Residence kitchen remodel.',
      termYears: '3',
    },
  },
];

let failed = 0;
for (const tc of CASES) {
  const path = join(templatesDir, tc.templateFile);
  try {
    const body = readFileSync(path, 'utf-8');
    const filled = fillTemplate(body, tc.fields);
    const blob = generateContractPdf({
      templateName: tc.templateName,
      body: filled,
      draft: true,
    });
    // jsPDF's Blob in Node is a polyfill; arrayBuffer() returns a Promise.
    const buf = Buffer.from(await blob.arrayBuffer());
    writeFileSync(tc.outFile, buf);
    console.log(
      `  ok  ${tc.templateFile.padEnd(40)} -> ${tc.outFile}  (${buf.length} bytes)`,
    );
  } catch (err) {
    failed++;
    console.error(`  FAIL ${tc.templateFile}: ${(err as Error).message}`);
    console.error((err as Error).stack);
  }
}

if (failed > 0) {
  console.error(`\n${failed} case(s) failed.`);
  process.exit(1);
}

console.log('\nAll PDFs generated. Open them to visually verify:');
console.log('  - Mechanics Lien Warning block is bold + visibly larger than body');
console.log('  - Three-Day Right to Cancel block is bold + visibly larger');
console.log('  - Notice of Cancellation block is bold + visibly larger');
console.log('  - Downpayment cap + progress payment callouts are bold + visibly larger');
console.log('  - Lien waiver NOTICE TO CLAIMANT block is bold + visibly larger');
console.log('  - NDA renders without any callout artifacts (backward compat)');
