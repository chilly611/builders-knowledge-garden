/**
 * markdownToJsx
 * ==============
 * Lightweight markdown-to-JSX renderer for specialist output.
 * Supports:
 * - Headers (# ## ###)
 * - Tables (markdown grid format)
 * - Bold (**text**)
 * - Italic (*text*)
 * - Links ([text](url) → plain links; action:/path → buttons)
 * - Bullet lists
 * - "What next?" sections (convert to button rows)
 * - Line breaks
 *
 * Does NOT support: code blocks, nested formatting, complex markdown.
 * Safe for trusted input (specialist responses).
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { colors, fontSizes, fontWeights, spacing, fonts } from '../../tokens';

/**
 * ActionButton
 * ============
 * Inline client component for rendering action: links as styled pill buttons.
 * Uses router.push() for client-side navigation instead of full page reload.
 *
 * INP fix (2026-05-06): Replaced window.location.href with useRouter().push()
 * to eliminate the 1-4 second full-page reload on click. Client-side navigation
 * is virtually instant and preserves state.
 */
function ActionButton({ label, action }: { label: string; action: string }) {
  const router = useRouter();

  const handleClick = () => {
    try {
      if (typeof window === 'undefined') return;

      // Project Spine v1 (2026-05-06 fix): preserve ?project=<id> across
      // AI-generated action buttons. Without this, buttons like
      // "Check codes" navigate to /killerapp/workflows/code-compliance
      // with no project_id, the workflow hook redirects back to /killerapp,
      // and from the user's POV "the page just refreshes."
      const currentParams = new URLSearchParams(window.location.search);
      const projectId = currentParams.get('project');

      let target = action;
      if (projectId && action.startsWith('/') && !action.includes('?project=')) {
        const sep = action.includes('?') ? '&' : '?';
        target = `${action}${sep}project=${encodeURIComponent(projectId)}`;
      }

      router.push(target);
    } catch (err) {
      console.error('Failed to navigate:', err);
    }
  };

  return (
    <button
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${spacing[1]} ${spacing[2]}`, // 10px-16px equivalent (4px + 8px padding)
        borderRadius: '8px',
        fontSize: fontSizes.sm, // 14px
        fontWeight: fontWeights.semibold,
        color: colors.navy,
        backgroundColor: colors.trace,
        border: `2px solid var(--stage-accent, ${colors.brass})`,
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        fontFamily: fonts.body,
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        const target = e.currentTarget as HTMLButtonElement;
        target.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        const target = e.currentTarget as HTMLButtonElement;
        target.style.transform = 'scale(1)';
      }}
    >
      {label}
    </button>
  );
}

export function markdownToJsx(markdown: string): React.ReactNode[] {
  const lines = markdown.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines (but track them)
    if (!line.trim()) {
      elements.push(
        <div key={`spacer-${i}`} style={{ height: spacing[2] }} />
      );
      i++;
      continue;
    }

    // Check for "What next?" section with action buttons
    if (line.trim() === '**What next?**') {
      // Look ahead for bullet list of action links
      let j = i + 1;
      const actionItems: Array<{ label: string; action: string }> = [];

      // Skip empty line after header
      if (j < lines.length && !lines[j].trim()) {
        j++;
      }

      // Collect bullet items with action: links
      while (j < lines.length && lines[j].match(/^\s*[-*]\s+/)) {
        const match = lines[j].match(/^\s*[-*]\s+\[(.+?)\]\(action:(.+?)\)$/);
        if (match) {
          actionItems.push({
            label: match[1],
            action: match[2],
          });
          j++;
        } else {
          break;
        }
      }

      // If we found action items, render as button row
      if (actionItems.length > 0) {
        elements.push(
          <div
            key={`whatnext-title-${i}`}
            style={{
              fontSize: fontSizes.base,
              fontWeight: fontWeights.semibold,
              color: colors.navy,
              marginTop: spacing[3],
              marginBottom: spacing[2],
              fontFamily: fonts.body,
            }}
          >
            What next?
          </div>
        );

        elements.push(
          <div
            key={`whatnext-buttons-${i}`}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: spacing[2],
              marginBottom: spacing[3],
            }}
          >
            {actionItems.map((item, idx) => (
              <ActionButton key={idx} label={item.label} action={item.action} />
            ))}
          </div>
        );

        i = j;
        continue;
      }
    }

    // Headers (# ## ###)
    const headerMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length as 1 | 2 | 3;
      const text = headerMatch[2];
      const headerSizes = {
        1: fontSizes.lg,
        2: fontSizes.base,
        3: fontSizes.sm,
      };
      const headerWeights = {
        1: fontWeights.bold,
        2: fontWeights.semibold,
        3: fontWeights.semibold,
      };
      elements.push(
        <div
          key={`header-${i}`}
          style={{
            fontSize: headerSizes[level],
            fontWeight: headerWeights[level],
            color: colors.ink[900],
            marginTop: level === 1 ? spacing[4] : spacing[3],
            marginBottom: spacing[2],
            fontFamily: fonts.heading,
          }}
        >
          {renderInlineMarkdown(text)}
        </div>
      );
      i++;
      continue;
    }

    // Table detection (must have |)
    if (line.includes('|')) {
      const tableLines = [line];
      let j = i + 1;
      // Collect table rows
      while (j < lines.length && lines[j].trim().includes('|')) {
        tableLines.push(lines[j]);
        j++;
      }

      if (tableLines.length >= 3) {
        // Assume row 2 is separator, rows 0+ and 2+ are data
        const parsed = parseMarkdownTable(tableLines);
        if (parsed) {
          elements.push(
            <div key={`table-${i}`} style={{ marginTop: spacing[3], marginBottom: spacing[3], overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: fontSizes.sm,
                  fontFamily: fonts.body,
                }}
              >
                {parsed.header && (
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${colors.ink[200]}` }}>
                      {parsed.header.map((cell, idx) => (
                        <th
                          key={idx}
                          style={{
                            padding: `${spacing[2]} ${spacing[3]}`,
                            textAlign: 'left',
                            fontWeight: fontWeights.semibold,
                            color: colors.ink[900],
                            backgroundColor: colors.ink[50],
                          }}
                        >
                          {renderInlineMarkdown(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {parsed.rows.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      style={{
                        borderBottom: `1px solid ${colors.ink[100]}`,
                        backgroundColor: rowIdx % 2 === 0 ? '#FFFFFF' : colors.ink[50],
                      }}
                    >
                      {row.map((cell, cellIdx) => (
                        <td
                          key={cellIdx}
                          style={{
                            padding: `${spacing[2]} ${spacing[3]}`,
                            color: colors.ink[700],
                          }}
                        >
                          {renderInlineMarkdown(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          i = j;
          continue;
        }
      }
    }

    // Bullet list (- or *)
    if (line.match(/^\s*[-*]\s+/)) {
      const listItems: string[] = [];
      let j = i;
      while (j < lines.length && lines[j].match(/^\s*[-*]\s+/)) {
        const match = lines[j].match(/^\s*[-*]\s+(.+)$/);
        if (match) {
          listItems.push(match[1]);
        }
        j++;
      }

      elements.push(
        <ul
          key={`list-${i}`}
          style={{
            margin: `${spacing[3]} 0`,
            paddingLeft: spacing[6],
            listStyle: 'disc',
            color: colors.ink[700],
            fontSize: fontSizes.sm,
          }}
        >
          {listItems.map((item, idx) => (
            <li key={idx} style={{ marginBottom: spacing[1] }}>
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
      i = j;
      continue;
    }

    // Regular paragraph
    elements.push(
      <div
        key={`para-${i}`}
        style={{
          color: colors.ink[900],
          fontSize: fontSizes.sm,
          lineHeight: '1.6',
          marginBottom: spacing[2],
          fontFamily: fonts.body,
        }}
      >
        {renderInlineMarkdown(line)}
      </div>
    );
    i++;
  }

  return elements;
}

/**
 * Render inline markdown: **bold**, *italic*, [link](url), [action](action:/path)
 */
function renderInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Pattern: (**text**), (*text*), or ([text](url)) or ([text](action:/path))
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((.+?)\)|__(.+?)__|_(.+?)_/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    if (match[1]) {
      // **bold**
      parts.push(
        <strong key={`bold-${match.index}`} style={{ fontWeight: fontWeights.bold }}>
          {match[1]}
        </strong>
      );
    } else if (match[2] || match[6]) {
      // *italic* or _italic_
      parts.push(
        <em key={`italic-${match.index}`} style={{ fontStyle: 'italic' }}>
          {match[2] || match[6]}
        </em>
      );
    } else if (match[3] && match[4]) {
      // [text](url) or [text](action:/path)
      const url = match[4];
      if (url.startsWith('action:')) {
        // Action link → render as button
        const action = url.substring(7); // Remove 'action:' prefix
        parts.push(
          <ActionButton key={`action-${match.index}`} label={match[3]} action={action} />
        );
      } else {
        // Regular link → render as anchor
        parts.push(
          <a
            key={`link-${match.index}`}
            href={url}
            style={{
              color: colors.brass,
              textDecoration: 'underline',
              fontWeight: fontWeights.semibold,
            }}
            target="_blank"
            rel="noopener noreferrer"
          >
            {match[3]}
          </a>
        );
      }
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length === 0 ? text : parts;
}

/**
 * Parse markdown table into { header: string[], rows: string[][] }
 * Expects format:
 * | col1 | col2 |
 * |------|------|
 * | data | data |
 */
function parseMarkdownTable(
  lines: string[]
): { header: string[]; rows: string[][] } | null {
  if (lines.length < 2) return null;

  // Extract header (first row)
  const headerCells = lines[0]
    .split('|')
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);

  if (headerCells.length === 0) return null;

  // Validate separator row (second row should be dashes)
  const separatorRow = lines[1];
  if (!separatorRow.includes('---') && !separatorRow.includes('---')) {
    return null;
  }

  // Extract data rows (skip header and separator)
  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    const cells = lines[i]
      .split('|')
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0);

    if (cells.length === headerCells.length) {
      rows.push(cells);
    }
  }

  return { header: headerCells, rows };
}
