/**
 * ICC DigitalCodes Adapter
 * Queries ICC DigitalCodes (codes.iccsafe.org) for building code sections
 * Graceful fallback to URL construction + citation when API unavailable
 */

import type { CodeQuery, CodeSourceResult } from "./types";

const ICC_TIMEOUT_MS = 3000;
const ICC_BASE_URL = "https://codes.iccsafe.org";

/**
 * Map discipline to ICC code body ID
 */
function getDisciplineCodeId(discipline: string): string {
  const mapping: Record<string, string> = {
    electrical: "IEC",
    structural: "IBC",
    plumbing: "IPC",
    mechanical: "IMC",
    fire: "NFPA",
  };
  return mapping[discipline] || "IBC";
}

/**
 * Construct ICC DigitalCodes URL for a given section
 */
function constructIccUrl(codeId: string, section?: string): string {
  if (!section) {
    return `${ICC_BASE_URL}/content/${codeId}`;
  }
  // Normalize section formatting for URL (e.g., "210.52(C)(5)" → "210-52-c-5")
  const normalized = section
    .toLowerCase()
    .replace(/\./g, "-")
    .replace(/[\(\)]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${ICC_BASE_URL}/content/${codeId}/${normalized}`;
}

/**
 * Query ICC DigitalCodes for a given code section
 * Returns standardized CodeSourceResult array
 * Gracefully handles timeouts and API unavailability
 */
export async function queryIcc(query: CodeQuery): Promise<CodeSourceResult[]> {
  const codeId = getDisciplineCodeId(query.discipline);

  if (!query.section && (!query.keywords || query.keywords.length === 0)) {
    return []; // No query terms to search on
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ICC_TIMEOUT_MS);

    try {
      // For now, construct URL-based result (official API may not be public)
      // This allows return of citation + URL even without full text fetch
      const url = constructIccUrl(codeId, query.section);
      const edition = query.edition || "2021";

      // Build canonical citation
      const citation = query.section
        ? `${codeId} ${query.section} (${edition})`
        : `${codeId} (${edition})`;

      // Return URL-based result for display
      // In future: attempt fetch to https://codes.iccsafe.org/search with query parameters
      // if official search API becomes available
      return [
        {
          source: "icc-digital-codes",
          edition,
          section: query.section || "General",
          jurisdiction: query.jurisdiction,
          title: `${codeId} ${query.section || "Code"}`,
          text: `See ICC DigitalCodes: ${url}`,
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
      console.warn("ICC query timeout");
    } else {
      console.warn("ICC query error:", err);
    }
    return [];
  }
}
