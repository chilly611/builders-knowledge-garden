import { describe, it, expect, beforeEach } from 'vitest';
import { query84Lumber } from '../lumber-84';
import type { VendorQuery } from '../types';

describe('vendors/84-lumber', () => {
  beforeEach(() => {
    // Clear environment variables before each test
    delete process.env.LUMBER_84_API_KEY;
  });

  it('should return empty array for non-lumber queries', async () => {
    const query: VendorQuery = {
      description: 'electrical outlet 15A duplex',
      quantity: 10,
      unit: 'ea',
    };

    const quotes = await query84Lumber(query);

    expect(Array.isArray(quotes)).toBe(true);
    expect(quotes.length).toBe(0);
  });

  it('should return empty array for fasteners and hardware', async () => {
    const queries: VendorQuery[] = [
      {
        description: '3" finishing nails box of 1000',
        quantity: 5,
        unit: 'bundle',
      },
      {
        description: '1/2" cabinet hinges',
        quantity: 20,
        unit: 'ea',
      },
      {
        description: 'brass door knobs',
        quantity: 12,
        unit: 'ea',
      },
    ];

    for (const q of queries) {
      const quotes = await query84Lumber(q);
      expect(quotes).toEqual([]);
    }
  });

  it('should accept framing lumber queries', async () => {
    const query: VendorQuery = {
      description: '2x4x8 SPF #2',
      quantity: 25,
      unit: 'ea',
      zip: '90210',
    };

    const quotes = await query84Lumber(query);

    // Even if empty (no web search), should not have failed
    expect(Array.isArray(quotes)).toBe(true);
  });

  it('should accept plywood and OSB queries', async () => {
    const queries: VendorQuery[] = [
      {
        description: '3/4" plywood CDX',
        quantity: 10,
        unit: 'sf',
      },
      {
        description: '1/2" OSB sheathing',
        quantity: 20,
        unit: 'sf',
      },
    ];

    for (const q of queries) {
      const quotes = await query84Lumber(q);
      expect(Array.isArray(quotes)).toBe(true);
    }
  });

  it('should accept EWP (engineered wood product) queries', async () => {
    const queries: VendorQuery[] = [
      {
        description: 'Engineered I-joist 9.5" 16"oc',
        quantity: 15,
        unit: 'lf',
      },
      {
        description: 'PSL beam 3.5x11.875 laminated',
        quantity: 1,
        unit: 'ea',
      },
      {
        description: 'LSL studs 1.75x9.25',
        quantity: 20,
        unit: 'ea',
      },
    ];

    for (const q of queries) {
      const quotes = await query84Lumber(q);
      expect(Array.isArray(quotes)).toBe(true);
    }
  });

  it('should gracefully handle timeout', async () => {
    const query: VendorQuery = {
      description: '2x6 SPF lumber',
      quantity: 50,
      unit: 'lf',
    };

    const startTime = Date.now();
    const quotes = await query84Lumber(query);
    const elapsed = Date.now() - startTime;

    expect(quotes).toEqual([]);
    expect(elapsed).toBeLessThan(6000); // 5s timeout + buffer
  });

  it('should return quotes with correct vendor name', async () => {
    const query: VendorQuery = {
      description: '2x4x16 SPF framing',
      quantity: 30,
      unit: 'ea',
    };

    const quotes = await query84Lumber(query);

    quotes.forEach((quote) => {
      expect(quote.vendor).toBe('84-lumber');
      expect(typeof quote.sku).toBe('string');
      expect(typeof quote.unitPrice).toBe('number');
      expect(typeof quote.extendedPrice).toBe('number');
      expect(['observed', 'estimated', 'web-search']).toContain(quote.confidence);
    });
  });

  it('should mark confidence as web-search when falling back', async () => {
    const query: VendorQuery = {
      description: 'plywood sheathing',
      quantity: 5,
      unit: 'sf',
    };

    const quotes = await query84Lumber(query);

    // If any quotes returned, they should be marked web-search (no real API key)
    quotes.forEach((quote) => {
      expect(quote.confidence).toBe('web-search');
    });
  });
});
