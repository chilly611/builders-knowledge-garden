/**
 * Shared App Shell — the one chrome every Killer App surface mounts.
 *
 *   <ShellConfigProvider>  — wraps the killerapp tree; computes the default
 *                            lane/project config, accepts per-surface pushes.
 *   <ShellStrips />        — top budget + journey/time-machine strips.
 *   <ShellNav />           — bottom-right compass + "Ask or tell the garden".
 *   <Seal />               — the large animated umbrella seal.
 *
 * Owner Lane is now a CONFIG of this shell, not a bespoke copy. See
 * src/app/killerapp/projects/[id]/owner/OwnerHomeClient.tsx.
 */

export { ShellConfigProvider, useShellConfig, useSetShellConfig } from './ShellConfigContext';
export { ShellStrips } from './ShellStrips';
export { ShellNav } from './ShellNav';
export { Seal } from './Seal';
export { AskTheGarden } from './AskTheGarden';
export { buildDefaultConfig, SEAL_SRC, laneLabel, fmtMoney, STAGE_PLAIN } from './config';
export { Ico, StageIco } from './icons';
export type {
  ShellConfig, ShellBudget, ShellBudgetCell, ShellJourney, ShellNavItem, MoneyState,
} from './types';
