export type { VendorQuery, VendorQuote, VendorName } from "./types";
export { queryHomeDepotPro } from "./home-depot-pro";
export { query84Lumber } from "./lumber-84";
export { queryWhiteCap } from "./white-cap";

import type { VendorQuery, VendorQuote, VendorName } from "./types";
import { queryHomeDepotPro } from "./home-depot-pro";
import { query84Lumber } from "./lumber-84";
import { queryWhiteCap } from "./white-cap";

/**
 * Query all vendors in parallel for the given query.
 * Returns aggregated results from all vendors that respond successfully.
 * Individual vendor failures are caught and excluded gracefully.
 */
export async function queryAllVendors(q: VendorQuery): Promise<VendorQuote[]> {
  const results = await Promise.allSettled([
    queryHomeDepotPro(q),
    query84Lumber(q),
    queryWhiteCap(q),
  ]);

  return results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => (r as PromiseFulfilledResult<VendorQuote[]>).value);
}

/**
 * Cost matrix builder: takes quotes and ranks them by cheapest, fastest, best value.
 * Normalizes prices by unit and weights quality tiers.
 */
export function buildCostMatrix(quotes: VendorQuote[]): {
  cheapest: VendorQuote | null;
  fastest: VendorQuote | null;
  bestValue: VendorQuote | null;
  allByVendor: Record<VendorName, VendorQuote[]>;
} {
  // Bucket quotes by vendor
  const allByVendor: Record<VendorName, VendorQuote[]> = {
    "home-depot-pro": [],
    "84-lumber": [],
    "white-cap": [],
  };

  quotes.forEach((q) => {
    if (allByVendor[q.vendor]) {
      allByVendor[q.vendor].push(q);
    }
  });

  // If no quotes, return empty matrix
  if (quotes.length === 0) {
    return {
      cheapest: null,
      fastest: null,
      bestValue: null,
      allByVendor,
    };
  }

  // Find cheapest: minimum extendedPrice
  let cheapest: VendorQuote | null = null;
  let minPrice = Infinity;
  for (const quote of quotes) {
    if (quote.extendedPrice < minPrice) {
      minPrice = quote.extendedPrice;
      cheapest = quote;
    }
  }

  // Find fastest: minimum leadTimeDays (in-stock = 0 days)
  let fastest: VendorQuote | null = null;
  let minLeadTime = Infinity;
  for (const quote of quotes) {
    const leadTime =
      quote.availability === "in-stock"
        ? 0
        : quote.leadTimeDays ?? Infinity;
    if (leadTime < minLeadTime) {
      minLeadTime = leadTime;
      fastest = quote;
    }
  }

  // Find best value: weighted score
  // price (50%) + leadTime (30%) + quality (20%)
  let bestValue: VendorQuote | null = null;
  let bestScore = -Infinity;

  for (const quote of quotes) {
    // Normalize price (0-100 scale, lower is better)
    const priceScore = Math.min(100, (minPrice / quote.extendedPrice) * 100);

    // Normalize leadTime (0-100 scale, lower is better)
    const leadTime =
      quote.availability === "in-stock"
        ? 0
        : quote.leadTimeDays ?? 99999;
    const leadTimeScore = leadTime === 0 ? 100 : Math.max(0, 100 - leadTime * 2);

    // Quality score (0-100 scale)
    let qualityScore = 50; // neutral default
    if (quote.qualityNotes) {
      const noteLower = quote.qualityNotes.toLowerCase();
      if (noteLower.includes("premium")) {
        qualityScore = 100;
      } else if (noteLower.includes("builder-grade")) {
        qualityScore = 30;
      } else {
        qualityScore = 50;
      }
    }

    // Composite score: weighted average
    const score =
      priceScore * 0.5 +
      leadTimeScore * 0.3 +
      qualityScore * 0.2;

    if (score > bestScore) {
      bestScore = score;
      bestValue = quote;
    }
  }

  return {
    cheapest,
    fastest,
    bestValue,
    allByVendor,
  };
}
