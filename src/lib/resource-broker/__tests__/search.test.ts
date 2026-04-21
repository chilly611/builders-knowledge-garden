import { describe, it, expect } from 'vitest';
import { search } from '../search';
import type { ResourceQuery, ResourceResponse } from '../types';

describe('resource-broker/search', () => {
  it('should return a valid ResourceResponse with required fields', async () => {
    const query: ResourceQuery = {
      query: 'SDS-max drill bit 3/4 inch',
      kinds: ['tool'],
      where: {
        address: 'Napa, CA',
        radiusMiles: 25,
      },
      limit: 5,
    };

    const response = await search(query);

    // Assert response structure
    expect(response).toBeDefined();
    expect(response.runId).toBeDefined();
    expect(typeof response.runId).toBe('string');
    expect(response.runId.length).toBeGreaterThan(0);

    // Assert results array
    expect(Array.isArray(response.results)).toBe(true);
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.results.length).toBeLessThanOrEqual(5);

    // Assert response fields
    expect(typeof response.totalFound).toBe('number');
    expect(response.totalFound).toBeGreaterThanOrEqual(0);
    expect(typeof response.latencyMs).toBe('number');
    expect(response.latencyMs).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(response.sources)).toBe(true);
    expect(response.sources.length).toBeGreaterThan(0);
    expect(Array.isArray(response.warnings)).toBeDefined();
  });

  it('should return results matching the requested kinds', async () => {
    const query: ResourceQuery = {
      query: 'framing subcontractor',
      kinds: ['subcontractor'],
      limit: 10,
    };

    const response = await search(query);

    expect(response.results.length).toBeGreaterThan(0);
    response.results.forEach((result) => {
      expect(result.kind).toBe('subcontractor');
    });
  });

  it('should return results with proper ResourceResult shape', async () => {
    const query: ResourceQuery = {
      query: 'general tool',
      kinds: ['tool'],
      limit: 3,
    };

    const response = await search(query);

    response.results.forEach((result) => {
      // Required fields
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');

      expect(result.kind).toBeDefined();
      expect(['tool', 'equipment', 'supply', 'subcontractor', 'laborer', 'service']).toContain(result.kind);

      expect(result.title).toBeDefined();
      expect(typeof result.title).toBe('string');

      expect(result.source).toBeDefined();
      expect([
        'home_depot',
        'lowes',
        'craigslist',
        'angi',
        'thumbtack',
        'yelp',
        'google_maps',
        'brave_search',
        'other',
        'demo_fixtures',
        'anthropic_web_search',
      ]).toContain(result.source);

      expect(result.url).toBeDefined();
      expect(typeof result.url).toBe('string');

      // Optional fields
      if (result.vendor !== undefined) {
        expect(typeof result.vendor).toBe('string');
      }
      if (result.priceUsd !== undefined) {
        expect(typeof result.priceUsd).toBe('number');
      }
      if (result.priceDisplay !== undefined) {
        expect(typeof result.priceDisplay).toBe('string');
      }
      if (result.distance !== undefined) {
        expect(result.distance.miles).toBeDefined();
        expect(typeof result.distance.miles).toBe('number');
        expect(result.distance.text).toBeDefined();
        expect(typeof result.distance.text).toBe('string');
      }
      if (result.availability !== undefined) {
        expect(typeof result.availability).toBe('string');
      }
      if (result.rating !== undefined) {
        expect(result.rating.stars).toBeDefined();
        expect(typeof result.rating.stars).toBe('number');
        expect(result.rating.count).toBeDefined();
        expect(typeof result.rating.count).toBe('number');
      }
      if (result.snippet !== undefined) {
        expect(typeof result.snippet).toBe('string');
      }
      if (result.tags !== undefined) {
        expect(Array.isArray(result.tags)).toBe(true);
      }
    });
  });

  it('should never return empty results without warnings', async () => {
    const query: ResourceQuery = {
      query: 'something unlikely to match real sources',
      kinds: ['tool'],
      limit: 12,
    };

    const response = await search(query);

    // Demo fixtures should always provide results, so warnings list may be populated
    // but we should never have both empty results AND no warnings
    if (response.results.length === 0) {
      expect(response.warnings.length).toBeGreaterThan(0);
    }
  });

  it('should respect the limit parameter', async () => {
    const query: ResourceQuery = {
      query: 'tool',
      kinds: ['tool'],
      limit: 2,
    };

    const response = await search(query);

    expect(response.results.length).toBeLessThanOrEqual(2);
  });

  it('should filter by budget ceiling if specified', async () => {
    const query: ResourceQuery = {
      query: 'equipment rental',
      kinds: ['equipment'],
      context: {
        budgetCeiling: 100,
      },
      limit: 10,
    };

    const response = await search(query);

    // All results with a price should be under or equal to $100
    response.results.forEach((result) => {
      if (result.priceUsd !== undefined) {
        expect(result.priceUsd).toBeLessThanOrEqual(100);
      }
    });
  });

  it('should include query in response for traceability', async () => {
    const query: ResourceQuery = {
      query: 'test query',
      kinds: ['tool', 'supply'],
      where: { address: 'Napa, CA' },
    };

    const response = await search(query);

    expect(response.query).toEqual(query);
  });
});
