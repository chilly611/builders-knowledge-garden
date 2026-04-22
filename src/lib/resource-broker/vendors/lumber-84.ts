import type { VendorQuery, VendorQuote } from './types';

/**
 * Query 84 Lumber for pricing and availability.
 * 84 Lumber is strongest on framing materials, lumber, and EWP (engineered wood products).
 * Returns empty gracefully if query is outside their specialty (finish goods, fasteners, rough electrical).
 * 5-second timeout per call.
 */
export async function query84Lumber(q: VendorQuery): Promise<VendorQuote[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    // Check if query is in 84 Lumber's strength areas
    if (!isFramingOrEWP(q.description)) {
      console.debug('[84-lumber] Query outside specialty (framing/EWP), returning empty');
      return [];
    }

    const apiKey = process.env.LUMBER_84_API_KEY;

    if (apiKey) {
      // Path 1: Real API
      return await query84LumberAPI(q, apiKey, controller.signal);
    } else {
      // Path 2: Web search fallback
      return await query84LumberWebSearch(q, controller.signal);
    }
  } catch (err) {
    console.warn('[84-lumber] Query failed:', err instanceof Error ? err.message : String(err));
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Real 84 Lumber B2B API implementation.
 * Endpoint: https://api.84lumber.com/v1/quote
 * Auth: Bearer token in Authorization header
 * (Stubbed for now until credentials are available)
 */
async function query84LumberAPI(
  q: VendorQuery,
  apiKey: string,
  signal: AbortSignal
): Promise<VendorQuote[]> {
  // Real API endpoint would be:
  // POST https://api.84lumber.com/v1/quote
  // Headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" }
  // Body: { "description": q.description, "quantity": q.quantity, "unit": q.unit, "zip": q.zip }
  //
  // When credentials are provisioned, replace the fallback below with actual fetch:
  //
  // const res = await fetch('https://api.84lumber.com/v1/quote', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${apiKey}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     description: q.description,
  //     quantity: q.quantity,
  //     unit: q.unit,
  //     zip: q.zip || '10001',
  //   }),
  //   signal,
  // });

  // Stub fallback to web search for now
  return query84LumberWebSearch(q, signal);
}

/**
 * Web search fallback for 84 Lumber pricing.
 * Scrapes 84lumber.com product pages via broker web-search.
 */
async function query84LumberWebSearch(
  q: VendorQuery,
  signal: AbortSignal
): Promise<VendorQuote[]> {
  // Search 84 Lumber for framing/lumber products
  // Pattern: "2x4x8 lumber site:84lumber.com"
  const searchQuery = `${q.description} site:84lumber.com`;

  // In production, this would invoke the ResourceBroker's web-search primitive
  // For now, return empty array with confidence: web-search
  // The actual implementation would:
  // 1. Call ResourceBroker.search() with the query
  // 2. Parse 84lumber.com product pages
  // 3. Extract unitPrice, availability, leadTime, pickup locations
  // 4. Build VendorQuote[] with confidence: "web-search"

  // Stub for now: log what we would search for
  console.debug('[84-lumber] Would search web for:', searchQuery);

  return [];
}

/**
 * Check if description indicates framing/lumber/EWP materials.
 * Returns false for finish goods, fasteners, rough electrical, etc.
 */
function isFramingOrEWP(description: string): boolean {
  const lowerDesc = description.toLowerCase();

  // Positive patterns: lumber, framing, EWP, engineered wood
  const positiveLumbering = [
    'lumber',
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
    'oriented strand board',
    'beam',
    'joist',
    'rafter',
    'stud',
    'spf',
    'dimensioned',
    'framing',
    'ewp',
    'engineered',
    'glue-lam',
    'laminated strand',
    'lsl',
    'psl',
    'parallel strand',
    'i-joist',
  ];

  // Negative patterns: finish, fasteners, electrical, etc.
  const negativePatterns = [
    'nail',
    'screw',
    'bolt',
    'fastener',
    'paint',
    'stain',
    'finish',
    'drywall',
    'sheetrock',
    'insulation',
    'wire',
    'electrical',
    'outlet',
    'switch',
    'circuit',
    'breaker',
    'knob',
    'hinge',
    'hardware',
    'lock',
    'hose',
    'copper',
    'pvc',
    'fitting',
  ];

  // Check for negative patterns first
  if (negativePatterns.some((p) => lowerDesc.includes(p))) {
    return false;
  }

  // Check for positive patterns
  if (positiveLumbering.some((p) => lowerDesc.includes(p))) {
    return true;
  }

  return false;
}
