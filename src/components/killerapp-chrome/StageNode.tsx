'use client';

/**
 * StageNode — one of the seven journey stages.
 *
 * CompletionRing + short label + due date, all wrapped in a clickable
 * surface that routes the page to ?stage=<slug>. The active stage gets
 * a soft red-chrome wash so it reads as "you are here." Completed
 * stages render the ring fully filled with the red chrome.
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { KAC_COLORS, KAC_FONTS } from './types';
import type { KacStageSlug, KacStageId } from './types';
import CompletionRing from './CompletionRing';

export interface StageNodeProps {
  id: KacStageId;
  slug: KacStageSlug;
  label: string;
  completion: number; // 0..100
  dueDate?: string; // ISO
  /** Mark this node as the active stage. */
  active?: boolean;
  /** When false, render non-interactive. Default true. */
  clickable?: boolean;
}

function fmtMonthDay(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function StageNode({
  slug,
  label,
  completion,
  dueDate,
  active = false,
  clickable = true,
}: StageNodeProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleClick() {
    if (!clickable) return;
    // Preserve other params (project, etc.); just rewrite ?stage=<slug>.
    // Construct from .toString() to dodge Next's ReadonlyURLSearchParams
    // typing of .entries() (TS rejects the iterator as URLSearchParamsInit).
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('stage', slug);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  const done = completion >= 100;
  const ringColor = done ? KAC_COLORS.incomeGreen : KAC_COLORS.redChrome;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!clickable}
      aria-current={active ? 'step' : undefined}
      aria-label={`${label}, ${Math.round(completion)} percent complete${dueDate ? `, due ${fmtMonthDay(dueDate)}` : ''}`}
      style={{
        flex: 1,
        minWidth: 0,
        background: active ? `${KAC_COLORS.redChrome}10` : 'transparent',
        border: 'none',
        borderRadius: 10,
        padding: '6px 6px 8px',
        cursor: clickable ? 'pointer' : 'default',
        color: 'inherit',
        font: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        textAlign: 'center',
        transition: 'background 160ms ease',
      }}
    >
      <CompletionRing
        percent={completion}
        size={40}
        strokeWidth={4}
        color={ringColor}
        label={`${label} ${Math.round(completion)} percent complete`}
      />
      <span
        style={{
          fontFamily: KAC_FONTS.body,
          fontSize: 11,
          fontWeight: active ? 700 : 600,
          letterSpacing: '0.02em',
          color: active ? KAC_COLORS.redChrome : KAC_COLORS.textInk,
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
        }}
      >
        {label}
      </span>
      {dueDate && (
        <span
          style={{
            fontFamily: KAC_FONTS.mono,
            fontSize: 9.5,
            color: KAC_COLORS.textWarmGray,
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          {fmtMonthDay(dueDate)}
        </span>
      )}
    </button>
  );
}
