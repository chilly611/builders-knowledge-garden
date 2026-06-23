// The AI-structuring SEAM.
//
// Everything model-specific (Whisper for voice, Claude for photo/text) lives BEHIND
// this interface. The capture endpoint depends only on `CaptureStructurer`, never on
// a vendor SDK — so swapping a deprecated model (or the whole provider) is a one-file
// change in structurer.default.ts, and tests inject a deterministic fake. This is the
// model-deprecation mitigation the sprint asked for.

export const SUPPORTED_KINDS = ['voice', 'photo'] as const;
// Roadmap stubs — accepted + stored (never silently dropped) but not auto-structured yet.
export const ROADMAP_KINDS = ['sketch', 'cad', 'blueprint', 'video'] as const;

export type CaptureKind = (typeof SUPPORTED_KINDS)[number] | (typeof ROADMAP_KINDS)[number];

export function isSupportedKind(k: string): k is (typeof SUPPORTED_KINDS)[number] {
  return (SUPPORTED_KINDS as readonly string[]).includes(k);
}
export function isRoadmapKind(k: string): k is (typeof ROADMAP_KINDS)[number] {
  return (ROADMAP_KINDS as readonly string[]).includes(k);
}

/** The field-report categories the structurer classifies into. */
export const CAPTURE_CATEGORIES = ['expense', 'progress', 'safety', 'delay', 'rfi', 'note'] as const;
export type CaptureCategory = (typeof CAPTURE_CATEGORIES)[number];

/** What the AI extracts from a voice transcript or a photo — the structured record. */
export interface StructuredRecord {
  category: CaptureCategory;
  cost_code: string | null; // MasterFormat code when it's an expense, else null
  amount: number | null; // USD when it's an expense, else null
  vendor: string | null;
  occurred_on: string | null; // ISO date (YYYY-MM-DD); the structurer defaults to "today" if unstated
  summary: string;
  confidence: number; // 0..1
  model: string; // which model produced this (provenance / deprecation tracking)
}

export interface TranscribeInput {
  storageUrl?: string;
  base64?: string;
  mimeType?: string;
}
export interface StructureInput {
  kind: CaptureKind;
  transcript?: string; // voice (post-transcription) or pre-supplied (offline path)
  imageUrl?: string; // photo
  imageBase64?: string; // photo
  mimeType?: string;
  knownCostCodes?: string[]; // so the model maps expenses to a REAL code, not a guess
  nowISO: string; // injected (no Date.now() in the seam → deterministic + testable)
}

/** The seam. Implementations: structurer.default.ts (Whisper+Claude); a fake in tests. */
export interface CaptureStructurer {
  transcribe(input: TranscribeInput): Promise<{ transcript: string; model: string }>;
  structure(input: StructureInput): Promise<StructuredRecord>;
}

/** A typed error so the endpoint can mark a single item 'failed' without aborting the batch. */
export class CaptureError extends Error {}

// Factory — the one place the concrete implementation is named. Tests vi.mock this module.
let _override: CaptureStructurer | null = null;
export function setStructurer(s: CaptureStructurer | null) {
  _override = s;
}
export async function getStructurer(): Promise<CaptureStructurer> {
  if (_override) return _override;
  const { DefaultStructurer } = await import('./structurer.default');
  return new DefaultStructurer();
}
