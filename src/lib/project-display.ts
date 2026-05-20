/**
 * Shared display helpers for project data.
 *
 * applyJurisdictionOverride: when a user explicitly saves a jurisdiction via
 * the Estimating workflow, replace the old City/State/ZIP pattern in any
 * free-form text (raw_input, analysis seeds) so all surfaces stay consistent
 * without requiring a raw_input rewrite in the DB.
 */

export function applyJurisdictionOverride(text: string, jurisdiction: string): string {
  if (!text || !jurisdiction) return text;

  // Require each city word to be Title Case (e.g. "San Francisco") so we
  // don't greedily consume preceding words like "ADU in" into the match.
  const titleCasePattern =
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}),\s*([A-Za-z]{2})\b(\s+\d{5}(?:-\d{4})?)?/;
  if (titleCasePattern.test(text)) {
    return text.replace(titleCasePattern, jurisdiction);
  }

  // Fallback for all-lowercase inputs: anchor to the preposition "in".
  const inPattern =
    /(\bin\s+)([a-z]+(?:\s+[a-z]+){0,3}),\s*([a-z]{2})\b(\s+\d{5}(?:-\d{4})?)?/i;
  if (inPattern.test(text)) {
    return text.replace(inPattern, `$1${jurisdiction}`);
  }

  return text;
}
