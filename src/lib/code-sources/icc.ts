/**
 * ICC DigitalCodes Adapter
 *
 * Two modes:
 *   - PREVIEW (default, no API key): construct a deep-link to ICC DigitalCodes
 *     and return a citation-only payload with `verified: false`. This is
 *     identical to the prior behavior and is what `SourceCountBadge` expects
 *     when the publisher isn't licensed.
 *   - LIVE (when ICC_API_KEY is set): fetch via http-fetcher against the
 *     ICC DigitalCodes API endpoint. On success, return `verified: true`
 *     with the actual rule text. On any failure (timeout, 4xx, 5xx, parse
 *     error) we fall back to the citation-only payload — never break the
 *     orchestrator.
 *
 * ICC DigitalCodes integration reality (May 2026):
 *   ICC DigitalCodes (codes.iccsafe.org) does NOT publish a public REST API.
 *   Access is via:
 *     a) DigitalCodes Premium (per-seat subscription, ~$200/yr/seat).
 *     b) Custom enterprise licensing that may include API access for
 *        compliance platforms — pricing is bespoke (typically 5–6 figures
 *        annual). Contact licensing@iccsafe.org.
 *   Until we have an enterprise contract, this adapter is structured so the
 *   live-mode codepath exists, can be unit-tested against a mock URL, and
 *   only needs the env var + endpoint URL to flip on. See
 *   docs/EXTERNAL-CODE-SOURCES.md for the wire-up plan.
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
 */

import type { CodeQuery, CodeSourceResult } from "./types";
import { fetchPublisher, hasApiKey } from "./http-fetcher";

const ICC_BASE_URL = "https://codes.iccsafe.org";
const ICC_API_BASE = process.env.ICC_API_BASE_URL || "https://api.iccsafe.org/v1";
const ICC_API_KEY_ENV = "ICC_API_KEY";

/**
 * Shape we expect from the ICC API (or our stub) when live-mode succeeds.
 * Conservative — only fields we'll actually surface.
 */
interface IccApiResponse {
  code: string;       // e.g. "NEC"
  edition?: string;   // e.g. "2023"
  section?: string;   // e.g. "210.52(C)(5)"
  title?: string;
  text?: string;      // The actual rule text
  url?: string;       // Canonical publisher URL
}

/**
 * Map discipline to the controlling ICC model code body for US construction.
 */
function getDisciplineCodeId(discipline: string): string {
  const mapping: Record<string, string> = {
    electrical: "NEC",
    structural: "IBC",
    plumbing: "IPC",
    mechanical: "IMC",
    fire: "IFC",
  };
  return mapping[discipline] || "IBC";
}

/**
 * Construct ICC DigitalCodes user-facing URL for a given section.
 */
function constructIccUrl(codeId: string, section?: string): string {
  if (!section) {
    return `${ICC_BASE_URL}/content/${codeId}`;
  }
  const normalized = section
    .toLowerCase()
    .replace(/\./g, "-")
    .replace(/[\(\)]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${ICC_BASE_URL}/content/${codeId}/${normalized}`;
}

/**
 * Build the API URL we'd hit in live mode. Currently shaped for ICC's
 * presumed REST surface. When the real contract lands, only this function
 * + the response parser need to change.
 */
function constructIccApiUrl(codeId: string, edition: string, section?: string): string {
  const params = new URLSearchParams({ code: codeId, edition });
  if (section) params.set("section", section);
  return `${ICC_API_BASE}/sections?${params.toString()}`;
}

/**
 * Build the citation-only payload we return in preview mode AND as the
 * fallback on any live-mode failure.
 */
function buildPreviewResult(
  query: CodeQuery,
  codeId: string,
  edition: string,
  url: string
): CodeSourceResult {
  const citation = query.section
    ? `${codeId} ${query.section} (${edition})`
    : `${codeId} (${edition})`;
  return {
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
  };
}

/**
 * Query ICC DigitalCodes for a given code section.
 * - No API key → citation-only (verified: false).
 * - API key + successful fetch → verified content (verified: true).
 * - API key + any failure → graceful fallback to citation-only.
 */
export async function queryIcc(query: CodeQuery): Promise<CodeSourceResult[]> {
  const codeId = getDisciplineCodeId(query.discipline);

  if (!query.section && (!query.keywords || query.keywords.length === 0)) {
    return [];
  }

  const edition = query.edition || "2021";
  const userUrl = constructIccUrl(codeId, query.section);

  // Preview mode: no key, no network. Identical behavior to pre-refactor.
  if (!hasApiKey(ICC_API_KEY_ENV)) {
    return [buildPreviewResult(query, codeId, edition, userUrl)];
  }

  // Live mode: attempt fetch. On any failure, fall back to citation-only.
  try {
    const apiUrl = constructIccApiUrl(codeId, edition, query.section);
    const fetched = await fetchPublisher<IccApiResponse>({
      url: apiUrl,
      apiKeyEnv: ICC_API_KEY_ENV,
      timeoutMs: 5000,
      retries: 3,
      retryBaseDelayMs: 250,
    });

    if (fetched.ok && fetched.data && fetched.data.text) {
      const data = fetched.data;
      const resolvedSection = data.section || query.section || "General";
      const resolvedEdition = data.edition || edition;
      const citation = `${data.code || codeId} ${resolvedSection} (${resolvedEdition})`;
      return [
        {
          source: "icc-digital-codes",
          edition: resolvedEdition,
          section: resolvedSection,
          jurisdiction: query.jurisdiction,
          title: data.title || `${codeId} ${resolvedSection}`,
          text: data.text ?? "",
          citation,
          confidenceTier: "primary",
          retrievedAt: new Date().toISOString(),
          url: data.url || userUrl,
          historical: false,
          verified: true,
        },
      ];
    }

    // Live mode hit but failed (timeout / 4xx / 5xx / parse-error).
    // Telemetry hook — keep quiet in tests but log in non-test envs.
    if (process.env.NODE_ENV !== "test") {
      console.warn(`ICC live fetch failed: ${fetched.reason} (status=${fetched.status ?? "n/a"})`);
    }
    return [buildPreviewResult(query, codeId, edition, userUrl)];
  } catch (err) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("ICC adapter error:", err);
    }
    return [buildPreviewResult(query, codeId, edition, userUrl)];
  }
}
