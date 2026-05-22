/**
 * glossary-render.tsx — DIY-LANE term-wrap helper (2026-05-22).
 *
 * Wraps construction-glossary terms in <TermTooltip /> at render time so
 * dreamer-lane users see tooltips on jargon ("CSI", "RFI", "lien waiver")
 * without us mutating the underlying narrative copy.
 *
 * Design rules:
 *   1. Lane-aware. Returns the input string verbatim when `lane !== 'diy'`
 *      so pro lanes never see noisy underlines on their own vocabulary.
 *   2. Pure render-time. The source text is unchanged — if you re-flow the
 *      paragraph through a different surface (PDF export, email), no
 *      tooltips leak.
 *   3. Conservative matching. Only wraps the FIRST occurrence of each term
 *      per call so a paragraph that says "RFI" five times underlines once
 *      (less visual noise; future iteration can opt back into all-matches).
 *   4. Word-boundary regex so "ADUlt" doesn't match "ADU". Aliases are
 *      respected — the term's `aliases` array contributes additional
 *      surface forms.
 *
 * Risk callouts (logged in agent report):
 *   - False positives are still possible on multi-word common phrases.
 *     Today the seed glossary leans technical so collisions are rare, but
 *     watch this when adding terms like "stage" or "scope" (we add the
 *     non-obvious ones).
 *   - Performance: O(text-length × terms). 30 terms × typical 300-char
 *     AI summary = ~9k char comparisons per render. Fine for now. If we
 *     grow to 200+ terms wrap each surface in useMemo.
 */

import React, { ReactNode } from 'react';
import TermTooltip from '@/components/TermTooltip';
import glossaryData from '@/data/glossary.json';
import type { ProjectRole } from '@/lib/use-user-lane';

interface GlossaryTerm {
  term: string;
  aliases?: string[];
  plain: string;
  pro?: string;
  source?: string;
}

/**
 * Build a single regex that matches any glossary term (or alias), longest-
 * first so "Junior ADU" beats "ADU". Cached at module-load so we don't
 * re-compile for every paragraph rendered.
 */
function buildTermRegex(): { regex: RegExp; terms: string[] } {
  const surfaces: string[] = [];
  for (const entry of glossaryData as GlossaryTerm[]) {
    surfaces.push(entry.term);
    if (entry.aliases) surfaces.push(...entry.aliases);
  }
  // De-dupe + sort longest-first so multi-word terms beat their substrings.
  const unique = Array.from(new Set(surfaces)).sort(
    (a, b) => b.length - a.length
  );
  // Escape regex meta-chars in each surface form.
  const escaped = unique.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  // Word-boundary on both sides so "scope" doesn't match inside "telescope".
  // Some terms include non-word chars (§, /), so we use lookbehind/ahead for
  // a "not letter/number" boundary rather than \b.
  const regex = new RegExp(
    `(?<![A-Za-z0-9])(${escaped.join('|')})(?![A-Za-z0-9])`,
    'gi'
  );
  return { regex, terms: unique };
}

const { regex: TERM_REGEX } = buildTermRegex();

/**
 * Wrap recognized glossary terms in the input string with <TermTooltip />
 * spans. Returns a ReactNode you can drop directly into JSX. When the
 * user's `lane` is not 'diy' (the dreamer lane), the input is returned
 * verbatim so pro surfaces stay clean.
 *
 * Only the FIRST occurrence of each unique surface form is wrapped per
 * call — re-running the regex on the same text would re-wrap and produce
 * nested tooltips. We dedupe at the match level.
 *
 * @param text plain string to render with tooltips on jargon
 * @param lane the active user's effectiveLane (from useUserLane)
 */
export function wrapGlossaryTerms(
  text: string,
  lane: ProjectRole
): ReactNode {
  if (!text) return text;
  // Only the dreamer lane gets glossary tooltips. Pro lanes are noise-free.
  if (lane !== 'diy') return text;

  const seen = new Set<string>();
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  // We need a fresh stateful RegExp because the module-level regex has
  // the /g flag — sharing its lastIndex across calls would skip matches
  // when used concurrently. Clone via .source + .flags.
  const re = new RegExp(TERM_REGEX.source, TERM_REGEX.flags);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const surface = match[1];
    const key = surface.toLowerCase();
    // Push any plain text before this match.
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (seen.has(key)) {
      // Already wrapped this surface form once in this paragraph — push
      // the bare text and keep going. Avoids underlines on every repeat.
      parts.push(surface);
    } else {
      seen.add(key);
      parts.push(
        <TermTooltip key={`${key}-${match.index}`} term={surface}>
          {surface}
        </TermTooltip>
      );
    }
    lastIndex = match.index + surface.length;
    // Guard against zero-length matches looping forever.
    if (re.lastIndex === match.index) re.lastIndex++;
  }
  // Tail — anything after the last match.
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  // No matches → return original string so React doesn't see a stray
  // single-element fragment for no reason.
  if (parts.length === 0) return text;
  return <>{parts}</>;
}

/**
 * Exported for tests and for callers that want to know if any wrapping
 * would happen at all (so they can avoid an unnecessary fragment).
 */
export function textHasGlossaryTerms(text: string): boolean {
  if (!text) return false;
  return new RegExp(TERM_REGEX.source, TERM_REGEX.flags).test(text);
}
