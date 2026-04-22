import type { VendorQuery, VendorQuote } from './types';

/**
 * Query White Cap for pricing and availability.
 * White Cap is strongest on concrete accessories, rebar, forming materials, jobsite supplies.
 * Returns empty gracefully if query is outside their specialty (framing lumber).
 * 5-second timeout per call.
 */
export async function queryWhiteCap(q: VendorQuery): Promise<VendorQuote[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    // Check if query is in White Cap's strength areas
    if (!isConcretFormingSupplies(q.description)) {
      console.debug('[white-cap] Query outside specialty (concrete/forming), returning empty');
      return [];
    }

    // White Cap has no public API; web search fallback only
    return await queryWhiteCapWebSearch(q, controller.signal);
  } catch (err) {
    console.warn('[white-cap] Query failed:', err instanceof Error ? err.message : String(err));
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Web search fallback for White Cap pricing.
 * Scrapes whitecap.com product pages via broker web-search.
 */
async function queryWhiteCapWebSearch(
  q: VendorQuery,
  signal: AbortSignal
): Promise<VendorQuote[]> {
  // Search White Cap for concrete/forming materials
  // Pattern: "rebar site:whitecap.com"
  const searchQuery = `${q.description} site:whitecap.com`;

  // In production, this would invoke the ResourceBroker's web-search primitive
  // For now, return empty array with confidence: web-search
  // The actual implementation would:
  // 1. Call ResourceBroker.search() with the query
  // 2. Parse whitecap.com product pages
  // 3. Extract unitPrice, availability, leadTime, pickup locations
  // 4. Build VendorQuote[] with confidence: "web-search"

  // Stub for now: log what we would search for
  console.debug('[white-cap] Would search web for:', searchQuery);

  return [];
}

/**
 * Check if description indicates concrete/forming/jobsite supplies.
 * Returns false for framing lumber and specialty materials.
 */
function isConcretFormingSupplies(description: string): boolean {
  const lowerDesc = description.toLowerCase();

  // Positive patterns: concrete, rebar, forming, bracing, jobsite
  const positivePatterns = [
    'concrete',
    'rebar',
    'reinforcing',
    're-bar',
    'form',
    'forming',
    'bracing',
    'shoring',
    'scaffold',
    'jobsite',
    'job site',
    'site supplies',
    'concrete accessories',
    'anchor',
    'tie',
    'wire',
    'mesh',
    'welded wire',
    'decking',
    'grade',
    'epoxy',
    'adhesive',
    'concrete mix',
    'mortar',
    'cement',
  ];

  // Negative patterns: lumber, framing, electrical, etc.
  const negativePatterns = [
    '2x4',
    '2x6',
    '2x8',
    '2x10',
    '2x12',
    '1x4',
    '1x6',
    '1x8',
    '1x10',
    '1x12',
    '4x4',
    '4x6',
    '4x8',
    'plywood',
    'osb',
    'lumber',
    'beam',
    'joist',
    'rafter',
    'stud',
    'framing',
    'spf',
    'ewp',
    'engineered',
    'paint',
    'stain',
    'finish',
    'electrical',
    'outlet',
    'switch',
    'circuit',
    'breaker',
    'wire',
    'pvc',
    'hvac',
  ];

  // Check for negative patterns first
  if (negativePatterns.some((p) => lowerDesc.includes(p))) {
    return false;
  }

  // Check for positive patterns
  if (positivePatterns.some((p) => lowerDesc.includes(p))) {
    return true;
  }

  return false;
}
