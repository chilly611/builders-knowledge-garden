/**
 * NFPA Adapter
 * Constructs deep-links into NFPA Link (nfpa.org) for the controlling NFPA
 * standard given a discipline.
 *
 * IMPORTANT: this adapter does NOT yet HTTP-fetch the rule text — NFPA Link
 * is paywalled and we have no contract. Results are returned with
 * `verified: false` and a `text` field that explicitly says
 * "Citation only — not yet verified." The SourceCountBadge counts only
 * verified results toward the trust signal, so citation-only entries do
 * not falsely inflate the "N sources verified" badge.
 *
 * Discipline → NFPA standard mapping:
 *   electrical   → NFPA 70  (National Electrical Code / NEC)
 *   structural   → NFPA 5000 (Building Construction & Safety Code)
 *                  — NFPA 101 (Life Safety Code) is also relevant for egress
 *                    but NFPA 5000 is the closer "structural" analogue.
 *   plumbing     → NFPA does not publish a primary plumbing code; we keep
 *                  NFPA 99 (Health Care Facilities) as the closest match
 *                  since it governs medical-gas piping which is the only
 *                  NFPA "plumbing" content. For ordinary plumbing the
 *                  controlling code is IPC/UPC/CPC, not NFPA.
 *   mechanical   → NFPA 90A (Air-Conditioning & Ventilating Systems)
 *   fire         → NFPA 1   (Fire Code)
 *
 * Per CLAIMS fix 2026-05-22: mappings are preserved but the result now
 * carries `verified: false`, so a fire question doesn't get credit as a
 * "verified source" merely because we built a URL.
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
    structural: "NFPA 5000", // Building Construction and Safety Code
    plumbing: "NFPA 99", // Health Care Facilities Code (medical-gas piping only)
    mechanical: "NFPA 90A", // Air-Conditioning and Ventilating Systems
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
 * Query NFPA for a given standard/section.
 * Returns a citation-only result (verified: false) — see file header.
 * Gracefully handles timeouts and adapter errors.
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
      // Citation-only path: construct deep-link to NFPA Link.
      // We do NOT fetch the rule text (paywall + no API contract).
      // `verified: false` so the SourceCountBadge does not count this
      // toward the "N sources verified" trust signal.
      const url = constructNfpaUrl(standard, query.section);
      const edition = query.edition || "2023";

      // Build canonical citation
      const citation = query.section
        ? `${standard} ${query.section} (${edition})`
        : `${standard} (${edition})`;

      return [
        {
          source: "nfpa",
          edition,
          section: query.section || "General",
          jurisdiction: query.jurisdiction,
          title: `${standard} ${query.section || "Standard"}`,
          text: `Citation only — not yet verified. Click through to NFPA Link to read the standard: ${url}`,
          citation,
          confidenceTier: "summary",
          retrievedAt: new Date().toISOString(),
          url,
          historical: false,
          verified: false,
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
