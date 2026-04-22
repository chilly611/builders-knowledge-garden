'use client';

/**
 * JurisdictionPicker
 * ==================
 * Searchable typeahead combobox for selecting a jurisdiction (city, county, or state).
 *
 * Props:
 * - jurisdictions: Full list of available jurisdictions
 * - value: Currently selected jurisdiction ID
 * - onChange: Called when user selects a new jurisdiction
 * - autoFocus: Optional autofocus on mount
 *
 * Behavior:
 * - Single input field with search
 * - Filters by name, state, county, and ID (substring, case-insensitive)
 * - Dropdown groups by state, then county, then individual jurisdictions
 * - Keyboard navigation: Down/Up arrows, Enter to select, Esc to close
 * - WAI-ARIA combobox pattern with proper roles and attributes
 * - When unfocused, displays selected jurisdiction's short name ("City, STATE")
 * - Displays secondary code/year info as muted subline
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { groupJurisdictions, type Jurisdiction } from '@/lib/knowledge-data';
import {
  colors, fonts, fontSizes, fontWeights, spacing, radii, zIndex, transitions,
} from '@/design-system/tokens';

interface JurisdictionPickerProps {
  jurisdictions: Jurisdiction[];
  value: string;
  onChange: (id: string) => void;
  autoFocus?: boolean;
}

interface SearchResult {
  state: string;
  countyGroups: Array<{
    county: string;
    items: Jurisdiction[];
  }>;
}

function normalizeForSearch(text: string): string {
  return text.toLowerCase().replace(/[àáâäæãåāăąçćĉċč]/g, 'a')
    .replace(/[èéêëēĕėęě]/g, 'e')
    .replace(/[ìíîïĩīĭįı]/g, 'i')
    .replace(/[ðďđ]/g, 'd')
    .replace(/[ñńņň]/g, 'n')
    .replace(/[òóôöœõōŏőø]/g, 'o')
    .replace(/[ùúûüũūŭůűų]/g, 'u')
    .replace(/[ýŷyleÿ]/g, 'y')
    .replace(/[ž]/g, 'z')
    .replace(/[ß]/g, 'ss');
}

function searchJurisdictions(
  jurisdictions: Jurisdiction[],
  query: string
): SearchResult[] {
  const normalizedQuery = normalizeForSearch(query);
  if (!normalizedQuery) {
    return groupJurisdictions(jurisdictions).map((group) => ({
      state: group.state,
      countyGroups: group.counties.map((county) => ({
        county: county.county,
        items: county.jurisdictions,
      })),
    }));
  }

  const grouped = groupJurisdictions(jurisdictions);
  const results: SearchResult[] = [];

  for (const stateGroup of grouped) {
    const countyGroups: SearchResult['countyGroups'] = [];

    for (const countyGroup of stateGroup.counties) {
      const matchingJurisdictions = countyGroup.jurisdictions.filter((j) => {
        const name = normalizeForSearch(j.name);
        const id = normalizeForSearch(j.id);
        const county = normalizeForSearch(countyGroup.county);
        const state = normalizeForSearch(stateGroup.state);

        return (
          name.includes(normalizedQuery)
          || id.includes(normalizedQuery)
          || county.includes(normalizedQuery)
          || state.includes(normalizedQuery)
        );
      });

      if (matchingJurisdictions.length > 0) {
        countyGroups.push({
          county: countyGroup.county,
          items: matchingJurisdictions,
        });
      }
    }

    if (countyGroups.length > 0) {
      results.push({
        state: stateGroup.state,
        countyGroups,
      });
    }
  }

  return results;
}

function getShortLabel(jurisdiction: Jurisdiction): string {
  if (jurisdiction.level === 'state' || jurisdiction.level === 'country') {
    return jurisdiction.state || jurisdiction.name;
  }
  const stateCode = jurisdiction.state
    ? jurisdiction.state.split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase()
    : 'US';
  return `${jurisdiction.name}, ${stateCode}`;
}

function getSecondaryLabel(jurisdiction: Jurisdiction): string {
  return `${jurisdiction.code} · ${jurisdiction.year}`;
}

export default function JurisdictionPicker({
  jurisdictions,
  value,
  onChange,
  autoFocus = false,
}: JurisdictionPickerProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const selectedJurisdiction = useMemo(
    () => jurisdictions.find((j) => j.id === value),
    [jurisdictions, value]
  );

  const searchResults = useMemo(
    () => searchJurisdictions(jurisdictions, inputValue),
    [jurisdictions, inputValue]
  );

  const flatResults = useMemo(() => {
    const flat: Jurisdiction[] = [];
    for (const stateGroup of searchResults) {
      for (const countyGroup of stateGroup.countyGroups) {
        flat.push(...countyGroup.items);
      }
    }
    return flat;
  }, [searchResults]);

  const handleInputFocus = () => {
    setIsOpen(true);
    setInputValue('');
  };

  const handleInputBlur = () => {
    // Delay to allow click events to fire
    setTimeout(() => {
      setIsOpen(false);
      if (!inputValue && selectedJurisdiction) {
        setHighlightedId(null);
      }
    }, 200);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setHighlightedId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const currentIndex = flatResults.findIndex((j) => j.id === highlightedId);
        const nextIndex = currentIndex < flatResults.length - 1 ? currentIndex + 1 : 0;
        setHighlightedId(flatResults[nextIndex]?.id ?? null);
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const currentIndex = flatResults.findIndex((j) => j.id === highlightedId);
        const nextIndex = currentIndex > 0 ? currentIndex - 1 : flatResults.length - 1;
        setHighlightedId(flatResults[nextIndex]?.id ?? null);
        break;
      }
      case 'Enter': {
        e.preventDefault();
        if (highlightedId) {
          const selected = jurisdictions.find((j) => j.id === highlightedId);
          if (selected) {
            onChange(selected.id);
            setIsOpen(false);
            setInputValue('');
            inputRef.current?.blur();
          }
        }
        break;
      }
      case 'Escape': {
        e.preventDefault();
        setIsOpen(false);
        setInputValue('');
        inputRef.current?.blur();
        break;
      }
      default:
        break;
    }
  };

  const handleSelectJurisdiction = (jurisdiction: Jurisdiction) => {
    onChange(jurisdiction.id);
    setIsOpen(false);
    setInputValue('');
    setHighlightedId(null);
    inputRef.current?.blur();
  };

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (highlightedId && scrollContainerRef.current) {
      const highlightedElement = scrollContainerRef.current.querySelector(
        `[data-jurisdiction-id="${highlightedId}"]`
      );
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedId]);

  const displayValue = isOpen ? inputValue : (selectedJurisdiction ? getShortLabel(selectedJurisdiction) : '');

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
      }}
    >
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-activedescendant={highlightedId || undefined}
        placeholder="Search city, county, or state — e.g., 'Oakland' or 'LA county'"
        value={displayValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = colors.amber.main;
          e.currentTarget.style.boxShadow = `0 0 0 2px ${colors.amber.glow}40`;
          e.currentTarget.style.outline = 'none';
          handleInputFocus();
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = colors.ink[200];
          e.currentTarget.style.boxShadow = 'none';
          handleInputBlur();
        }}
        style={{
          width: '100%',
          padding: spacing[2],
          fontSize: fontSizes.sm,
          fontFamily: fonts.body,
          border: `1px solid ${colors.ink[200]}`,
          borderRadius: radii.sm,
          backgroundColor: colors.paper.white,
          color: colors.ink[900],
          outline: 'none',
          transition: transitions.fast,
        }}
      />

      {isOpen && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: spacing[1],
            backgroundColor: colors.paper.white,
            border: `1px solid ${colors.ink[200]}`,
            borderRadius: radii.sm,
            boxShadow: '0 4px 12px rgba(11, 29, 51, 0.15)',
            zIndex: zIndex.dropdown,
            maxWidth: '100%',
          }}
        >
          <div
            ref={scrollContainerRef}
            style={{
              maxHeight: '80vh',
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            {searchResults.length === 0 ? (
              <div
                style={{
                  padding: spacing[3],
                  fontSize: fontSizes.sm,
                  color: colors.ink[400],
                  textAlign: 'center',
                }}
              >
                No jurisdictions found
              </div>
            ) : (
              searchResults.map((stateGroup) => (
                <div key={stateGroup.state}>
                  <div
                    style={{
                      padding: `${spacing[2]} ${spacing[3]}`,
                      fontSize: fontSizes.xs,
                      fontWeight: fontWeights.semibold,
                      textTransform: 'uppercase',
                      fontVariant: 'small-caps',
                      letterSpacing: '0.05em',
                      color: colors.ink[500],
                      backgroundColor: colors.ink[50],
                      borderBottom: `1px solid ${colors.ink[100]}`,
                      position: 'sticky',
                      top: 0,
                    }}
                  >
                    {stateGroup.state}
                  </div>

                  {stateGroup.countyGroups.map((countyGroup) => (
                    <div key={`${stateGroup.state}-${countyGroup.county}`}>
                      {countyGroup.county !== '(statewide)' && (
                        <div
                          style={{
                            padding: `${spacing[1]} ${spacing[3]}`,
                            paddingLeft: spacing[4],
                            fontSize: fontSizes.xs,
                            fontWeight: fontWeights.medium,
                            color: colors.ink[400],
                            backgroundColor: colors.ink[50],
                            textTransform: 'uppercase',
                          }}
                        >
                          {countyGroup.county} County
                        </div>
                      )}

                      {countyGroup.items.map((jurisdiction) => (
                        <div
                          key={jurisdiction.id}
                          data-jurisdiction-id={jurisdiction.id}
                          onClick={() => handleSelectJurisdiction(jurisdiction)}
                          style={{
                            padding: `${spacing[2]} ${spacing[3]}`,
                            paddingLeft: countyGroup.county !== '(statewide)' ? spacing[4] : spacing[3],
                            cursor: 'pointer',
                            backgroundColor:
                              highlightedId === jurisdiction.id
                                ? `${colors.cyan.main}20`
                                : 'transparent',
                            transition: transitions.fast,
                            borderLeft:
                              highlightedId === jurisdiction.id
                                ? `2px solid ${colors.cyan.main}`
                                : '2px solid transparent',
                          }}
                          onMouseEnter={() => setHighlightedId(jurisdiction.id)}
                          onMouseLeave={() => setHighlightedId(null)}
                        >
                          <div
                            style={{
                              fontSize: fontSizes.sm,
                              fontWeight: fontWeights.semibold,
                              color: colors.ink[900],
                              marginBottom: spacing[1],
                            }}
                          >
                            {jurisdiction.name}
                          </div>
                          <div
                            style={{
                              fontSize: fontSizes.xs,
                              color: colors.ink[400],
                              fontWeight: fontWeights.regular,
                            }}
                          >
                            {getSecondaryLabel(jurisdiction)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          <div
            style={{
              padding: spacing[2],
              fontSize: fontSizes.xs,
              color: colors.ink[400],
              borderTop: `1px solid ${colors.ink[100]}`,
              backgroundColor: colors.ink[50],
              textAlign: 'center',
            }}
          >
            ⓘ Can&apos;t find your jurisdiction? Pick the closest county.
          </div>
        </div>
      )}
    </div>
  );
}
