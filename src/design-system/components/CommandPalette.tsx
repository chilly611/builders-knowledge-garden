'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { colors, fonts, fontSizes, fontWeights, spacing, borders, radii, shadows, transitions, zIndex } from '../tokens';

// Navigation items: 7 stages + 17 workflows + 2 global actions
const NAV_ITEMS = [
  // Stages
  { id: 'stage-1', emoji: '🧭', label: 'Size up', category: 'stage' as const, href: '/killerapp/workflows/estimating' },
  { id: 'stage-2', emoji: '🔒', label: 'Lock it in', category: 'stage' as const, href: '/killerapp/workflows/contract-templates' },
  { id: 'stage-3', emoji: '📐', label: 'Plan it out', category: 'stage' as const, href: '/killerapp/workflows/job-sequencing' },
  { id: 'stage-4', emoji: '🔨', label: 'Build', category: 'stage' as const, href: '/killerapp/workflows/daily-log' },
  { id: 'stage-5', emoji: '🔄', label: 'Adapt', category: 'stage' as const, href: '/killerapp/workflows/services-todos' },
  { id: 'stage-6', emoji: '💰', label: 'Collect', category: 'stage' as const, href: '/killerapp/workflows/expenses' },
  { id: 'stage-7', emoji: '📖', label: 'Reflect', category: 'stage' as const, href: '/killerapp/workflows/compass-nav' },
  // Workflows
  { id: 'q2', emoji: '📝', label: 'Estimate a job', category: 'workflow' as const, href: '/killerapp/workflows/estimating' },
  { id: 'q4', emoji: '📄', label: 'Draft contracts', category: 'workflow' as const, href: '/killerapp/workflows/contract-templates' },
  { id: 'q5', emoji: '🏛️', label: 'Code compliance', category: 'workflow' as const, href: '/killerapp/workflows/code-compliance' },
  { id: 'q6', emoji: '🧩', label: 'Sequence trades', category: 'workflow' as const, href: '/killerapp/workflows/job-sequencing' },
  { id: 'q7', emoji: '👷', label: 'Size your crew', category: 'workflow' as const, href: '/killerapp/workflows/worker-count' },
  { id: 'q8', emoji: '📋', label: 'Permit applications', category: 'workflow' as const, href: '/killerapp/workflows/permit-applications' },
  { id: 'q9', emoji: '🤝', label: 'Sub management', category: 'workflow' as const, href: '/killerapp/workflows/sub-management' },
  { id: 'q10', emoji: '🛠️', label: 'Equipment', category: 'workflow' as const, href: '/killerapp/workflows/equipment' },
  { id: 'q11', emoji: '🚚', label: 'Supply ordering', category: 'workflow' as const, href: '/killerapp/workflows/supply-ordering' },
  { id: 'q12', emoji: '💧', label: 'Services & utilities', category: 'workflow' as const, href: '/killerapp/workflows/services-todos' },
  { id: 'q13', emoji: '🎯', label: 'Hiring', category: 'workflow' as const, href: '/killerapp/workflows/hiring' },
  { id: 'q14', emoji: '🌦️', label: 'Weather scheduling', category: 'workflow' as const, href: '/killerapp/workflows/weather-scheduling' },
  { id: 'q15', emoji: '📝', label: 'Daily log', category: 'workflow' as const, href: '/killerapp/workflows/daily-log' },
  { id: 'q16', emoji: '🦺', label: 'OSHA toolbox talk', category: 'workflow' as const, href: '/killerapp/workflows/osha-toolbox' },
  { id: 'q17', emoji: '💳', label: 'Expenses', category: 'workflow' as const, href: '/killerapp/workflows/expenses' },
  { id: 'q18', emoji: '📢', label: 'Outreach', category: 'workflow' as const, href: '/killerapp/workflows/outreach' },
  { id: 'q19', emoji: '🧭', label: 'Compass navigator', category: 'workflow' as const, href: '/killerapp/workflows/compass-nav' },
  // Actions
  { id: 'home', emoji: '🏠', label: 'Home (workflow picker)', category: 'action' as const, href: '/killerapp' },
  { id: 'ai', emoji: '✨', label: 'Ask the AI', category: 'action' as const, href: null },
];

// Popular items (top 5) shown when input is empty
const POPULAR_ITEMS = [
  'Code compliance',
  'Estimating',
  'Supply ordering',
  'Job Sequencing',
  'Daily log',
];

// Simple fuzzy match: substring match with longest-match-wins
function fuzzyMatch(query: string, items: typeof NAV_ITEMS): typeof NAV_ITEMS {
  if (!query.trim()) {
    return NAV_ITEMS.filter(item => POPULAR_ITEMS.includes(item.label));
  }

  const lowerQuery = query.toLowerCase();
  const scored = NAV_ITEMS
    .map(item => {
      const lowerLabel = item.label.toLowerCase();
      if (!lowerLabel.includes(lowerQuery)) {
        return { item, score: -1 };
      }
      // Score based on match position (earlier = better) and length (shorter label = better)
      const matchPos = lowerLabel.indexOf(lowerQuery);
      const score = (lowerLabel.length - matchPos) / lowerLabel.length;
      return { item, score };
    })
    .filter(({ score }) => score > -1)
    .sort((a, b) => b.score - a.score);

  return scored.map(({ item }) => item);
}

interface CommandPaletteItemProps {
  item: typeof NAV_ITEMS[0];
  isActive: boolean;
  onSelect: (item: typeof NAV_ITEMS[0]) => void;
}

function CommandPaletteItem({ item, isActive, onSelect }: CommandPaletteItemProps) {
  const handleClick = () => {
    onSelect(item);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSelect(item);
    }
  };

  const categoryLabel = item.category.charAt(0).toUpperCase() + item.category.slice(1);

  return (
    <div
      role="option"
      aria-selected={isActive}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={isActive ? 0 : -1}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '44px',
        padding: `0 ${spacing[4]}`,
        backgroundColor: isActive ? colors.trace : 'transparent',
        borderLeft: isActive ? `3px solid ${colors.brass}` : 'none',
        borderLeftWidth: isActive ? '3px' : '0',
        paddingLeft: isActive ? `calc(${spacing[4]} - 3px)` : spacing[4],
        cursor: 'pointer',
        transition: `all ${transitions.base}`,
        marginBottom: spacing[3],
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
        <span style={{ fontSize: '20px' }}>{item.emoji}</span>
        <span
          style={{
            fontSize: fontSizes.base,
            fontFamily: fonts.body,
            fontWeight: fontWeights.regular,
            color: colors.ink[900],
          }}
        >
          {item.label}
        </span>
      </div>
      <span
        style={{
          fontSize: fontSizes.xs,
          fontFamily: fonts.body,
          fontWeight: fontWeights.regular,
          color: colors.ink[400],
          backgroundColor: colors.paper.aged,
          padding: `2px ${spacing[2]}`,
          borderRadius: radii.md,
        }}
      >
        {categoryLabel}
      </span>
    </div>
  );
}

/**
 * CommandPalette Component
 * =========================
 * Global keyboard-accessible command launcher.
 *
 * Features:
 * - ⌘K (Mac) / Ctrl+K (Windows/Linux) toggles open/close from anywhere
 * - Escape closes the palette
 * - Arrow keys navigate results
 * - Enter selects item and navigates
 * - Fuzzy search with substring matching
 * - Popular items shown when search is empty
 * - Fixed centered modal with Trace background, Navy shadow
 */
export default function CommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get filtered results based on query
  const results = useMemo(() => {
    return fuzzyMatch(query, NAV_ITEMS);
  }, [query]);

  // Keep selectedIndex in bounds
  useEffect(() => {
    if (selectedIndex >= results.length) {
      setSelectedIndex(Math.max(0, results.length - 1));
    }
  }, [results.length, selectedIndex]);

  // Handle selection
  const handleSelect = useCallback(
    (item: typeof NAV_ITEMS[0]) => {
      if (item.href) {
        router.push(item.href);
      } else if (item.id === 'ai') {
        // Dispatch custom event for AI FAB
        window.dispatchEvent(new CustomEvent('ai-fab:open'));
      }
      setIsOpen(false);
      setQuery('');
      setSelectedIndex(0);
    },
    [router],
  );

  // Global keyboard listener for ⌘K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }

      // Only handle palette-specific keys if open
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setQuery('');
          setSelectedIndex(0);
          break;

        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % results.length);
          break;

        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
          break;

        case 'Enter':
          e.preventDefault();
          if (results.length > 0) {
            handleSelect(results[selectedIndex]);
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, results, selectedIndex, handleSelect]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
        setSelectedIndex(0);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.overlay,
          zIndex: zIndex.modal - 1,
        }}
      />

      {/* Modal container */}
      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(520px, 80vw)',
          maxHeight: '70vh',
          backgroundColor: colors.trace,
          borderRadius: radii.xl,
          boxShadow: shadows.xl,
          zIndex: zIndex.modal,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Search input */}
        <div style={{ padding: spacing[4], borderBottom: `${borders.thin} ${colors.fadedRule}` }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Where to?"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            aria-label="Search commands"
            aria-autocomplete="list"
            role="combobox"
            aria-expanded={isOpen}
            style={{
              width: '100%',
              padding: spacing[3],
              fontSize: fontSizes.base,
              fontFamily: fonts.body,
              border: `${borders.thin} ${colors.navy}`,
              borderRadius: radii.md,
              outline: 'none',
              boxSizing: 'border-box',
              transition: `all ${transitions.base}`,
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = colors.navy;
              e.currentTarget.style.boxShadow = `0 0 0 2px ${colors.robin}40`;
            }}
            onBlur={e => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Results list */}
        <div
          role="listbox"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: `${spacing[3]} ${spacing[4]}`,
          }}
        >
          {results.length === 0 && query ? (
            <div
              style={{
                padding: spacing[4],
                textAlign: 'center',
                color: colors.ink[400],
                fontSize: fontSizes.sm,
                fontFamily: fonts.body,
              }}
            >
              No results for "{query}"
            </div>
          ) : results.length === 0 ? (
            <div
              style={{
                padding: spacing[4],
                textAlign: 'center',
                color: colors.ink[400],
                fontSize: fontSizes.sm,
                fontFamily: fonts.body,
              }}
            >
              Popular
            </div>
          ) : null}

          {results.map((item, index) => (
            <CommandPaletteItem
              key={item.id}
              item={item}
              isActive={index === selectedIndex}
              onSelect={handleSelect}
            />
          ))}
        </div>

        {/* Footer hint */}
        {results.length > 0 && (
          <div
            style={{
              padding: `${spacing[2]} ${spacing[4]}`,
              borderTop: `${borders.thin} ${colors.fadedRule}`,
              fontSize: fontSizes.xs,
              color: colors.ink[400],
              fontFamily: fonts.body,
              textAlign: 'right',
            }}
          >
            ↑ ↓ to navigate • Enter to select • Esc to close
          </div>
        )}
      </div>
    </>
  );
}
