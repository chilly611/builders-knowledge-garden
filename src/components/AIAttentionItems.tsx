'use client';

/**
 * AIAttentionItems — extracted 2026-05-28 from the demolished legacy
 * `/projects/[id]` overview tab. Lives now in `src/components/` so any
 * journey-aware stage screen (or the new `/killerapp/projects/[id]` view)
 * can mount it.
 *
 * Default data: `MARIN_ATTENTION_ITEMS` from the Marin demo fixture.
 * Pass `items` to override (e.g. live API hydration once a per-project
 * AI advisor endpoint is wired up — the legacy global
 * `command_center_attention` query is intentionally NOT used here; it
 * leaked another project's stale items into Marin during the May demo).
 */

import { AlertTriangle } from 'lucide-react';
import { MARIN_ATTENTION_ITEMS } from '@/lib/demo/marin-4000';

export interface AIAttentionItem {
  id: string;
  title: string;
  body: string;
  urgency: 'red' | 'yellow' | 'green';
}

interface Props {
  items?: AIAttentionItem[];
  /** Optional heading override; defaults to "AI Attention Items". */
  heading?: string;
  /** Hide the wrapper card border (use when nested inside a chrome panel). */
  flush?: boolean;
}

export function AIAttentionItems({
  items = MARIN_ATTENTION_ITEMS,
  heading = 'AI Attention Items',
  flush = false,
}: Props) {
  if (!items || items.length === 0) return null;

  return (
    <div
      className={
        flush
          ? 'p-0'
          : 'rounded-lg border border-orange-200 bg-orange-50 p-6'
      }
    >
      <h3 className="text-lg font-semibold text-[var(--fg)] mb-4 flex items-center gap-2">
        <AlertTriangle size={20} className="text-orange-600" />
        {heading}
      </h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded border border-orange-200 bg-white p-3"
          >
            <p className="text-sm font-medium text-[var(--fg)]">{item.title}</p>
            <p className="mt-1 text-sm text-gray-600">{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AIAttentionItems;
