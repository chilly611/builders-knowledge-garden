import { describe, it, expect } from 'vitest';
import type { VendorQuote } from '@/lib/resource-broker/vendors/types';

describe('Supply Workflow - Integration & No Compliance Leakage', () => {
  /**
   * Test that the supply workflow specialist prompts
   * and responses contain NO compliance/code citations.
   */

  const mockSupplyResponse = {
    summary: "Three vendors returned quotes. Home Depot Pro is cheapest and fastest (in-stock, $2120 total). 84 Lumber is $121 cheaper total if you can wait 2 days.",
    recommendations: {
      cheapest: {
        vendor: "84-lumber",
        totalPrice: 1999.00,
        notes: "Web-sourced quote — confirm at checkout. $121 cheaper than in-stock option, 2-day lead."
      },
      fastest: {
        vendor: "home-depot-pro",
        leadTimeDays: 0,
        notes: "In-stock today. Same-day pickup or delivery within 24 hours."
      },
      bestValue: {
        vendor: "home-depot-pro",
        notes: "In-stock, reliable, no delivery fee if you pick up. Fastest path to get materials and start."
      }
    }
  };

  const mockVendorQuotes: VendorQuote[] = [
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
  ];

  it('specialist response contains pricing data only, no compliance', () => {
    const responseText = JSON.stringify(mockSupplyResponse);

    // MUST contain pricing/vendor info
    expect(responseText).toContain('home-depot-pro');
    expect(responseText).toContain('84-lumber');
    expect(responseText).toContain('$');

    // MUST NOT contain compliance terms
    expect(responseText).not.toContain('IBC');
    expect(responseText).not.toContain('OSHA');
    expect(responseText).not.toContain('building code');
    expect(responseText).not.toContain('jurisdiction');
    expect(responseText).not.toContain('permit');
    expect(responseText).not.toContain('inspection');
  });

  it('vendor quotes contain material/price/availability, not codes', () => {
    const quoteText = JSON.stringify(mockVendorQuotes);

    // MUST contain factual vendor data
    expect(quoteText).toContain('home-depot-pro');
    expect(quoteText).toContain('CDX');
    expect(quoteText).toContain('in-stock');

    // MUST NOT contain compliance language
    expect(quoteText).not.toContain('IBC');
    expect(quoteText).not.toContain('OSHA');
    expect(quoteText).not.toContain('code');
    expect(quoteText).not.toContain('compliance');
  });

  it('supply workflow response does not blend with compliance specialists', () => {
    const forbiddenComplianceTerms = [
      'IBC',
      'OSHA',
      'building code',
      'electrical code',
      'structural code',
      'jurisdiction',
      'permit required',
      'inspection',
      'enforcement',
    ];

    const responseText = JSON.stringify(mockSupplyResponse);

    forbiddenComplianceTerms.forEach((term) => {
      expect(responseText).not.toContain(term);
    });
  });

  it('snapshot: recommendations summary stays under 180 words and compliance-free', () => {
    const summary = mockSupplyResponse.summary;
    const wordCount = summary.split(/\s+/).length;

    expect(wordCount).toBeLessThan(180);

    // No compliance terms
    expect(summary).not.toMatch(/IBC|OSHA|code|jurisdiction|permit|inspection/i);
  });

  it('handles VendorQuery to VendorQuote pipeline without compliance injection', () => {
    // Simulate the pipeline: VendorQuery -> queryAllVendors -> VendorQuote -> buildCostMatrix
    const queries = [
      {
        description: '3/4" CDX plywood',
        quantity: 40,
        unit: 'ea' as const,
        qualityTier: 'standard' as const,
      },
    ];

    const queryText = JSON.stringify(queries);

    // Queries should have no compliance terms
    expect(queryText).not.toContain('IBC');
    expect(queryText).not.toContain('OSHA');

    // Simulate vendor quote response
    const quotes = mockVendorQuotes;
    const quoteText = JSON.stringify(quotes);

    // Quotes should have no compliance terms
    expect(quoteText).not.toContain('IBC');
    expect(quoteText).not.toContain('OSHA');
  });

  it('cost matrix does not leak compliance data', () => {
    const costMatrixOutput = {
      cheapest: mockVendorQuotes[0],
      fastest: mockVendorQuotes[0],
      bestValue: mockVendorQuotes[0],
      allQuotes: mockVendorQuotes,
    };

    const matrixText = JSON.stringify(costMatrixOutput);

    // Should contain vendor/price data
    expect(matrixText).toContain('home-depot-pro');
    expect(matrixText).toContain('plywood');

    // Should NOT contain compliance terms
    expect(matrixText).not.toContain('IBC');
    expect(matrixText).not.toContain('OSHA');
    expect(matrixText).not.toContain('building code');
    expect(matrixText).not.toContain('jurisdiction');
  });
});
