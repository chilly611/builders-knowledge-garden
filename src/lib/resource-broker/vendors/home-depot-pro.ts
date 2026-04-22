import type { VendorQuery, VendorQuote } from './types';

/**
 * Query Home Depot Pro for pricing and availability.
 * Attempts real API if HD_PRO_API_KEY is set; otherwise falls back to web search.
 * 5-second timeout per call. Graceful failure returns empty array.
 */
export async function queryHomeDepotPro(q: VendorQuery): Promise<VendorQuote[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const apiKey = process.env.HD_PRO_API_KEY;

    if (apiKey) {
      // Path 1: Real API (Pro Xtra)
      return await queryHomeDepotProAPI(q, apiKey, controller.signal);
    } else {
      // Path 2: Web search fallback
      return await queryHomeDepotProWebSearch(q, controller.signal);
    }
  } catch (err) {
    console.warn('[home-depot-pro] Query failed:', err instanceof Error ? err.message : String(err));
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Real Home Depot Pro Xtra API implementation.
 * Endpoint: https://services.homedepot.com/api/v1/products
 * Headers: X-Api-Key, Content-Type: application/json
 * (Stubbed for now until credentials are available)
 */
async function queryHomeDepotProAPI(
  q: VendorQuery,
  apiKey: string,
  signal: AbortSignal
): Promise<VendorQuote[]> {
  // Real API endpoint would be:
  // POST https://services.homedepot.com/api/v1/products/search
  // Headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" }
  // Body: { "keywords": q.description, "quantity": q.quantity, "zip": q.zip }
  //
  // For now, we stub this and fall back to web search
  // When credentials are provisioned, replace the fallback below with actual fetch:
  //
  // const res = await fetch('https://services.homedepot.com/api/v1/products/search', {
  //   method: 'POST',
  //   headers: {
  //     'X-Api-Key': apiKey,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     keywords: q.description,
  //     quantity: q.quantity,
  //     zip: q.zip || '10001',
  //   }),
  //   signal,
  // });

  // Stub fallback to web search for now
  return queryHomeDepotProWebSearch(q, signal);
}

/**
 * Web search fallback for Home Depot pricing.
 * Scrapes homedepot.com product pages via broker web-search.
 */
async function queryHomeDepotProWebSearch(
  q: VendorQuery,
  signal: AbortSignal
): Promise<VendorQuote[]> {
  // Search Home Depot for the product
  // Pattern: "2x4x8 lumber site:homedepot.com"
  const searchQuery = `${q.description} site:homedepot.com builder supplies pricing`;

  // In production, this would invoke the ResourceBroker's web-search primitive
  // For now, return empty array with confidence: web-search
  // The actual implementation would:
  // 1. Call ResourceBroker.search() with the query
  // 2. Parse homedepot.com product pages
  // 3. Extract unitPrice, availability, leadTime, pickup locations
  // 4. Build VendorQuote[] with confidence: "web-search"

  // Stub for now: log what we would search for
  console.debug('[home-depot-pro] Would search web for:', searchQuery);

  return [];
}
