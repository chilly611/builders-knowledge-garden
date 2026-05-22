/**
 * NFPA Adapter
 *
 * Two modes (same pattern as icc.ts):
 *   - PREVIEW (default, no API key): construct a deep-link to NFPA Link and
 *     return a citation-only payload with `verified: false`.
 *   - LIVE (when NFPA_API_KEY is set): fetch from NFPA's API (or a stub URL
 *     pre-contract), with timeout + retry. On success, return `verified: true`
 *     with the rule text. On failure, fall back to citation-only.
 *
 * NFPA Link integration reality (May 2026):
 *   NFPA Link (nfpa.org/link) is paywalled commercial SaaS. NFPA does not
 *   publish a public REST API. Enterprise licensing exists for compliance
 *   platforms with bespoke pricing (typically 5–6 figures annual). Contact
 *   licensing@nfpa.org. See docs/EXTERNAL-CODE-SOURCES.md.
 *
 * Discipline → NFPA standard mapping:
 *   electrical   → NFPA 70  (National Electrical Code / NEC)
 *   structural   → NFPA 5000 (Building Construction & Safety Code)
 *   plumbing     → NFPA 99  (Health Care Facilities; medical-gas piping only)
 *   mechanical   → NFPA 90A (Air-Conditioning & Ventilating Systems)
 *   fire         → NFPA 1   (Fire Code)
 */

import { z } from "zod";
import type { CodeQuery, CodeSourceResult } from "./types";
import { fetchPublisher, hasApiKey } from "./http-fetcher";
import { withCache } from "./cache";

const NFPA_BASE_URL = "https://nfpa.org";
const NFPA_API_BASE = process.env.NFPA_API_BASE_URL || "https://api.nfpa.org/v1";
const NFPA_API_KEY_ENV = "NFPA_API_KEY";

/**
 * Zod schema for NFPA Link section response.
 *
 * NFPA Link's enterprise API is not publicly documented. The shape below is
 * derived from (a) the JSON nfpa.org/link serves to its SPA on a paid session
 * and (b) public posts from RedVector and Brightly's integrations. Like ICC,
 * NFPA varies between `text` and `body`; we accept both.
 *
 * All fields optional for the same reason as ICC: thin / metadata-only
 * responses are valid, and we'd rather degrade to citation-only than crash.
 */
export const NfpaSectionResponseSchema = z.object({
  title: z.string().optional(),
  text: z.string().optional(),
  body: z.string().optional(),
  url: z.string().url().optional(),
  standard: z.string().optional(),
  section: z.string().optional(),
  edition: z.string().optional(),
});
export type NfpaSectionResponse = z.infer<typeof NfpaSectionResponseSchema>;

function deriveText(parsed: NfpaSectionResponse): string {
  return parsed.text || parsed.body || "";
}

function getDisciplineStandard(discipline: string): string {
  const mapping: Record<string, string> = {
    electrical: "NFPA 70",
    structural: "NFPA 5000",
    plumbing: "NFPA 99",
    mechanical: "NFPA 90A",
    fire: "NFPA 1",
  };
  return mapping[discipline] || "NFPA 1";
}

function constructNfpaUrl(standard: string, section?: string): string {
  const base = `${NFPA_BASE_URL}/${standard.toLowerCase().replace(/\s+/g, "-")}`;
  if (!section) return base;
  const normalized = section
    .toLowerCase()
    .replace(/\./g, "-")
    .replace(/[\(\)]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}/${normalized}`;
}

function constructNfpaApiUrl(standard: string, edition: string, section?: string): string {
  const params = new URLSearchParams({ standard, edition });
  if (section) params.set("section", section);
  return `${NFPA_API_BASE}/sections?${params.toString()}`;
}

function buildPreviewResult(
  query: CodeQuery,
  standard: string,
  edition: string,
  url: string
): CodeSourceResult {
  const citation = query.section
    ? `${standard} ${query.section} (${edition})`
    : `${standard} (${edition})`;
  return {
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
  };
}

/**
 * Query NFPA for a given standard/section.
 * - No API key → citation-only (verified: false).
 * - API key + successful fetch → verified content (verified: true).
 * - API key + any failure → graceful fallback to citation-only.
 */
export async function queryNfpa(query: CodeQuery): Promise<CodeSourceResult[]> {
  const standard = getDisciplineStandard(query.discipline);

  if (!query.section && (!query.keywords || query.keywords.length === 0)) {
    return [];
  }

  const edition = query.edition || "2023";
  const userUrl = constructNfpaUrl(standard, query.section);

  return withCache("nfpa", query, async () => {
  if (!hasApiKey(NFPA_API_KEY_ENV)) {
    return [buildPreviewResult(query, standard, edition, userUrl)];
  }

  try {
    const apiUrl = constructNfpaApiUrl(standard, edition, query.section);
    const fetched = await fetchPublisher<unknown>({
      url: apiUrl,
      apiKeyEnv: NFPA_API_KEY_ENV,
      timeoutMs: 5000,
      retries: 3,
      retryBaseDelayMs: 250,
    });

    if (fetched.ok && fetched.data) {
      const parseResult = NfpaSectionResponseSchema.safeParse(fetched.data);
      if (!parseResult.success) {
        if (process.env.NODE_ENV !== "test") {
          console.warn(
            "NFPA response failed schema validation:",
            parseResult.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
          );
        }
        return [buildPreviewResult(query, standard, edition, userUrl)];
      }

      const data = parseResult.data;
      const text = deriveText(data);

      if (!text) {
        if (process.env.NODE_ENV !== "test") {
          console.warn("NFPA response parsed but had no text/body");
        }
        return [buildPreviewResult(query, standard, edition, userUrl)];
      }

      const resolvedSection = data.section || query.section || "General";
      const resolvedEdition = data.edition || edition;
      const resolvedStandard = data.standard || standard;
      const citation = `${resolvedStandard} ${resolvedSection} (${resolvedEdition})`;
      return [
        {
          source: "nfpa",
          edition: resolvedEdition,
          section: resolvedSection,
          jurisdiction: query.jurisdiction,
          title: data.title || `${resolvedStandard} ${resolvedSection}`,
          text,
          citation,
          confidenceTier: "primary",
          retrievedAt: new Date().toISOString(),
          url: data.url || userUrl,
          historical: false,
          verified: true,
        },
      ];
    }

    if (process.env.NODE_ENV !== "test") {
      console.warn(`NFPA live fetch failed: ${fetched.reason} (status=${fetched.status ?? "n/a"})`);
    }
    return [buildPreviewResult(query, standard, edition, userUrl)];
  } catch (err) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("NFPA adapter error:", err);
    }
    return [buildPreviewResult(query, standard, edition, userUrl)];
  }
  });
}
