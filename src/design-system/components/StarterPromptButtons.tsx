'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { colors, fonts, fontSizes, fontWeights, spacing } from '../tokens';

/**
 * Blueprint StarterPromptButtons
 * ==============================
 * Row of starter prompt buttons for quick workflow input.
 * Wraps on mobile, includes label above.
 */

interface StarterPrompt {
  label: string;
  prompt: string;
}

export interface StarterPromptButtonsProps {
  workflowId?: string;
  onSelect: (prompt: string) => void;
  className?: string;
}

// Fallback data for when src/lib/stage-prompts.ts is not yet available
const FALLBACK_STARTERS: StarterPrompt[] = [
  { label: 'Estimate this job', prompt: 'Estimate a 2500 sqft ADU in San Diego' },
  { label: 'Check code', prompt: 'What code sections apply to my egress window?' },
  { label: 'Sequence trades', prompt: 'Sequence a 2500 sqft ADU ground-up' },
];

/**
 * Attempt to import getStartersForWorkflow, fall back to constant if not available.
 */
function getStarters(workflowId?: string): StarterPrompt[] {
  try {
    // Lazy load to support both import-time and runtime presence
    const { getStartersForWorkflow } = require('@/lib/stage-prompts');
    if (typeof getStartersForWorkflow === 'function') {
      const result = getStartersForWorkflow(workflowId);
      return Array.isArray(result) ? result : FALLBACK_STARTERS;
    }
  } catch {
    // Silently fall back to default starters if module not found
  }
  return FALLBACK_STARTERS;
}

export function StarterPromptButtons({
  workflowId,
  onSelect,
  className,
}: StarterPromptButtonsProps): React.ReactElement {
  const starters = useMemo(() => getStarters(workflowId), [workflowId]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Inject styles once on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const styleId = 'starter-prompt-buttons-styles';
    if (document.getElementById(styleId)) return; // Already injected

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      [data-starter-prompt-buttons] {
        display: flex;
        flex-direction: column;
        gap: ${spacing.sm}px;
      }

      [data-starter-prompt-label] {
        font-size: ${fontSizes.xs};
        font-family: ${fonts.body};
        font-weight: ${fontWeights.medium};
        color: ${colors.graphite};
      }

      [data-starter-prompt-container] {
        display: flex;
        flex-wrap: wrap;
        gap: ${spacing.xs}px;
      }

      [data-starter-prompt-button] {
        flex: 1 1 auto;
        min-width: 0;
        padding: ${spacing.sm}px ${spacing.lg}px;
        font-size: ${fontSizes.sm};
        font-family: ${fonts.body};
        font-weight: ${fontWeights.medium};
        color: ${colors.graphite};
        background-color: ${colors.trace};
        border: 1px solid ${colors.fadedRule};
        border-radius: 4px;
        cursor: pointer;
        transition: all 150ms ease-in-out;
        text-align: left;
        white-space: normal;
        word-wrap: break-word;
      }

      [data-starter-prompt-button]:hover {
        border-color: ${colors.navy};
        border-bottom-color: var(--stage-accent, ${colors.brass});
        border-bottom-width: 2px;
      }

      @media (max-width: 639px) {
        [data-starter-prompt-container] {
          flex-direction: column;
        }

        [data-starter-prompt-button] {
          flex: 1 1 auto;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      data-starter-prompt-buttons
    >
      <label data-starter-prompt-label>
        Try one of these:
      </label>

      <div data-starter-prompt-container>
        {starters.map((starter, idx) => (
          <button
            key={idx}
            data-starter-prompt-button
            onClick={() => onSelect(starter.prompt)}
          >
            {starter.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default StarterPromptButtons;
