import { describe, it, expect } from 'vitest';
import { queryWhiteCap } from '../white-cap';
import type { VendorQuery } from '../types';

describe('vendors/white-cap', () => {
  it('should return empty array for framing lumber queries', async () => {
    const queries: VendorQuery[] = [
      {
        description: '2x4x8 SPF #2',
        quantity: 25,
        unit: 'ea',
      },
      {
        description: '3/4" plywood CDX',
        quantity: 10,
        unit: 'sf',
      },
      {
        description: 'Engineered I-joist',
        quantity: 15,
        unit: 'lf',
      },
    ];

    for (const q of queries) {
      const quotes = await queryWhiteCap(q);
      expect(quotes).toEqual([]);
    }
  });

  it('should return empty array for electrical and HVAC queries', async () => {
    const queries: VendorQuery[] = [
      {
        description: 'electrical outlet 15A',
        quantity: 10,
        unit: 'ea',
      },
      {
        description: 'circuit breaker 20A',
        quantity: 5,
        unit: 'ea',
      },
      {
        description: 'HVAC ducting',
        quantity: 100,
        unit: 'lf',
      },
    ];

    for (const q of queries) {
      const quotes = await queryWhiteCap(q);
      expect(quotes).toEqual([]);
    }
  });

  it('should accept concrete-related queries', async () => {
    const queries: VendorQuery[] = [
      {
        description: 'concrete mix bags 60lb',
        quantity: 50,
        unit: 'ea',
      },
      {
        description: 'rebar #5 grade 60',
        quantity: 100,
        unit: 'lf',
      },
      {
        description: 'concrete form plywood',
        quantity: 20,
        unit: 'sf',
      },
    ];

    for (const q of queries) {
      const quotes = await queryWhiteCap(q);
      expect(Array.isArray(quotes)).toBe(true);
    }
  });

  it('should accept forming and shoring supplies', async () => {
    const queries: VendorQuery[] = [
      {
        description: 'concrete forming accessories',
        quantity: 1,
        unit: 'bundle',
      },
      {
        description: 'shoring posts adjustable',
        quantity: 20,
        unit: 'ea',
      },
      {
        description: 'bracing lumber 2x4',
        quantity: 50,
        unit: 'lf',
      },
    ];

    for (const q of queries) {
      const quotes = await queryWhiteCap(q);
      expect(Array.isArray(quotes)).toBe(true);
    }
  });

  it('should accept jobsite supplies queries', async () => {
    const queries: VendorQuery[] = [
      {
        description: 'jobsite supplies equipment',
        quantity: 1,
        unit: 'bundle',
      },
      {
        description: 'site fencing temporary',
        quantity: 100,
        unit: 'lf',
      },
      {
        description: 'safety equipment harness',
        quantity: 5,
        unit: 'ea',
      },
    ];

    for (const q of queries) {
      const quotes = await queryWhiteCap(q);
      expect(Array.isArray(quotes)).toBe(true);
    }
  });

  it('should return quotes with correct vendor name', async () => {
    const query: VendorQuery = {
      description: 'rebar reinforcing steel',
      quantity: 200,
      unit: 'lf',
    };

    const quotes = await queryWhiteCap(query);

    quotes.forEach((quote) => {
      expect(quote.vendor).toBe('white-cap');
      expect(typeof quote.sku).toBe('string');
      expect(typeof quote.unitPrice).toBe('number');
      expect(typeof quote.extendedPrice).toBe('number');
      expect(['observed', 'estimated', 'web-search']).toContain(quote.confidence);
    });
  });

  it('should gracefully handle timeout', async () => {
    const query: VendorQuery = {
      description: 'concrete forming supplies',
      quantity: 100,
      unit: 'ea',
    };

    const startTime = Date.now();
    const quotes = await queryWhiteCap(query);
    const elapsed = Date.now() - startTime;

    expect(quotes).toEqual([]);
    expect(elapsed).toBeLessThan(6000); // 5s timeout + buffer
  });

  it('should mark confidence as web-search', async () => {
    const query: VendorQuery = {
      description: 'concrete accessories forming',
      quantity: 50,
      unit: 'ea',
    };

    const quotes = await queryWhiteCap(query);

    quotes.forEach((quote) => {
      expect(quote.confidence).toBe('web-search');
    });
  });
});
