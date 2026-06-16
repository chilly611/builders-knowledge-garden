/**
 * Budget-DNA — public surface.
 *
 * The category palette + CSI map (`categories`), the week-timeline math
 * (`schedule`), the pure derivation (`derive`), and the project-bound hook
 * (`useBudgetDna`). Spec: docs/design/budget-dna-and-color-system.md.
 */

export * from './categories';
export * from './schedule';
export * from './derive';
export { useBudgetDna } from './useBudgetDna';
export type { UseBudgetDnaResult } from './useBudgetDna';
