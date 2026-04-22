/**
 * sanitizeNarrative — Defense against JSON-fenced narrative corruption
 * ====================================================================
 *
 * When the specialist prompt returns JSON fence blocks where narrative should be,
 * this helper extracts the actual prose and leaves the structured data available
 * for machine consumption (Goal 8).
 *
 * Defensive patterns:
 * 1. Detect markdown ```json {...} ``` and extract narrative / answer / summary field
 * 2. If still raw JSON after extraction, strip braces and quote patterns
 * 3. Never render raw JSON, never render markdown fences, never render code blocks
 * 4. Return fallback message + code_sections list if no extractable prose remains
 */

export interface SanitizeResult {
  prose: string;
  extractedJson: unknown | null;
  codeSectionsFromJson?: Array<{
    section: string;
    title: string;
    requirement: string;
    status?: string;
  }>;
}

/**
 * Extract JSON from markdown code fence
 */
function extractJsonFromFence(text: string): { json: unknown; cleaned: string } | null {
  // Match ```json {...} ``` or ``` {...} ```
  const jsonFenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (!jsonFenceMatch) return null;

  const jsonStr = jsonFenceMatch[1].trim();
  try {
    const parsed = JSON.parse(jsonStr);
    const cleaned = text.replace(/```(?:json)?\s*\n?[\s\S]*?\n?```/, '').trim();
    return { json: parsed, cleaned };
  } catch {
    return null;
  }
}

/**
 * Try to extract narrative-like field from parsed JSON object
 */
function extractNarrativeFromJson(obj: unknown): string | null {
  if (typeof obj !== 'object' || obj === null) return null;

  const record = obj as Record<string, unknown>;

  // Try common narrative field names in order
  for (const key of ['narrative', 'answer', 'summary', 'explanation', 'result', 'response']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 10) {
      return value.trim();
    }
  }

  return null;
}

/**
 * Extract code_sections array if present
 */
function extractCodeSectionsFromJson(
  obj: unknown
): Array<{ section: string; title: string; requirement: string; status?: string }> | null {
  if (typeof obj !== 'object' || obj === null) return null;

  const record = obj as Record<string, unknown>;
  const sections = record.code_sections || record.codeSections;

  if (Array.isArray(sections) && sections.length > 0) {
    return sections.map((sec: any) => ({
      section: sec.section || sec.code || 'N/A',
      title: sec.title || sec.name || '',
      requirement: sec.requirement || sec.description || '',
      status: sec.status,
    }));
  }

  return null;
}

/**
 * Strip all top-level JSON-like syntax (braces, quotes) but preserve plain text
 */
function stripJsonSyntax(text: string): string {
  // Remove top-level { and } at start/end
  let cleaned = text.trim();
  if (cleaned.startsWith('{')) cleaned = cleaned.substring(1);
  if (cleaned.endsWith('}')) cleaned = cleaned.substring(0, cleaned.length - 1);

  // Remove obvious "key": "value" patterns but keep the values
  // This is a last-resort heuristic; won't be perfect
  cleaned = cleaned
    .split('\n')
    .map((line) => {
      // Match "key": "value" and extract just the value
      const match = line.match(/^\s*"[^"]*":\s*"([^"]*)"\s*,?\s*$/);
      if (match) {
        return match[1];
      }
      return line;
    })
    .join('\n')
    .trim();

  // If still mostly JSON-like (lots of { or " chars), return empty to trigger fallback
  const braceCount = (cleaned.match(/{/g) || []).length + (cleaned.match(/}/g) || []).length;
  if (braceCount > cleaned.length * 0.1) {
    return '';
  }

  return cleaned;
}

/**
 * Main sanitization function
 */
export function sanitizeNarrative(raw: string): SanitizeResult {
  const trimmed = raw.trim();

  // Step 1: Try to extract JSON from fence
  const fenceResult = extractJsonFromFence(trimmed);

  if (fenceResult) {
    const { json, cleaned } = fenceResult;

    // Try to extract narrative field from the JSON
    const narrativeFromJson = extractNarrativeFromJson(json);
    const codeSections = extractCodeSectionsFromJson(json);

    if (narrativeFromJson && narrativeFromJson.trim().length > 10) {
      // Success: we found a good narrative field in the JSON
      return {
        prose: narrativeFromJson.trim(),
        extractedJson: json,
        codeSectionsFromJson: codeSections || undefined,
      };
    }

    // No narrative field found, but we have code_sections — use fallback message
    if (codeSections && codeSections.length > 0) {
      return {
        prose: 'Specialist returned structured code sections — see details below.',
        extractedJson: json,
        codeSectionsFromJson: codeSections,
      };
    }

    // Try to use whatever was before the fence
    if (cleaned.trim().length > 10) {
      return {
        prose: cleaned.trim(),
        extractedJson: json,
        codeSectionsFromJson: codeSections || undefined,
      };
    }
  }

  // Step 2: Check if raw string still contains JSON-like patterns
  if (trimmed.includes('{') || (trimmed.match(/"/g) || []).length > 5) {
    // Try to strip JSON syntax
    const stripped = stripJsonSyntax(trimmed);
    if (stripped.trim().length > 10) {
      return {
        prose: stripped.trim(),
        extractedJson: null,
      };
    }

    // Last resort: return fallback
    return {
      prose: 'Specialist returned structured data — see details below.',
      extractedJson: null,
    };
  }

  // Step 3: Raw string looks like plain prose — return as-is
  return {
    prose: trimmed,
    extractedJson: null,
  };
}
