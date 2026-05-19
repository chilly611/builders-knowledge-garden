/**
 * Contract PDF generator.
 *
 * Takes a filled contract-template body (markdown) and produces a branded
 * Builder's Knowledge Garden PDF with a diagonal DRAFT watermark on every
 * page and an attorney-review disclaimer footer.
 *
 * Runs in the browser (client-side) via jsPDF. Returns a Blob so the
 * client component can trigger a download without a round-trip to the API.
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Page setup in millimeters. */
const PAGE = {
  orientation: 'portrait' as const,
  unit: 'mm' as const,
  format: 'letter' as const,
  marginTop: 22,
  marginBottom: 22,
  marginLeft: 18,
  marginRight: 18,
};

/** BKG brand colors (RGB). */
const COLOR = {
  brand: [29, 158, 117] as const, // --color-emerald-core-ish
  text: [24, 24, 27] as const,
  muted: [113, 113, 122] as const,
  warn: [180, 83, 9] as const, // amber-700
  rule: [228, 228, 231] as const,
  watermark: [200, 210, 205] as const,
};

/** Typography sizes in pt. */
const TYPE = {
  title: 18,
  h2: 13,
  h3: 11,
  body: 10,
  small: 8.5,
  watermark: 82,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ContractPdfOptions {
  /** Template display name — used in the PDF title, header, and filename. */
  templateName: string;
  /** Filled markdown body (already run through fillTemplate). */
  body: string;
  /**
   * When true, stamps a "DRAFT" diagonal watermark on every page and appends
   * the attorney-review disclaimer to the footer. Default: true.
   *
   * Leave as true until an attorney has reviewed the template language for
   * the user's state. See killer-app-direction.md § Legal prerequisites.
   */
  draft?: boolean;
}

/** Produce a PDF Blob for a filled contract. */
export function generateContractPdf(options: ContractPdfOptions): Blob {
  const { templateName, body, draft = true } = options;

  const doc = new jsPDF({
    orientation: PAGE.orientation,
    unit: PAGE.unit,
    format: PAGE.format,
  });

  const renderer = new ContractRenderer(doc, templateName, draft);
  renderer.render(body);

  return doc.output('blob');
}

/** Trigger a browser download of a filled contract PDF. */
export function downloadContractPdf(options: ContractPdfOptions & { filename?: string }): void {
  const blob = generateContractPdf(options);
  const filename =
    options.filename ??
    `${slugify(options.templateName)}-draft-${todayStamp()}.pdf`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function todayStamp(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

// ---------------------------------------------------------------------------
// Markdown → PDF renderer
// ---------------------------------------------------------------------------

type Block =
  | { kind: 'title'; text: string }
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'hr' }
  | { kind: 'table'; headers: string[]; rows: string[][] }
  | { kind: 'signatureBlock'; text: string };

class ContractRenderer {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private contentWidth: number;
  private y: number;
  private templateName: string;
  private draft: boolean;

  constructor(doc: jsPDF, templateName: string, draft: boolean) {
    this.doc = doc;
    this.pageWidth = doc.internal.pageSize.getWidth();
    this.pageHeight = doc.internal.pageSize.getHeight();
    this.contentWidth = this.pageWidth - PAGE.marginLeft - PAGE.marginRight;
    this.y = PAGE.marginTop;
    this.templateName = templateName;
    this.draft = draft;
  }

  render(body: string): void {
    const blocks = parseBlocks(body);

    this.paintPageFurniture();

    for (const block of blocks) {
      this.renderBlock(block);
    }

    // Finalize: stamp watermark + footer on every page (including ones
    // autoTable may have created while we weren't looking).
    this.finalizePages();
  }

  // -------------------------------------------------------------------------
  // Per-block rendering
  // -------------------------------------------------------------------------

  private renderBlock(block: Block): void {
    switch (block.kind) {
      case 'title':
        this.renderTitle(block.text);
        break;
      case 'h2':
        this.renderH2(block.text);
        break;
      case 'h3':
        this.renderH3(block.text);
        break;
      case 'paragraph':
        this.renderParagraph(block.text);
        break;
      case 'ul':
        this.renderList(block.items);
        break;
      case 'hr':
        this.renderHr();
        break;
      case 'table':
        this.renderTable(block);
        break;
      case 'signatureBlock':
        this.renderSignatureBlock(block.text);
        break;
    }
  }

  private renderTitle(text: string): void {
    this.ensureSpace(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(TYPE.title);
    this.doc.setTextColor(...rgb(COLOR.text));
    this.doc.text(sanitizeForPdf(text), this.pageWidth / 2, this.y + 6, { align: 'center' });
    this.y += 14;
  }

  private renderH2(text: string): void {
    this.ensureSpace(11);
    this.y += 3;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(TYPE.h2);
    this.doc.setTextColor(...rgb(COLOR.brand));
    this.doc.text(sanitizeForPdf(text), PAGE.marginLeft, this.y + 4);
    this.y += 7;
  }

  private renderH3(text: string): void {
    this.ensureSpace(9);
    this.y += 2;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(TYPE.h3);
    this.doc.setTextColor(...rgb(COLOR.text));
    this.doc.text(sanitizeForPdf(text), PAGE.marginLeft, this.y + 4);
    this.y += 6;
  }

  private renderParagraph(text: string): void {
    // Three rendering modes for whole-paragraph emphasis (lowest priority first):
    //   plain  — body text, left-aligned
    //   **X**  — bold, left-aligned (preserved for short heading-like phrases)
    //   ***X***— bold + CENTERED (used for the DRAFT NOTICE banner)
    // Inline emphasis *inside* a longer paragraph is dropped — the templates
    // rarely use it for legal-meaning content, and reliable wrap matters more.
    const trimmed = text.trim();
    const wholeCenterBold = /^\*\*\*[\s\S]*\*\*\*$/.test(trimmed);
    const wholeBold = !wholeCenterBold && /^\*\*[\s\S]*\*\*$/.test(trimmed);
    const cleaned = sanitizeForPdf(stripInlineMarkers(text));
    if (!cleaned.trim()) return;

    this.doc.setFont('helvetica', (wholeCenterBold || wholeBold) ? 'bold' : 'normal');
    this.doc.setFontSize(TYPE.body);
    this.doc.setTextColor(...rgb(COLOR.text));

    if (wholeCenterBold) {
      this.renderWrappedLines(cleaned, this.pageWidth / 2, 0, { align: 'center' });
    } else {
      this.renderWrappedLines(cleaned, PAGE.marginLeft, 0);
    }
    this.y += 2.5;
  }

  private renderList(items: string[]): void {
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(TYPE.body);
    this.doc.setTextColor(...rgb(COLOR.text));
    for (const item of items) {
      const cleaned = sanitizeForPdf(stripInlineMarkers(item));
      if (!cleaned.trim()) continue;
      // Render bullet at fixed indent, then the wrapped content with a 6mm
      // hanging indent so wrapped lines align under the first character.
      this.ensureSpace(5);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text('•', PAGE.marginLeft + 2, this.y + 4);
      this.renderWrappedLines(cleaned, PAGE.marginLeft + 6, 6);
    }
    this.y += 1;
  }

  /**
   * Wrap `text` to fit within (contentWidth - indent) and render each line at
   * x/this.y. Uses jsPDF's splitTextToSize for the primary wrap, then runs a
   * hard character-based safety pass that re-splits any line whose measured
   * width still exceeds availableWidth (defense against font-metric edge
   * cases that have repeatedly bitten this renderer).
   *
   * `align: 'center'` centers each wrapped line around `x`; default is
   * left-aligned starting at `x`.
   */
  private renderWrappedLines(
    text: string,
    x: number,
    indent: number,
    opts: { align?: 'left' | 'center' } = {},
  ): void {
    const availableWidth = this.contentWidth - indent;
    const lineHeight = 5;

    // Primary wrap.
    const primary = this.doc.splitTextToSize(text, availableWidth) as string[];

    // Safety pass: split any line that still measures wider than
    // availableWidth. Walks word-by-word; if a single word is wider than the
    // line, falls back to a char-by-char split. Guarantees no rendered line
    // overflows the margin even if splitTextToSize's metrics are off.
    const lines: string[] = [];
    for (const ln of primary) {
      if (this.doc.getTextWidth(ln) <= availableWidth) {
        lines.push(ln);
        continue;
      }
      lines.push(...this.hardWrap(ln, availableWidth));
    }

    for (const ln of lines) {
      this.ensureSpace(lineHeight);
      this.doc.text(ln, x, this.y + 4, opts.align ? { align: opts.align } : undefined);
      this.y += lineHeight;
    }
  }

  /** Manual word- then char-level wrap. Last-resort safety. */
  private hardWrap(text: string, maxWidth: number): string[] {
    const out: string[] = [];
    const words = text.split(/(\s+)/);
    let current = '';
    const flush = () => {
      if (current.length > 0) {
        out.push(current);
        current = '';
      }
    };
    for (const w of words) {
      if (w === '') continue;
      const candidate = current + w;
      if (this.doc.getTextWidth(candidate) <= maxWidth) {
        current = candidate;
        continue;
      }
      // Current word would overflow.
      flush();
      // If the word itself is wider than the line, split char-by-char.
      if (this.doc.getTextWidth(w) > maxWidth) {
        let chunk = '';
        for (const ch of w) {
          const next = chunk + ch;
          if (this.doc.getTextWidth(next) > maxWidth && chunk.length > 0) {
            out.push(chunk);
            chunk = ch;
          } else {
            chunk = next;
          }
        }
        if (chunk.length > 0) current = chunk;
      } else {
        current = w.trimStart();
      }
    }
    flush();
    return out;
  }

  private renderHr(): void {
    this.ensureSpace(4);
    this.doc.setDrawColor(...rgb(COLOR.rule));
    this.doc.setLineWidth(0.2);
    this.doc.line(
      PAGE.marginLeft,
      this.y + 2,
      this.pageWidth - PAGE.marginRight,
      this.y + 2
    );
    this.y += 5;
  }

  private renderTable(block: { kind: 'table'; headers: string[]; rows: string[][] }): void {
    const startY = this.y + 2;
    autoTable(this.doc, {
      startY,
      head: [block.headers.map(stripInlineMarkers)],
      body: block.rows.map((r) => r.map(stripInlineMarkers)),
      margin: { left: PAGE.marginLeft, right: PAGE.marginRight },
      theme: 'grid',
      styles: {
        fontSize: TYPE.body,
        textColor: rgbArr(COLOR.text),
        lineColor: rgbArr(COLOR.rule),
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: rgbArr(COLOR.brand),
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      didDrawPage: () => {
        // autoTable may spill onto a new page; paint furniture there too.
        this.paintPageFurniture();
      },
    });
    // lastAutoTable is attached to doc at runtime.
    const finalY = (this.doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
    this.y = (finalY ?? this.y) + 4;
  }

  private renderSignatureBlock(text: string): void {
    // Render as a lightly-indented monospace-ish block so signature lines
    // retain their underscored spacing.
    this.doc.setFont('courier', 'normal');
    this.doc.setFontSize(TYPE.body);
    this.doc.setTextColor(...rgb(COLOR.text));
    const lines = sanitizeForPdf(text).split('\n');
    for (const line of lines) {
      this.ensureSpace(5);
      this.doc.text(line, PAGE.marginLeft, this.y + 4);
      this.y += 5;
    }
    this.y += 2;
  }

  // -------------------------------------------------------------------------
  // (Removed 2026-05-19): the previous custom inline-styled wrap renderer
  // had measurement bugs that bled long paragraphs past the right margin.
  // Replaced by renderWrappedLines() above, which uses jsPDF's built-in
  // splitTextToSize (known-correct width math). Trade-off: we drop
  // mid-paragraph **bold** / _italic_ emphasis; whole-paragraph bold is
  // detected and preserved by renderParagraph. The templates use inline
  // emphasis sparingly and never for legal-meaning content.
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // Page flow
  // -------------------------------------------------------------------------

  private ensureSpace(needed: number): void {
    const limit = this.pageHeight - PAGE.marginBottom;
    if (this.y + needed > limit) {
      this.doc.addPage();
      this.y = PAGE.marginTop;
      this.paintPageFurniture();
    }
  }

  private paintPageFurniture(): void {
    if (this.draft) {
      this.stampWatermark();
    }
    this.paintHeader();
  }

  private stampWatermark(): void {
    // Preserve state.
    this.doc.saveGraphicsState();
    const gState = (this.doc as unknown as {
      GState?: new (opts: { opacity: number }) => unknown;
      setGState: (g: unknown) => void;
    });
    if (gState.GState && gState.setGState) {
      gState.setGState(new gState.GState({ opacity: 0.18 }));
    }
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(TYPE.watermark);
    this.doc.setTextColor(...rgb(COLOR.watermark));
    this.doc.text('DRAFT', this.pageWidth / 2, this.pageHeight / 2, {
      align: 'center',
      angle: 35,
    });
    this.doc.restoreGraphicsState();
  }

  private paintHeader(): void {
    // Brand wordmark (top-left) + template name (top-right rule).
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(...rgb(COLOR.brand));
    this.doc.text("BUILDER'S KNOWLEDGE GARDEN", PAGE.marginLeft, 12);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(...rgb(COLOR.muted));
    this.doc.text(
      this.templateName.toUpperCase() + (this.draft ? ' · DRAFT' : ''),
      this.pageWidth - PAGE.marginRight,
      12,
      { align: 'right' }
    );

    this.doc.setDrawColor(...rgb(COLOR.rule));
    this.doc.setLineWidth(0.3);
    this.doc.line(PAGE.marginLeft, 14, this.pageWidth - PAGE.marginRight, 14);
  }

  private finalizePages(): void {
    const total = this.doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      this.doc.setPage(p);
      this.paintFooter(p, total);
    }
  }

  private paintFooter(pageNum: number, totalPages: number): void {
    const y = this.pageHeight - 10;
    this.doc.setDrawColor(...rgb(COLOR.rule));
    this.doc.setLineWidth(0.3);
    this.doc.line(
      PAGE.marginLeft,
      y - 5,
      this.pageWidth - PAGE.marginRight,
      y - 5
    );

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(TYPE.small);

    if (this.draft) {
      this.doc.setTextColor(...rgb(COLOR.warn));
      this.doc.text(
        'DRAFT — not reviewed by an attorney. Not legal advice.',
        PAGE.marginLeft,
        y
      );
    } else {
      this.doc.setTextColor(...rgb(COLOR.muted));
      this.doc.text('Generated by Builder\u2019s Knowledge Garden', PAGE.marginLeft, y);
    }

    this.doc.setTextColor(...rgb(COLOR.muted));
    this.doc.text(
      `Page ${pageNum} of ${totalPages}`,
      this.pageWidth - PAGE.marginRight,
      y,
      { align: 'right' }
    );
  }
}

// ---------------------------------------------------------------------------
// Markdown block parser — handles only the subset we produce in our templates.
// ---------------------------------------------------------------------------

function parseBlocks(source: string): Block[] {
  // Strip HTML comments (including multi-line) — these are author notes in
  // the template files (e.g. "<!-- SHARED DISCLAIMER — See ..._shared/
  // disclaimer.md for canonical version -->") and must never reach the PDF.
  const stripped = source.replace(/<!--[\s\S]*?-->/g, '');
  const lines = stripped.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];

  let i = 0;

  // A "signature block" heuristic: once we hit "## SIGNATURES" or "## AUTHORIZATIONS"
  // or "## SIGNATURE" (singular), subsequent lines that contain underscore-lines
  // are rendered in fixed-pitch so the "____________" spacing survives.
  let inSignatureBlock = false;

  const pushParagraph = (buf: string[]) => {
    const text = buf.join(' ').trim();
    if (text) blocks.push({ kind: 'paragraph', text });
  };

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();

    // Blank
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Horizontal rule — also ends signature-block mode. A `---` after the
    // SIGNATURES section is the natural delimiter before the disclaimer; we
    // need to clear the sig-block flag here so subsequent paragraphs render
    // as helvetica paragraphs, not courier signature lines.
    if (/^---+$/.test(line.trim())) {
      blocks.push({ kind: 'hr' });
      inSignatureBlock = false;
      i++;
      continue;
    }

    // Headings — h1 and h3 also end signature-block mode (only h2 with
    // "SIGNATURES"/"AUTHORIZATIONS" text turns it ON).
    if (line.startsWith('# ')) {
      blocks.push({ kind: 'title', text: stripInlineMarkers(line.slice(2)) });
      inSignatureBlock = false;
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      const text = stripInlineMarkers(line.slice(3));
      blocks.push({ kind: 'h2', text });
      const upper = text.toUpperCase();
      inSignatureBlock =
        upper.startsWith('SIGNATURE') ||
        upper.startsWith('AUTHORIZATION');
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      blocks.push({ kind: 'h3', text: stripInlineMarkers(line.slice(4)) });
      inSignatureBlock = false;
      i++;
      continue;
    }

    // Signature-block mode: render contiguous non-empty lines in courier.
    if (inSignatureBlock) {
      const sigLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !lines[i].startsWith('#') &&
        !/^---+$/.test(lines[i].trim())
      ) {
        sigLines.push(stripInlineMarkers(lines[i]));
        i++;
      }
      if (sigLines.length > 0) {
        blocks.push({ kind: 'signatureBlock', text: sigLines.join('\n') });
      }
      continue;
    }

    // Table: starts with a pipe and the next line is a separator row.
    if (line.startsWith('|') && i + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[i + 1].trim())) {
      const headers = parsePipeRow(line);
      const rows: string[][] = [];
      i += 2; // skip header + separator
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(parsePipeRow(lines[i]));
        i++;
      }
      blocks.push({ kind: 'table', headers, rows });
      continue;
    }

    // Bullet list (- or * at start, with optional indent)
    if (/^\s*[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*] /.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*] /, '').trim());
        i++;
      }
      // Consume trailing sub-indent paragraphs into previous item? Skip for simplicity.
      blocks.push({ kind: 'ul', items });
      continue;
    }

    // Ordered list: treat each "1. item" line as its own paragraph prefixed with the number.
    if (/^\s*\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) {
        items.push(lines[i].trim());
        i++;
      }
      // Render as simple paragraphs so numbers survive.
      for (const it of items) blocks.push({ kind: 'paragraph', text: it });
      continue;
    }

    // Fallback: paragraph (merge consecutive non-blank lines)
    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('|') &&
      !/^---+$/.test(lines[i].trim()) &&
      !/^\s*[-*] /.test(lines[i]) &&
      !/^\s*\d+\.\s/.test(lines[i])
    ) {
      buf.push(lines[i].trim());
      i++;
    }
    pushParagraph(buf);
  }

  return blocks;
}

function parsePipeRow(line: string): string[] {
  // Split on | and trim; drop leading/trailing empty cells caused by surrounding pipes.
  const cells = line.split('|').map((c) => c.trim());
  if (cells.length > 0 && cells[0] === '') cells.shift();
  if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
  return cells;
}

/** Remove inline markdown markers for contexts that don't render them. */
function stripInlineMarkers(s: string): string {
  return s.replace(/\*\*/g, '').replace(/(^|\W)_([^_]+)_(?=\W|$)/g, '$1$2');
}

/**
 * jsPDF's default helvetica is WinAnsi-encoded (CP1252). Characters outside
 * that range get substituted with a placeholder glyph that surfaces as `&`
 * or similar visual noise in the rendered PDF. Strip the symbols we know
 * the templates use that aren't in WinAnsi (⚠ for the draft notice, etc.).
 * Per user feedback: if the symbol can't render, leave nothing in its place —
 * don't substitute an alternative letter.
 *
 * Em-dash (—, U+2014) and smart quotes (', ', ", ") ARE in WinAnsi and
 * render correctly, so we leave them alone.
 */
function sanitizeForPdf(s: string): string {
  return s
    // Strip Misc Symbols (U+2600..U+26FF), Dingbats (U+2700..U+27BF),
    // and emoji / supplementary symbols (U+1F000..U+1FFFF). These are
    // the most common offenders authored into our templates (⚠).
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    // Collapse any whitespace runs that result from stripping a symbol —
    // e.g. "⚠ DRAFT" -> " DRAFT" -> "DRAFT" so the bold paragraph doesn't
    // start with a stray space.
    .replace(/ {2,}/g, ' ')
    .replace(/^ +/gm, '')
    .replace(/ +$/gm, '');
}

// ---------------------------------------------------------------------------
// Color helpers (jsPDF wants spread r,g,b — not arrays)
// ---------------------------------------------------------------------------

function rgb(c: readonly [number, number, number]): [number, number, number] {
  return [c[0], c[1], c[2]];
}

function rgbArr(c: readonly [number, number, number]): [number, number, number] {
  return [c[0], c[1], c[2]];
}
