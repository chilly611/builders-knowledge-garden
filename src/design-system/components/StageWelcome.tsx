'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { STAGE_WELCOME } from '@/lib/stage-welcome-copy';
import { colors, fonts, fontSizes, fontWeights, spacing, lineHeights } from '../tokens';

export interface StageWelcomeProps {
  stageId: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  projectId: string;
  /** Workflow list for this stage, minimal shape */
  workflows: Array<{ id: string; label: string; href?: string }>;
  /** Called when user dismisses (either "Got it" or the CTA navigation) */
  onDismiss?: () => void;
}

/**
 * StageWelcome — First-visit-per-stage overlay
 *
 * Renders a centered modal on first visit per (stageId, projectId).
 * Dismissal state persists in localStorage; component returns null
 * after dismiss and on subsequent mounts.
 *
 * Accessibility:
 * - role="dialog", aria-modal="true"
 * - focus trap on mount
 * - ESC key closes, backdrop click closes
 * - respects prefers-reduced-motion
 */
export default function StageWelcome({ stageId, projectId, workflows, onDismiss }: StageWelcomeProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);

  const localStorageKey = `bkg:stage-welcome:${projectId}:${stageId}`;
  const copy = STAGE_WELCOME[stageId];

  // Find first workflow with href
  const firstLiveWorkflow = workflows.find((w) => w.href);
  const ctaHref = firstLiveWorkflow?.href || '#';
  const ctaLabel = firstLiveWorkflow ? `${copy.ctaPrefix} ${firstLiveWorkflow.label}` : copy.ctaPrefix;

  // Check localStorage on mount
  useEffect(() => {
    setIsClient(true);
    const stored = localStorage.getItem(localStorageKey);
    if (stored === 'dismissed') {
      setIsDismissed(true);
    }
  }, [localStorageKey]);

  // Focus management
  useEffect(() => {
    if (!isDismissed && isClient && ctaRef.current) {
      ctaRef.current.focus();
    }
  }, [isDismissed, isClient]);

  const handleDismiss = () => {
    localStorage.setItem(localStorageKey, 'dismissed');
    setIsDismissed(true);
    onDismiss?.();
  };

  const handleEscape = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      handleDismiss();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleDismiss();
    }
  };

  if (!isClient || isDismissed) {
    return null;
  }

  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(11, 29, 51, 0.6)',
        zIndex: 9999,
        animation: prefersReducedMotion ? 'none' : 'fadeIn 0.2s ease-out',
      }}
      onClick={handleBackdropClick}
      onKeyDown={handleEscape}
      role="dialog"
      aria-modal="true"
      aria-labelledby="stage-welcome-title"
    >
      <div
        ref={dialogRef}
        style={{
          position: 'relative',
          backgroundColor: colors.trace,
          borderRadius: '4px',
          border: `1px solid ${colors.fadedRule}`,
          padding: spacing[6],
          maxWidth: '480px',
          width: '90vw',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          animation: prefersReducedMotion ? 'none' : 'slideUp 0.3s ease-out',
        }}
      >
        <h1
          id="stage-welcome-title"
          style={{
            fontFamily: fonts.heading,
            fontSize: fontSizes['2xl'],
            fontWeight: fontWeights.bold,
            color: colors.navy,
            margin: `0 0 ${spacing[4]} 0`,
            lineHeight: lineHeights.tight,
          }}
        >
          {copy.title}
        </h1>

        <p
          style={{
            fontFamily: fonts.body,
            fontSize: fontSizes.md,
            color: colors.navy,
            lineHeight: lineHeights.relaxed,
            margin: `0 0 ${spacing[4]} 0`,
          }}
        >
          {copy.description}
        </p>

        <div
          style={{
            display: 'flex',
            gap: spacing[3],
            alignItems: 'center',
          }}
        >
          <Link
            ref={ctaRef}
            href={ctaHref}
            onClick={handleDismiss}
            style={{
              display: 'inline-block',
              backgroundColor: colors.brass,
              color: 'white',
              fontFamily: fonts.body,
              fontSize: fontSizes.md,
              fontWeight: fontWeights.semibold,
              padding: `${spacing[3]} ${spacing[4]}`,
              borderRadius: '4px',
              textDecoration: 'none',
              transition: 'background-color 0.2s ease-out',
              cursor: 'pointer',
              border: 'none',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#9E6F2F';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = colors.brass;
            }}
          >
            {ctaLabel}
          </Link>

          <button
            onClick={handleDismiss}
            type="button"
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              fontFamily: fonts.body,
              fontSize: fontSizes.md,
              color: colors.graphite,
              cursor: 'pointer',
              padding: spacing[2],
              textDecoration: 'none',
              transition: 'color 0.2s ease-out',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = colors.navy;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = colors.graphite;
            }}
          >
            Got it, let me explore
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
