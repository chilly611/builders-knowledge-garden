/**
 * Honesty publish gate — the single chokepoint that decides what a stored
 * compliance fact is ALLOWED to assert to a user.
 *
 * LOOP 2 / Slice A (2026-06-12). Before this, every surface (the compliance
 * API, the specialists, the SourceCountBadge in ContextEngine) re-derived
 * "is this trustworthy enough to state plainly?" from the raw verification
 * columns on its own. Spreading that decision across N call sites is how
 * "unreviewed text served as if verified" happens by omission. This module
 * centralizes the decision into ONE pure, testable verdict so the per-fact
 * contract is enforced identically everywhere a fact is surfaced.
 *
 * It introduces NO new thresholds — it mirrors rules that already exist:
 *   - `toVerification()` in compliance-lookup.ts  (manual > auto-not-flagged > none)
 *   - `isManuallyAttested()` / `isAutoVerified()` in code-sources/index.ts
 * It is purely additive: it reads signals already present on the row; it
 * changes no schema and invents no data. (Closing the "served while
 * unreviewed" gap at the DATA layer — the HITL review queue — is Slice B;
 * this gate makes the ASSERTION LEVEL honest in the meantime.)
 *
 * THREE TIERS — what a fact may assert:
 *   - "verified" — human-attested (`manually_verified`) and current. May be
 *                  presented as authoritative. (Green badge.)
 *   - "labeled"  — served WITH a mandatory caveat: AI-cross-checked (auto),
 *                  citation-only (unverified but with a real citation +
 *                  provenance), or superseded/historical. (Yellow badge.)
 *   - "withheld" — NOT to be presented as a compliance assertion (unverified
 *                  with nothing to stand on). Callers fall back to the honest
 *                  "not yet covered" path rather than dressing it as an answer.
 */

import type { VerificationLevel, CodeCitation } from "../compliance-lookup";

export type PublishTier = "verified" | "labeled" | "withheld";

export type GateReason =
  | "manually_attested"
  | "auto_cross_checked"
  | "citation_only"
  | "superseded"
  | "insufficient_provenance";

export interface FactGateInput {
  /** The row's attestation level (see `toVerification`). */
  verification: VerificationLevel;
  /** A real, displayable citation was derived from stored fields (not invented). */
  hasCitation: boolean;
  /** ≥1 source URL or source doc — provenance the reader can actually follow. */
  hasProvenance: boolean;
  /**
   * Superseded by a newer edition/section (e.g. the 2025 CRC R312→R321
   * guard-rail renumbering). Optional; defaults false. When true a fact can
   * be at most "labeled" — never asserted as current code, even if attested.
   */
  superseded?: boolean;
}

export interface FactVerdict {
  tier: PublishTier;
  verification: VerificationLevel;
  /**
   * True ONLY for tier "verified". The single boolean a surface should check
   * before rendering the authoritative (green) badge or stating the fact as
   * confirmed code. Everything else must carry the caveat or be withheld.
   */
  mayAssertVerified: boolean;
  /** Mandatory user-facing caveat for "labeled" facts; null for verified/withheld. */
  label: string | null;
  /** Machine-readable reason for the tier — telemetry, debugging, tests. */
  reason: GateReason;
}

const SUPERSEDED_LABEL =
  "Superseded — a newer edition replaces this. Confirm the current section before relying on it.";
const AUTO_LABEL =
  "AI-cross-checked, not yet human-reviewed. Confirm against the cited source.";
const CITATION_ONLY_LABEL =
  "Citation only — text not yet verified against the source. Confirm before relying on it.";

/**
 * The gate. Pure and total — every input maps to exactly one verdict.
 */
export function gateFact(input: FactGateInput): FactVerdict {
  const { verification, hasCitation, hasProvenance, superseded = false } = input;

  // Superseded text can never assert as current code — even human-attested
  // text, because attestation proves the text matches the source, not that
  // the edition is current. Demote to "labeled" with the supersession caveat.
  if (superseded) {
    return {
      tier: "labeled",
      verification,
      mayAssertVerified: false,
      label: SUPERSEDED_LABEL,
      reason: "superseded",
    };
  }

  if (verification === "manually_verified") {
    return {
      tier: "verified",
      verification,
      mayAssertVerified: true,
      label: null,
      reason: "manually_attested",
    };
  }

  if (verification === "auto_verified") {
    return {
      tier: "labeled",
      verification,
      mayAssertVerified: false,
      label: AUTO_LABEL,
      reason: "auto_cross_checked",
    };
  }

  // unverified — serve only if there's a real citation + provenance to stand
  // on; otherwise withhold rather than dress nothing up as an answer.
  if (hasCitation && hasProvenance) {
    return {
      tier: "labeled",
      verification,
      mayAssertVerified: false,
      label: CITATION_ONLY_LABEL,
      reason: "citation_only",
    };
  }

  return {
    tier: "withheld",
    verification,
    mayAssertVerified: false,
    label: null,
    reason: "insufficient_provenance",
  };
}

/**
 * Adapter: gate a `CodeCitation` from the compliance lookup. Provenance =
 * any source URL or doc; citation = the non-empty derived label. `superseded`
 * is not yet carried on `CodeCitation` (edition-currency detection is Slice C),
 * so it defaults false — the gate is ready for it the day it arrives.
 */
export function gateCitation(
  c: Pick<CodeCitation, "verification" | "citation" | "sourceUrls" | "sourceDocs"> & {
    superseded?: boolean;
  }
): FactVerdict {
  return gateFact({
    verification: c.verification,
    hasCitation: typeof c.citation === "string" && c.citation.trim().length > 0,
    hasProvenance: (c.sourceUrls?.length ?? 0) > 0 || (c.sourceDocs?.length ?? 0) > 0,
    superseded: c.superseded ?? false,
  });
}
