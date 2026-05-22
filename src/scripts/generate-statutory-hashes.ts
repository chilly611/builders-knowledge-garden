/**
 * Generate the golden-file SHA-256 hash JSON for every statutory callout
 * (`:::7159-callout`) in the CA HIC contract templates.
 *
 * This script is run **on purpose** when (and only when) a maintainer has
 * intentionally updated statutory text — for example after a California
 * legislative amendment to Bus. & Prof. Code § 7159 or Civ. Code §§ 8132 /
 * 8134 / 8136 / 8138. Re-running the script regenerates
 * `src/lib/contract-templates/__tests__/statutory-text-hashes.json`, which
 * is the locked golden file that the test suite compares against.
 *
 * Workflow for an intentional update:
 *   1. Edit the affected template (e.g. `client-agreement-ca-hic.md`).
 *   2. Run `npm run statutory:hash`.
 *   3. Inspect the JSON diff. If it matches the intended legislative
 *      change, commit the template + JSON together in the same PR.
 *   4. Reference the leginfo.legislature.ca.gov URL + amendment date in
 *      the PR description so future auditors can re-verify.
 *
 * Workflow for an *unintentional* drift (e.g. a stray "smart quote" replace):
 *   The golden test fails. Either revert the markdown change or, if the
 *   change is wanted, follow the intentional-update workflow above.
 *
 * Usage:
 *   npm run statutory:hash
 *   # or:
 *   npx tsx src/scripts/generate-statutory-hashes.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEMPLATES_DIR = join(__dirname, '..', 'lib', 'contract-templates');
const OUTPUT_PATH = join(
  TEMPLATES_DIR,
  '__tests__',
  'statutory-text-hashes.json',
);

/**
 * Manifest of templates we lock. The `source` strings are the canonical
 * statutory citations the callout body is asserted to match. The `slugs`
 * array constrains which callout titles (slug-form) we expect in each
 * file — generation will throw if a file is missing one of these slugs
 * or has unexpected extras, which guards against accidental rename or
 * deletion of a statutory block.
 */
type CalloutDef = { slug: string; source: string };
type FileManifest = { file: string; callouts: CalloutDef[] };

const MANIFEST: FileManifest[] = [
  {
    file: 'client-agreement-ca-hic.md',
    callouts: [
      {
        slug: 'downpayment-cap-bus-prof-7159-d-8',
        source: 'Cal. Bus. & Prof. Code § 7159(d)(8)',
      },
      {
        slug: 'schedule-of-progress-payments-bus-prof-7159-d-9',
        source: 'Cal. Bus. & Prof. Code § 7159(d)(9)',
      },
      {
        slug: 'mechanics-lien-warning',
        source: 'Cal. Bus. & Prof. Code § 7159(e)(4)',
      },
      {
        slug: 'three-day-right-to-cancel',
        source: 'Cal. Bus. & Prof. Code § 7159(e)(6)',
      },
      {
        slug: 'notice-of-cancellation',
        source: 'Cal. Bus. & Prof. Code § 7159(d)(4)',
      },
    ],
  },
  {
    file: 'lien-waiver-progress-conditional.md',
    callouts: [{ slug: 'notice', source: 'Cal. Civ. Code § 8132' }],
  },
  {
    file: 'lien-waiver-progress-unconditional.md',
    callouts: [
      { slug: 'notice-to-claimant', source: 'Cal. Civ. Code § 8134' },
    ],
  },
  {
    file: 'lien-waiver-final-conditional.md',
    callouts: [{ slug: 'notice', source: 'Cal. Civ. Code § 8136' }],
  },
  {
    file: 'lien-waiver-final-unconditional.md',
    callouts: [
      { slug: 'notice-to-claimant', source: 'Cal. Civ. Code § 8138' },
    ],
  },
];

/**
 * Convert a callout `title="..."` value into a deterministic slug.
 * Lowercased, ASCII-only, runs of non-alphanumerics collapsed into a
 * single hyphen, hyphens trimmed off the ends. We avoid the URL
 * `encodeURIComponent` route deliberately so the slug stays stable
 * across Node versions and locale settings.
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\x20-\x7e]/g, '') // strip non-ASCII (e.g. smart quotes)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Normalize whitespace before hashing. The goal: be tolerant of editor
 * line-ending churn (CRLF on Windows checkouts, LF on macOS/Linux) and
 * trailing-blank-line jitter, while remaining strict about meaningful
 * character differences (every glyph, every internal space, every
 * paragraph break is part of the hash).
 *
 * Rules:
 *   1. Convert any CRLF or CR to LF.
 *   2. Strip a UTF-8 BOM if present.
 *   3. Collapse 3+ consecutive blank lines down to exactly one blank
 *      line (i.e. two consecutive \n become preserved, but \n\n\n+
 *      collapses to \n\n).
 *   4. Trim trailing whitespace from the very end.
 *
 * We deliberately do NOT collapse internal multi-space runs or trim
 * leading whitespace from individual lines — both can carry meaning
 * in statutory text (indentation of numbered list items, spacing
 * between sentences).
 */
export function normalize(text: string): string {
  return text
    .replace(/^﻿/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+$/gm, '') // strip trailing whitespace on every line
    .trim();
}

export function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Parse `:::7159-callout title="..."` fenced blocks out of a markdown
 * source. Returns a map of {slug: body}. The body excludes the opening
 * fence (and its title attribute) and the closing `:::` fence; what is
 * returned is purely the statutory text the renderer sets in 12pt bold.
 *
 * The parser is intentionally simple: line-by-line, no nesting. Callout
 * blocks in our templates never nest, and a closing `:::` on its own line
 * is the only terminator. If a malformed (unterminated) callout is
 * encountered we throw — better to fail loudly than silently hash a
 * truncated body.
 */
export function extractCallouts(md: string): Record<string, string> {
  const lines = md.split('\n');
  const out: Record<string, string> = {};

  const OPEN_RE = /^:::7159-callout\s+title="([^"]+)"\s*$/;
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(OPEN_RE);
    if (!m) {
      i += 1;
      continue;
    }
    const title = m[1];
    const slug = slugify(title);
    const bodyLines: string[] = [];
    i += 1;
    let closed = false;
    while (i < lines.length) {
      if (lines[i].trim() === ':::') {
        closed = true;
        i += 1;
        break;
      }
      bodyLines.push(lines[i]);
      i += 1;
    }
    if (!closed) {
      throw new Error(
        `Unterminated :::7159-callout block for title="${title}"`,
      );
    }
    if (slug in out) {
      throw new Error(
        `Duplicate callout slug "${slug}" (title="${title}"). ` +
          `Each template must have unique callout titles.`,
      );
    }
    out[slug] = bodyLines.join('\n');
  }
  return out;
}

type FixtureEntry = {
  sha256: string;
  approx_len: number;
  first_30_chars: string;
  source: string;
};
type Fixture = Record<string, Record<string, FixtureEntry>>;

function main(): void {
  const fixture: Fixture = {};

  for (const { file, callouts } of MANIFEST) {
    const path = join(TEMPLATES_DIR, file);
    const md = readFileSync(path, 'utf8');
    const found = extractCallouts(md);

    const expectedSlugs = new Set(callouts.map((c) => c.slug));
    const foundSlugs = new Set(Object.keys(found));

    for (const slug of expectedSlugs) {
      if (!foundSlugs.has(slug)) {
        throw new Error(
          `${file}: expected callout slug "${slug}" but it was not found. ` +
            `Found: ${[...foundSlugs].join(', ') || '(none)'}.`,
        );
      }
    }
    for (const slug of foundSlugs) {
      if (!expectedSlugs.has(slug)) {
        throw new Error(
          `${file}: unexpected callout slug "${slug}". ` +
            `If this is a new statutory callout, add it to the MANIFEST ` +
            `in src/scripts/generate-statutory-hashes.ts.`,
        );
      }
    }

    fixture[file] = {};
    for (const { slug, source } of callouts) {
      const body = found[slug];
      const normalized = normalize(body);
      fixture[file][slug] = {
        sha256: sha256(normalized),
        approx_len: normalized.length,
        first_30_chars: normalized.slice(0, 30),
        source,
      };
    }
  }

  const json = JSON.stringify(fixture, null, 2) + '\n';
  writeFileSync(OUTPUT_PATH, json, 'utf8');

  console.log(`Wrote ${OUTPUT_PATH}`);
  for (const file of Object.keys(fixture)) {
    for (const slug of Object.keys(fixture[file])) {
      const e = fixture[file][slug];
      console.log(
        `  ${file} :: ${slug} -> ${e.sha256.slice(0, 12)}... (${e.approx_len} chars)`,
      );
    }
  }
}

main();
