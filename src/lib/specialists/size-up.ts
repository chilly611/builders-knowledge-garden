'use server';

/**
 * Size Up specialist (lifecycle stage 1).
 * ======================================
 *
 * Answers the plain question: "What are you building, where, and how big?"
 * and returns a ballpark cost the contractor can stand behind in front of a
 * client — without pretending to be a real estimate.
 *
 * The number is deterministic on purpose: `$/sqft x sqft x locale modifier`,
 * banded +/- 15%. A demo can't afford to depend on the LLM being reachable,
 * and the founder's brief specifies exactly this formula. The "AI specialist"
 * framing is honored by (a) running server-side, (b) resolving jurisdiction,
 * (c) returning a confidence score with a reason, and (d) logging every run to
 * `specialist_runs` for RSI Loop 2 telemetry — the same contract every other
 * specialist honors via `rsi-instrumentation`.
 *
 * This is a `'use server'` module: every export is an async server action.
 * The page imports `runSizeUpEstimate` / `emitSizeUpWrite` and calls them from
 * event handlers. Types are erased at compile time, so exporting them is safe.
 */

import { logSpecialistRunStart, logSpecialistRunComplete } from '@/lib/rsi-instrumentation';
import { eventBus } from '@/lib/events';
import type { SpecialistResult } from '@/lib/specialists';

// ─── Public types ───────────────────────────────────────────────────────────

export type BuildingType = 'residential' | 'commercial' | 'mixed';

export interface SizeUpInput {
  projectId?: string;
  buildingType: BuildingType;
  /** Free-form address or "lat,lng" pin string. Drives the locale modifier. */
  address?: string;
  /** Jurisdiction string already on the project record, if any. */
  jurisdiction?: string;
  squareFootage: number;
  /** Specialty trades selected by a sub. Informational; widens the band. */
  trades?: string[];
  /** Plain scope text (project notes / raw_input). Lifts confidence. */
  scopeText?: string;
  /** Pro override: $/sqft the contractor wants to force. */
  costPerSqftOverride?: number;
}

export interface EstimateLine {
  label: string;
  /** Share of the mid total, 0..1. */
  share: number;
  amount: number;
}

export interface JurisdictionResult {
  name: string;
  /** 'full' only where we have real code depth tonight (SF). */
  codeCoverage: 'full' | 'preliminary';
  note: string;
}

export interface SizeUpResult {
  low: number;
  mid: number;
  high: number;
  perSqftUsed: number;
  localeModifier: number;
  localeLabel: string;
  jurisdiction: JurisdictionResult;
  confidence: 'low' | 'medium' | 'high';
  confidenceReason: string;
  lines: EstimateLine[];
  assumptions: string[];
  /** specialist_runs.run_id, when telemetry is wired (service-role present). */
  runId: string | null;
}

// ─── Cost model (internal) ────────────────────────────────────────────────────
// Mid-grade, California-coastal baselines. These are deliberately conservative
// "ballpark" numbers, not a takeoff. The +/-15% band carries the uncertainty.

const BASE_PER_SQFT: Record<BuildingType, number> = {
  residential: 375,
  commercial: 285,
  mixed: 330,
};

// Trade-bucket split of the mid total — what shows in the line table.
const TRADE_SPLIT: Array<{ label: string; share: number }> = [
  { label: 'Sitework + foundation', share: 0.16 },
  { label: 'Shell + framing + roof', share: 0.27 },
  { label: 'MEP (mechanical / electrical / plumbing)', share: 0.18 },
  { label: 'Interior finishes', share: 0.24 },
  { label: 'GC overhead + margin', share: 0.15 },
];

const BAND = 0.15;

interface LocaleHit {
  modifier: number;
  label: string;
}

/** Resolve a cost-of-construction locale modifier from address + jurisdiction. */
function resolveLocale(address: string, jurisdiction: string): LocaleHit {
  const hay = `${address} ${jurisdiction}`.toLowerCase();
  if (/(san francisco|\bsf\b|soma|mission district)/.test(hay)) {
    return { modifier: 1.35, label: 'San Francisco metro' };
  }
  if (/(marin|sausalito|mill valley|tiburon|napa|sonoma)/.test(hay)) {
    return { modifier: 1.25, label: 'North Bay coastal' };
  }
  if (/(oakland|berkeley|east bay|alameda)/.test(hay)) {
    return { modifier: 1.18, label: 'East Bay' };
  }
  if (/(san jose|palo alto|peninsula|santa clara|silicon valley)/.test(hay)) {
    return { modifier: 1.22, label: 'Peninsula / South Bay' };
  }
  if (/(california|\bca\b|los angeles|san diego)/.test(hay)) {
    return { modifier: 1.1, label: 'California' };
  }
  return { modifier: 1.0, label: 'National baseline' };
}

/**
 * Jurisdiction depth gate. Tonight we only have real code coverage for
 * San Francisco (the UpCodes ~200-row seed). Everywhere else we surface the
 * jurisdiction name but flag the estimate as preliminary so nobody mistakes a
 * North-Bay ballpark for a code-checked number.
 */
function resolveJurisdiction(address: string, jurisdiction: string): JurisdictionResult {
  const hay = `${address} ${jurisdiction}`.toLowerCase();
  if (/(san francisco|\bsf\b|soma)/.test(hay)) {
    return {
      name: 'San Francisco, CA',
      codeCoverage: 'full',
      note: 'Full code coverage loaded (SF building + planning, ~200 provisions). Estimate is code-aware.',
    };
  }
  const name = jurisdiction.trim() || (address.trim() ? address.trim() : 'Unknown');
  return {
    name,
    codeCoverage: 'preliminary',
    note: 'Preliminary — deep code coverage is San Francisco-only right now. Treat this as a planning ballpark, not a code check.',
  };
}

function scoreConfidence(input: SizeUpInput): { level: 'low' | 'medium' | 'high'; reason: string } {
  const hasType = !!input.buildingType;
  const hasSqft = typeof input.squareFootage === 'number' && input.squareFootage > 0;
  const hasAddress = !!(input.address && input.address.trim()) || !!(input.jurisdiction && input.jurisdiction.trim());
  const hasScope = !!(input.scopeText && input.scopeText.trim().length > 12);

  if (hasType && hasSqft && hasAddress && hasScope) {
    return { level: 'high', reason: 'Building type, size, location, and scope are all set.' };
  }
  if (hasType && hasSqft && (hasAddress || hasScope)) {
    return { level: 'medium', reason: 'Type and size are set; tightening location and scope would narrow the band.' };
  }
  return { level: 'low', reason: 'Add square footage and a location to move past a rough guess.' };
}

function round100(n: number): number {
  return Math.round(n / 100) * 100;
}

function buildLines(mid: number): EstimateLine[] {
  return TRADE_SPLIT.map((t) => ({
    label: t.label,
    share: t.share,
    amount: round100(mid * t.share),
  }));
}

// ─── Server actions ───────────────────────────────────────────────────────────

/**
 * Run the Size Up specialist. Deterministic estimate + jurisdiction +
 * confidence, with a silent telemetry write to `specialist_runs`.
 */
export async function runSizeUpEstimate(input: SizeUpInput): Promise<SizeUpResult> {
  const start = Date.now();

  const runId = await logSpecialistRunStart({
    workflow_id: 'q1',
    step_id: 'size-up-estimate',
    specialist_id: 'size-up',
    prompt_version: 'deterministic-v1',
    input_json: input,
  });

  const address = input.address ?? '';
  const jurisdictionIn = input.jurisdiction ?? '';
  const sqft = Number.isFinite(input.squareFootage) ? Math.max(0, Math.round(input.squareFootage)) : 0;

  const locale = resolveLocale(address, jurisdictionIn);
  const jurisdiction = resolveJurisdiction(address, jurisdictionIn);
  const basePerSqft = BASE_PER_SQFT[input.buildingType] ?? BASE_PER_SQFT.residential;
  const perSqftUsed =
    typeof input.costPerSqftOverride === 'number' && input.costPerSqftOverride > 0
      ? input.costPerSqftOverride
      : basePerSqft;

  const rawMid = perSqftUsed * sqft * locale.modifier;
  const mid = round100(rawMid);
  // A pile of selected trades on a sub job widens the band a touch (more moving
  // parts the ballpark can't see yet).
  const band = BAND + Math.min(0.05, (input.trades?.length ?? 0) * 0.01);
  const low = round100(mid * (1 - band));
  const high = round100(mid * (1 + band));

  const conf = scoreConfidence(input);

  const assumptions: string[] = [
    `Mid-grade finishes at $${perSqftUsed}/sqft baseline for ${input.buildingType}.`,
    `${locale.label} cost factor applied (x${locale.modifier.toFixed(2)}).`,
    'Excludes land, design fees, permits, and unusual site conditions.',
    'Plus/minus band reflects ballpark uncertainty, not a priced takeoff.',
  ];
  if (input.trades && input.trades.length > 0) {
    assumptions.push(`Specialty scope noted: ${input.trades.join(', ')}.`);
  }

  const result: SizeUpResult = {
    low,
    mid,
    high,
    perSqftUsed,
    localeModifier: locale.modifier,
    localeLabel: locale.label,
    jurisdiction,
    confidence: conf.level,
    confidenceReason: conf.reason,
    lines: buildLines(mid),
    assumptions,
    runId,
  };

  // Telemetry: mirror into the SpecialistResult shape rsi-instrumentation expects.
  if (runId) {
    const asSpecialistResult: SpecialistResult = {
      narrative: `Ballpark ${input.buildingType} build in ${jurisdiction.name}: $${low.toLocaleString()}–$${high.toLocaleString()} (most likely $${mid.toLocaleString()}).`,
      structured: { ...result },
      citations: [],
      confidence: conf.level,
      raw_response: '',
      model: 'size-up/deterministic-v1',
      latency_ms: Date.now() - start,
      promptVersion: 'v1',
    };
    await logSpecialistRunComplete(runId, asSpecialistResult, Date.now() - start);
  }

  // Constitution mandate: the specialist run emits an event for RSI.
  await eventBus.emit(
    'specialist.size_up_run',
    {
      projectId: input.projectId ?? null,
      buildingType: input.buildingType,
      sqft,
      mid,
      jurisdiction: jurisdiction.name,
      confidence: conf.level,
      runId,
    },
    { source: 'size-up-specialist' }
  );

  return result;
}

/**
 * Emit the constitution-mandated write event after the page has persisted the
 * Size Up result to the project record via PATCH /api/v1/projects. Kept here so
 * the write path has an events.ts emission even though the REST route itself
 * predates the mandate and lives outside this stage's files.
 */
export async function emitSizeUpWrite(payload: {
  projectId: string;
  buildingType: BuildingType;
  sqft: number;
  budgetAmount: number;
  jurisdiction: string;
}): Promise<void> {
  await eventBus.emit(
    'project.size_up_saved',
    { ...payload },
    { source: 'size-up-stage' }
  );
}
