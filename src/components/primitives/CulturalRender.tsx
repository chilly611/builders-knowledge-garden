/**
 * CulturalRender (Pattern Language #16, Dimensional Rendering).
 *
 * Category: Dimensional Rendering.
 * Axes touched: locale (primary — language + jurisdiction + units + currency
 *               + conventions). Plus active touches: lane (administrators may
 *               see multi-jurisdiction toggles), modality (voice rendering
 *               uses locale.language for TTS).
 *
 * Language · units · jurisdiction · conventions as first-class data, not
 * settings. The primitive provides format helpers + a small wrapper that
 * supplies LocaleContext to children.
 */

'use client';

import * as React from 'react';
import { createContext, useContext } from 'react';
import { useStanceCard } from '@/lib/stance-card';
import type { StanceCard, StanceLocale } from './StanceCard.types';

const LocaleContext = createContext<StanceLocale | null>(null);

export interface CulturalRenderProps {
  children: React.ReactNode;
  /** Override locale — e.g. previewing US-CA when user is in US-NV. */
  override?: Partial<StanceLocale>;
  /** Pin stance for SSR. */
  stance?: StanceCard;
}

export function CulturalRender({
  children,
  override,
  stance,
}: CulturalRenderProps) {
  const clientStance = useStanceCard();
  const base = (stance ?? clientStance).locale;
  const value: StanceLocale = { ...base, ...override };
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): StanceLocale {
  const ctx = useContext(LocaleContext);
  const stance = useStanceCard();
  return ctx ?? stance.locale;
}

/** Format a length given in feet, converting if locale is metric. */
export function formatLength(value: number, fromUnit: 'ft' | 'm', locale: StanceLocale): string {
  const meters = fromUnit === 'm' ? value : value * 0.3048;
  if (locale.units === 'metric') {
    return `${meters.toFixed(2)} m`;
  }
  const feet = fromUnit === 'ft' ? value : value / 0.3048;
  return `${feet.toFixed(1)} ft`;
}

/** Format currency for the locale. */
export function formatCurrency(amount: number, locale: StanceLocale): string {
  try {
    return new Intl.NumberFormat(locale.language, {
      style: 'currency',
      currency: locale.currency,
    }).format(amount);
  } catch {
    return `${locale.currency} ${amount.toFixed(2)}`;
  }
}

export default CulturalRender;
