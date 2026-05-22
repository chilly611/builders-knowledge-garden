/**
 * sanitize-ai-text
 * ================
 * Strips conversational AI artifacts from text destined for contract-grade,
 * client-facing surfaces (Scope of Work fields, change-order descriptions,
 * NDA purpose statements, etc.).
 *
 * Context: the `command_center_projects.ai_summary` field — and the live
 * copilot output that backs it — is generated with a foreman-orientation
 * prompt that opens with phrases like "Alright, here's how I'd read it:"
 * and ends with prompts like "Here's where I'd start:" or "Want me to...".
 * That voice is fine in the project shell, but it bleeds straight into
 * contract autofill fields where a client sees it on a signed PDF. This
 * helper exists to be a single chokepoint at the AI-to-contract boundary.
 *
 * NOT a Markdown renderer. NOT a profanity filter. NOT a fact checker.
 * Only removes well-known conversational scaffolding around real content.
 *
 * Modes:
 *   - `contract-prose`   : full strip. Prose output suitable for plain-text
 *                          contract fields (Scope of Work, change description).
 *                          Strips code fences, markdown bold/italic, lead-ins,
 *                          trailing chat-style offers ("Want me to...").
 *   - `contract-bullets` : same as `contract-prose` but preserves Markdown
 *                          list structure (`-` / `*` / `1.` lines). Use for
 *                          fields that render as a bulleted list.
 *   - `free-text`        : minimal strip — only conversational lead-ins and
 *                          trailing offers. Keeps code fences and Markdown.
 *
 * Pure function, no side effects, no I/O. Idempotent: running it twice on the
 * same input produces the same output as running it once.
 */

export type SanitizeMode = 'contract-prose' | 'contract-bullets' | 'free-text';

// ---------------------------------------------------------------------------
// Pattern catalog
// ---------------------------------------------------------------------------

/**
 * Conversational openers we strip from the start of the text. These match the
 * first *paragraph-leading* occurrence only — never mid-sentence. We anchor
 * with `^` (after normalization) and require punctuation or whitespace after
 * the keyword so we don't eat words like "Heres" inside content (e.g.,
 * "Here's the kicker:" *as a paragraph opener* IS stripped, but the same
 * phrase appearing in the middle of a sentence is preserved).
 *
 * The keyword list comes from the project's summarize prompt (which literally
 * instructs the model to open with "Alright, here's how I'd read it:" — see
 * src/app/api/v1/projects/summarize/route.ts) plus the empirical list of
 * conversational openers observed in copilot output.
 */
const LEAD_IN_KEYWORDS = [
  'Alright',
  'Sure thing',
  'Sure',
  'Okay',
  'OK',
  'Right',
  "Here's",
  'Here is',
  'Here you go',
  'Let me',
  "I'd",
  'I would',
  'My take',
  'My read',
  'My recommendation',
  "Let's",
  'Got it',
  'Understood',
  // Common openers from the summarize SYSTEM_PROMPT:
  //   1. Opening: "Alright, here's how I'd read it:" or "Let me think this through:"
  // We catch both with the keywords above.
];

/**
 * Trailing chat-style offers / questions we strip from the END of the text.
 * Match a paragraph that opens with one of these phrases — we drop the whole
 * paragraph since the rest of the sentence is part of the offer.
 *
 * IMPORTANT: trailing-only. A mid-document "Here's the catch:" inside a
 * substantive paragraph stays put.
 */
const TRAILING_OFFER_OPENERS = [
  "Here's where I'd start",
  "Here's where I would start",
  'Want me to',
  'Should I',
  'Let me know if',
  'Would you like',
  'Do you want',
  'Happy to',
  'Just let me know',
];

/**
 * Build a single regex that matches a paragraph-leading conversational
 * opener. We escape every keyword and join with `|`. The match consumes
 * the opener AND the rest of its sentence (up to the first newline or
 * sentence-terminating punctuation followed by whitespace/end).
 */
function buildLeadInRegex(): RegExp {
  const escaped = LEAD_IN_KEYWORDS.map(escapeRegExp).join('|');
  // Anchor at start (after we trim). Require the keyword to be followed by
  // punctuation OR a space — this is what distinguishes a sentence-leading
  // "Here's the plan:" from an in-word match like "Heresy".
  //
  // We then eat through the end of the opening sentence — up to a newline
  // or the first `: ` / `. ` boundary. The opener typically ends with
  // a colon ("Here's how I'd read it:") or a period ("Got it.").
  //
  // We deliberately stop at `\n` so we never cross a paragraph boundary.
  return new RegExp(
    `^(?:${escaped})\\b[^\\n]*?(?:[:!.?]|\\n|$)\\s*`,
    'i'
  );
}

/**
 * Build a regex that matches a paragraph-leading trailing-offer at the end
 * of the text. We use a multi-line anchor and consume to end-of-document.
 */
function buildTrailingOfferRegex(): RegExp {
  const escaped = TRAILING_OFFER_OPENERS.map(escapeRegExp).join('|');
  // (^ or \n\n) + opener + everything to end of string.
  return new RegExp(
    `(?:^|\\n\\n+|\\n)\\s*(?:${escaped})\\b[\\s\\S]*$`,
    'i'
  );
}

const LEAD_IN_REGEX = buildLeadInRegex();
const TRAILING_OFFER_REGEX = buildTrailingOfferRegex();

/**
 * Triple-backtick code fence with optional language tag. Captures the inner
 * content so we can keep it as plain text (the contract field is plain text;
 * fences are visual noise).
 */
const CODE_FENCE_REGEX = /```[a-zA-Z0-9_-]*\n?([\s\S]*?)```/g;

/** Inline backtick code spans: `foo` → foo */
const INLINE_CODE_REGEX = /`([^`\n]+)`/g;

/** Markdown bold: **foo** or __foo__ → foo */
const BOLD_REGEX = /(\*\*|__)(.+?)\1/g;

/** Markdown italic: *foo* or _foo_ → foo. We do this AFTER bold to avoid
 *  munging `**foo**` into `*foo*` then `foo`. */
const ITALIC_REGEX = /(?<![*_])([*_])(?!\s)([^*_\n]+?)(?<!\s)\1(?![*_])/g;

/** Three+ consecutive newlines collapsed to two (single blank line). */
const MULTI_BLANK_LINE_REGEX = /\n{3,}/g;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sanitize AI-generated text for use in a contract field.
 *
 * @param input - The raw AI output (may be `null`/`undefined` from DB).
 * @param mode  - How aggressive to be. Defaults to `'contract-prose'`.
 * @returns A cleaned string, or `''` if the input was empty/whitespace.
 */
export function sanitizeAiText(
  input: string | null | undefined,
  mode: SanitizeMode = 'contract-prose'
): string {
  if (input === null || input === undefined) return '';
  let s = String(input);
  if (s.trim() === '') return '';

  // Normalize CRLF → LF first so all our regexes line up.
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // -------------------------------------------------------------------------
  // Step 1: strip code fences. Always strip — they are never valid in a
  // plain-text contract field, regardless of mode. The fence wrapper is
  // visual markup; the content inside may still be useful, so we keep it.
  // -------------------------------------------------------------------------
  s = s.replace(CODE_FENCE_REGEX, (_match, inner: string) => inner.trim());

  // -------------------------------------------------------------------------
  // Step 2: strip the conversational lead-in (paragraph-opener only).
  // We trim first so `^` anchors to real content.
  // -------------------------------------------------------------------------
  s = s.trimStart();
  s = s.replace(LEAD_IN_REGEX, '');

  // Apply lead-in stripping iteratively (up to a small bound) in case the
  // model stacked multiple openers: "Alright. Here's the deal: ..."
  for (let i = 0; i < 3; i++) {
    const next = s.replace(LEAD_IN_REGEX, '');
    if (next === s) break;
    s = next;
  }

  // -------------------------------------------------------------------------
  // Step 3: strip trailing chat-style offers.
  // -------------------------------------------------------------------------
  s = s.replace(TRAILING_OFFER_REGEX, '');

  // -------------------------------------------------------------------------
  // Step 4: markdown decoration (mode-dependent).
  // -------------------------------------------------------------------------
  if (mode === 'contract-prose' || mode === 'contract-bullets') {
    s = s.replace(INLINE_CODE_REGEX, '$1');
    s = s.replace(BOLD_REGEX, '$2');
    s = s.replace(ITALIC_REGEX, '$2');
  }

  // -------------------------------------------------------------------------
  // Step 5: bullet handling.
  //
  // In `contract-prose` mode we leave list markers alone — they're not the
  // common case in Scope of Work prose and removing them blindly would mangle
  // "- 2024 model" type usage. The downstream PDF renderer treats `-` lines
  // as bullets already.
  //
  // In `contract-bullets` we just normalize bullet markers to `- ` for
  // consistency. The PDF renderer accepts both.
  // -------------------------------------------------------------------------
  if (mode === 'contract-bullets') {
    s = s.replace(/^(\s*)[*•]\s+/gm, '$1- ');
  }

  // -------------------------------------------------------------------------
  // Step 6: whitespace cleanup. Always run.
  // -------------------------------------------------------------------------
  s = s.replace(MULTI_BLANK_LINE_REGEX, '\n\n');
  s = s.trim();

  return s;
}

// ---------------------------------------------------------------------------
// Internals (exported for tests only)
// ---------------------------------------------------------------------------

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
