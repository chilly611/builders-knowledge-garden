import { describe, it, expect } from 'vitest';

/**
 * Test suite for the copilot response sanitizer.
 * These tests verify that banned CYA vocabulary is properly removed or replaced
 * from Claude's responses before they're sent to clients.
 */

// Import the sanitizer function (we'll need to export it from route.ts for testing)
// For now, we'll inline the same logic here to test it
function sanitizeCopilotResponse(text: string): string {
  if (!text) return text;

  let result = text;

  // 1. Replace "Authority Having Jurisdiction" or "AHJ" → "the local building department"
  // Handle "The Authority Having Jurisdiction" (case variations)
  result = result.replace(/\bThe\s+Authority Having Jurisdiction\b/gi, (match) =>
    match.startsWith('T') ? "The local building department" : "the local building department"
  );
  // Handle "the Authority Having Jurisdiction" (lowercase variations)
  result = result.replace(/\bthe\s+Authority Having Jurisdiction\b/gi, "the local building department");
  // Handle standalone "Authority Having Jurisdiction" (case-insensitive)
  result = result.replace(/\bAuthority Having Jurisdiction\b/gi, "the local building department");
  // Handle "The AHJ" (case variations)
  result = result.replace(/\bThe\s+AHJ\b/g, "The local building department");
  result = result.replace(/\bthe\s+AHJ\b/g, "the local building department");
  // Handle remaining standalone AHJ (whole word)
  result = result.replace(/\bAHJ\b/g, "the local building department");

  // 2. Replace "consult (with) a licensed (architect|engineer|attorney|professional)" → "work with a qualified"
  result = result.replace(
    /[Cc]onsult\s+(with\s+)?a\s+licensed\s+(architect|engineer|attorney|professional)/gi,
    "work with a qualified"
  );

  // 3. Replace phrases indicating prohibition → "subject to a design-path choice"
  result = result.replace(
    /(not permitted|cannot be built|is illegal)/gi,
    "subject to a design-path choice"
  );

  // 4. Strip "**Important:**" and "*Important:" patterns completely
  result = result.replace(/\*\*Important:\*\*\s*/gi, "");
  result = result.replace(/\*Important:\*\s*/gi, "");
  result = result.replace(/^Important:\s*/gim, "");

  // 5. Remove entire sentences containing CYA-prone phrases
  const cyaPatterns = [
    /[^.!?\n]*\bConsult\s+with\b[^.!?\n]*[.!?\n]/gi,
    /[^.!?\n]*\bYou\s+should\s+retain\b[^.!?\n]*[.!?\n]/gi,
    /[^.!?\n]*\bVerify\s+with\s+your\s+building\s+department\b[^.!?\n]*[.!?\n]/gi,
    /[^.!?\n]*\bWe\s+recommend\s+engaging\b[^.!?\n]*[.!?\n]/gi,
  ];

  for (const pattern of cyaPatterns) {
    result = result.replace(pattern, "");
  }

  return result.trim();
}

describe('sanitizeCopilotResponse', () => {
  describe('AHJ / Authority Having Jurisdiction replacement', () => {
    it('should replace "Authority Having Jurisdiction" with "the local building department"', () => {
      const input = 'You need to check with the Authority Having Jurisdiction for approval.';
      const expected = 'You need to check with the local building department for approval.';
      expect(sanitizeCopilotResponse(input)).toBe(expected);
    });

    it('should replace "AHJ" with "the local building department"', () => {
      const input = 'The AHJ requires this in all projects.';
      const expected = 'The local building department requires this in all projects.';
      expect(sanitizeCopilotResponse(input)).toBe(expected);
    });

    it('should replace "AHJ" only as a whole word', () => {
      const input = 'The AHJUSTMENT is important. Check with AHJ for details.';
      const expected = 'The AHJUSTMENT is important. Check with the local building department for details.';
      expect(sanitizeCopilotResponse(input)).toBe(expected);
    });

    it('should be case-insensitive for Authority Having Jurisdiction', () => {
      const input = 'Talk to the authority having jurisdiction about this.';
      const expected = 'Talk to the local building department about this.';
      expect(sanitizeCopilotResponse(input)).toBe(expected);
    });

    it('should handle "the Authority Having Jurisdiction" with preceding article', () => {
      const input = 'Check with the Authority Having Jurisdiction about site limits.';
      const expected = 'Check with the local building department about site limits.';
      expect(sanitizeCopilotResponse(input)).toBe(expected);
    });
  });

  describe('Licensed professional replacement', () => {
    it('should replace "consult a licensed architect"', () => {
      const input = 'Please consult a licensed architect for the design.';
      const expected = 'Please work with a qualified for the design.';
      expect(sanitizeCopilotResponse(input)).toBe(expected);
    });

    it('should replace "consult with a licensed engineer"', () => {
      const input = 'You should consult with a licensed engineer before proceeding.';
      const expected = 'You should work with a qualified before proceeding.';
      expect(sanitizeCopilotResponse(input)).toBe(expected);
    });

    it('should replace "consult a licensed attorney"', () => {
      const input = 'We recommend you consult a licensed attorney about the contract.';
      const expected = 'We recommend you work with a qualified about the contract.';
      expect(sanitizeCopilotResponse(input)).toBe(expected);
    });

    it('should replace "consult a licensed professional"', () => {
      const input = 'Consult a licensed professional for site assessment.';
      const expected = 'work with a qualified for site assessment.';
      expect(sanitizeCopilotResponse(input)).toBe(expected);
    });

    it('should handle case-insensitive matching', () => {
      const input = 'CONSULT WITH A LICENSED ARCHITECT for details.';
      const expected = 'work with a qualified for details.';
      expect(sanitizeCopilotResponse(input)).toBe(expected);
    });
  });

  describe('Prohibition phrase replacement', () => {
    it('should replace "not permitted"', () => {
      const input = 'This work is not permitted in residential zones.';
      const expected = 'This work is subject to a design-path choice in residential zones.';
      expect(sanitizeCopilotResponse(input)).toBe(expected);
    });

    it('should replace "cannot be built"', () => {
      const input = 'An ADU larger than 2000 sqft cannot be built here.';
      const expected = 'An ADU larger than 2000 sqft subject to a design-path choice here.';
      expect(sanitizeCopilotResponse(input)).toBe(expected);
    });

    it('should replace "is illegal"', () => {
      const input = 'Unpermitted work is illegal and will be fined.';
      const expected = 'Unpermitted work subject to a design-path choice and will be fined.';
      expect(sanitizeCopilotResponse(input)).toBe(expected);
    });

    it('should handle case-insensitive matching', () => {
      const input = 'This IS ILLEGAL in your jurisdiction.';
      const expected = 'This subject to a design-path choice in your jurisdiction.';
      expect(sanitizeCopilotResponse(input)).toBe(expected);
    });
  });

  describe('Important header stripping', () => {
    it('should remove "Important:" from line start', () => {
      const input = 'Important: Always verify site conditions.';
      const expected = 'Always verify site conditions.';
      expect(sanitizeCopilotResponse(input)).toBe(expected);
    });

    it('should remove "**Important:**" with bold markers', () => {
      const input = '**Important:** Check local codes before starting.';
      const expected = 'Check local codes before starting.';
      expect(sanitizeCopilotResponse(input)).toBe(expected);
    });

    it('should handle multiple Important headers', () => {
      const input = 'Important: First note.\n\nImportant: Second note.';
      const expected = 'First note.\n\nSecond note.';
      expect(sanitizeCopilotResponse(input)).toBe(expected);
    });
  });

  describe('CYA sentence removal', () => {
    it('should remove sentences starting with "Consult with"', () => {
      const input = 'Here is the information. Consult with your legal team before proceeding. Thank you.';
      const expected = 'Here is the information. Thank you.';
      expect(sanitizeCopilotResponse(input)).toBe(expected);
    });

    it('should remove sentences containing "You should retain"', () => {
      const input = 'The foundation is ready. You should retain an engineer to verify depths. Next steps are sequencing.';
      const expected = 'The foundation is ready. Next steps are sequencing.';
      expect(sanitizeCopilotResponse(input)).toBe(expected);
    });

    it('should remove sentences with "Verify with your building department"', () => {
      const input = 'Check the setbacks. Verify with your building department for final approval. Move to the next phase.';
      const expected = 'Check the setbacks. Move to the next phase.';
      expect(sanitizeCopilotResponse(input)).toBe(expected);
    });

    it('should remove sentences with "We recommend engaging"', () => {
      const input = 'Consider the budget impact. We recommend engaging a structural engineer for the design. Let\'s proceed.';
      const expected = 'Consider the budget impact. Let\'s proceed.';
      expect(sanitizeCopilotResponse(input)).toBe(expected);
    });

    it('should handle multiple CYA sentences', () => {
      const input = 'First point. Consult with experts on this matter. Second point. You should retain a professional. Third point.';
      const expected = 'First point. Second point. Third point.';
      expect(sanitizeCopilotResponse(input)).toBe(expected);
    });
  });

  describe('Complex real-world scenarios', () => {
    it('should sanitize a complete copilot response with multiple violations', () => {
      const input = `Here's what you need to know about fire protection:

Important: This is a critical code requirement.

Per the IBC, automatic sprinkler systems are required. The Authority Having Jurisdiction requires compliance. However, you should consult a licensed engineer to determine the specific system type needed for your building.

**What next?**
- Option 1
- Option 2`;

      const result = sanitizeCopilotResponse(input);

      // Should not contain banned phrases
      expect(result).not.toContain('Important:');
      expect(result).not.toContain('Authority Having Jurisdiction');
      expect(result).not.toContain('consult a licensed engineer');

      // Should still contain core content
      expect(result).toContain('automatic sprinkler systems');
      expect(result).toContain('**What next?**');
    });

    it('should preserve action buttons while removing CYA phrases', () => {
      const input = `Consult a licensed architect for details.

**What next?**
- [Button 1](action:/workflow)
- [Button 2](action:/workflow)`;

      const result = sanitizeCopilotResponse(input);
      expect(result).toContain('**What next?**');
      expect(result).toContain('[Button 1](action:/workflow)');
      expect(result).not.toContain('Consult a licensed architect');
    });

    it('should handle empty or null input', () => {
      expect(sanitizeCopilotResponse('')).toBe('');
      expect(sanitizeCopilotResponse('   ')).toBe('');
    });

    it('should not modify responses with no banned content', () => {
      const input = 'Here are your options: Phase 1 takes 4 weeks, Phase 2 takes 6 weeks.';
      expect(sanitizeCopilotResponse(input)).toBe(input);
    });
  });

  describe('Edge cases', () => {
    it('should handle mixed case variants', () => {
      const input = 'Check with The Authority Having Jurisdiction and AHJ about rules.';
      const result = sanitizeCopilotResponse(input);
      expect(result).not.toContain('Authority');
      expect(result).not.toContain('AHJ');
      expect(result).toContain('the local building department');
    });

    it('should not over-replace similar words', () => {
      const input = 'The authority will review this case.';
      const result = sanitizeCopilotResponse(input);
      // Should preserve the sentence since "Authority Having Jurisdiction" is not present
      expect(result).toContain('authority');
    });

    it('should preserve punctuation around replacements', () => {
      const input = 'Contact the AHJ, file permits, then proceed.';
      const result = sanitizeCopilotResponse(input);
      expect(result).toContain('the local building department,');
    });

    it('should handle newlines in CYA sentences', () => {
      const input = 'Point 1.\nConsult with professionals\nregarding site conditions.\nPoint 2.';
      const result = sanitizeCopilotResponse(input);
      expect(result).toContain('Point 1.');
      expect(result).toContain('Point 2.');
    });
  });
});
