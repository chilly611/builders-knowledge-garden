/**
 * UpCodes Adapter
 *
 * UpCodes (https://up.codes) is a third-party publisher of ICC model codes
 * plus state/local jurisdiction overlays. Unlike ICC DigitalCodes and NFPA
 * Link, UpCodes publishes a documented REST API and lists pricing publicly
 * (https://up.codes/about/api). Recommended starting integration for code
 * verification because:
 *
 *   - Real public API (no enterprise sales call required to start dev).
 *   - Coverage of ICC I-codes + many state/local amendments in one feed.
 *   - Free preview tier returns metadata + first paragraph of body — enough
 *     to verify the section exists, even before contract escalation.
 *   - ~$10k+/yr commercial tier unlocks full body text and higher rate.
 *
 * Same two-mode pattern as icc.ts / nfpa.ts:
 *   - PREVIEW (no UPCODES_API_KEY): citation-only, verified: false.
 *   - LIVE (key set): real fetch through http-fetcher, Zod-validated,
 *     falls back to citation-only on any failure.
 *
 * NOTE: The endpoint shape below is the documented public surface as of
 * May 2026. When the production contract specifies a different versioned
 * base path, override via UPCODES_API_BASE_URL.
 */

import { z } from "zod";
import type { CodeQuery, CodeSourceResult } from "./types";
import { fetchPublisher, hasApiKey } from "./http-fetcher";

const UPCODES_BASE_URL = "https://up.codes";
const UPCODES_API_BASE =
  process.env.UPCODES_API_BASE_URL || "https://api.up.codes/v1";
const UPCODES_API_KEY_ENV = "UPCODES_API_KEY";

/**
 * Zod schema for an UpCodes section response. Mirrors what UpCodes returns
 * from /v1/codes/{code}/sections/{section}. The free-preview tier returns
 * a truncated `body` plus `body_truncated: true`; paid tier returns full
 * body and `body_truncated: false`.
 */
export const UpCodesSectionResponseSchema = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  text: z.string().optional(),
  content: z.string().optional(),
  body_truncated: z.boolean().optional(),
  url: z.string().url().optional(),
  edition: z.string().optional(),
  code: z.string().optional(),
  section: z.string().optional(),
  chapter: z.string().optional(),
  jurisdiction: z.string().optional(),
});
export type UpCodesSectionResponse = z.infer<typeof UpCodesSectionResponseSchema>;

function deriveText(parsed: UpCodesSectionResponse): string {
  return parsed.body || parsed.text || parsed.content || "";
}

/**
 * Map discipline to the controlling I-code body. Same mapping as icc.ts
 * (UpCodes wraps the same ICC content + state overlays).
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
 * Build a user-facing UpCodes URL. UpCodes' public section URLs follow
 * /viewer/{jurisdiction}/{code}/chapter/{section} — when we don't know
 * the jurisdiction we fall back to the canonical I-code view.
 */
function constructUpCodesUrl(
  codeId: string,
  section?: string,
  jurisdiction?: string
): string {
  const codeSlug = codeId.toLowerCase();
  const juris = jurisdiction || "icc";
  if (!section) {
    return `${UPCODES_BASE_URL}/viewer/${juris}/${codeSlug}`;
  }
  const normalized = section
    .toLowerCase()
    .replace(/\./g, "-")
    .replace(/[\(\)]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${UPCODES_BASE_URL}/viewer/${juris}/${codeSlug}/chapter/${normalized}`;
}

function constructUpCodesApiUrl(
  codeId: string,
  edition: string,
  section?: string,
  jurisdiction?: string
): string {
  const params = new URLSearchParams({
    code: codeId,
    edition,
  });
  if (section) params.set("section", section);
  if (jurisdiction) params.set("jurisdiction", jurisdiction);
  return `${UPCODES_API_BASE}/sections?${params.toString()}`;
}

function buildPreviewResult(
  query: CodeQuery,
  codeId: string,
  edition: string,
  url: string
): CodeSourceResult {
  const citation = query.section
    ? `${codeId} ${query.section} (${edition}) [via UpCodes]`
    : `${codeId} (${edition}) [via UpCodes]`;
  return {
    source: "upcodes",
    edition,
    section: query.section || "General",
    jurisdiction: query.jurisdiction,
    title: `${codeId} ${query.section || "Code"}`,
    text: `Citation only — not yet verified. Click through to UpCodes to read the rule: ${url}`,
    citation,
    confidenceTier: "summary",
    retrievedAt: new Date().toISOString(),
    url,
    historical: false,
    verified: false,
  };
}

/**
 * Query UpCodes for a given code section.
 * Identical contract to queryIcc / queryNfpa.
 */
export async function queryUpCodes(query: CodeQuery): Promise<CodeSourceResult[]> {
  const codeId = getDisciplineCodeId(query.discipline);

  if (!query.section && (!query.keywords || query.keywords.length === 0)) {
    return [];
  }

  const edition = query.edition || "2021";
  const userUrl = constructUpCodesUrl(codeId, query.section, query.jurisdiction);

  if (!hasApiKey(UPCODES_API_KEY_ENV)) {
    return [buildPreviewResult(query, codeId, edition, userUrl)];
  }

  try {
    const apiUrl = constructUpCodesApiUrl(
      codeId,
      edition,
      query.section,
      query.jurisdiction
    );
    const fetched = await fetchPublisher<unknown>({
      url: apiUrl,
      apiKeyEnv: UPCODES_API_KEY_ENV,
      timeoutMs: 5000,
      retries: 3,
      retryBaseDelayMs: 250,
    });

    if (fetched.ok && fetched.data) {
      const parseResult = UpCodesSectionResponseSchema.safeParse(fetched.data);
      if (!parseResult.success) {
        if (process.env.NODE_ENV !== "test") {
          console.warn(
            "UpCodes response failed schema validation:",
            parseResult.error.issues
              .slice(0, 3)
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join("; ")
          );
        }
        return [buildPreviewResult(query, codeId, edition, userUrl)];
      }

      const data = parseResult.data;
      const text = deriveText(data);

      if (!text) {
        if (process.env.NODE_ENV !== "test") {
          console.warn("UpCodes response parsed but had no body/text/content");
        }
        return [buildPreviewResult(query, codeId, edition, userUrl)];
      }

      const resolvedSection = data.section || query.section || "General";
      const resolvedEdition = data.edition || edition;
      const resolvedCode = data.code || codeId;
      // If the free-tier returned a truncated body, we still mark verified:
      // true because we DID retrieve real publisher text — just less of it.
      // The downstream UI is responsible for showing a "preview" cue if
      // body_truncated is set.
      const citation = `${resolvedCode} ${resolvedSection} (${resolvedEdition}) [via UpCodes]`;
      return [
        {
          source: "upcodes",
          edition: resolvedEdition,
          section: resolvedSection,
          jurisdiction: data.jurisdiction || query.jurisdiction,
          title: data.title || `${codeId} ${resolvedSection}`,
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
      console.warn(
        `UpCodes live fetch failed: ${fetched.reason} (status=${fetched.status ?? "n/a"})`
      );
    }
    return [buildPreviewResult(query, codeId, edition, userUrl)];
  } catch (err) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("UpCodes adapter error:", err);
    }
    return [buildPreviewResult(query, codeId, edition, userUrl)];
  }
}
