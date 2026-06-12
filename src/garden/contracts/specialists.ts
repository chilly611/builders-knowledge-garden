/**
 * L2 contract — Specialists
 * =========================
 *
 * Part of the garden-engine extraction seam (CODE-2). See
 * `docs/garden-engine/01-DEPENDENCY-GRAPH.md §4` (edge 5: AnalysisPane →
 * specialists / specialists.client).
 *
 * The engine's `AnalysisPane` renders the result of an async "specialist"
 * call — narrative + citations + confidence + handoff banners. How that call
 * is executed (BKG: `fetch` to `/api/v1/specialists/[id]`) is garden-specific,
 * so the engine owns only the INTERFACE here and receives the concrete
 * runner via `SpecialistRunnerProvider` (see `src/garden/runtime/`). The
 * builders garden wires `runSpecialist` from `src/lib/specialists.client.ts`
 * in `src/garden/builders/specialists.ts`.
 *
 * These shapes are the single source of truth: `src/lib/specialists.ts`
 * re-exports them so the builders server runner and the engine consume the
 * SAME types (no drift between contract and implementation).
 *
 * Type-only module (no runtime, no 'use client') so server and client bundles
 * can both import it.
 */

export interface SpecialistContext {
  scope_description: string;
  jurisdiction?: string;
  trade?: string;
  /**
   * TODO(garden-engine Phase 3): the lane union is builders-specific
   * vocabulary; genericize alongside the RoleModel contract.
   */
  lane?: "gc" | "diy" | "specialty" | "worker" | "supplier" | "equipment" | "service" | "agent";
  project_phase?: string;
  extra?: Record<string, unknown>;
}

export interface SpecialistCitation {
  /**
   * Synthetic identifier of the form `${source}/${section}` — used as a
   * React key and display tag, NOT a UUID into `knowledge_entities`. There
   * is no `/knowledge/entity/:id` drill-through route; downstream UIs
   * should treat this as opaque and link through `url` instead.
   */
  entity_id: string;
  code_body?: string;
  section?: string;
  jurisdiction?: string;
  edition?: string;
  updated_at?: string;
  relevance?: string;
  /**
   * External deep-link to the source rule (ICC DigitalCodes, NFPA Link, or
   * a local amendment page). When present, the UI should route clicks
   * here instead of an internal entity page. Always opens in a new tab.
   */
  url?: string;
  /**
   * True only when the underlying CodeSourceResult was verified (text
   * actually retrieved). False for citation-only ICC/NFPA results — the
   * UI should hide the "click for full text" affordance for these.
   */
  verified?: boolean;
}

export interface DisciplineHandoff {
  detected: "electrical" | "structural" | "plumbing" | "mechanical" | "fire";
  suggestStep: string;
  message: string;
}

export interface SupersededNotice {
  oldSection: string;
  newSection: string;
  summary: string;
}

export interface SpecialistResult {
  narrative: string;
  structured: Record<string, unknown>;
  citations: SpecialistCitation[];
  confidence: "high" | "medium" | "low";
  deferred_to_human?: string;
  raw_response: string;
  model: string;
  latency_ms: number;
  promptVersion: "v1" | "v2";
  disciplineHandoff?: DisciplineHandoff;
  supersededNotice?: SupersededNotice;
  code_sections?: { section: string; title: string; requirement: string; status?: string }[];
  warnings?: string[];
  /**
   * For compliance specialists: number of distinct code sources cross-verified
   * (BKG seed / ICC / NFPA / local amendments). Set from
   * `codeSourceConfidenceData.sourceCount` after `queryAllSources` runs.
   * Drives the trust badge in AnalysisPane. Undefined for non-compliance
   * specialists.
   */
  sourceCount?: number;
  /**
   * ATTEST-WIRE: any of the underlying rows carry manual_attestation. Drives
   * the green-tick tooltip on the badge.
   */
  manuallyAttested?: boolean;
  /**
   * AUTO-VERIFY (2026-05-25): any of the underlying rows passed the Claude
   * cross-check pre-pass AND none are manually attested. Drives the
   * yellow-tick ai-checked label on the badge. Strictly weaker than manual.
   */
  autoVerified?: boolean;
}

/**
 * The injectable runner. The engine calls this with a specialist id and a
 * context; the garden decides transport (HTTP route, server action, mock).
 * Must reject with an `Error` whose `message` is user-presentable —
 * `AnalysisPane` renders it verbatim in its error surface.
 */
export type SpecialistRunner = (
  specialistId: string,
  context: SpecialistContext,
) => Promise<SpecialistResult>;
