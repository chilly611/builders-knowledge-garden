/**
 * Local Amendments Adapter
 * Loads jurisdiction-specific building code amendments from JSON files
 * Enables BKG to provide local jurisdiction-specific code guidance
 */

import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as path from "path";
import type { CodeQuery, CodeSourceResult } from "./types";

interface Amendment {
  id: string;
  discipline: string;
  baseEdition: string;
  baseSection: string;
  title: string;
  text: string;
  citation: string;
  confidenceTier: "primary" | "summary" | "historical";
  keywords: string[];
}

interface AmendmentFile {
  jurisdiction: string;
  jurisdictionName: string;
  parent: string;
  adoptedEdition: string;
  effectiveDate: string;
  sourceUrl: string;
  amendments: Amendment[];
}

// In-memory cache of loaded amendment files
let amendmentCache: Map<string, AmendmentFile> | null = null;

/**
 * Load all amendment JSON files from data/amendments directory
 * Caches results in memory to avoid repeated filesystem reads
 */
function loadAmendments(): Map<string, AmendmentFile> {
  if (amendmentCache) {
    return amendmentCache;
  }

  const cache = new Map<string, AmendmentFile>();
  const amendmentsDir = path.join(process.cwd(), "data/amendments");

  try {
    const files = fsSync.readdirSync(amendmentsDir);

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const filePath = path.join(amendmentsDir, file);
      try {
        const content = fsSync.readFileSync(filePath, "utf-8");
        const parsed: AmendmentFile = JSON.parse(content);
        cache.set(parsed.jurisdiction, parsed);
      } catch (err) {
        console.warn(`Failed to load amendment file ${file}:`, err);
        // Continue loading other files
      }
    }
  } catch (err) {
    console.warn("Failed to read amendments directory:", err);
  }

  amendmentCache = cache;
  return cache;
}

/**
 * Get matching jurisdictions based on query
 * If jurisdiction is specified, include it and its parent
 * Otherwise try to infer from keywords
 */
function getTargetJurisdictions(
  query: CodeQuery,
  allJurisdictions: string[]
): string[] {
  if (query.jurisdiction) {
    const targets = [query.jurisdiction];
    // Also include parent jurisdiction (e.g., ca-sf query includes ca-statewide)
    // This is a heuristic: if jurisdiction starts with "ca-", also search "ca-statewide"
    if (query.jurisdiction.startsWith("ca-") && query.jurisdiction !== "ca-statewide") {
      targets.push("ca-statewide-calgreen");
    }
    return targets;
  }

  // Fallback: try to infer from keywords (very conservative)
  // If keywords contain state abbreviations, include those
  const lowerKeywords = query.keywords.map((k) => k.toLowerCase());
  const targets: string[] = [];

  if (lowerKeywords.some((k) => k.includes("california") || k.includes("ca"))) {
    targets.push(...allJurisdictions.filter((j) => j.startsWith("ca-")));
  } else if (lowerKeywords.some((k) => k.includes("nevada") || k.includes("nv"))) {
    targets.push(...allJurisdictions.filter((j) => j.startsWith("nv-")));
  }

  return targets;
}

/**
 * Calculate match strength between amendment and query
 * Returns score: higher is better match
 */
function calculateMatchStrength(
  amendment: Amendment,
  query: CodeQuery
): number {
  let score = 0;

  // Exact section match: highest priority
  if (query.section && amendment.baseSection === query.section) {
    score += 1000;
  }

  // Keyword overlap (case-insensitive)
  const queryKeywords = query.keywords.map((k) => k.toLowerCase());
  const amendmentKeywords = amendment.keywords.map((k) => k.toLowerCase());
  const overlap = queryKeywords.filter((k) => amendmentKeywords.includes(k))
    .length;
  score += overlap * 10;

  return score;
}

/**
 * Query local amendments based on jurisdiction, discipline, and keywords
 * Returns standardized CodeSourceResult array, sorted by match strength
 */
export async function queryLocalAmendments(
  query: CodeQuery
): Promise<CodeSourceResult[]> {
  const amendments = loadAmendments();

  if (amendments.size === 0) {
    return [];
  }

  // Determine which jurisdictions to search
  const allJurisdictions = Array.from(amendments.keys());
  const targetJurisdictions = getTargetJurisdictions(query, allJurisdictions);

  if (targetJurisdictions.length === 0 && !query.jurisdiction) {
    // No jurisdiction specified and couldn't infer one
    return [];
  }

  const results: Array<{
    result: CodeSourceResult;
    strength: number;
  }> = [];

  // Search target jurisdictions
  const jurisdictionsToSearch = query.jurisdiction
    ? [query.jurisdiction]
    : targetJurisdictions;

  for (const jurisdiction of jurisdictionsToSearch) {
    const file = amendments.get(jurisdiction);
    if (!file) continue;

    // Filter amendments by discipline
    const filtered = file.amendments.filter(
      (a) => a.discipline === query.discipline
    );

    for (const amendment of filtered) {
      const strength = calculateMatchStrength(amendment, query);
      if (strength === 0 && query.section) {
        // If section was specified but didn't match, skip this amendment
        continue;
      }
      if (strength === 0 && query.keywords.length > 0) {
        // If keywords were specified but no overlap, skip this amendment
        continue;
      }

      const result: CodeSourceResult = {
        source: "local-amendment",
        edition: amendment.baseEdition,
        section: amendment.baseSection,
        jurisdiction: file.jurisdiction,
        title: amendment.title,
        text: amendment.text,
        citation: amendment.citation,
        confidenceTier: amendment.confidenceTier,
        retrievedAt: new Date().toISOString(),
        url: file.sourceUrl,
        historical: false,
      };

      results.push({ result, strength });
    }
  }

  // Sort by strength (descending), then by title (ascending)
  results.sort((a, b) => {
    if (b.strength !== a.strength) {
      return b.strength - a.strength;
    }
    return a.result.title.localeCompare(b.result.title);
  });

  return results.map(({ result }) => result);
}
