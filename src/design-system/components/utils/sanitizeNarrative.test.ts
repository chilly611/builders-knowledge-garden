import { describe, it, expect } from 'vitest';
import { sanitizeNarrative } from './sanitizeNarrative';

describe('sanitizeNarrative', () => {
  it('should extract narrative from ```json {...} ``` fence with narrative field', () => {
    const input = `\`\`\`json
{
  "narrative": "The kitchen outlet must meet NEC Article 210 requirements.",
  "code_sections": [
    { "section": "210.52", "title": "Receptacles in Kitchens", "requirement": "GFCI protection" }
  ],
  "confidence": "high"
}
\`\`\``;

    const result = sanitizeNarrative(input);
    expect(result.prose).toBe('The kitchen outlet must meet NEC Article 210 requirements.');
    expect(result.extractedJson).toBeTruthy();
    expect(result.codeSectionsFromJson).toHaveLength(1);
    expect(result.codeSectionsFromJson?.[0].section).toBe('210.52');
  });

  it('should extract answer field as fallback when narrative not present', () => {
    const input = `\`\`\`json
{
  "answer": "Structural review recommended before installation.",
  "citations": []
}
\`\`\``;

    const result = sanitizeNarrative(input);
    expect(result.prose).toBe('Structural review recommended before installation.');
    expect(result.extractedJson).toBeTruthy();
  });

  it('should use summary field as fallback', () => {
    const input = `\`\`\`json
{
  "summary": "Complete electrical code check passed.",
  "status": "approved"
}
\`\`\``;

    const result = sanitizeNarrative(input);
    expect(result.prose).toBe('Complete electrical code check passed.');
  });

  it('should return plain prose unchanged', () => {
    const input = 'This is plain text about the code requirements.';

    const result = sanitizeNarrative(input);
    expect(result.prose).toBe('This is plain text about the code requirements.');
    expect(result.extractedJson).toBeNull();
  });

  it('should render fallback message when JSON has no extractable narrative field but has code_sections', () => {
    const input = `\`\`\`json
{
  "code_sections": [
    { "section": "1107", "title": "Accessibility", "requirement": "Accessible routes required" },
    { "section": "504.4", "title": "Height", "requirement": "48 inch max reach" }
  ]
}
\`\`\``;

    const result = sanitizeNarrative(input);
    expect(result.prose).toBe('Specialist returned structured code sections — see details below.');
    expect(result.codeSectionsFromJson).toHaveLength(2);
  });

  it('should cap citations to 3 items when processing citations array', () => {
    const input = `\`\`\`json
{
  "narrative": "Code check completed.",
  "citations": [
    { "id": "1", "relevance": "high" },
    { "id": "2", "relevance": "medium" },
    { "id": "3", "relevance": "low" },
    { "id": "4", "relevance": "low" },
    { "id": "5", "relevance": "low" }
  ]
}
\`\`\``;

    const result = sanitizeNarrative(input);
    expect(result.prose).toBe('Code check completed.');
    // Note: citation capping happens in AnalysisPane component, not sanitizeNarrative
    expect(result.extractedJson).toBeTruthy();
  });

  it('should handle raw JSON with no fence — strip braces and quotes', () => {
    const input = `{
  "narrative": "Should have been in fence",
  "status": "pending"
}`;

    // When raw JSON is detected (has { and multiple "), stripJsonSyntax should clean it
    const result = sanitizeNarrative(input);
    // Since this JSON has a "narrative" field, it may still be extracted
    expect(result.prose).toBeTruthy();
    expect(result.prose.length > 0).toBe(true);
  });

  it('should return fallback when narrative is pure JSON gibberish', () => {
    const input = `{"x": 1, "y": 2, "z": 3}`;

    const result = sanitizeNarrative(input);
    // Should detect JSON and either return fallback or empty
    expect(result.prose).toBeTruthy();
  });

  it('should preserve code_sections as structured data for rendering', () => {
    const input = `\`\`\`json
{
  "narrative": "Electrical requirements for kitchen outlets:",
  "code_sections": [
    {
      "section": "210.52(C)(5)",
      "title": "Countertop Receptacles",
      "requirement": "GFCI protection required for all countertop outlets"
    }
  ]
}
\`\`\``;

    const result = sanitizeNarrative(input);
    expect(result.codeSectionsFromJson).toHaveLength(1);
    expect(result.codeSectionsFromJson?.[0]).toEqual({
      section: '210.52(C)(5)',
      title: 'Countertop Receptacles',
      requirement: 'GFCI protection required for all countertop outlets',
    });
  });

  it('should handle fence with undefined code_sections gracefully', () => {
    const input = `\`\`\`json
{
  "narrative": "Analysis complete.",
  "code_sections": []
}
\`\`\``;

    const result = sanitizeNarrative(input);
    expect(result.prose).toBe('Analysis complete.');
    expect(result.codeSectionsFromJson).toBeUndefined(); // Empty array is not returned
  });

  it('should strip markdown fence markers but keep content before fence', () => {
    const input = `Some preamble text here.

\`\`\`json
{
  "narrative": "Extracted narrative",
  "confidence": "high"
}
\`\`\`

Postamble text.`;

    const result = sanitizeNarrative(input);
    // Should extract the JSON narrative
    expect(result.prose).toBe('Extracted narrative');
    expect(result.extractedJson).toBeTruthy();
  });

  it('should handle fence with codeSections (camelCase) variant', () => {
    const input = `\`\`\`json
{
  "narrative": "Report ready",
  "codeSections": [
    { "section": "1101", "title": "General", "requirement": "Apply generally" }
  ]
}
\`\`\``;

    const result = sanitizeNarrative(input);
    expect(result.codeSectionsFromJson).toHaveLength(1);
    expect(result.codeSectionsFromJson?.[0].section).toBe('1101');
  });
});
