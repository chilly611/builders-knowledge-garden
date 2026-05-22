/**
 * ICC DigitalCodes Adapter
 * Constructs deep-links into ICC DigitalCodes (codes.iccsafe.org) for the
 * model-code body that controls a given discipline.
 *
 * IMPORTANT: this adapter does NOT yet HTTP-fetch the rule text — ICC
 * DigitalCodes is paywalled and we have no contract. Results are returned
 * with `verified: false` and a `text` field that explicitly says
 * "Citation only — not yet verified." The SourceCountBadge counts only
 * verified results toward the trust signal, so citation-only entries do
 * not falsely inflate the "N sources verified" badge.
 *
 * Discipline → ICC model code mapping (US / California construction):
 *   electrical   → NEC      (NFPA 70; in CA: CEC = Title 24 Part 3, adopts NEC)
 *   structural   → IBC      (Chapters 16–23 for Type V; in CA: CBC = Title 24 Pt 2)
 *   plumbing     → IPC      (in CA: CPC = Title 24 Pt 5, based on UPC)
 *   mechanical   → IMC      (in CA: CMC = Title 24 Pt 4, based on UMC)
 *   fire         → IFC      (in CA: CFC = Title 24 Pt 9, based on IFC)
 *   energy       → IECC     (in CA: Title 24 Pt 6)
 *   accessibility→ ICC A117.1 + ADA 2010 (in CA: CBC Ch 11A/11B)
 *   residential  → IRC      (in CA: CRC = Title 24 Pt 2.5; R-3 SFD exempt from IBC)
 *
 * Per CLAIMS fix 2026-05-22: prior mapping had `electrical → IEC` (IEC is
 * European, not adopted in the US) and `fire → NFPA` (NFPA covers NEC
 * and life-safety but the ICC fire body is IFC). Those constructed
 * fabricated URLs.
 */

import type { CodeQuery, CodeSourceResult } from "./types";

const ICC_TIMEOUT_MS = 3000;
const ICC_BASE_URL = "https://codes.iccsafe.org";

/**
 * Map discipline to the controlling ICC model code body for US construction.
 * Returns the ICC code abbreviation used in DigitalCodes URLs and citations.
 */
function getDisciplineCodeId(discipline: string): string {
  const mapping: Record<string, string> = {
    electrical: "NEC", // National Electrical Code (NFPA 70) — adopted as Title 24 Pt 3 in CA
    structural: "IBC", // International Building Code Ch 16–23 (Type V & up)
    plumbing: "IPC", // International Plumbing Code
    mechanical: "IMC", // International Mechanical Code
    fire: "IFC", // International Fire Code — adopted as Title 24 Pt 9 (CFC) in CA
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
 * Query ICC DigitalCodes for a given code section.
 * Returns a citation-only result (verified: false) — see file header.
 * Gracefully handles timeouts and adapter errors.
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
      // Citation-only path: construct deep-link to ICC DigitalCodes.
      // We do NOT fetch the rule text (paywall + no API contract).
      // `verified: false` so the SourceCountBadge does not count this
      // toward the "N sources verified" trust signal.
      const url = constructIccUrl(codeId, query.section);
      const edition = query.edition || "2021";

      // Build canonical citation
      const citation = query.section
        ? `${codeId} ${query.section} (${edition})`
        : `${codeId} (${edition})`;

      return [
        {
          source: "icc-digital-codes",
          edition,
          section: query.section || "General",
          jurisdiction: query.jurisdiction,
          title: `${codeId} ${query.section || "Code"}`,
          text: `Citation only — not yet verified. Click through to ICC DigitalCodes to read the rule: ${url}`,
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
      console.warn("ICC query timeout");
    } else {
      console.warn("ICC query error:", err);
    }
    return [];
  }
}
