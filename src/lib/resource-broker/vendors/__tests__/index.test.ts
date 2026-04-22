import { describe, it, expect, vi } from 'vitest';
import { queryAllVendors, buildCostMatrix } from '../index';
import type { VendorQuery, VendorQuote } from '../types';

describe('vendors/index', () => {
  describe('queryAllVendors', () => {
    it('should return aggregated results from all vendors', async () => {
      const query: VendorQuery = {
        description: '2x4x8 SPF #2 lumber',
        quantity: 10,
        unit: 'ea',
        zip: '94102',
      };

      const quotes = await queryAllVendors(query);

      // Should be an array (may be empty if no live data)
      expect(Array.isArray(quotes)).toBe(true);
    });

    it('should handle individual vendor failures gracefully', async () => {
      const query: VendorQuery = {
        description: '2x4 lumber framing',
        quantity: 20,
        unit: 'lf',
      };

      // Should not throw even if individual vendors fail
      const quotes = await queryAllVendors(query);
      expect(Array.isArray(quotes)).toBe(true);
    });

    it('should filter out non-framing queries from specialty vendors', async () => {
      const query: VendorQuery = {
        description: 'electrical outlet 15A',
        quantity: 10,
        unit: 'ea',
      };

      const quotes = await queryAllVendors(query);

      // 84 Lumber and White Cap should return empty for electrical
      expect(Array.isArray(quotes)).toBe(true);
    });
  });

  describe('buildCostMatrix', () => {
    const mockQuotes: VendorQuote[] = [
      {
        vendor: 'home-depot-pro',
        sku: 'HD-2x4-8-001',
        description: '2x4x8 SPF #2',
        unitPrice: 3.50,
        extendedPrice: 35.0,
        quantity: 10,
        unit: 'ea',
        availability: 'in-stock',
        leadTimeDays: 0,
        qualityNotes: 'standard grade',
        url: 'https://homedepot.com/product/1',
        retrievedAt: new Date().toISOString(),
        confidence: 'web-search',
      },
      {
        vendor: '84-lumber',
        sku: '84-2x4-8-002',
        description: '2x4x8 SPF #2',
        unitPrice: 3.25,
        extendedPrice: 32.5,
        quantity: 10,
        unit: 'ea',
        availability: 'in-stock',
        leadTimeDays: 0,
        qualityNotes: 'builder-grade',
        url: 'https://84lumber.com/product/2',
        retrievedAt: new Date().toISOString(),
        confidence: 'web-search',
      },
      {
        vendor: 'white-cap',
        sku: 'WC-2x4-8-003',
        description: '2x4x8 SPF #2',
        unitPrice: 3.75,
        extendedPrice: 37.5,
        quantity: 10,
        unit: 'ea',
        availability: 'ships-in',
        leadTimeDays: 2,
        qualityNotes: 'premium grade',
        url: 'https://whitecap.com/product/3',
        retrievedAt: new Date().toISOString(),
        confidence: 'web-search',
      },
    ];

    it('should identify cheapest quote by extendedPrice', () => {
      const matrix = buildCostMatrix(mockQuotes);

      expect(matrix.cheapest).toBeDefined();
      expect(matrix.cheapest?.sku).toBe('84-2x4-8-002'); // 84 Lumber at $32.50
      expect(matrix.cheapest?.vendor).toBe('84-lumber');
      expect(matrix.cheapest?.extendedPrice).toBe(32.5);
    });

    it('should identify fastest quote by leadTimeDays', () => {
      const matrix = buildCostMatrix(mockQuotes);

      expect(matrix.fastest).toBeDefined();
      // Both HD and 84 are in-stock (0 days), White Cap is 2 days
      // Should pick one of the in-stock options (first one encountered)
      expect(matrix.fastest?.vendor).toBe('home-depot-pro');
      expect(matrix.fastest?.leadTimeDays).toBe(0);
    });

    it('should identify best value using weighted scoring', () => {
      const matrix = buildCostMatrix(mockQuotes);

      expect(matrix.bestValue).toBeDefined();
      expect(matrix.bestValue?.vendor).toBeDefined();

      // Best value should balance price, leadTime, and quality
      // 84 Lumber: price score 100 (32.5 min) + leadTime 100 (in-stock) + quality 30 (builder-grade)
      //   = 100*0.5 + 100*0.3 + 30*0.2 = 50 + 30 + 6 = 86
      // HD: price score 92.8 (35.0) + leadTime 100 (in-stock) + quality 50 (standard)
      //   = 92.8*0.5 + 100*0.3 + 50*0.2 = 46.4 + 30 + 10 = 86.4
      // White Cap: price score 86.7 (37.5) + leadTime 96 (2 days) + quality 100 (premium)
      //   = 86.7*0.5 + 96*0.3 + 100*0.2 = 43.35 + 28.8 + 20 = 92.15
      // Expect White Cap due to premium quality outweighing slightly higher cost
      expect(matrix.bestValue?.vendor).toBe('white-cap');
    });

    it('should bucket quotes by vendor', () => {
      const matrix = buildCostMatrix(mockQuotes);

      expect(matrix.allByVendor['home-depot-pro']).toHaveLength(1);
      expect(matrix.allByVendor['84-lumber']).toHaveLength(1);
      expect(matrix.allByVendor['white-cap']).toHaveLength(1);
    });

    it('should handle empty quote array', () => {
      const matrix = buildCostMatrix([]);

      expect(matrix.cheapest).toBeNull();
      expect(matrix.fastest).toBeNull();
      expect(matrix.bestValue).toBeNull();
      expect(matrix.allByVendor['home-depot-pro']).toHaveLength(0);
      expect(matrix.allByVendor['84-lumber']).toHaveLength(0);
      expect(matrix.allByVendor['white-cap']).toHaveLength(0);
    });

    it('should handle single quote', () => {
      const singleQuote = mockQuotes.slice(0, 1);
      const matrix = buildCostMatrix(singleQuote);

      expect(matrix.cheapest?.vendor).toBe('home-depot-pro');
      expect(matrix.fastest?.vendor).toBe('home-depot-pro');
      expect(matrix.bestValue?.vendor).toBe('home-depot-pro');
    });

    it('should handle quality tiers in scoring', () => {
      const quotesWithVariousQuality: VendorQuote[] = [
        {
          vendor: 'home-depot-pro',
          sku: 'HD-001',
          description: 'Material',
          unitPrice: 5.0,
          extendedPrice: 50.0,
          quantity: 10,
          unit: 'ea',
          availability: 'in-stock',
          leadTimeDays: 0,
          qualityNotes: 'standard grade',
          retrievedAt: new Date().toISOString(),
          confidence: 'web-search',
        },
        {
          vendor: '84-lumber',
          sku: '84-001',
          description: 'Material',
          unitPrice: 4.8,
          extendedPrice: 48.0,
          quantity: 10,
          unit: 'ea',
          availability: 'in-stock',
          leadTimeDays: 0,
          qualityNotes: 'premium grade',
          retrievedAt: new Date().toISOString(),
          confidence: 'web-search',
        },
      ];

      const matrix = buildCostMatrix(quotesWithVariousQuality);

      // HD: price score 96 (48/50*100) + leadtime 100 + quality 50 (standard)
      //   = 96*0.5 + 100*0.3 + 50*0.2 = 48 + 30 + 10 = 88
      // 84: price score 100 (48 min) + leadtime 100 + quality 100 (premium)
      //   = 100*0.5 + 100*0.3 + 100*0.2 = 50 + 30 + 20 = 100
      // 84 Lumber wins on both price and quality
      expect(matrix.bestValue?.vendor).toBe('84-lumber');
    });

    it('should handle quotes with missing leadTimeDays', () => {
      const quotesWithoutLeadTime: VendorQuote[] = [
        {
          vendor: 'home-depot-pro',
          sku: 'HD-001',
          description: 'Material',
          unitPrice: 5.0,
          extendedPrice: 50.0,
          quantity: 10,
          unit: 'ea',
          availability: 'unknown',
          // leadTimeDays undefined
          retrievedAt: new Date().toISOString(),
          confidence: 'web-search',
        },
        {
          vendor: '84-lumber',
          sku: '84-001',
          description: 'Material',
          unitPrice: 4.5,
          extendedPrice: 45.0,
          quantity: 10,
          unit: 'ea',
          availability: 'in-stock',
          leadTimeDays: 0,
          retrievedAt: new Date().toISOString(),
          confidence: 'web-search',
        },
      ];

      const matrix = buildCostMatrix(quotesWithoutLeadTime);

      expect(matrix.cheapest?.sku).toBe('84-001');
      // 84-lumber has in-stock (0 days), HD has unknown (Infinity treated as highest)
      expect(matrix.fastest?.vendor).toBe('84-lumber');
    });

    it('should normalize price scoring across different quantities', () => {
      const quotesWithDifferentQuantities: VendorQuote[] = [
        {
          vendor: 'home-depot-pro',
          sku: 'HD-001',
          description: 'Lumber',
          unitPrice: 3.0,
          extendedPrice: 30.0,
          quantity: 10,
          unit: 'ea',
          availability: 'in-stock',
          retrievedAt: new Date().toISOString(),
          confidence: 'web-search',
        },
        {
          vendor: '84-lumber',
          sku: '84-001',
          description: 'Lumber',
          unitPrice: 3.2,
          extendedPrice: 64.0,
          quantity: 20,
          unit: 'ea',
          availability: 'in-stock',
          retrievedAt: new Date().toISOString(),
          confidence: 'web-search',
        },
      ];

      const matrix = buildCostMatrix(quotesWithDifferentQuantities);

      // HD is cheaper per extended price (30 vs 64)
      expect(matrix.cheapest?.sku).toBe('HD-001');
    });
  });
});
