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

/**
 * Buckets the picker UI groups templates into. Keep this list closed so the
 * picker can render labels in a predictable order.
 */
export type ContractCategory =
  | 'prime'
  | 'sub'
  | 'architect'
  | 'change_order'
  | 'nda'
  | 'lien_waiver_statutory'
  | 'lien_waiver_generic';

/** Human-friendly group labels for ContractCategory, ordered for display. */
export const CONTRACT_CATEGORY_LABELS: Array<{
  id: ContractCategory;
  label: string;
}> = [
  { id: 'prime', label: 'Prime contracts' },
  { id: 'sub', label: 'Sub contracts' },
  { id: 'architect', label: 'Architect' },
  { id: 'change_order', label: 'Change orders' },
  { id: 'nda', label: 'NDAs' },
  { id: 'lien_waiver_statutory', label: 'Lien waivers (CA statutory)' },
  { id: 'lien_waiver_generic', label: 'Lien waivers (legacy generic)' },
];

export interface ContractTemplateMeta {
  id: string;
  name: string;
  /** Short lucide icon name OR emoji — used in the chooser card. */
  icon: string;
  /** One-line description shown in the chooser card. */
  desc: string;
  /** Longer description shown on hover / secondary row. */
  longDesc?: string;
  /** Picker grouping bucket. */
  category: ContractCategory;
  /**
   * 1–2 sentence "when would I pick this?" guidance shown as a tooltip /
   * helper line in the picker UI. Plain English, no legalese.
   */
  whenToUse: string;
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

// ---- Fields specific to CA Home Improvement Contract (Bus. & Prof. § 7159) --

const FIELD_CONTRACTOR_BOND: ContractField = {
  key: 'contractorBond',
  label: 'Contractor bond number',
  type: 'text',
  hint: 'CSLB requires a $25,000 minimum bond. Enter the bond number on file with CSLB.',
};

const FIELD_CONTRACTOR_PHONE: ContractField = {
  key: 'contractorPhone',
  label: 'Contractor phone number',
  type: 'text',
  hint: 'Required by § 7159(c)(3)(B)(iii) — phone to help the buyer fill out a Notice of Cancellation.',
};

const FIELD_CONTRACTOR_EMAIL: ContractField = {
  key: 'contractorEmail',
  label: 'Contractor email for Notice of Cancellation',
  type: 'text',
  hint: 'Required by § 7159(c)(3)(B)(ii) — address/email where a Notice of Cancellation may be sent.',
};

const FIELD_FINANCE_CHARGE: ContractField = {
  key: 'financeCharge',
  label: 'Finance charge',
  type: 'currency',
  hint: 'Set out separately from Contract Price per § 7159(d)(6). Enter "NONE" if none.',
  placeholder: 'NONE',
};

const FIELD_DOWNPAYMENT: ContractField = {
  key: 'downPayment',
  label: 'Downpayment amount',
  type: 'currency',
  hint: 'CA law caps downpayment at 10% of contract price OR $1,000, whichever is less.',
  required: true,
};

const FIELD_INCORPORATED_DOCS: ContractField = {
  key: 'incorporatedDocuments',
  label: 'List of documents incorporated into the contract',
  type: 'textarea',
  hint: 'e.g., plans, specs, allowances, addenda. Write "NONE" if none.',
};

const FIELD_SUBCONTRACTOR_LIST: ContractField = {
  key: 'subcontractorList',
  label: 'List of subcontractors (if known)',
  type: 'textarea',
  hint: 'Name, contact info, license number, and classification. Required upon request per § 7159(c)(7)(B).',
};

const FIELD_CGL_NOTICE: ContractField = {
  key: 'cglNotice',
  label: 'Commercial General Liability (CGL) insurance notice',
  type: 'textarea',
  hint: 'Use one of the four statutory statements from § 7159(e)(1) — e.g., "This contractor carries CGL insurance written by [insurer]. Call [phone] to verify."',
};

const FIELD_WORKERS_COMP_NOTICE: ContractField = {
  key: 'workersCompNotice',
  label: 'Workers\' compensation insurance notice',
  type: 'textarea',
  hint: 'Use one of the statutory statements from § 7159(e)(2) — e.g., "This contractor has no employees and is exempt" OR "This contractor carries workers\' compensation insurance for all employees."',
};

const FIELD_ARBITRATION_NOTICE: ContractField = {
  key: 'arbitrationNotice',
  label: 'Arbitration notice (if used)',
  type: 'textarea',
  hint: 'If arbitration is elected, include the arbitration clause + CCP §§ 1280 et seq. disclosures. Otherwise write "Arbitration not elected."',
};

// ---- Fields specific to CA lien-waiver statutory forms ----------------------

const FIELD_PROGRESS_PAYMENT_AMOUNT: ContractField = {
  key: 'progressPaymentAmount',
  label: 'Progress payment amount',
  type: 'currency',
  required: true,
};

const FIELD_FINAL_PAYMENT_AMOUNT: ContractField = {
  key: 'finalPaymentAmount',
  label: 'Final payment amount',
  type: 'currency',
  required: true,
};

const FIELD_THROUGH_DATE: ContractField = {
  key: 'throughDate',
  label: 'Through date (work covered)',
  type: 'date',
  hint: 'The waiver covers work through this date only.',
  required: true,
};

const FIELD_EXCEPTIONS: ContractField = {
  key: 'exceptions',
  label: 'Exceptions / disputed claims',
  type: 'textarea',
  hint: 'Disputed claims, retentions, extras, or items not yet paid. Write "NONE" if none.',
  placeholder: 'NONE',
};

const FIELD_CONTRACTOR_SIGNATURE: ContractField = {
  key: 'contractorSignature',
  label: 'Claimant signatory name',
  type: 'text',
  hint: 'Name of the person signing on behalf of the claimant.',
};

const FIELD_SIGNATURE_DATE: ContractField = {
  key: 'signatureDate',
  label: 'Date of signature',
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
    category: 'prime',
    whenToUse:
      'Use as the main contract between you (the GC) and the homeowner on a non-California project, or any project where a state-specific home-improvement form is not required.',
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
    category: 'sub',
    whenToUse:
      'Use when you are the GC hiring a subcontractor for a trade package (electrical, plumbing, framing, etc.). Flows your prime-contract obligations down to the sub.',
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
    name: 'Lien Waiver — Conditional (Progress) (legacy generic — prefer statutory CA versions above)',
    icon: '📝',
    desc: 'Conditional waiver exchanged for a progress payment. Effective only when the check clears. (Legacy generic — prefer the CA § 8132 statutory version on California projects.)',
    longDesc:
      'Use this when requesting or receiving a progress payment. Because it is conditional, you keep your lien rights if the check bounces. Legacy generic — for California projects use the § 8132 statutory form instead.',
    category: 'lien_waiver_generic',
    whenToUse:
      'Legacy generic conditional progress waiver. For California, prefer the § 8132 statutory form instead — only use this for non-CA projects where a state-specific form is not required.',
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
    name: 'Lien Waiver — Unconditional (Final) (legacy generic — prefer statutory CA versions above)',
    icon: '⚠',
    desc: 'Final unconditional waiver. Once signed, lien rights are gone — whether or not you were paid. (Legacy generic — prefer the CA § 8138 statutory version on California projects.)',
    longDesc:
      'Only use AFTER the final check has cleared your bank. Statutory-form states require exact statutory language — have an attorney confirm before use. Legacy generic — for California projects use the § 8138 statutory form.',
    category: 'lien_waiver_generic',
    whenToUse:
      'Legacy generic unconditional final waiver. For California, prefer the § 8138 statutory form. Only sign AFTER the final check has cleared — once signed, your lien rights are extinguished.',
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
    category: 'nda',
    whenToUse:
      'Use before sharing sensitive pricing, plans, or methods during pre-bid or design-collaboration conversations. Both sides keep the disclosed information confidential.',
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
    id: 'client-agreement-ca-hic',
    name: 'Client Agreement — CA Home Improvement Contract (§ 7159)',
    icon: '🏠',
    desc: 'California-compliant Home Improvement Contract per Bus. & Prof. Code § 7159.',
    longDesc:
      'CA-statutory Home Improvement Contract. Includes the verbatim Mechanics Lien Warning (§ 7159(e)(4)), Three-Day Right to Cancel (§ 7159(e)(6)), downpayment cap notice (§ 7159(d)(8)), CSLB contact info, and bond disclosure. Use this — not the generic Client Agreement — for any CA residential improvement project over $500.',
    category: 'prime',
    whenToUse:
      'Required for any California residential home-improvement contract over $500. Includes the verbatim Mechanics Lien Warning, 3-Day Right to Cancel, downpayment cap, and CSLB disclosures.',
    bodyFile: 'client-agreement-ca-hic.md',
    fields: [
      FIELD_CONTRACT_DATE,
      FIELD_CLIENT_NAME,
      FIELD_CLIENT_ADDRESS,
      FIELD_CONTRACTOR_NAME,
      FIELD_CONTRACTOR_ADDRESS,
      FIELD_CONTRACTOR_LICENSE,
      FIELD_CONTRACTOR_BOND,
      FIELD_CONTRACTOR_PHONE,
      FIELD_CONTRACTOR_EMAIL,
      FIELD_PROJECT_NAME,
      FIELD_PROJECT_ADDRESS,
      FIELD_SCOPE_OF_WORK,
      FIELD_CONTRACT_AMOUNT,
      FIELD_FINANCE_CHARGE,
      FIELD_DOWNPAYMENT,
      FIELD_PAYMENT_TERMS,
      FIELD_START_DATE,
      FIELD_COMPLETION_DATE,
      FIELD_INCORPORATED_DOCS,
      FIELD_SUBCONTRACTOR_LIST,
      FIELD_CGL_NOTICE,
      FIELD_WORKERS_COMP_NOTICE,
      FIELD_ARBITRATION_NOTICE,
    ],
  },
  {
    id: 'lien-waiver-progress-conditional',
    name: 'Lien Waiver — Conditional on Progress Payment (CA § 8132)',
    icon: '📝',
    desc: 'California statutory form: conditional waiver on a progress payment (Civ. Code § 8132).',
    longDesc:
      'STATUTORY FORM — California Civil Code § 8132. Effective only on actual receipt of the named check. Required for any CA progress payment where a waiver is exchanged.',
    category: 'lien_waiver_statutory',
    whenToUse:
      'California progress-payment waiver, conditional on actual receipt of the check. Required form when a CA owner requests a waiver before issuing a progress payment.',
    bodyFile: 'lien-waiver-progress-conditional.md',
    fields: [
      FIELD_CONTRACTOR_NAME,
      FIELD_CONTRACTOR_ADDRESS,
      { ...FIELD_CLIENT_NAME, label: 'Customer name (party making payment)' },
      FIELD_CLIENT_ADDRESS,
      FIELD_PROJECT_ADDRESS,
      FIELD_THROUGH_DATE,
      FIELD_PROGRESS_PAYMENT_AMOUNT,
      FIELD_EXCEPTIONS,
      FIELD_CONTRACTOR_SIGNATURE,
      FIELD_SIGNATURE_DATE,
    ],
  },
  {
    id: 'lien-waiver-progress-unconditional',
    name: 'Lien Waiver — Unconditional on Progress Payment (CA § 8134)',
    icon: '⚠',
    desc: 'California statutory form: unconditional waiver on a progress payment (Civ. Code § 8134).',
    longDesc:
      'STATUTORY FORM — California Civil Code § 8134. Enforceable on signature even if not paid. Do NOT sign unless the progress payment has been received and cleared.',
    category: 'lien_waiver_statutory',
    whenToUse:
      'California progress-payment waiver, unconditional. Only sign after the progress check has cleared — once signed it is enforceable whether or not you were paid.',
    bodyFile: 'lien-waiver-progress-unconditional.md',
    fields: [
      FIELD_CONTRACTOR_NAME,
      FIELD_CONTRACTOR_ADDRESS,
      { ...FIELD_CLIENT_NAME, label: 'Customer name (party who paid)' },
      FIELD_CLIENT_ADDRESS,
      FIELD_PROJECT_ADDRESS,
      FIELD_THROUGH_DATE,
      FIELD_PROGRESS_PAYMENT_AMOUNT,
      FIELD_EXCEPTIONS,
      FIELD_CONTRACTOR_SIGNATURE,
      FIELD_SIGNATURE_DATE,
    ],
  },
  {
    id: 'lien-waiver-final-conditional',
    name: 'Lien Waiver — Conditional on Final Payment (CA § 8136)',
    icon: '📝',
    desc: 'California statutory form: conditional waiver on final payment (Civ. Code § 8136).',
    longDesc:
      'STATUTORY FORM — California Civil Code § 8136. Effective only on actual receipt of the named final-payment check. Required for any CA final payment where a waiver is exchanged.',
    category: 'lien_waiver_statutory',
    whenToUse:
      'California final-payment waiver, conditional on actual receipt of the final check. Use when exchanging a waiver in return for the final payment on a CA project.',
    bodyFile: 'lien-waiver-final-conditional.md',
    fields: [
      FIELD_CONTRACTOR_NAME,
      FIELD_CONTRACTOR_ADDRESS,
      { ...FIELD_CLIENT_NAME, label: 'Customer name (party making final payment)' },
      FIELD_CLIENT_ADDRESS,
      FIELD_PROJECT_ADDRESS,
      FIELD_FINAL_PAYMENT_AMOUNT,
      FIELD_EXCEPTIONS,
      FIELD_CONTRACTOR_SIGNATURE,
      FIELD_SIGNATURE_DATE,
    ],
  },
  {
    id: 'lien-waiver-final-unconditional',
    name: 'Lien Waiver — Unconditional on Final Payment (CA § 8138)',
    icon: '⚠',
    desc: 'California statutory form: unconditional waiver on final payment (Civ. Code § 8138).',
    longDesc:
      'STATUTORY FORM — California Civil Code § 8138. Enforceable on signature even if not paid. Only sign AFTER the final check has cleared your bank — once signed, lien, stop-payment, and payment-bond rights are extinguished.',
    category: 'lien_waiver_statutory',
    whenToUse:
      'California final-payment waiver, unconditional. Only sign AFTER the final check has cleared — once signed, your lien, stop-payment, and payment-bond rights are extinguished.',
    bodyFile: 'lien-waiver-final-unconditional.md',
    fields: [
      FIELD_CONTRACTOR_NAME,
      FIELD_CONTRACTOR_ADDRESS,
      { ...FIELD_CLIENT_NAME, label: 'Customer name (party who paid)' },
      FIELD_CLIENT_ADDRESS,
      FIELD_PROJECT_ADDRESS,
      FIELD_FINAL_PAYMENT_AMOUNT,
      FIELD_EXCEPTIONS,
      FIELD_CONTRACTOR_SIGNATURE,
      FIELD_SIGNATURE_DATE,
    ],
  },
  {
    id: 'b141-owner-architect',
    name: 'Owner–Architect Agreement (B141-style — PREVIEW)',
    icon: '📐',
    desc: 'Owner–Architect engagement modeled on AIA B141. Preview only — have an attorney review.',
    longDesc:
      'PREVIEW. Modeled on AIA Document B141 — not an AIA-licensed form. Covers the five standard B141 phases (SD, DD, CD, Bidding, CA), compensation, copyright / instruments of service, standard of care, and termination. Have a CA-licensed attorney review before use.',
    category: 'architect',
    whenToUse:
      'Use when an owner is engaging an architect for design services (SD / DD / CD / Bidding / CA phases). Preview only — modeled on AIA B141, not the licensed form itself.',
    bodyFile: 'b141-owner-architect.md',
    fields: [
      FIELD_CONTRACT_DATE,
      FIELD_CLIENT_NAME,
      FIELD_CLIENT_ADDRESS,
      { ...FIELD_CONTRACTOR_NAME, label: 'Architect / firm legal name' },
      { ...FIELD_CONTRACTOR_ADDRESS, label: 'Architect mailing address' },
      { ...FIELD_CONTRACTOR_LICENSE, label: 'California architect license number' },
      FIELD_PROJECT_NAME,
      FIELD_PROJECT_ADDRESS,
      { ...FIELD_SCOPE_OF_WORK, label: 'Project description' },
      {
        key: 'phasesIncluded',
        label: 'Phases included',
        type: 'textarea',
        hint: 'e.g., Schematic Design, Design Development, Construction Documents.',
      },
      {
        key: 'phasesExcluded',
        label: 'Phases excluded',
        type: 'textarea',
        hint: 'e.g., Bidding, Construction Administration.',
      },
      {
        key: 'compensationMethod',
        label: 'Compensation method',
        type: 'text',
        hint: 'Fixed fee / percentage of construction cost / hourly w/ NTE.',
      },
      { ...FIELD_CONTRACT_AMOUNT, label: 'Total fee' },
      FIELD_PAYMENT_TERMS,
      FIELD_START_DATE,
      { ...FIELD_COMPLETION_DATE, label: 'Substantial completion of CDs' },
    ],
  },
  {
    id: 'change-order',
    name: 'Change Order',
    icon: '🔁',
    desc: 'Written modification to an executed contract — price, schedule, or scope.',
    longDesc:
      'Get every change in writing before work starts. Tracks cumulative contract price, schedule impact, and includes the cumulative-impact waiver (confirm enforceable in your state).',
    category: 'change_order',
    whenToUse:
      'Use when the scope, price, or schedule on an executed contract changes. Sign it BEFORE the changed work starts so everyone agrees on cost and schedule impact.',
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
 * Pick the default prime-contract template for a project. CA → CA HIC,
 * everything else → generic Client Agreement. Pass `null`/`undefined` when
 * the project has no jurisdiction yet — you'll get the generic form.
 */
export function getDefaultTemplateIdForJurisdiction(
  jurisdiction: string | null | undefined,
): string {
  const j = (jurisdiction ?? '').trim().toLowerCase();
  // Match "California", "ca", "CA - Marin County", "us-ca", "United States / California"
  const isCA =
    j === 'ca' ||
    j === 'california' ||
    /\bcalifornia\b/.test(j) ||
    /\bca\b/.test(j) ||
    j.startsWith('ca-') ||
    j.startsWith('us-ca') ||
    j.endsWith('-ca');
  return isCA ? 'client-agreement-ca-hic' : 'client-agreement';
}

/**
 * Case-insensitive substring filter across name + desc + whenToUse + id.
 * Empty query → all templates (in registry order).
 */
export function filterTemplatesByQuery(
  templates: ContractTemplateMeta[],
  query: string,
): ContractTemplateMeta[] {
  const q = query.trim().toLowerCase();
  if (!q) return templates.slice();
  return templates.filter((t) => {
    const hay = `${t.id} ${t.name} ${t.desc} ${t.whenToUse} ${t.longDesc ?? ''}`.toLowerCase();
    return hay.includes(q);
  });
}

/**
 * Group templates by ContractCategory in the order defined by
 * CONTRACT_CATEGORY_LABELS. Empty groups are dropped — so a filtered
 * list won't render empty <optgroup>s.
 */
export function groupTemplatesByCategory(
  templates: ContractTemplateMeta[],
): Array<{ id: ContractCategory; label: string; templates: ContractTemplateMeta[] }> {
  return CONTRACT_CATEGORY_LABELS.map(({ id, label }) => ({
    id,
    label,
    templates: templates.filter((t) => t.category === id),
  })).filter((g) => g.templates.length > 0);
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
