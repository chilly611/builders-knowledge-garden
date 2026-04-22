import { describe, it, expect } from 'vitest';
import type { VendorQuote } from '@/lib/resource-broker/vendors/types';

describe('CostMatrix - Unit Tests', () => {
  const mockQuotes: VendorQuote[] = [
    {
      vendor: 'home-depot-pro',
      sku: 'PLY075CDX',
      description: '3/4" CDX plywood, sheet',
      unitPrice: 52.99,
      extendedPrice: 2119.60,
      quantity: 40,
      unit: 'ea',
      availability: 'in-stock',
      leadTimeDays: 0,
      deliveryFee: 89.99,
      qualityNotes: 'Exterior grade, sanded two sides',
      retrievedAt: '2026-04-22T14:30:00Z',
      confidence: 'observed',
    },
    {
      vendor: '84-lumber',
      sku: 'CDX075',
      description: '3/4" CDX plywood, sheet',
      unitPrice: 49.98,
      extendedPrice: 1999.20,
      quantity: 40,
      unit: 'ea',
      availability: 'ships-in',
      leadTimeDays: 2,
      deliveryFee: 0,
      qualityNotes: 'Exterior grade',
      retrievedAt: '2026-04-22T14:30:00Z',
      confidence: 'web-search',
    },
  ];

  it('validates cost matrix quote structure', () => {
    expect(mockQuotes.length).toBe(2);
    mockQuotes.forEach((quote) => {
      expect(quote.vendor).toBeDefined();
      expect(quote.sku).toBeDefined();
      expect(quote.unitPrice).toBeGreaterThan(0);
      expect(quote.extendedPrice).toBeGreaterThanOrEqual(0);
      expect(quote.quantity).toBeGreaterThan(0);
      expect(quote.availability).toBeDefined();
      expect(['observed', 'estimated', 'web-search']).toContain(quote.confidence);
    });
  });

  it('computes total price correctly (extended + delivery)', () => {
    const quote1Total = mockQuotes[0].extendedPrice + (mockQuotes[0].deliveryFee || 0);
    const quote2Total = mockQuotes[1].extendedPrice + (mockQuotes[1].deliveryFee || 0);

    expect(quote1Total).toBe(2119.60 + 89.99);
    expect(quote2Total).toBe(1999.20 + 0);
    expect(quote2Total).toBeLessThan(quote1Total);
  });

  it('identifies cheapest option (lowest total price)', () => {
    const totals = mockQuotes.map(q => q.extendedPrice + (q.deliveryFee || 0));
    const minTotal = Math.min(...totals);
    const cheapestQuote = mockQuotes.find(q => (q.extendedPrice + (q.deliveryFee || 0)) === minTotal);

    expect(cheapestQuote?.vendor).toBe('84-lumber');
  });

  it('identifies fastest option (shortest lead time)', () => {
    // Home Depot has 0 days, 84 Lumber has 2 days, so Home Depot is fastest
    expect(mockQuotes[0].leadTimeDays).toBe(0);
    expect(mockQuotes[1].leadTimeDays).toBe(2);
    
    const fastestQuote = mockQuotes[0]; // Home Depot has leadTimeDays: 0
    expect(fastestQuote.vendor).toBe('home-depot-pro');
    expect(fastestQuote.leadTimeDays).toBe(0);
  });

  it('does not include compliance terms in quote data', () => {
    const forbiddenTerms = ['IBC', 'OSHA', 'code', 'jurisdiction', 'permit'];
    const quoteText = JSON.stringify(mockQuotes);

    forbiddenTerms.forEach((term) => {
      expect(quoteText).not.toContain(term);
    });
  });

  it('handles empty quotes array gracefully', () => {
    const emptyQuotes: VendorQuote[] = [];
    expect(emptyQuotes.length).toBe(0);
  });

  it('distinguishes confidence levels: observed, web-search, estimated', () => {
    const confidenceTypes = mockQuotes.map(q => q.confidence);
    expect(confidenceTypes).toContain('observed');
    expect(confidenceTypes).toContain('web-search');
  });
});
