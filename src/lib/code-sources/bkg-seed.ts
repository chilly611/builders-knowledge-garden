/**
 * BKG Seed Adapter
 * Wraps existing retrieveEntities() from src/lib/rag.ts
 * Maps KnowledgeEntity output to CodeSourceResult contract
 * Preserves existing specialist.ts behavior
 */

import { retrieveEntities, type KnowledgeEntity } from "../rag";
import type { CodeQuery, CodeSourceResult } from "./types";

/**
 * Map knowledge entity domain to confidence tier
 * Assumes Agent 2 expanded seed with confidenceTier field in metadata
 */
function getConfidenceTier(entity: KnowledgeEntity): "primary" | "summary" | "historical" {
  // Check metadata for agent 2's confidence tier field
  const tierFromMeta = entity.metadata?.confidenceTier;
  if (tierFromMeta === "primary" || tierFromMeta === "summary" || tierFromMeta === "historical") {
    return tierFromMeta;
  }

  // Fallback: infer from entity_type
  if (entity.entity_type === "code_section") {
    return "primary";
  }
  if (entity.entity_type === "material" || entity.entity_type === "safety_rule") {
    return "summary";
  }
  return "summary";
}

/**
 * Extract section number from entity title if present
 * e.g., "IBC Section 903.2.1 — Automatic Sprinkler Systems" → "903.2.1"
 */
function extractSection(title: string): string {
  const match = title.match(/[Ss]ection\s+([\d.()A-Za-z-]+)/);
  return match ? match[1] : "General";
}

/**
 * Extract code body (e.g., "IBC", "NEC") from title or domain
 */
function extractCodeBody(entity: KnowledgeEntity): string {
  const titleMatch = entity.title.match(/^([A-Z]+)\s/);
  if (titleMatch) return titleMatch[1];

  // Map domain to common code bodies
  const domainMap: Record<string, string> = {
    codes: "Code",
    safety: "OSHA",
    materials: "Material",
    specialty: "Standard",
  };
  return domainMap[entity.domain] || "BKG";
}

/**
 * Discipline-specific keyword gates for relevance filtering
 */
const DISCIPLINE_KEYWORDS: Record<string, string[]> = {
  electrical: ["electrical", "nec", "circuit", "receptacle", "gfci", "afci", "wiring", "panel", "amp", "volt", "conduit", "romex", "outlet", "plug"],
  structural: ["ibc", "irc", "framing", "load", "seismic", "shear", "lateral", "foundation", "beam", "column", "joist", "rafter"],
  plumbing: ["ipc", "pipe", "drain", "vent", "trap", "fixture", "gpf", "sewer", "backflow", "riser", "rough-in"],
  mechanical: ["hvac", "duct", "imc", "ventilation", "cfm", "refrigerant", "heat", "pump", "ahu", "vav"],
  fire: ["sprinkler", "alarm", "nfpa", "smoke", "egress", "fire-rated", "life-safety", "occupant", "exit"],
};

/**
 * Filter entities by discipline and keyword relevance
 * An entity passes if:
 * 1. Its title/body contains at least one discipline keyword, AND
 * 2. Its title/body intersects with query keywords (word-level substring match)
 * Returns empty array if no entities survive filter.
 */
function filterByDisciplineAndKeywords(
  entities: KnowledgeEntity[],
  query: CodeQuery
): KnowledgeEntity[] {
  if (!entities.length) return [];

  const disciplineTerms = DISCIPLINE_KEYWORDS[query.discipline] || [];
  const queryKeywords = query.keywords || [];

  return entities.filter((entity) => {
    const fullText = (
      entity.title.toLowerCase() +
      " " +
      (entity.summary || "").toLowerCase() +
      " " +
      (entity.body || "").toLowerCase()
    );

    // Check discipline gate: at least one discipline keyword must appear
    const hasDisciplineMatch = disciplineTerms.some((term) =>
      fullText.includes(term.toLowerCase())
    );

    if (!hasDisciplineMatch) {
      return false;
    }

    // Check keyword gate: at least one query keyword must intersect
    // Use word-level substring match to avoid false positives
    const hasKeywordMatch = queryKeywords.some((keyword) =>
      fullText.includes(keyword.toLowerCase())
    );

    return hasKeywordMatch;
  });
}

/**
 * Query BKG seed database via existing retrieveEntities
 * Returns standardized CodeSourceResult array
 * Filters by discipline and keyword relevance; caps at 3 results.
 * Returns empty array if no results survive filtering.
 */
export async function queryBkgSeed(query: CodeQuery): Promise<CodeSourceResult[]> {
  // Build search keywords from both discipline and free-text keywords
  const searchTerms = [
    query.discipline,
    query.section,
    ...query.keywords,
  ]
    .filter(Boolean)
    .join(" ");

  if (!searchTerms.trim()) {
    return [];
  }

  try {
    const result = await retrieveEntities(searchTerms, {
      jurisdiction: query.jurisdiction,
      limit: 10,
    });

    // Apply relevance filter: discipline + keyword gate
    const filtered = filterByDisciplineAndKeywords(result.entities, query);

    // If no entities survive filter, return empty
    if (!filtered.length) {
      return [];
    }

    // Cap at top 3 after filter
    const capped = filtered.slice(0, 3);

    // Map entities to CodeSourceResult
    return capped.map((entity): CodeSourceResult => {
      const section = extractSection(entity.title);
      const codeBody = extractCodeBody(entity);
      const edition = (entity.metadata?.edition as string) || "Current";

      return {
        source: "bkg-seed",
        edition,
        section,
        jurisdiction: query.jurisdiction,
        title: entity.title,
        text: entity.summary + (entity.body ? "\n\n" + entity.body : ""),
        citation: `${entity.slug}`,
        confidenceTier: getConfidenceTier(entity),
        retrievedAt: new Date().toISOString(),
        url: undefined, // BKG seed doesn't have URLs yet
        historical: (entity.metadata?.historical as boolean) || false,
        supersededBy: (entity.metadata?.supersededBy as string) || undefined,
      };
    });
  } catch (err) {
    console.warn("BKG seed query error:", err);
    return [];
  }
}
