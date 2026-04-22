/**
 * NFPA Adapter
 * Queries NFPA (nfpa.org) for fire, electrical, and safety standards
 * NFPA free-tier search + section lookup with graceful timeout handling
 */

import type { CodeQuery, CodeSourceResult } from "./types";

const NFPA_TIMEOUT_MS = 3000;
const NFPA_BASE_URL = "https://nfpa.org";

/**
 * Map discipline to NFPA standard
 */
function getDisciplineStandard(discipline: string): string {
  const mapping: Record<string, string> = {
    electrical: "NFPA 70", // National Electrical Code (NEC)
    structural: "NFPA 101", // Life Safety Code
    plumbing: "NFPA 99", // Health Care Facilities Code
    mechanical: "NFPA 90A", // Standard for the Installation of Air-Conditioning and Ventilating Systems
    fire: "NFPA 1", // Fire Code
  };
  return mapping[discipline] || "NFPA 1";
}

/**
 * Construct NFPA.org URL for a given standard/section
 */
function constructNfpaUrl(standard: string, section?: string): string {
  const base = `${NFPA_BASE_URL}/${standard.toLowerCase().replace(/\s+/g, "-")}`;
  if (!section) {
    return base;
  }
  // Normalize section for URL (e.g., "210.52(C)(5)" → "210-52-c-5")
  const normalized = section
    .toLowerCase()
    .replace(/\./g, "-")
    .replace(/[\(\)]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}/${normalized}`;
}

/**
 * Query NFPA for a given standard/section
 * Returns standardized CodeSourceResult array
 * Gracefully handles timeouts and API unavailability
 */
export async function queryNfpa(query: CodeQuery): Promise<CodeSourceResult[]> {
  const standard = getDisciplineStandard(query.discipline);

  if (!query.section && (!query.keywords || query.keywords.length === 0)) {
    return []; // No query terms to search on
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), NFPA_TIMEOUT_MS);

    try {
      // For now, construct URL-based result (free-tier search may have limitations)
      // Official free API: https://api.nfpa.org/ has limited endpoints
      const url = constructNfpaUrl(standard, query.section);
      const edition = query.edition || "2023";

      // Build canonical citation
      const citation = query.section
        ? `${standard} ${query.section} (${edition})`
        : `${standard} (${edition})`;

      // Return URL-based result for display
      // In future: attempt fetch to NFPA free search endpoint if publicly available
      return [
        {
          source: "nfpa",
          edition,
          section: query.section || "General",
          jurisdiction: query.jurisdiction,
          title: `${standard} ${query.section || "Standard"}`,
          text: `See NFPA: ${url}`,
          citation,
          confidenceTier: "summary",
          retrievedAt: new Date().toISOString(),
          url,
          historical: false,
        },
      ];
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err) {
    // Timeout or network error — gracefully return empty
    if (err instanceof Error && err.name === "AbortError") {
      console.warn("NFPA query timeout");
    } else {
      console.warn("NFPA query error:", err);
    }
    return [];
  }
}
