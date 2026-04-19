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
    this.doc.text(text, this.pageWidth / 2, this.y + 6, { align: 'center' });
    this.y += 14;
  }

  private renderH2(text: string): void {
    this.ensureSpace(11);
    this.y += 3;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(TYPE.h2);
    this.doc.setTextColor(...rgb(COLOR.brand));
    this.doc.text(text, PAGE.marginLeft, this.y + 4);
    this.y += 7;
  }

  private renderH3(text: string): void {
    this.ensureSpace(9);
    this.y += 2;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(TYPE.h3);
    this.doc.setTextColor(...rgb(COLOR.text));
    this.doc.text(text, PAGE.marginLeft, this.y + 4);
    this.y += 6;
  }

  private renderParagraph(text: string): void {
    this.doc.setFontSize(TYPE.body);
    this.doc.setTextColor(...rgb(COLOR.text));
    this.renderInlineText(text, { indent: 0 });
    this.y += 2.5;
  }

  private renderList(items: string[]): void {
    this.doc.setFontSize(TYPE.body);
    this.doc.setTextColor(...rgb(COLOR.text));
    for (const item of items) {
      this.ensureSpace(5);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text('•', PAGE.marginLeft + 2, this.y + 4);
      this.renderInlineText(item, { indent: 6 });
    }
    this.y += 1;
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
    const lines = text.split('\n');
    for (const line of lines) {
      this.ensureSpace(5);
      this.doc.text(line, PAGE.marginLeft, this.y + 4);
      this.y += 5;
    }
    this.y += 2;
  }

  // -------------------------------------------------------------------------
  // Inline rendering — handles **bold**, _italic_, and wraps at contentWidth
  // -------------------------------------------------------------------------

  private renderInlineText(text: string, opts: { indent: number }): void {
    const segments = parseInline(text);
    const availableWidth = this.contentWidth - opts.indent;
    const lineHeight = 5;
    const x0 = PAGE.marginLeft + opts.indent;

    // Build a word list where each word carries its style.
    type Word = { text: string; style: 'normal' | 'bold' | 'italic' | 'bolditalic' };
    const words: Word[] = [];
    for (const seg of segments) {
      // Split on whitespace but keep word-style pairing.
      const tokens = seg.text.split(/(\s+)/).filter((t) => t.length > 0);
      for (const tok of tokens) {
        if (/^\s+$/.test(tok)) {
          // Whitespace — collapse to a single space marker.
          if (words.length > 0 && words[words.length - 1].text !== ' ') {
            words.push({ text: ' ', style: seg.style });
          }
        } else {
          words.push({ text: tok, style: seg.style });
        }
      }
    }

    // Greedy line-fill.
    let line: Word[] = [];
    let lineWidthMm = 0;

    const flushLine = () => {
      this.ensureSpace(lineHeight);
      let x = x0;
      for (const w of line) {
        if (w.text === ' ') {
          x += this.doc.getTextWidth(' ');
          continue;
        }
        this.setStyle(w.style);
        this.doc.text(w.text, x, this.y + 4);
        x += this.doc.getTextWidth(w.text);
      }
      this.y += lineHeight;
    };

    for (const w of words) {
      this.setStyle(w.style);
      const wWidth = this.doc.getTextWidth(w.text);
      // A leading space at start of line is meaningless.
      if (line.length === 0 && w.text === ' ') continue;
      if (lineWidthMm + wWidth > availableWidth && w.text !== ' ') {
        // wrap
        // Drop trailing space
        while (line.length > 0 && line[line.length - 1].text === ' ') line.pop();
        flushLine();
        line = [];
        lineWidthMm = 0;
        if (w.text === ' ') continue;
      }
      line.push(w);
      lineWidthMm += wWidth;
    }
    if (line.length > 0) {
      while (line.length > 0 && line[line.length - 1].text === ' ') line.pop();
      flushLine();
    }
  }

  private setStyle(style: 'normal' | 'bold' | 'italic' | 'bolditalic'): void {
    const s =
      style === 'bold'
        ? 'bold'
        : style === 'italic'
          ? 'italic'
          : style === 'bolditalic'
            ? 'bolditalic'
            : 'normal';
    this.doc.setFont('helvetica', s);
    this.doc.setFontSize(TYPE.body);
  }

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
  const lines = source.replace(/\r\n/g, '\n').split('\n');
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

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      blocks.push({ kind: 'hr' });
      i++;
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      blocks.push({ kind: 'title', text: stripInlineMarkers(line.slice(2)) });
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

// ---------------------------------------------------------------------------
// Inline parsing — **bold** and _italic_
// ---------------------------------------------------------------------------

type InlineStyle = 'normal' | 'bold' | 'italic' | 'bolditalic';

function parseInline(text: string): Array<{ text: string; style: InlineStyle }> {
  const out: Array<{ text: string; style: InlineStyle }> = [];
  let buf = '';
  let style: InlineStyle = 'normal';
  let i = 0;

  const flush = () => {
    if (buf) {
      out.push({ text: buf, style });
      buf = '';
    }
  };

  while (i < text.length) {
    if (text[i] === '*' && text[i + 1] === '*') {
      flush();
      style = toggleBold(style);
      i += 2;
      continue;
    }
    // `_` only triggers italic when it's a word boundary — avoid mangling
    // things like {{snake_case_keys}} (although we don't currently produce any).
    if (
      text[i] === '_' &&
      (i === 0 || /[\s\W]/.test(text[i - 1]) || isItalicToggleAllowed(out, buf, style)) &&
      (text[i + 1] === undefined || /\S/.test(text[i + 1]))
    ) {
      // Look ahead for closing _ before whitespace
      const rest = text.slice(i + 1);
      const closeIdx = rest.search(/_/);
      if (closeIdx > 0 && !/\s/.test(rest[0])) {
        flush();
        style = toggleItalic(style);
        i += 1;
        continue;
      }
    }
    buf += text[i];
    i++;
  }
  flush();
  return out;
}

function isItalicToggleAllowed(
  _out: Array<{ text: string; style: InlineStyle }>,
  _buf: string,
  _style: InlineStyle
): boolean {
  return true;
}

function toggleBold(s: InlineStyle): InlineStyle {
  switch (s) {
    case 'normal':
      return 'bold';
    case 'bold':
      return 'normal';
    case 'italic':
      return 'bolditalic';
    case 'bolditalic':
      return 'italic';
  }
}

function toggleItalic(s: InlineStyle): InlineStyle {
  switch (s) {
    case 'normal':
      return 'italic';
    case 'italic':
      return 'normal';
    case 'bold':
      return 'bolditalic';
    case 'bolditalic':
      return 'bold';
  }
}

/** Remove inline markdown markers for contexts that don't render them. */
function stripInlineMarkers(s: string): string {
  return s.replace(/\*\*/g, '').replace(/(^|\W)_([^_]+)_(?=\W|$)/g, '$1$2');
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
