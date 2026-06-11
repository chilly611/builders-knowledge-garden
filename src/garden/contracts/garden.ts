/**
 * L2 contract — GardenConfig (the single object an app hands the engine)
 * =====================================================================
 *
 * This is the seam. The engine (L0/L1) reads everything domain-specific from a
 * `GardenConfig`; it must never `import` from a garden (L3) directly. Each
 * garden — `gardens/builders` (BKG) today, a new garden tomorrow — supplies one
 * implementation.
 *
 * See `docs/garden-engine/00-EXTRACTION-PLAN.md` and `02-REPO-LAYOUT.md §2`.
 */

import type { Lifecycle } from './lifecycle';
import type { ThemeTokens, BrandAssets } from './theme';
import type { WorkflowRegistry } from './workflows';
import type { RoleModel } from './roles';
import type { KnowledgeSource } from './knowledge-source';
import type { McpToolRegistry } from './mcp';
import type { OnboardingSeed } from './onboarding';

export interface CopilotConfig {
  /** System persona prefix (de-hardcodes rag.ts "AI Construction Copilot"). */
  systemPersona: string;
  /** entity_type values RAG retrieves over (BKG: building_code, code_section…). */
  entityTypeFilter: string[];
}

export interface GardenConfig {
  /**
   * Namespace prefix for localStorage/cookies — replaces the hardcoded `bkg-`
   * prefix (15+ keys today: bkg-active-project, bkg-lane, bkg-jurisdiction…).
   */
  namespace: string;
  theme: ThemeTokens;
  brand: BrandAssets;
  lifecycle: Lifecycle;
  workflows: WorkflowRegistry;
  roles: RoleModel;
  knowledgeSources: KnowledgeSource[];
  mcpTools: McpToolRegistry;
  onboarding: OnboardingSeed;
  copilot: CopilotConfig;
}
