/**
 * Knowledge Gardens OS — Pattern Language primitives barrel.
 *
 * The RSI Heartbeat is the platform. One self-improving knowledge graph per
 * garden, ingesting source data on a domain cadence, re-verifying every entity,
 * surfacing freshness on every claim, learning from use. Every primitive in
 * this barrel reads the Stance Card before rendering — that is how the
 * platform's accumulated learning reaches the point of decision.
 *
 * The 20-piece Pattern Language (per docs/strategy/lane-stance-strategy-v3.md):
 *
 *   Constitutional (7, from the design constitution):
 *     01 InvitationCard
 *     02 EmotionalArc
 *     03 Whisper
 *     04 TimeMachine
 *     05 AskAnything
 *     06 ProToggle           (also catalogued as #12)
 *     07 ProgressiveReveal
 *
 *   Platform (4, baked into every garden):
 *     08 TrustStrip
 *     09 ThreeSourceRule (helper, not a React component)
 *     10 FederationContract  (enforced via brand-tokens + layout chrome)
 *     11 MachineLegibleEverything (route-level JSON-LD + llms.txt + MCP)
 *
 *   Dimensional (9, ratified in v3):
 *     12 ProToggle           (lane × skill)
 *     13 InfiniteDescent     (engagement-depth × skill)
 *     14 TempoAdapt          (time-pressure)
 *     15 ModalityMirror      (modality)
 *     16 CulturalRender      (cultural + lingual)
 *     17 AccessibilityAdapt  (accessibility)
 *     18 CrossSurfaceBridge  (surface continuity)
 *     19 LifecycleMemory     (time-horizon)
 *     20 TrustPostureAdapt   (trust-posture)
 *
 * Pieces 10 and 11 are platform-level patterns enforced by layout + route
 * conventions rather than reusable React components, so they don't appear as
 * exports here. The other 18 do.
 */

export { InvitationCard, type InvitationCardProps } from './InvitationCard';
export { EmotionalArc, type EmotionalArcProps, type ArcStage } from './EmotionalArc';
export { Whisper, type WhisperProps } from './Whisper';
export {
  TimeMachine,
  useTimeMachineHistory,
  type TimeMachineProps,
  type TimeMachineEntry,
} from './TimeMachine';
export { AskAnything, type AskAnythingProps } from './AskAnything';
export { ProToggle, type ProToggleProps } from './ProToggle';
export { ProgressiveReveal, type ProgressiveRevealProps } from './ProgressiveReveal';

export { TrustStrip, type TrustStripProps } from './TrustStrip';
export {
  verifyThreeSource,
  isAuthoritative,
  verdictLabel,
  type ClaimVerdict,
  type SourceCitation,
} from './ThreeSourceRule';

export { InfiniteDescent, type InfiniteDescentProps, type DescentFloor } from './InfiniteDescent';
export { TempoAdapt, type TempoAdaptProps } from './TempoAdapt';
export { ModalityMirror, type ModalityMirrorProps } from './ModalityMirror';
export {
  CulturalRender,
  useLocale,
  formatLength,
  formatCurrency,
  type CulturalRenderProps,
} from './CulturalRender';
export { AccessibilityAdapt, type AccessibilityAdaptProps } from './AccessibilityAdapt';
export {
  CrossSurfaceBridge,
  persistBridge,
  readBridge,
  useBridge,
  type CrossSurfaceBridgeProps,
  type BridgePayload,
} from './CrossSurfaceBridge';
export { LifecycleMemory, type LifecycleMemoryProps, type LifecycleStageRecord } from './LifecycleMemory';
export { TrustPostureAdapt, type TrustPostureAdaptProps } from './TrustPostureAdapt';

export {
  DEFAULT_STANCE_CARD,
  type StanceCard,
  type StanceDomain,
  type StanceSurface,
  type StanceLane,
  type StanceModality,
  type StanceDeviceClass,
  type StanceTempo,
  type StanceEmotionalSignal,
  type StanceTimeHorizon,
  type StanceLocale,
  type StanceAccessibility,
} from './StanceCard.types';
