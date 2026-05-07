'use client';

import React, { useState, useRef, useEffect } from 'react';
import glossaryData from '@/data/glossary.json';

interface GlossaryTerm {
  term: string;
  aliases?: string[];
  plain: string;
  pro?: string;
  source?: string;
}

interface TermTooltipProps {
  children: React.ReactNode;
  term?: string;
  className?: string;
}

/**
 * TermTooltip — wraps a span/text and shows a glossary definition on hover/focus.
 *
 * On desktop: hover to show popover, click outside to hide.
 * On mobile: tap to open, tap outside to close. Trigger area is min 44px tall.
 *
 * Reads from data/glossary.json, matches case-insensitive with alias support.
 */
export default function TermTooltip({
  children,
  term: explicitTerm,
  className = '',
}: TermTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Extract term from children if not explicit
  const termText = explicitTerm || (typeof children === 'string' ? children : '');

  // Find matching glossary entry (case-insensitive, alias-aware)
  const glossaryEntry = React.useMemo(() => {
    if (!termText) return null;

    const search = termText.toLowerCase().trim();
    return (glossaryData as GlossaryTerm[]).find((entry) => {
      if (entry.term.toLowerCase() === search) return true;
      if (entry.aliases?.some((alias) => alias.toLowerCase() === search))
        return true;
      return false;
    });
  }, [termText]);

  // Position popover below trigger
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 8,
      left: Math.max(8, rect.left),
    });
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isOpen]);

  if (!glossaryEntry) {
    // No glossary match — render children as-is
    return <span className={className}>{children}</span>;
  }

  return (
    <>
      {/* Trigger */}
      <span
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className={`
          inline cursor-help
          ${className}
          sm:hover:underline sm:hover:underline-offset-2
        `}
        style={{
          minHeight: '44px',
          display: 'inline-flex',
          alignItems: 'center',
        }}
        role="button"
        tabIndex={0}
        aria-label={`Definition: ${glossaryEntry.term}`}
      >
        {children}
      </span>

      {/* Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            zIndex: 9999,
          }}
          className="
            bg-white dark:bg-slate-900
            border border-slate-200 dark:border-slate-700
            rounded-md shadow-lg
            max-w-xs sm:max-w-sm
            p-3 sm:p-4
            text-sm
            backdrop-filter backdrop-blur-sm
          "
        >
          {/* Term heading */}
          <div className="font-bold text-slate-900 dark:text-white mb-2">
            {glossaryEntry.term}
          </div>

          {/* Plain-English definition */}
          <div className="text-slate-700 dark:text-slate-200 leading-relaxed mb-2">
            {glossaryEntry.plain}
          </div>

          {/* Pro version (if present) */}
          {glossaryEntry.pro && (
            <div className="text-xs text-slate-500 dark:text-slate-400 italic pt-2 border-t border-slate-200 dark:border-slate-700">
              {glossaryEntry.pro}
            </div>
          )}
        </div>
      )}
    </>
  );
}
