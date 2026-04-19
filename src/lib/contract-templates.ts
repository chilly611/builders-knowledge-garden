/**
 * Contract Templates registry.
 *
 * Source of truth for the 6 contract templates shipped by the Contract Templates
 * workflow (q4). Each template's body lives as a .md file in
 * src/lib/contract-templates/*.md so a human can read it without running the app.
 *
 * This module is ISOMORPHIC — safe to import from both Server and Client
 * Components. For the server-only filesystem loader, see
 * `contract-templates.server.ts`.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContractFieldType = 'text' | 'textarea' | 'date' | 'currency' | 'number';

export interface ContractField {
  /** Matches the {{variable}} placeholder in the markdown body. */
  key: string;
  /** Human-readable label for the form. */
  label: string;
  /** Input style. */
  type: ContractFieldType;
  /** Optional helper copy rendered under the input. */
  hint?: string;
  /** Optional placeholder. */
  placeholder?: string;
  /** If true, the field is required before PDF can be generated. */
  required?: boolean;
}

export interface ContractTemplateMeta {
  id: string;
  name: string;
  /** Short lucide icon name OR emoji — used in the chooser card. */
  icon: string;
  /** One-line description shown in the chooser card. */
  desc: string;
  /** Longer description shown on hover / secondary row. */
  longDesc?: string;
  /** Fields required to fill this template. */
  fields: ContractField[];
  /** Filename of the markdown body under src/lib/contract-templates/. */
  bodyFile: string;
}

// ---------------------------------------------------------------------------
// Common field definitions (reused across templates)
// ---------------------------------------------------------------------------

const FIELD_CONTRACT_DATE: ContractField = {
  key: 'contractDate',
  label: 'Date of this agreement',
  type: 'date',
  required: true,
};

const FIELD_CLIENT_NAME: ContractField = {
  key: 'clientName',
  label: 'Client full legal name',
  type: 'text',
  placeholder: 'Jane Q. Homeowner',
  required: true,
};

const FIELD_CLIENT_ADDRESS: ContractField = {
  key: 'clientAddress',
  label: 'Client mailing address',
  type: 'textarea',
};

const FIELD_CONTRACTOR_NAME: ContractField = {
  key: 'contractorName',
  label: 'Contractor / company legal name',
  type: 'text',
  required: true,
};

const FIELD_CONTRACTOR_ADDRESS: ContractField = {
  key: 'contractorAddress',
  label: 'Contractor mailing address',
  type: 'textarea',
};

const FIELD_CONTRACTOR_LICENSE: ContractField = {
  key: 'contractorLicense',
  label: 'Contractor license number',
  type: 'text',
  hint: 'License number as it appears on your CSLB / state board record.',
};

const FIELD_PROJECT_NAME: ContractField = {
  key: 'projectName',
  label: 'Project name',
  type: 'text',
  placeholder: 'Smith Residence — Kitchen Remodel',
};

const FIELD_PROJECT_ADDRESS: ContractField = {
  key: 'projectAddress',
  label: 'Project site address',
  type: 'textarea',
  required: true,
};

const FIELD_SCOPE_OF_WORK: ContractField = {
  key: 'scopeOfWork',
  label: 'Scope of work',
  type: 'textarea',
  hint: 'Describe what is and is not included. The more specific, the fewer change orders you fight later.',
  required: true,
};

const FIELD_CONTRACT_AMOUNT: ContractField = {
  key: 'contractAmount',
  label: 'Contract price',
  type: 'currency',
  placeholder: '$125,000.00',
  required: true,
};

const FIELD_PAYMENT_TERMS: ContractField = {
  key: 'paymentTerms',
  label: 'Payment terms',
  type: 'textarea',
  hint: 'E.g., 10% on signing, 40% at rough-in, 40% at substantial completion, 10% on punch-list sign-off. Stay under your state\'s deposit cap.',
};

const FIELD_START_DATE: ContractField = {
  key: 'startDate',
  label: 'Scheduled start date',
  type: 'date',
};

const FIELD_COMPLETION_DATE: ContractField = {
  key: 'completionDate',
  label: 'Substantial completion date',
  type: 'date',
};

// ---------------------------------------------------------------------------
// Template registry
// ---------------------------------------------------------------------------

export const TEMPLATE_META: ContractTemplateMeta[] = [
  {
    id: 'client-agreement',
    name: 'Client Agreement',
    icon: '📄',
    desc: 'Prime contract between you and the homeowner.',
    longDesc:
      'The baseline residential-construction prime contract: scope, price, payment schedule, warranty, insurance, dispute resolution.',
    bodyFile: 'client-agreement.md',
    fields: [
      FIELD_CONTRACT_DATE,
      FIELD_CLIENT_NAME,
      FIELD_CLIENT_ADDRESS,
      FIELD_CONTRACTOR_NAME,
      FIELD_CONTRACTOR_ADDRESS,
      FIELD_CONTRACTOR_LICENSE,
      FIELD_PROJECT_NAME,
      FIELD_PROJECT_ADDRESS,
      FIELD_SCOPE_OF_WORK,
      FIELD_CONTRACT_AMOUNT,
      FIELD_PAYMENT_TERMS,
      FIELD_START_DATE,
      FIELD_COMPLETION_DATE,
    ],
  },
  {
    id: 'sub-agreement',
    name: 'Subcontractor Agreement',
    icon: '🔨',
    desc: 'Prime-contractor-to-subcontractor agreement for a scoped trade package.',
    longDesc:
      'Flow-down terms from your prime contract, plus insurance / additional-insured, indemnity, lien waiver, and safety provisions.',
    bodyFile: 'sub-agreement.md',
    fields: [
      FIELD_CONTRACT_DATE,
      FIELD_CONTRACTOR_NAME,
      FIELD_CONTRACTOR_ADDRESS,
      FIELD_CONTRACTOR_LICENSE,
      {
        key: 'subcontractorName',
        label: 'Subcontractor legal name',
        type: 'text',
        required: true,
      },
      {
        key: 'subcontractorAddress',
        label: 'Subcontractor mailing address',
        type: 'textarea',
      },
      {
        key: 'subcontractorLicense',
        label: 'Subcontractor license number',
        type: 'text',
      },
      FIELD_PROJECT_NAME,
      FIELD_PROJECT_ADDRESS,
      { ...FIELD_CLIENT_NAME, label: 'Owner full legal name' },
      FIELD_SCOPE_OF_WORK,
      { ...FIELD_CONTRACT_AMOUNT, label: 'Subcontract price' },
      FIELD_PAYMENT_TERMS,
      FIELD_START_DATE,
      FIELD_COMPLETION_DATE,
    ],
  },
  {
    id: 'lien-waiver-conditional',
    name: 'Lien Waiver — Conditional (Progress)',
    icon: '📝',
    desc: 'Conditional waiver exchanged for a progress payment. Effective only when the check clears.',
    longDesc:
      'Use this when requesting or receiving a progress payment. Because it is conditional, you keep your lien rights if the check bounces.',
    bodyFile: 'lien-waiver-conditional.md',
    fields: [
      FIELD_CONTRACTOR_NAME,
      FIELD_CLIENT_NAME,
      FIELD_PROJECT_ADDRESS,
      {
        key: 'throughDate',
        label: 'Through date (work covered)',
        type: 'date',
        hint: 'The waiver covers work through this date only.',
        required: true,
      },
      { ...FIELD_CONTRACT_AMOUNT, label: 'Progress payment amount' },
    ],
  },
  {
    id: 'lien-waiver-unconditional',
    name: 'Lien Waiver — Unconditional (Final)',
    icon: '⚠',
    desc: 'Final unconditional waiver. Once signed, lien rights are gone — whether or not you were paid.',
    longDesc:
      'Only use AFTER the final check has cleared your bank. Statutory-form states require exact statutory language — have an attorney confirm before use.',
    bodyFile: 'lien-waiver-unconditional.md',
    fields: [
      FIELD_CONTRACTOR_NAME,
      FIELD_CLIENT_NAME,
      FIELD_PROJECT_ADDRESS,
      { ...FIELD_CONTRACT_AMOUNT, label: 'Final payment amount received' },
    ],
  },
  {
    id: 'nda',
    name: 'Mutual NDA',
    icon: '🤝',
    desc: 'Mutual non-disclosure agreement for sharing pricing, plans, or proprietary methods.',
    longDesc:
      'Bidirectional confidentiality. Use during pre-bid discussions, design collaborations, or anytime you need to share bid detail before a contract is signed.',
    bodyFile: 'nda.md',
    fields: [
      FIELD_CONTRACT_DATE,
      FIELD_CONTRACTOR_NAME,
      FIELD_CONTRACTOR_ADDRESS,
      FIELD_CLIENT_NAME,
      FIELD_CLIENT_ADDRESS,
      { ...FIELD_SCOPE_OF_WORK, label: 'Purpose of disclosure', hint: 'What project or opportunity is this NDA covering?' },
      {
        key: 'termYears',
        label: 'Term (years)',
        type: 'number',
        hint: 'Typical: 2–5 years. Trade secrets survive indefinitely regardless.',
        placeholder: '3',
      },
    ],
  },
  {
    id: 'change-order',
    name: 'Change Order',
    icon: '🔁',
    desc: 'Written modification to an executed contract — price, schedule, or scope.',
    longDesc:
      'Get every change in writing before work starts. Tracks cumulative contract price, schedule impact, and includes the cumulative-impact waiver (confirm enforceable in your state).',
    bodyFile: 'change-order.md',
    fields: [
      FIELD_PROJECT_NAME,
      FIELD_PROJECT_ADDRESS,
      {
        key: 'originalContractDate',
        label: 'Original contract date',
        type: 'date',
        required: true,
      },
      {
        key: 'changeOrderNumber',
        label: 'Change order number',
        type: 'text',
        placeholder: 'CO-001',
        required: true,
      },
      FIELD_CONTRACT_DATE,
      FIELD_CONTRACTOR_NAME,
      FIELD_CONTRACTOR_LICENSE,
      FIELD_CLIENT_NAME,
      {
        key: 'changeDescription',
        label: 'Description of change',
        type: 'textarea',
        hint: 'Be specific. Include what\'s added, what\'s removed, and any materials / specs affected.',
        required: true,
      },
      {
        key: 'originalContractAmount',
        label: 'Original contract price',
        type: 'currency',
        required: true,
      },
      {
        key: 'priorChangesAmount',
        label: 'Net change from prior executed Change Orders',
        type: 'currency',
        placeholder: '$0.00',
      },
      {
        key: 'changeAmount',
        label: 'Amount of THIS Change Order',
        type: 'currency',
        required: true,
      },
      {
        key: 'newContractAmount',
        label: 'New contract price',
        type: 'currency',
        hint: 'Original + all prior COs + this CO.',
        required: true,
      },
      {
        key: 'originalCompletionDate',
        label: 'Original substantial completion date',
        type: 'date',
      },
      {
        key: 'scheduleImpactDays',
        label: 'Schedule impact (days)',
        type: 'number',
        hint: 'Positive = extension. Zero = no impact. Negative = acceleration.',
        placeholder: '0',
      },
      {
        key: 'newCompletionDate',
        label: 'Revised substantial completion date',
        type: 'date',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export type TemplateBodies = Record<string, string>;

/** Look up a template meta record by id. */
export function getTemplateMeta(id: string): ContractTemplateMeta | undefined {
  return TEMPLATE_META.find((m) => m.id === id);
}

/**
 * Substitute {{variable}} placeholders with values from `fields`.
 *
 * - Missing / empty fields are left as a placeholder blank so the user can
 *   see which fields the contract relies on.
 * - HTML is not escaped — this output is consumed by the PDF renderer, not
 *   a web page.
 */
export function fillTemplate(body: string, fields: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = fields[key];
    if (value === undefined || value === null || value === '') {
      return `[${humanizeKey(key)}]`;
    }
    return value;
  });
}

/** Turn camelCase keys into `Spaced Words` for placeholder display. */
function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

/**
 * Return the list of {{variable}} keys referenced in a template body,
 * deduped in document order. Useful for validating the registry against
 * the markdown source.
 */
export function extractTemplateKeys(body: string): string[] {
  const keys = new Set<string>();
  const re = /\{\{(\w+)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) keys.add(m[1]);
  return Array.from(keys);
}
