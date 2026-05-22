/**
 * Golden-file lock for the verbatim statutory language inside the CA HIC
 * contract templates. Each `:::7159-callout` block in those markdown files
 * is content that California statute requires be reproduced **verbatim**
 * (Bus. & Prof. Code § 7159(e)(4) / (e)(6) / (d)(4) / (d)(8) / (d)(9),
 * Civ. Code §§ 8132 / 8134 / 8136 / 8138). Any unintended edit — a
 * stray "smart quote" autocorrect, an editor-inserted hyphen, a misplaced
 * paragraph break — is a legal compliance hazard.
 *
 * This test parses the callout bodies out of the markdown, normalizes
 * line endings and trailing-whitespace jitter, hashes the result with
 * SHA-256, and compares against the committed golden JSON at
 * `./statutory-text-hashes.json`. A failure means EITHER:
 *
 *   (a) Someone accidentally drifted the statutory text. Revert.
 *   (b) Someone intentionally updated the statutory text (e.g. CA
 *       legislative amendment). They must re-run the generator:
 *
 *           npm run statutory:hash
 *
 *       and commit the regenerated JSON alongside the markdown change
 *       in the same PR, with a reference to the leginfo.legislature.
 *       ca.gov URL in the PR body.
 *
 * The test is a pure function of file contents on disk — no network, no
 * mocks, no timers — so it should never be flaky.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import goldenHashes from './statutory-text-hashes.json';

const TEMPLATES_DIR = join(__dirname, '..');

type FixtureEntry = {
  sha256: string;
  approx_len: number;
  first_30_chars: string;
  source: string;
};
type Fixture = Record<string, Record<string, FixtureEntry>>;

/**
 * Identical to the slugify used by the generator. Kept inline (rather
 * than imported from the generator script) so this test has zero
 * runtime dependency on `src/scripts/` — vitest only ever needs to load
 * this single file plus the JSON to verify the lock.
 */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Parse `:::7159-callout title="..."` fences out of a markdown source.
 * Mirrors the generator parser exactly — if these two ever drift, every
 * golden hash will fail simultaneously, which is the correct loud
 * failure mode.
 */
function extractCallouts(md: string): Record<string, string> {
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
    const slug = slugify(m[1]);
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
      throw new Error(`Unterminated :::7159-callout block for "${m[1]}"`);
    }
    out[slug] = bodyLines.join('\n');
  }
  return out;
}

function normalize(text: string): string {
  return text
    .replace(/^﻿/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+$/gm, '')
    .trim();
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

describe('statutory text golden-file lock', () => {
  const golden = goldenHashes as Fixture;

  for (const [file, expected] of Object.entries(golden)) {
    describe(file, () => {
      const path = join(TEMPLATES_DIR, file);
      const md = readFileSync(path, 'utf8');
      const callouts = extractCallouts(md);

      for (const [slug, fix] of Object.entries(expected)) {
        it(`${slug} matches golden hash (${fix.source})`, () => {
          const body = callouts[slug];
          expect(
            body,
            `Missing callout '${slug}' in ${file}. Found: ${Object.keys(
              callouts,
            ).join(', ') || '(none)'}.`,
          ).toBeDefined();
          const normalized = normalize(body);
          const actual = sha256(normalized);
          if (actual !== fix.sha256) {
            const firstActual = normalized.slice(0, 60);
            const msg = [
              `Statutory text drift detected in ${file} :: ${slug}`,
              `  source:   ${fix.source}`,
              `  expected: ${fix.sha256}`,
              `  actual:   ${actual}`,
              `  expected first 30: ${JSON.stringify(fix.first_30_chars)}`,
              `  actual   first 60: ${JSON.stringify(firstActual)}`,
              `  expected length:   ${fix.approx_len}`,
              `  actual   length:   ${normalized.length}`,
              ``,
              `If this change is INTENTIONAL (e.g. a CA legislative amendment),`,
              `run "npm run statutory:hash" to regenerate the golden file and`,
              `commit both the markdown change and the JSON update together.`,
              `See docs/CA-HIC-COMPLIANCE.md for the full procedure.`,
            ].join('\n');
            throw new Error(msg);
          }
          expect(actual).toBe(fix.sha256);
        });
      }
    });
  }
});
