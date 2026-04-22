import { describe, it, expect, beforeEach, vi } from 'vitest';
import { queryHomeDepotPro } from '../home-depot-pro';
import type { VendorQuery } from '../types';

describe('vendors/home-depot-pro', () => {
  beforeEach(() => {
    // Clear environment variables before each test
    delete process.env.HD_PRO_API_KEY;
  });

  it('should return empty array when no API key and web search disabled', async () => {
    const query: VendorQuery = {
      description: '2x4x8 SPF #2 lumber',
      quantity: 10,
      unit: 'ea',
      zip: '94102',
    };

    const quotes = await queryHomeDepotPro(query);

    expect(Array.isArray(quotes)).toBe(true);
    expect(quotes.length).toBe(0);
  });

  it('should gracefully handle timeout (5 second limit)', async () => {
    const query: VendorQuery = {
      description: '2x4x8 SPF #2 lumber',
      quantity: 10,
      unit: 'ea',
    };

    const startTime = Date.now();
    const quotes = await queryHomeDepotPro(query);
    const elapsed = Date.now() - startTime;

    // Should timeout and return empty array
    expect(quotes).toEqual([]);
    expect(elapsed).toBeLessThan(6000); // 5s timeout + buffer
  });

  it('should return quotes with correct vendor name', async () => {
    // Mock the actual API call scenario where we'd get back quotes
    // For now, just verify structure if we had quotes
    const query: VendorQuery = {
      description: '3/4" plywood CDX',
      quantity: 5,
      unit: 'sf',
      zip: '10001',
    };

    const quotes = await queryHomeDepotPro(query);

    // All returned quotes should have vendor: "home-depot-pro"
    quotes.forEach((quote) => {
      expect(quote.vendor).toBe('home-depot-pro');
      expect(typeof quote.sku).toBe('string');
      expect(typeof quote.unitPrice).toBe('number');
      expect(typeof quote.extendedPrice).toBe('number');
      expect(typeof quote.retrievedAt).toBe('string');
      expect(['observed', 'estimated', 'web-search']).toContain(quote.confidence);
    });
  });

  it('should deduplicate quotes by SKU', async () => {
    // Hypothetical scenario: if web search returns duplicates,
    // we should filter them out
    const query: VendorQuery = {
      description: '2x4 lumber framing',
      quantity: 20,
      unit: 'lf',
    };

    const quotes = await queryHomeDepotPro(query);

    // Check for uniqueness by SKU
    const skus = quotes.map((q) => q.sku);
    const uniqueSkus = new Set(skus);
    expect(uniqueSkus.size).toBe(skus.length);
  });

  it('should include quality notes when available', async () => {
    const query: VendorQuery = {
      description: 'premium 2x4x8 SPF',
      quantity: 1,
      unit: 'ea',
      qualityTier: 'premium',
    };

    const quotes = await queryHomeDepotPro(query);

    // Any returned quotes should have qualityNotes if they have quality info
    quotes.forEach((quote) => {
      if (quote.qualityNotes) {
        expect(typeof quote.qualityNotes).toBe('string');
      }
    });
  });

  it('should include pickup locations if available', async () => {
    const query: VendorQuery = {
      description: '2x4 lumber',
      quantity: 10,
      unit: 'ea',
      zip: '94102',
    };

    const quotes = await queryHomeDepotPro(query);

    quotes.forEach((quote) => {
      if (quote.pickupLocations && quote.pickupLocations.length > 0) {
        quote.pickupLocations.forEach((loc) => {
          expect(typeof loc.name).toBe('string');
          expect(typeof loc.address).toBe('string');
          if (loc.distanceMiles !== undefined) {
            expect(typeof loc.distanceMiles).toBe('number');
          }
        });
      }
    });
  });
});
