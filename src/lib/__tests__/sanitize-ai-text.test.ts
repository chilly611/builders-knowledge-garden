import { describe, it, expect } from 'vitest';
import { sanitizeAiText } from '../sanitize-ai-text';

describe('sanitizeAiText', () => {
  describe('contract-prose mode (default)', () => {
    it('strips "Alright, here\'s how I\'d read it:" lead-in', () => {
      const input = "Alright, here's how I'd read it:\n\nReal scope content here";
      expect(sanitizeAiText(input)).toBe('Real scope content here');
    });

    it('strips "Sure thing! Here\'s the contract:" lead-in (stacked openers)', () => {
      const input = "Sure thing! Here's the contract:\n\n# Scope\n- Item 1";
      expect(sanitizeAiText(input)).toBe('# Scope\n- Item 1');
    });

    it('strips trailing "Here\'s where I\'d start: ..." chat-style offer', () => {
      const input = "Real content first.\n\nHere's where I'd start: scoping the site.";
      expect(sanitizeAiText(input)).toBe('Real content first.');
    });

    it('strips a fenced code block, keeping the inner content', () => {
      const input = '```\nfoo\n```';
      expect(sanitizeAiText(input)).toBe('foo');
    });

    it('strips markdown bold to plain text', () => {
      const input = '**bold** text';
      expect(sanitizeAiText(input, 'contract-prose')).toBe('bold text');
    });

    it('returns empty string for empty input', () => {
      expect(sanitizeAiText('')).toBe('');
    });

    it('returns empty string for whitespace-only input', () => {
      expect(sanitizeAiText('   \n\t  \n  ')).toBe('');
    });

    it('returns empty string for null', () => {
      expect(sanitizeAiText(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(sanitizeAiText(undefined)).toBe('');
    });

    it('preserves multi-paragraph content when "Here\'s" appears mid-sentence', () => {
      // "Here's" inside a paragraph (not at the start) must be preserved.
      const input =
        'The slab pour is the long pole. Here\'s the catch though — it\'s a real one — Marin\'s drying schedule lengthens the cure window by a week.';
      // The "Here's the catch though" phrase opens a sentence WITHIN a paragraph,
      // not a paragraph of its own, so it should NOT be stripped.
      const out = sanitizeAiText(input);
      expect(out).toContain("Here's the catch");
      expect(out).toContain('Marin');
    });

    it('preserves bullet list structure inside content', () => {
      const input =
        "Alright, here's the scope:\n\n- Demo existing kitchen\n- Reframe load-bearing wall\n- New cabinets";
      const out = sanitizeAiText(input);
      expect(out).toBe(
        '- Demo existing kitchen\n- Reframe load-bearing wall\n- New cabinets'
      );
    });

    it('collapses three+ blank lines to a single blank line', () => {
      const input = 'Para 1.\n\n\n\n\nPara 2.';
      expect(sanitizeAiText(input)).toBe('Para 1.\n\nPara 2.');
    });

    it('handles CRLF line endings', () => {
      const input = "Alright, here's the read:\r\n\r\nReal content.";
      expect(sanitizeAiText(input)).toBe('Real content.');
    });

    it('is idempotent (running twice equals running once)', () => {
      const input =
        "Alright, here's how I'd read it:\n\n**Scope:** demo + reframe.\n\nHere's where I'd start: tomorrow.";
      const once = sanitizeAiText(input);
      const twice = sanitizeAiText(once);
      expect(twice).toBe(once);
    });

    it('passes through clean content unchanged', () => {
      const input =
        '1,800 sf custom build in Marin. $750k–$1.06M delivered. Title 24 compliance and seismic detailing drive cost.';
      expect(sanitizeAiText(input)).toBe(input);
    });

    it('handles the canonical Marin AI summary end-to-end', () => {
      const input =
        "Alright, here's how I'd read it: 1,800 sf custom build in Marin lands in the $750k–$1.06M range delivered. " +
        'Marin County permitting is strict and slow.\n\n' +
        'Jurisdiction: Marin County, CA\n\n' +
        "Here's where I'd start:";
      const out = sanitizeAiText(input);
      expect(out).toMatch(/^1,800 sf custom build/);
      expect(out).toContain('Jurisdiction: Marin County, CA');
      expect(out).not.toMatch(/Alright/);
      expect(out).not.toMatch(/Here's where/);
    });

    it('strips a fenced code block with language tag', () => {
      const input = '```markdown\n# Scope\n- Item\n```';
      expect(sanitizeAiText(input)).toBe('# Scope\n- Item');
    });

    it('strips inline backticks', () => {
      expect(sanitizeAiText('Use the `--release` flag.')).toBe(
        'Use the --release flag.'
      );
    });

    it('strips italic markers', () => {
      expect(sanitizeAiText('this is *important* work')).toBe(
        'this is important work'
      );
    });
  });

  describe('contract-bullets mode', () => {
    it('normalizes asterisk bullets to dashes', () => {
      const input = "Here's the list:\n\n* Item A\n* Item B";
      expect(sanitizeAiText(input, 'contract-bullets')).toBe('- Item A\n- Item B');
    });

    it('preserves dash bullets', () => {
      const input = '- Item A\n- Item B';
      expect(sanitizeAiText(input, 'contract-bullets')).toBe('- Item A\n- Item B');
    });
  });

  describe('free-text mode', () => {
    it('strips conversational lead-ins', () => {
      const input = "Alright, here's the deal:\n\nContent.";
      expect(sanitizeAiText(input, 'free-text')).toBe('Content.');
    });

    it('preserves code fences in free-text mode is NOT supported — fences always stripped', () => {
      // Spec note: code fences are stripped in every mode because they are
      // never valid in any of our destination fields. If we ever need a mode
      // that preserves them, add it explicitly.
      const input = '```\nfoo\n```';
      expect(sanitizeAiText(input, 'free-text')).toBe('foo');
    });

    it('preserves markdown bold in free-text mode', () => {
      const input = 'this is **bold** text';
      expect(sanitizeAiText(input, 'free-text')).toBe('this is **bold** text');
    });
  });
});
