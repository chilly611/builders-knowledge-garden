/**
 * Builders garden — config (BKG)
 * ==============================
 *
 * Phase 1 wires the two hottest adapters that Phase 2 needs to cut coupling
 * edges. The remaining `GardenConfig` slices (theme, brand, workflows,
 * knowledgeSources, mcpTools, onboarding, copilot) are assembled in Phase 2–3
 * as each subsystem is inverted onto its contract — see
 * `docs/garden-engine/00-EXTRACTION-PLAN.md`. We intentionally do NOT stub them
 * here: a partial-but-honest config beats a fake full one.
 */

export { buildersLifecycle, buildersStageFromPath } from './lifecycle';
export { buildersRoles } from './roles';
