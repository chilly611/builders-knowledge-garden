'use client';

/**
 * BudgetRibbon — Row 1 of KillerAppChrome.
 *
 * Three equal blocks across a single 56–60px tall row:
 *   ┌───────────┬──────────────┬─────────────┐
 *   │ SpendBlock│ IncomeStacked│ HeadroomGauge│
 *   └───────────┴──────────────┴─────────────┘
 *
 * The ribbon itself owns no state. It accepts a KacBudget and renders.
 * Clicking any of the three blocks fires onDrilldown(blockName) so the
 * parent (the page) can open the existing BudgetModule for the chosen
 * block. We deliberately don't try to OPEN BudgetModule from inside
 * the chrome — chrome is meant to be a glance, not a workspace.
 */

import { KAC_COLORS } from './types';
import type { KacBudget } from './types';
import SpendBlock from './SpendBlock';
import IncomeStackedTracks from './IncomeStackedTracks';
import HeadroomGauge from './HeadroomGauge';

export type BudgetRibbonBlock = 'spend' | 'income' | 'headroom';

export interface BudgetRibbonProps {
  budget: KacBudget;
  /** Fired when the user taps one of the three blocks. */
  onDrilldown?: (block: BudgetRibbonBlock) => void;
}

export default function BudgetRibbon({ budget, onDrilldown }: BudgetRibbonProps) {
  return (
    <div
      role="region"
      aria-label="Project budget at a glance"
      style={{
        display: 'flex',
        alignItems: 'stretch',
        background: KAC_COLORS.card,
        border: `1px solid ${KAC_COLORS.cardBorder}`,
        borderRadius: 12,
        boxShadow: `0 1px 2px ${KAC_COLORS.shadow}`,
        overflow: 'hidden',
        flexShrink: 0,
        minHeight: 64,
      }}
    >
      <SpendBlock budget={budget} onClick={() => onDrilldown?.('spend')} />
      <IncomeStackedTracks budget={budget} onClick={() => onDrilldown?.('income')} />
      <HeadroomGauge budget={budget} onClick={() => onDrilldown?.('headroom')} />
    </div>
  );
}
