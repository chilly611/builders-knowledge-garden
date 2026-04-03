// Universal project types for the Builder's Knowledge Garden dream interfaces
// Every dream interface (Oracle, Alchemist, Cosmos, Sim, TimeMachine, Elements,
// WorldWalker, Narrator, Quest, Genome) serializes to/from this format.

export type DreamInterfaceType =
  | 'oracle'
  | 'alchemist'
  | 'cosmos'
  | 'sim'
  | 'timemachine'
  | 'elements'
  | 'worldwalker'
  | 'narrator'
  | 'quest'
  | 'genome';

export interface DreamProject {
  /** Unique identifier (nanoid or uuid) */
  id: string;
  /** User-given name */
  name: string;
  /** Which interface created this project */
  sourceInterface: DreamInterfaceType;
  /** Which interfaces this project has been opened in */
  visitedInterfaces: DreamInterfaceType[];
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last modification */
  updatedAt: string;
  /** Short user description */
  description: string;
  /** Hex color for thumbnail badge */
  themeColor: string;
  /** Schema version for forward compatibility */
  schemaVersion: number;

  /**
   * Interface-specific state data.
   * Each interface stores its serialized state under its own key.
   * This allows a project to carry state from multiple interfaces.
   */
  interfaceData: Partial<Record<DreamInterfaceType, unknown>>;

  /**
   * Common "dream DNA" extracted from any interface.
   * This is the portable essence that lets cross-interface switching work.
   * Interfaces read this to seed their initial state when opening a foreign project.
   */
  dreamEssence: DreamEssence;
}

/**
 * The portable core of a dream — extracted from any interface,
 * consumable by any other interface. This is the "rosetta stone"
 * that enables cross-interface project switching.
 */
export interface DreamEssence {
  styles: string[];        // e.g. ["Mediterranean", "Modern"]
  materials: string[];     // e.g. ["Warm Wood", "Glass"]
  features: string[];      // e.g. ["Infinity Pool", "Green Roof"]
  moods: string[];         // e.g. ["Sunset", "Ocean"]
  constraints: string[];   // e.g. ["IBC Code", "Budget"]
  freeformNotes: string;   // user's own words about the dream
  estimatedBudget?: string;
  profileSummary?: string; // from Oracle
}

/** Oracle-specific serialized state */
export interface OracleState {
  phase: 'intro' | 'questions' | 'processing' | 'profile' | 'renders';
  currentQuestion: number;
  answers: string[];
  profile: {
    lightPreference: string;
    socialScale: number;
    natureRelationship: string;
    aestheticDNA: string;
    securityNeed: string;
    rechargeMethod: string;
    homeEssence: string;
    overallVibe: string;
  } | null;
}

/** Alchemist-specific serialized state */
export interface AlchemistState {
  phase: 'compose' | 'transmuting' | 'result';
  crucibleIds: string[];   // ingredient IDs in the crucible
  activeCategory: number;
  result: {
    name: string;
    style: string;
    description: string;
    features: string[];
    estimatedCost: string;
    imagePrompt: string;
  } | null;
}

/** Cosmos-specific serialized state */
export interface CosmosState {
  absorbedIds: string[];   // node IDs that have been absorbed
  selectedId: string | null;
}

/** Metadata for the interface registry */
export interface InterfaceInfo {
  type: DreamInterfaceType;
  label: string;
  emoji: string;
  color: string;
  route: string;
  description: string;
  available: boolean;
}

/** The complete registry of all dream interfaces */
export const DREAM_INTERFACES: InterfaceInfo[] = [
  { type: 'oracle', label: 'The Oracle', emoji: '🔮', color: '#D85A30', route: '/dream/oracle', description: 'AI Dream Profiler — 7 life questions become architecture', available: true },
  { type: 'alchemist', label: 'The Alchemist', emoji: '⚗️', color: '#C4A44A', route: '/dream/alchemist', description: 'Mix ingredients to create dream homes', available: true },
  { type: 'cosmos', label: 'The Cosmos', emoji: '🌌', color: '#1D9E75', route: '/dream/cosmos', description: 'Explore the building universe in orbit', available: true },
  { type: 'sim', label: 'The Sim', emoji: '🏗️', color: '#3B82F6', route: '/dream/sim', description: 'Simulate and walk through your dream', available: false },
  { type: 'timemachine', label: 'Time Machine', emoji: '⏳', color: '#8B5CF6', route: '/dream/timemachine', description: 'See your project across decades', available: false },
  { type: 'elements', label: 'Elements', emoji: '🧩', color: '#EC4899', route: '/dream/elements', description: 'Build room by room, element by element', available: false },
  { type: 'worldwalker', label: 'WorldWalker', emoji: '🌍', color: '#0EA5E9', route: '/dream/worldwalker', description: 'Walk through buildings around the world', available: false },
  { type: 'narrator', label: 'The Narrator', emoji: '📖', color: '#F59E0B', route: '/dream/narrator', description: 'Tell the story of your dream home', available: false },
  { type: 'quest', label: 'The Quest', emoji: '⚔️', color: '#EF4444', route: '/dream/quest', description: 'Gamified building challenges', available: false },
  { type: 'genome', label: 'The Genome', emoji: '🧬', color: '#14B8A6', route: '/dream/genome', description: 'Evolve your design through generations', available: false },
];

/** Helper: generate a short unique ID */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Helper: create a blank project */
export function createBlankProject(
  sourceInterface: DreamInterfaceType,
  name?: string,
): DreamProject {
  const info = DREAM_INTERFACES.find(i => i.type === sourceInterface);
  return {
    id: generateId(),
    name: name || `${info?.label || 'Dream'} Project`,
    sourceInterface,
    visitedInterfaces: [sourceInterface],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: '',
    themeColor: info?.color || '#D85A30',
    schemaVersion: 1,
    interfaceData: {},
    dreamEssence: {
      styles: [],
      materials: [],
      features: [],
      moods: [],
      constraints: [],
      freeformNotes: '',
    },
  };
}

/** Helper: validate imported project JSON */
export function validateProject(data: unknown): data is DreamProject {
  if (!data || typeof data !== 'object') return false;
  const p = data as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.sourceInterface === 'string' &&
    typeof p.schemaVersion === 'number' &&
    typeof p.interfaceData === 'object' &&
    typeof p.dreamEssence === 'object'
  );
}
