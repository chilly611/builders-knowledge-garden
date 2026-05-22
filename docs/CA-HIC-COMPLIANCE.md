# California Home Improvement Contract — § 7159 Compliance Notes

Status: **draft, engineering-level documentation**. This file describes how the
Builder's Knowledge Garden contract PDF renderer attempts to satisfy the
formatting requirements of California Business & Professions Code § 7159 and
Civil Code § 8136(c). **It is not legal advice. A California-licensed
construction attorney must review the rendered output before any commercial
deployment.**

## Statutory requirement: 12-point boldface callouts

Cal. Bus. & Prof. Code § 7159(c)(2) requires certain statutory callouts in
a Home Improvement Contract to be set in **12-point boldface type**. The
following five callouts are mandatory and must satisfy this format:

| # | Callout | Statute | Template location |
|---|---|---|---|
| 1 | Mechanics Lien Warning (14-paragraph notice) | § 7159(e)(4) (substance), § 7159(c)(2) (form) | `client-agreement-ca-hic.md`, under `## MECHANICS LIEN WARNING` |
| 2 | Three-Day Right to Cancel (in-contract notice) | § 7159(e)(6) | `client-agreement-ca-hic.md`, under `## THREE-DAY RIGHT TO CANCEL` |
| 3 | Notice of Cancellation (detachable buyer form) | § 7159(d)(4) | `client-agreement-ca-hic.md`, under `## NOTICE OF CANCELLATION` |
| 4 | Downpayment cap | § 7159(d)(8) | `client-agreement-ca-hic.md`, under `## 4. Downpayment` |
| 5 | Schedule of Progress Payments | § 7159(d)(9) | `client-agreement-ca-hic.md`, under `## 5. Schedule of Progress Payments` |

A sixth, related requirement applies to lien-waiver statutory forms (Civ.
Code §§ 8132 / 8134 / 8136 / 8138):

| # | Callout | Statute | Template locations |
|---|---|---|---|
| 6 | "NOTICE" / "NOTICE TO CLAIMANT" block | Civ. Code § 8136(c) — "at least as large as any other type" | `lien-waiver-progress-conditional.md`, `lien-waiver-progress-unconditional.md`, `lien-waiver-final-conditional.md`, `lien-waiver-final-unconditional.md` |

## How the renderer satisfies the format

Each callout above is wrapped in the markdown source with a fenced
`:::7159-callout` marker:

```
:::7159-callout title="MECHANICS LIEN WARNING"
Anyone who helps improve your property, but who is not paid, may record what
is called a mechanics lien...
:::
```

The PDF renderer (`src/lib/pdf/contract-pdf.ts`) parses this marker in
`parseBlocks()` and dispatches to `renderStatutoryCallout()`, which:

1. Sets font to `helvetica` + `bold` via `doc.setFont('helvetica', 'bold')`.
2. Sets size to 12 pt via `doc.setFontSize(TYPE.statutoryCallout)` where
   `TYPE.statutoryCallout = 12`.
3. Adds 4 mm of vertical padding above and below the block to visually
   isolate it from surrounding body copy.
4. Draws a thin black left-edge rule from the top to the bottom of the
   block (when on a single page) to draw the eye — bold black on white,
   no color, which is the safest default for a compliance reviewer.
5. Resets font + size at the end so the next paragraph renders in the
   normal 10 pt body face.

The body baseline is 10 pt (`TYPE.body = 10`), so 12 pt is strictly larger
than every body paragraph — satisfying both § 7159(c)(2)'s "12-point
boldface" requirement and Civ. Code § 8136(c)'s "at least as large as any
other type" requirement for the lien-waiver NOTICE block.

### Verification of point size in the rendered PDF

The renderer's output can be inspected at the PDF-operator level. Running
`node --experimental-strip-types src/scripts/test-contract-pdf.ts` produces:

- `/tmp/test-contract.pdf` (CA HIC) — contains 42 instances of `/F2 12 Tf`
  (Helvetica-Bold at 12 pt), zero instances of any body-bold above 10 pt
  outside the callouts.
- `/tmp/test-lien-waiver-conditional.pdf` — 5 instances of `/F2 12 Tf`
  (the single NOTICE block: title + wrapped body lines).
- `/tmp/test-nda.pdf` (no callouts) — zero instances of `/F2 12 Tf`,
  confirming backward compatibility for non-§-7159 templates.

`/F2` resolves to `Helvetica-Bold` via the PDF font dictionary; the
matching `12 Tf` operator means "set font slot 2 at 12 points." This is
mechanical evidence that the renderer is putting bold-12pt glyphs on the
page for each callout block.

### Backward compatibility

Templates that do **not** contain a `:::7159-callout` fence (the generic
client agreement, NDA, change order, B141 architect agreement, legacy
generic lien waivers) render exactly as before. The new parser branch is
only entered when the fence is detected; otherwise the parser falls
through to the existing block-classification path.

## Known limitations

1. **Multi-page callouts lose the left rule.** If a callout block is long
   enough to span a page break (currently only the Mechanics Lien Warning
   reliably does this with longer client-name / address fills), the left
   vertical rule is omitted to avoid mis-tracking page boundaries. The
   12 pt bold text remains — and that is what the statute requires; the
   rule is decorative emphasis only.

2. **Inline emphasis dropped inside callouts.** The renderer strips
   `**bold**` and `_italic_` markers inside callout bodies because the
   entire block is already bold. If you need a callout phrase to stand
   out further, prefer ALL CAPS in the template source.

3. **Helvetica only.** jsPDF's bundled fonts are limited to Helvetica,
   Times, Courier, Symbol, and ZapfDingbats. We render in Helvetica-Bold
   for legibility; "Times-Bold" is an equally valid choice if a reviewer
   prefers a serif face. Custom fonts (e.g. a CSLB-recommended
   typeface) would require shipping font data with the bundle — out of
   scope for the current renderer.

4. **No machine compliance check on the *rendered PDF* output.** The
   renderer enforces 12 pt bold on callout blocks but does not validate
   the *layout* of the rendered PDF (signature proximity, page-break
   placement, etc.). Visual review by counsel is still required.

   The *content* of each callout body **is** now machine-locked: see
   "Statutory text golden-file lock" below.

## Statutory text golden-file lock

Every `:::7159-callout` body in the templates listed above is hashed
(SHA-256, after CRLF→LF + trailing-whitespace normalization) and the
hashes are committed to:

```
src/lib/contract-templates/__tests__/statutory-text-hashes.json
```

The test `src/lib/contract-templates/__tests__/statutory-text-golden.test.ts`
re-parses, re-hashes, and re-compares on every `npm test` run. If a PR
modifies a single byte of a callout body without also updating the JSON,
the test fails and the build is blocked. **This is the legal-compliance
defense against accidental drift** (smart-quote autocorrect, paragraph
break shuffling, hyphen replacement, etc.).

### How to intentionally update statutory text

If a California legislative amendment changes the text of one of the
locked callouts (e.g. an amendment to Bus. & Prof. § 7159 or Civ. Code
§§ 8132 / 8134 / 8136 / 8138):

1. Pull the new verbatim language from leginfo.legislature.ca.gov.
2. Update the affected template markdown(s) inside the `:::7159-callout`
   fence — and ONLY inside the fence; the surrounding context can stay.
3. Run:

   ```
   npm run statutory:hash
   ```

   This regenerates `statutory-text-hashes.json` from the current
   markdown.
4. Inspect the JSON diff. Every changed `sha256` must correspond to a
   callout you intentionally edited; if an unrelated hash also changed,
   you have accidental drift in another callout — investigate before
   committing.
5. Commit the template change(s) + the regenerated JSON in the SAME PR.
   In the PR description, include:
   - The leginfo.legislature.ca.gov URL for the new statutory text.
   - The effective date of the legislative amendment.
   - The chapter / bill number (e.g. "Stats. 2025, ch. 123, § 4").
6. Run `npm test` locally to confirm the golden test now passes against
   the regenerated JSON before opening the PR.

A PR that changes a callout body WITHOUT updating the JSON will fail
`statutory-text-golden.test.ts` on Vercel preview / CI and cannot merge.

### How to verify the statutory chain end-to-end

Auditors can re-verify the entire compliance chain:

| Layer | Source | How to verify |
|---|---|---|
| Markdown | `src/lib/contract-templates/*.md` | Read the file. |
| Hash | `statutory-text-hashes.json` | Run `npm run statutory:hash` and compare diff. |
| Statute (BPC § 7159) | https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7159 | Compare callout body word-for-word. |
| Statute (Civ. § 8132) | https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=8132 | Conditional progress waiver. |
| Statute (Civ. § 8134) | https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=8134 | Unconditional progress waiver. |
| Statute (Civ. § 8136) | https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=8136 | Conditional final waiver. |
| Statute (Civ. § 8138) | https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=8138 | Unconditional final waiver. |

**Last manual verification against leginfo.legislature.ca.gov:** _not
yet performed — fill in this date and reviewer initials after the first
verification pass._

### Risk callouts (normalization edge cases)

The normalization the hash is computed over does the following — keep
this in mind when editing or auditing:

- **CRLF / CR → LF.** A Windows checkout (`git config core.autocrlf
  true`) would otherwise produce different bytes than a macOS / Linux
  checkout. The hash is line-ending-agnostic so the test is stable
  across contributor environments.
- **UTF-8 BOM stripped.** If an editor adds a BOM, it does not change
  the hash.
- **3+ consecutive blank lines collapse to 1 blank line.** Editor
  autoformat or `prettier --write` may add a stray blank line at the
  end of a callout; this is tolerated.
- **Trailing whitespace stripped per line.** Tolerates accidental
  trailing spaces.
- **Internal whitespace is NOT collapsed.** A double space between
  two words *is* part of the hash. So is the indentation of a numbered
  list line. So is the position of paragraph breaks.
- **Smart quotes / curly apostrophes ARE part of the hash.** If your
  editor autocorrects `'` to `’` inside a callout, the test will fail.
  Configure your editor to disable smart-quote substitution for
  `.md` files in the `contract-templates/` directory, or revert the
  substitution before committing.
- **Template placeholders are part of the hash.** `{{contractorName}}`
  inside the Notice of Cancellation callout is intentionally hashed —
  changing the placeholder name (e.g. to `{{vendorName}}`) would change
  the rendered text for every customer and is therefore a drift event
  by design.

## Pre-deployment checklist

Before any user-facing release of the CA HIC contract template:

- [ ] CA-licensed construction attorney has reviewed the rendered PDF
      output (not just the markdown source).
- [ ] Each of the five § 7159 callouts has been visually confirmed to be
      bold + 12 pt + visibly distinct from the surrounding body copy.
- [ ] The "Notice of Cancellation" callout's substituted placeholders
      ({{contractorName}}, {{contractorAddress}}, {{contractorEmail}})
      render correctly inside the bold callout context.
- [ ] The Three-Day Right to Cancel block appears in close visual
      proximity to the buyer-signature line (§ 7159(c)(3)(B)(iv)).
- [ ] The lien-waiver NOTICE TO CLAIMANT block is the largest type on
      the page on each of the four statutory waiver forms.
- [ ] CSLB website (www.cslb.ca.gov) link, license number, bond number,
      and phone-for-cancellation are correctly populated.

## References

- Cal. Bus. & Prof. Code § 7159 — Home Improvement Contracts.
  Full text: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7159
- Cal. Civ. Code §§ 8132, 8134, 8136, 8138 — Statutory waiver and release
  forms (and § 8136(c) format requirement).
  Full text: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=8136
- CSLB consumer-facing summary of § 7159:
  https://www.cslb.ca.gov/consumers/

## Disclaimer

**Builder's Knowledge Garden is not a law firm and these templates are not
legal advice.** The 12 pt boldface treatment described above is one
necessary condition for § 7159 compliance; it is not sufficient on its
own. The full statute imposes additional requirements (signature
proximity, separately-initialed paragraphs, attached cancellation form,
mandatory insurance-disclosure boilerplate, etc.) that are encoded in the
template markdown but must be verified by counsel for each project.
