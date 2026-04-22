/**
 * BKG 3-Source Code Verification Types
 * Secondary source adapter layer for cross-checking code queries
 * against ≥2 sources before returning confidence: high
 */

export type CodeSourceName = "bkg-seed" | "icc-digital-codes" | "nfpa" | "local-amendment";
export type ConfidenceTier = "primary" | "summary" | "historical";

/**
 * Normalized query contract for all code sources
 */
export interface CodeQuery {
  discipline: "electrical" | "structural" | "plumbing" | "mechanical" | "fire";
  edition?: string; // e.g. "NEC 2023" — optional; if missing, try current + one historical
  section?: string; // e.g. "210.52(C)(5)" — optional
  keywords: string[]; // free-text terms; always populated
  jurisdiction?: string; // e.g. "ca-sf" — drives amendment lookup in Agent 4's layer
}

/**
 * Standardized result from any code source
 * Enables orchestrator to merge results from ICC, NFPA, and BKG seed
 */
export interface CodeSourceResult {
  source: CodeSourceName;
  edition: string;
  section: string;
  jurisdiction?: string;
  title: string;
  text: string; // applicable code text or summary
  citation: string; // canonical citation for display
  confidenceTier: ConfidenceTier;
  retrievedAt: string; // ISO timestamp
  url?: string;
  historical?: boolean; // true if superseded
  supersededBy?: string; // id / section of current rule if historical
}
