'use client';

/**
 * BriefMarkdown — a minimal, safe markdown renderer for the compass daily
 * brief.
 *
 * The briefing model (POST /api/v1/briefing) emits light markdown — a heading,
 * a paragraph or two, the occasional bullet list, **bold** / *italic*.
 * CompassToday used to dump that string raw into a `white-space: pre-wrap`
 * <p>, so "# Morning Briefing — …" and "**…**" rendered as literal characters.
 * This renders the markdown as real elements instead.
 *
 * It deliberately supports only the small subset a ~150-word brief uses:
 * headings (#, ##, ###), unordered/simple-ordered lists, paragraphs, and inline
 * bold/italic. No raw HTML is ever injected — every leaf is React text (which
 * React escapes), so there is no XSS surface even though the source is LLM
 * output. The date substitution (`[Date]` → today) happens upstream in
 * useDailyBriefing.fillBriefDate before the text ever reaches here.
 */

import React from 'react';

export type BriefBlock =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] };

/**
 * Pure: split brief markdown into block tokens. Exported (and unit-tested)
 * separately from the component so the parse is verifiable without a DOM.
 */
export function parseBrief(input: string): BriefBlock[] {
  const blocks: BriefBlock[] = [];
  const lines = (input ?? '').replace(/\r\n/g, '\n').split('\n');
  let para: string[] = [];
  let list: string[] = [];

  const flushPara = () => {
    if (para.length) {
      blocks.push({ kind: 'paragraph', text: para.join(' ').trim() });
      para = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push({ kind: 'list', items: list.slice() });
      list = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    const bullet = line.match(/^[-*+]\s+(.+)$/);
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);

    if (heading) {
      flushPara();
      flushList();
      blocks.push({ kind: 'heading', level: Math.min(heading[1].length, 3), text: heading[2].trim() });
    } else if (bullet) {
      flushPara();
      list.push(bullet[1].trim());
    } else if (ordered) {
      flushPara();
      list.push(ordered[1].trim());
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return blocks;
}

/** Inline **bold** / *italic* / _italic_ → React nodes (plain text otherwise). */
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[2] != null) {
      out.push(<strong key={`${keyBase}-s${i}`}>{m[2]}</strong>);
    } else {
      out.push(<em key={`${keyBase}-e${i}`}>{m[3] ?? m[4]}</em>);
    }
    last = m.index + m[0].length;
    i += 1;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function BriefMarkdown({ text }: { text: string }) {
  const blocks = parseBrief(text);
  return (
    <div className="today-brief">
      {blocks.map((b, i) => {
        if (b.kind === 'heading') {
          return (
            <p key={`h${i}`} className={`today-brief-h today-brief-h${b.level}`}>
              {renderInline(b.text, `h${i}`)}
            </p>
          );
        }
        if (b.kind === 'list') {
          return (
            <ul key={`l${i}`} className="today-brief-list">
              {b.items.map((it, j) => (
                <li key={`l${i}-${j}`}>{renderInline(it, `l${i}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={`p${i}`} className="today-brief-p">
            {renderInline(b.text, `p${i}`)}
          </p>
        );
      })}
    </div>
  );
}

export default BriefMarkdown;
