/**
 * Stance Card — the canonical 14-axis user-state shape.
 *
 * The RSI Heartbeat is the platform. One self-improving knowledge graph per
 * garden, ingesting source data on a domain cadence, re-verifying every entity,
 * surfacing freshness on every claim, learning from use. The platform doesn't
 * hold knowledge — it improves itself in public. Every other platform in our
 * space holds static data and ages. We get more right every week. That is the
 * moat in the AI era.
 *
 * Every primitive reads this before rendering. Every agent reads it to act on
 * behalf of the user. This is what "all four lanes always" means in code.
 *
 * Source of truth: docs/strategy/lane-stance-strategy-v3.md (locked 2026-05-25)
 *
 * Do NOT add fields to this type without reopening the v3 strategy. Every
 * primitive must handle the existing 14 axes; adding a 15th breaks the
 * "explicit rendering or explicit no-op for every axis" contract.
 */

export type StanceDomain =
  | 'construction'
  | 'orchids'
  | 'toxicology'
  | 'health'
  | 'biomarker'
  | 'unknown';

export type StanceSurface = 'garden' | 'dream' | 'killer-app';

export type StanceLane =
  | 'administrator'
  | 'professional'
  | 'public'
  | 'machine';

export type StanceModality = 'visual' | 'voice' | 'gesture' | 'agent-api';

export type StanceDeviceClass =
  | 'phone'
  | 'tablet'
  | 'desktop'
  | 'xr'
  | 'voice-only'
  | 'agent';

export type StanceTempo = 'leisurely' | 'focused' | 'urgent' | 'emergency';

export type StanceEmotionalSignal =
  | 'curious'
  | 'anxious'
  | 'confident'
  | 'overwhelmed'
  | 'celebratory'
  | 'mournful';

export type StanceTimeHorizon =
  | 'now'
  | 'today'
  | 'this-week'
  | 'this-project'
  | 'lifetime';

export interface StanceLocale {
  language: string; // BCP 47 tag, e.g. 'en-US'
  jurisdiction: string; // ISO 3166-2 region, e.g. 'US-CA'
  units: 'imperial' | 'metric';
  currency: string; // ISO 4217, e.g. 'USD'
  conventions: Record<string, unknown>;
}

export interface StanceAccessibility {
  vision: 'default' | 'low' | 'blind';
  hearing: 'default' | 'low' | 'deaf';
  motor: 'default' | 'limited';
  cognitive: 'default' | 'reduced-motion' | 'simplified';
  neurodivergent: boolean;
}

export interface StanceCard {
  /** Which garden domain the user is in. */
  domain: StanceDomain;
  /** Which of the 3 umbrella surfaces is mounted. */
  surface: StanceSurface;
  /** Domain-specific lifecycle stage (e.g. construction: 'size-up' | 'lock' | ...). */
  stage?: string;
  /** Which of the 4 umbrella lanes the user is acting in. */
  lane: StanceLane;
  /** 0.0 plain → 1.0 expert. Continuous so primitives can render gracefully. */
  skill_signal: number;
  /** Active modality. */
  modality: StanceModality;
  /** Device class drives layout density + interaction model. */
  device_class: StanceDeviceClass;
  /** Time pressure axis. Drives TempoAdapt + AskAnything urgency. */
  tempo: StanceTempo;
  /** Optional inferred emotional state. */
  emotional_signal?: StanceEmotionalSignal;
  /** Language + jurisdiction + units + currency + conventions. */
  locale: StanceLocale;
  /** Vision, hearing, motor, cognitive, neurodivergent flags. */
  accessibility: StanceAccessibility;
  /** Optional 0.0-1.0 economic-pressure signal, only set when relevant. */
  economic_signal?: number;
  /** Horizon of the user's current intent. */
  time_horizon: StanceTimeHorizon;
  /** 0.0-1.0 inferred from tenure + behavior. TrustPostureAdapt drives this. */
  trust_posture: number;
}

/**
 * The minimal default Stance Card. Every primitive must render acceptably
 * against this — it is the cold-start state when nothing is known.
 */
export const DEFAULT_STANCE_CARD: StanceCard = {
  domain: 'unknown',
  surface: 'killer-app',
  lane: 'public',
  skill_signal: 0.3,
  modality: 'visual',
  device_class: 'desktop',
  tempo: 'focused',
  locale: {
    language: 'en-US',
    jurisdiction: 'US-CA',
    units: 'imperial',
    currency: 'USD',
    conventions: {},
  },
  accessibility: {
    vision: 'default',
    hearing: 'default',
    motor: 'default',
    cognitive: 'default',
    neurodivergent: false,
  },
  time_horizon: 'today',
  trust_posture: 0.1,
};
