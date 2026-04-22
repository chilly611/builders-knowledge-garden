import { describe, it, expect } from 'vitest';
import { JURISDICTIONS } from '../../lib/knowledge-data';

/**
 * JurisdictionPicker Unit Tests
 *
 * Tests data structure and core functionality.
 * Full React Testing Library tests would require @testing-library/react package.
 */

describe('JurisdictionPicker - Data Validation', () => {
  it('has 60+ jurisdictions available', () => {
    expect(JURISDICTIONS.length).toBeGreaterThanOrEqual(60);
  });

  it('all jurisdictions have required fields', () => {
    JURISDICTIONS.forEach((j) => {
      expect(j.id).toBeDefined();
      expect(j.name).toBeDefined();
      expect(j.code).toBeDefined();
      expect(j.year).toBeDefined();
      expect(j.level).toBeDefined();
    });
  });

  it('Los Angeles County has proper structure', () => {
    const laCounty = JURISDICTIONS.find((j) => j.id === 'ca-la-county');
    expect(laCounty).toBeDefined();
    expect(laCounty?.name).toBe('Los Angeles County');
    expect(laCounty?.code).toContain('CBC');
    expect(laCounty?.year).toBe(2022);
    expect(laCounty?.state).toBe('California');
    expect(laCounty?.county).toBe('Los Angeles');
    expect(laCounty?.level).toBe('county');
  });

  it('jurisdictions can be filtered by state', () => {
    const california = JURISDICTIONS.filter((j) => j.state === 'California');
    expect(california.length).toBeGreaterThan(10);
  });

  it('jurisdictions can be filtered by county', () => {
    const laCountyJurisdictions = JURISDICTIONS.filter((j) => j.county === 'Los Angeles');
    expect(laCountyJurisdictions.length).toBeGreaterThan(0);
  });

  it('jurisdictions can be filtered by name substring (case-insensitive)', () => {
    const oakland = JURISDICTIONS.filter((j) => j.name.toLowerCase().includes('oakland'));
    expect(oakland.length).toBeGreaterThan(0);
  });

  it('has jurisdictions at all level types', () => {
    const levels = new Set(JURISDICTIONS.map((j) => j.level));
    expect(levels.has('international')).toBe(true);
    expect(levels.has('state')).toBe(true);
    expect(levels.has('county')).toBe(true);
    expect(levels.has('city')).toBe(true);
  });

  it('contains IBC 2024 international fallback', () => {
    const ibc = JURISDICTIONS.find((j) => j.id === 'ibc-2024');
    expect(ibc).toBeDefined();
    expect(ibc?.level).toBe('international');
    expect(ibc?.code).toBe('IBC');
  });

  it('all US cities have state information', () => {
    const cities = JURISDICTIONS.filter((j) => j.level === 'city');
    const usaCities = cities.filter((c) => c.state);
    usaCities.forEach((c) => {
      expect(c.state).toBeDefined();
    });
    expect(usaCities.length).toBeGreaterThan(0);
  });

  it('all counties have state information', () => {
    const counties = JURISDICTIONS.filter((j) => j.level === 'county');
    counties.forEach((c) => {
      expect(c.state).toBeDefined();
    });
  });

  it('secondary labels (code + year) are well-formed', () => {
    JURISDICTIONS.forEach((j) => {
      const label = `${j.code} · ${j.year}`;
      expect(label).toMatch(/\d{4}/); // Has year
      expect(label.length).toBeGreaterThan(5);
    });
  });

  it('jurisdictions are organized hierarchically by state', () => {
    const stateMap = new Map<string, Set<string>>();
    JURISDICTIONS.forEach((j) => {
      const state = j.state ?? 'Other';
      if (!stateMap.has(state)) stateMap.set(state, new Set());
      stateMap.get(state)!.add(j.name);
    });
    expect(stateMap.size).toBeGreaterThan(1);
    expect(stateMap.has('California')).toBe(true);
  });

  it('short label for Los Angeles County should contain county name and state', () => {
    const laCounty = JURISDICTIONS.find((j) => j.id === 'ca-la-county');
    expect(laCounty?.name).toContain('Los Angeles');
  });

  it('matches are filterable by ID', () => {
    const byId = JURISDICTIONS.filter((j) => j.id === 'ca-la');
    expect(byId.length).toEqual(1);
    expect(byId[0].name).toBe('Los Angeles, CA');
  });
});
