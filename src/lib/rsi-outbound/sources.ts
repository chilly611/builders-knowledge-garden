// Builder's Knowledge Garden — RSI OUTBOUND heartbeat (Stage 4a) · SOURCE REGISTRY
// ---------------------------------------------------------------------------
// THIS IS THE CONFIG FILE. The daily OUTBOUND heartbeat polls every enabled
// entry below for a drift signature and, when a source has changed, enqueues a
// review candidate into improvement_ledger (never auto-applies — see the Manual
// RSI Protocol guardrail).
//
// To add/retire a source: edit OUTBOUND_SOURCES and bump REGISTRY_VERSION. No
// code changes are required elsewhere. URLs are the canonical publisher landing
// / feed pages curated in docs/EXTERNAL-CODE-SOURCES.md (section-level deep
// links are deferred to the licensed icc-digital-codes adapter).
//
// Fields are documented in ./types.ts (OutboundSource).

import type { OutboundSource } from './types';

/** Bump when the registry changes; stamped into every heartbeat_reports row. */
export const REGISTRY_VERSION = '2026-05-31.1';

/**
 * Static snapshot of published knowledge_entities counts by entity_type
 * (docs/EXTERNAL-CODE-SOURCES.md, Round-5 backfill, 2026-05-22). Used ONLY as
 * a fallback to size drift impact when a live DB read is unavailable (e.g. an
 * offline dry run). The live run always prefers a real count query.
 */
export const KG_ENTITY_TYPE_BASELINE: Record<string, number> = {
  building_code: 569,
  material: 486,
  safety_regulation: 325,
  construction_method: 214,
  jurisdiction: 131,
  sustainability: 74,
  inspection: 70,
  legal: 61,
  certification: 58,
  project_delivery: 31,
  architectural_style: 30,
  trade: 28,
  building_type: 26,
  method: 25,
  standard: 24,
  permit_requirement: 22,
  sequence_rule: 20,
  inspection_protocol: 18,
  equipment: 16,
  climate_zone: 12,
  zoning_district: 8,
  code_section: 8,
};

export const OUTBOUND_SOURCES: OutboundSource[] = [
  // ── ICC model code family (codes.iccsafe.org) ──────────────────────────
  {
    id: 'icc-ibc',
    name: 'ICC International Building Code (IBC 2021)',
    kind: 'code',
    publisher: 'ICC',
    url: 'https://codes.iccsafe.org/content/IBC2021P2',
    entityTypes: ['building_code'],
    slugPrefixes: ['ibc-'],
    enabled: true,
    seedCandidateOnBaseline: true,
    checkMethod: 'head',
  },
  {
    id: 'icc-irc',
    name: 'ICC International Residential Code (IRC 2021)',
    kind: 'code',
    publisher: 'ICC',
    url: 'https://codes.iccsafe.org/content/IRC2021P2',
    entityTypes: ['building_code'],
    slugPrefixes: ['irc-'],
    enabled: true,
    seedCandidateOnBaseline: true,
    checkMethod: 'head',
  },
  {
    id: 'icc-ifc',
    name: 'ICC International Fire Code (IFC 2021)',
    kind: 'code',
    publisher: 'ICC',
    url: 'https://codes.iccsafe.org/content/IFC2021P1',
    entityTypes: ['building_code', 'safety_regulation'],
    slugPrefixes: ['ifc-', 'mep-ifc-'],
    enabled: true,
    seedCandidateOnBaseline: false,
    checkMethod: 'head',
  },
  {
    id: 'icc-imc',
    name: 'ICC International Mechanical Code (IMC 2021)',
    kind: 'code',
    publisher: 'ICC',
    url: 'https://codes.iccsafe.org/content/IMC2021P1',
    entityTypes: ['building_code'],
    slugPrefixes: ['imc-', 'mep-cmc-'],
    enabled: true,
    seedCandidateOnBaseline: false,
    checkMethod: 'head',
  },
  {
    id: 'icc-ipc',
    name: 'ICC International Plumbing Code (IPC 2021)',
    kind: 'code',
    publisher: 'ICC',
    url: 'https://codes.iccsafe.org/content/IPC2021P1',
    entityTypes: ['building_code'],
    slugPrefixes: ['ipc-', 'mep-cpc-'],
    enabled: true,
    seedCandidateOnBaseline: false,
    checkMethod: 'head',
  },
  {
    id: 'icc-iecc',
    name: 'ICC International Energy Conservation Code (IECC 2021)',
    kind: 'code',
    publisher: 'ICC',
    url: 'https://codes.iccsafe.org/content/IECC2021P1',
    entityTypes: ['building_code', 'sustainability', 'climate_zone'],
    slugPrefixes: ['iecc-'],
    enabled: true,
    seedCandidateOnBaseline: false,
    checkMethod: 'head',
  },
  {
    id: 'ca-title-24',
    name: 'California Title 24 Building Energy Efficiency Standards',
    kind: 'code',
    publisher: 'California Energy Commission',
    url: 'https://www.energy.ca.gov/programs-and-topics/programs/building-energy-efficiency-standards',
    entityTypes: ['building_code', 'jurisdiction', 'sustainability'],
    slugPrefixes: ['title-24-', 'mep-title-24-', 'cbc-', 'crc-', 'cec-'],
    enabled: true,
    seedCandidateOnBaseline: false,
    checkMethod: 'head',
  },

  // ── NFPA (nfpa.org) — electrical & fire ────────────────────────────────
  {
    id: 'nfpa-70-nec',
    name: 'NFPA 70 — National Electrical Code (NEC)',
    kind: 'code',
    publisher: 'NFPA',
    url: 'https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70',
    entityTypes: ['building_code', 'safety_regulation', 'standard'],
    slugPrefixes: ['nec-', 'mep-nec-', 'nfpa-70-'],
    enabled: true,
    seedCandidateOnBaseline: true,
    checkMethod: 'get',
    notes: 'NFPA frequently bot-blocks HEAD; GET (range) is more reliable, errors are tolerated.',
  },
  {
    id: 'nfpa-101-life-safety',
    name: 'NFPA 101 — Life Safety Code',
    kind: 'safety_regulation',
    publisher: 'NFPA',
    url: 'https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=101',
    entityTypes: ['safety_regulation', 'building_code'],
    slugPrefixes: ['nfpa-101-'],
    enabled: true,
    seedCandidateOnBaseline: false,
    checkMethod: 'get',
  },

  // ── OSHA / EPA / DOT (federal) ─────────────────────────────────────────
  {
    id: 'osha-1926-construction',
    name: 'OSHA 29 CFR 1926 — Construction Standards',
    kind: 'safety_regulation',
    publisher: 'OSHA',
    url: 'https://www.osha.gov/laws-regs/regulations/standardnumber/1926',
    entityTypes: ['safety_regulation'],
    slugPrefixes: ['osha-1926-'],
    enabled: true,
    seedCandidateOnBaseline: true,
    checkMethod: 'head',
  },
  {
    id: 'osha-1910-general',
    name: 'OSHA 29 CFR 1910 — General Industry Standards',
    kind: 'safety_regulation',
    publisher: 'OSHA',
    url: 'https://www.osha.gov/laws-regs/regulations/standardnumber/1910',
    entityTypes: ['safety_regulation'],
    slugPrefixes: ['osha-1910-', 'osha-std-1910'],
    enabled: true,
    seedCandidateOnBaseline: false,
    checkMethod: 'head',
  },
  {
    id: 'epa',
    name: 'US Environmental Protection Agency',
    kind: 'safety_regulation',
    publisher: 'EPA',
    url: 'https://www.epa.gov/',
    entityTypes: ['safety_regulation', 'sustainability'],
    slugPrefixes: ['epa-'],
    enabled: true,
    seedCandidateOnBaseline: false,
    checkMethod: 'head',
  },

  // ── Referenced standards bodies ────────────────────────────────────────
  {
    id: 'aci-318',
    name: 'ACI — American Concrete Institute (ACI 318 family)',
    kind: 'standard',
    publisher: 'ACI',
    url: 'https://www.concrete.org/',
    entityTypes: ['standard', 'material', 'construction_method'],
    slugPrefixes: ['aci-', 'standard-aci-318'],
    enabled: true,
    seedCandidateOnBaseline: false,
    checkMethod: 'get',
    notes: 'concrete.org bot-blocks automated HEAD; GET tolerated, errors are non-fatal.',
  },
  {
    id: 'aisc-360',
    name: 'AISC — American Institute of Steel Construction (AISC 360)',
    kind: 'standard',
    publisher: 'AISC',
    url: 'https://www.aisc.org/',
    entityTypes: ['standard', 'material'],
    slugPrefixes: ['aisc-', 'standard-aisc-360'],
    enabled: true,
    seedCandidateOnBaseline: false,
    checkMethod: 'head',
  },
  {
    id: 'asce-7',
    name: 'ASCE 7 — Minimum Design Loads',
    kind: 'standard',
    publisher: 'ASCE',
    url: 'https://www.asce.org/publications-and-news/asce-7',
    entityTypes: ['standard'],
    slugPrefixes: ['asce-', 'asce7-', 'standard-asce-7'],
    enabled: true,
    seedCandidateOnBaseline: false,
    checkMethod: 'head',
  },
  {
    id: 'ashrae',
    name: 'ASHRAE — Standards & Guidelines',
    kind: 'standard',
    publisher: 'ASHRAE',
    url: 'https://www.ashrae.org/technical-resources/standards-and-guidelines',
    entityTypes: ['standard', 'material', 'construction_method'],
    slugPrefixes: ['ashrae-', 'standard-ashrae-', 'mep-ashrae-'],
    enabled: true,
    seedCandidateOnBaseline: false,
    checkMethod: 'head',
  },
  {
    id: 'awc-nds',
    name: 'AWC — American Wood Council (NDS)',
    kind: 'standard',
    publisher: 'AWC',
    url: 'https://awc.org/',
    entityTypes: ['standard', 'material', 'construction_method'],
    slugPrefixes: ['awc-', 'standard-nds-wood'],
    enabled: true,
    seedCandidateOnBaseline: false,
    checkMethod: 'head',
  },

  // ── Regulatory news & data feeds ───────────────────────────────────────
  {
    id: 'federal-register-building',
    name: 'Federal Register — building code & construction rules (JSON API)',
    kind: 'news',
    publisher: 'US Federal Register (NARA/GPO)',
    url: 'https://www.federalregister.gov/api/v1/documents.json?conditions%5Bterm%5D=building%20code&per_page=20&order=newest',
    entityTypes: ['building_code', 'safety_regulation', 'legal', 'permit_requirement'],
    slugPrefixes: [],
    enabled: true,
    seedCandidateOnBaseline: true,
    checkMethod: 'get',
    notes: 'Live JSON feed; content fingerprint shifts whenever a relevant rule is published.',
  },
  {
    id: 'cpsc-recalls',
    name: 'CPSC — product recalls (construction materials & equipment)',
    kind: 'news',
    publisher: 'US Consumer Product Safety Commission',
    url: 'https://www.saferproducts.gov/RestWebServices/Recall?format=json&RecallTitle=construction',
    entityTypes: ['material', 'equipment', 'safety_regulation', 'certification'],
    slugPrefixes: [],
    enabled: true,
    seedCandidateOnBaseline: false,
    checkMethod: 'get',
  },
  {
    id: 'census-construction-spending',
    name: 'US Census — Construction Spending (C30)',
    kind: 'data_feed',
    publisher: 'US Census Bureau',
    url: 'https://www.census.gov/construction/c30/c30index.html',
    entityTypes: ['material', 'trade'],
    slugPrefixes: [],
    enabled: true,
    seedCandidateOnBaseline: false,
    checkMethod: 'head',
  },
  {
    id: 'bls-ppi-construction',
    name: 'BLS — Producer Price Index (construction materials)',
    kind: 'data_feed',
    publisher: 'US Bureau of Labor Statistics',
    url: 'https://www.bls.gov/ppi/',
    entityTypes: ['material'],
    slugPrefixes: [],
    enabled: true,
    seedCandidateOnBaseline: false,
    checkMethod: 'head',
  },
];

/** The enabled subset the heartbeat actually polls. */
export function enabledSources(): OutboundSource[] {
  return OUTBOUND_SOURCES.filter((s) => s.enabled);
}
