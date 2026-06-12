/**
 * Garden-engine L2 config contracts — barrel.
 *
 * The seam between the reusable engine and a specific garden. See
 * `docs/garden-engine/` for the extraction plan, dependency graph, and layout.
 *
 * Phase 1 (this commit) defines the contracts and wires the two hottest
 * adapters (lifecycle, roles) in `src/garden/builders/`. Nothing consumes them
 * yet — behaviour is unchanged. Phase 2 flips the generic consumers to read
 * from these contracts (see the architecture lint in eslint.config.mjs).
 */

export type {
  LifecycleStageDef,
  Lifecycle,
} from './lifecycle';
export { stageForWorkflow } from './lifecycle';

export type {
  ThemeColorTokens,
  ThemeFontTokens,
  ThemeMotionTokens,
  TypeScaleKey,
  ThemeTokens,
  BrandAssets,
} from './theme';

export type {
  WorkflowStep,
  WorkflowDefinition,
  WorkflowRegistry,
} from './workflows';

export type { PermissionRule, RoleModel } from './roles';

export type {
  KnowledgeQuery,
  KnowledgeResult,
  KnowledgeSource,
  AuthorityLevel,
} from './knowledge-source';

export type { McpContext, McpTool, McpToolRegistry } from './mcp';

export type {
  SeedBudgetLine,
  SeedEmailTemplate,
  OnboardingSeed,
} from './onboarding';

export type { CopilotConfig, GardenConfig } from './garden';
