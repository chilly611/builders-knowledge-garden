'use client';

/**
 * CostExplainerClient — DIY-LANE plain-English budget walkthrough.
 * ===============================================================
 *
 * Reads the active project's `project_budget_lines` via /api/v1/projects/budget-lines
 * and renders each row with:
 *   - the CSI code's plain-English label ("Concrete" instead of "03 Concrete")
 *   - the budgeted amount
 *   - one-sentence "why it costs that" explainer
 *
 * Explainers come from src/data/csi-plain-english.json — pre-computed rather
 * than AI-generated so behavior is deterministic across all demo projects.
 * If a row's csi_division doesn't match anything in the file, we fall back
 * to a generic "Other costs" label and skip the explainer.
 *
 * At the bottom: total with a $/sf badge (using CostPerSquareFootBadge from
 * COCKPIT-FIXES) and a "Why does this cost so much?" expander with general
 * construction-cost education.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import csiPlainEnglish from '@/data/csi-plain-english.json';
import CostPerSquareFootBadge from '@/design-system/components/CostPerSquareFootBadge';

interface CsiPlainEntry {
  csi_prefix: string;
  label: string;
  plain_label: string;
  explainer: string;
}

interface BudgetLine {
  id: string;
  project_id: string;
  csi_division: string | null;
  // legacy column name in older rows
  division?: string | null;
  description: string | null;
  budgeted: number | null;
  committed?: number | null;
  actual_spent?: number | null;
}

interface ProjectFacts {
  id: string;
  name: string | null;
  sqft: string | number | null;
  jurisdiction: string | null;
}

const COLORS = {
  paper:    '#FAF8F2',
  ink:      '#1A1A1A',
  graphite: '#3D3D3D',
  faded:    '#B8B5AC',
  rule:     '#D8D2C2',
  green:    '#1D9E75',
  amber:    '#C4A44A',
  warm:     '#D85A30',
};

/** Match a budget line's CSI division string against the plain-English map. */
function findPlainEntry(division: string | null | undefined): CsiPlainEntry | null {
  if (!division) return null;
  const num = String(division).trim().slice(0, 2);
  return (csiPlainEnglish as CsiPlainEntry[]).find((e) => e.csi_prefix === num) || null;
}

function formatMoney(n: number): string {
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export default function CostExplainerClient() {
  const search = useSearchParams();
  const projectId = search.get('project');

  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [project, setProject] = useState<ProjectFacts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [whyExpanded, setWhyExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!projectId) {
        setLoading(false);
        return;
      }
      try {
        const { data: sess } = await supabase.auth.getSession();
        const tok = sess.session?.access_token;
        const headers = tok ? { Authorization: `Bearer ${tok}` } : undefined;

        const [linesRes, projRes] = await Promise.all([
          fetch(`/api/v1/projects/budget-lines?projectId=${encodeURIComponent(projectId)}`, { headers }),
          fetch(`/api/v1/projects?id=${encodeURIComponent(projectId)}`, { headers }),
        ]);

        if (cancelled) return;

        if (linesRes.ok) {
          const json = await linesRes.json();
          setLines(Array.isArray(json.lines) ? json.lines : []);
        } else {
          setError('Could not load your budget. Try refreshing.');
        }
        if (projRes.ok) {
          const pj = await projRes.json();
          if (pj && pj.id) setProject(pj as ProjectFacts);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unexpected error.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [projectId]);

  // Group lines by plain-English category so multiple "03 Concrete - footings"
  // and "03 Concrete - slab" rows roll up to a single "Concrete" card.
  const grouped = useMemo(() => {
    const groups = new Map<string, {
      entry: CsiPlainEntry | null;
      lines: BudgetLine[];
      total: number;
    }>();
    for (const line of lines) {
      const division = line.csi_division || line.division || null;
      const entry = findPlainEntry(division);
      const key = entry?.csi_prefix ?? 'other';
      const existing = groups.get(key);
      const amount = Number(line.budgeted) || 0;
      if (existing) {
        existing.lines.push(line);
        existing.total += amount;
      } else {
        groups.set(key, { entry, lines: [line], total: amount });
      }
    }
    return Array.from(groups.entries())
      .map(([key, g]) => ({ key, ...g }))
      .sort((a, b) => b.total - a.total);
  }, [lines]);

  const grandTotal = useMemo(
    () => lines.reduce((sum, l) => sum + (Number(l.budgeted) || 0), 0),
    [lines]
  );

  if (!projectId) {
    return (
      <main style={pageWrap}>
        <div style={card}>
          <h1 style={h1Style}>Pick a project first</h1>
          <p style={{ ...bodyText, marginTop: 12 }}>
            This walkthrough explains your budget line by line — but it needs a
            project to read from.
          </p>
          <Link href="/killerapp" style={ctaPrimary}>← Back to projects</Link>
        </div>
      </main>
    );
  }

  return (
    <main style={pageWrap}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={card}>
          <p style={eyebrow}>STAGE 1 · SIZE UP</p>
          <h1 style={h1Style}>Why does it cost what it does?</h1>
          <p style={{ ...bodyText, marginTop: 12 }}>
            Construction estimates look intimidating because they&apos;re
            organized by code (the {pillEl('CSI')} numbering system contractors
            use). Below is the same budget, in plain English — every category
            explained, every line item visible.
          </p>

          {loading && (
            <p style={{ ...bodyText, marginTop: 24, color: COLORS.faded }}>
              Loading your budget…
            </p>
          )}

          {error && (
            <div role="alert" style={errorCard}>{error}</div>
          )}

          {!loading && !error && lines.length === 0 && (
            <div style={{ marginTop: 24, padding: 20, background: COLORS.paper, borderRadius: 8, border: `1px solid ${COLORS.rule}` }}>
              <p style={{ ...bodyText, fontWeight: 600 }}>No budget lines yet.</p>
              <p style={{ ...bodyText, fontSize: 14, color: COLORS.faded, marginTop: 6 }}>
                Once you (or the AI estimator) push numbers to this project, they&apos;ll appear here.
              </p>
              <Link href={`/killerapp/workflows/estimating?project=${encodeURIComponent(projectId)}`} style={{ ...ctaPrimary, display: 'inline-block', marginTop: 12 }}>
                Run an estimate →
              </Link>
            </div>
          )}

          {!loading && grouped.length > 0 && (
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {grouped.map((g) => {
                const isExpanded = expandedRow === g.key;
                const label = g.entry?.plain_label || 'Other costs';
                return (
                  <div
                    key={g.key}
                    style={{
                      border: `1px solid ${COLORS.rule}`,
                      borderRadius: 10,
                      background: '#FFFFFF',
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedRow(isExpanded ? null : g.key)}
                      style={{
                        width: '100%',
                        padding: '16px 18px',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.ink }}>
                          {label}
                        </div>
                        {g.entry && (
                          <div style={{ fontSize: 12, color: COLORS.faded, marginTop: 2 }}>
                            {g.entry.label} · {g.lines.length} line{g.lines.length === 1 ? '' : 's'}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.ink, whiteSpace: 'nowrap' }}>
                        {formatMoney(g.total)}
                        <span style={{ fontSize: 11, marginLeft: 8, color: COLORS.faded }}>
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </button>
                    {isExpanded && (
                      <div style={{ padding: '0 18px 18px', borderTop: `1px solid ${COLORS.rule}`, paddingTop: 14 }}>
                        {g.entry && (
                          <p style={{ ...bodyText, fontSize: 14, color: COLORS.graphite, marginBottom: 14 }}>
                            {g.entry.explainer}
                          </p>
                        )}
                        {!g.entry && (
                          <p style={{ ...bodyText, fontSize: 13, color: COLORS.faded, marginBottom: 14, fontStyle: 'italic' }}>
                            No plain-English mapping for this category yet — these are
                            the raw line items.
                          </p>
                        )}
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <tbody>
                            {g.lines.map((line) => (
                              <tr key={line.id} style={{ borderTop: `1px solid ${COLORS.rule}` }}>
                                <td style={{ padding: '8px 0', color: COLORS.graphite }}>
                                  {line.description || '—'}
                                </td>
                                <td style={{ padding: '8px 0', textAlign: 'right', whiteSpace: 'nowrap', color: COLORS.ink, fontWeight: 600 }}>
                                  {formatMoney(Number(line.budgeted) || 0)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Total + $/sf badge */}
          {!loading && grandTotal > 0 && (
            <div
              style={{
                marginTop: 24,
                padding: '20px 22px',
                background: COLORS.paper,
                border: `1px solid ${COLORS.rule}`,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: COLORS.faded, fontWeight: 700 }}>
                  Total budgeted
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.ink, marginTop: 4 }}>
                  {formatMoney(grandTotal)}
                </div>
              </div>
              {project?.sqft && (
                <CostPerSquareFootBadge
                  cost={grandTotal}
                  sqft={project.sqft}
                  verbose
                />
              )}
            </div>
          )}

          {/* Why-does-this-cost-so-much expander */}
          <div style={{ marginTop: 24 }}>
            <button
              type="button"
              onClick={() => setWhyExpanded((v) => !v)}
              style={{
                width: '100%',
                padding: '14px 18px',
                background: 'transparent',
                border: `1px solid ${COLORS.rule}`,
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                color: COLORS.ink,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>Why does construction cost this much?</span>
              <span style={{ color: COLORS.faded }}>{whyExpanded ? '▲' : '▼'}</span>
            </button>
            {whyExpanded && (
              <div style={{ padding: '18px 22px', background: '#FFFFFF', border: `1px solid ${COLORS.rule}`, borderRadius: 10, marginTop: 8 }}>
                <p style={{ ...bodyText, marginBottom: 14 }}>
                  Three things drive most of the cost:
                </p>
                <ol style={{ margin: 0, paddingLeft: 22, color: COLORS.graphite, fontSize: 15, lineHeight: 1.6 }}>
                  <li style={{ marginBottom: 12 }}>
                    <strong style={{ color: COLORS.ink }}>Labor.</strong> California construction
                    labor runs $80-$180/hour fully loaded (wages + workers&apos; comp + benefits + GC
                    markup). Skilled trades (electricians, plumbers, finish carpenters) cost more
                    because there&apos;s a shortage of them — and that shortage has been getting
                    worse for 20 years.
                  </li>
                  <li style={{ marginBottom: 12 }}>
                    <strong style={{ color: COLORS.ink }}>Materials.</strong> Lumber, steel,
                    concrete, and copper all swing 15-40% year-over-year with global commodity
                    markets. Plus you pay for everything to ship to the site, get unloaded, and
                    move from staging to install.
                  </li>
                  <li style={{ marginBottom: 12 }}>
                    <strong style={{ color: COLORS.ink }}>Code and compliance.</strong> Title 24
                    energy, seismic bracing, fire sprinklers, ADA, accessibility, low-flow
                    plumbing — every CA project carries 10-20% extra cost vs the same building
                    in a less-regulated state. (That cost mostly comes back in lower utility
                    bills and safer buildings, but it&apos;s real money up-front.)
                  </li>
                </ol>
                <p style={{ ...bodyText, marginTop: 16 }}>
                  The biggest single thing you can do to control cost: <strong>lock the scope
                  early</strong>. Every change order during construction costs 2-5x what it
                  would have cost to design correctly in the first place.
                </p>
              </div>
            )}
          </div>

          <div style={{ marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link
              href={`/killerapp?project=${encodeURIComponent(projectId)}&cockpit=diy`}
              style={ctaPrimary}
            >
              ← Back to my project
            </Link>
            <Link
              href={`/killerapp/workflows/find-a-gc?project=${encodeURIComponent(projectId)}`}
              style={ctaSecondary}
            >
              Find a contractor →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function pillEl(text: string) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        background: 'rgba(196,164,74,0.18)',
        color: '#7A6020',
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: 0.3,
      }}
    >
      {text}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const pageWrap: React.CSSProperties = {
  minHeight: '100vh',
  background: COLORS.paper,
  padding: '64px 24px',
  fontFamily: "var(--font-archivo, 'Archivo', sans-serif)",
  color: COLORS.ink,
};

const card: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: 12,
  padding: '36px 32px',
  border: `1px solid ${COLORS.rule}`,
  boxShadow: '0 1px 0 rgba(0,0,0,0.02), 0 8px 24px rgba(0,0,0,0.04)',
};

const eyebrow: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.14em',
  color: COLORS.amber,
  textTransform: 'uppercase',
};

const h1Style: React.CSSProperties = {
  margin: '8px 0 0',
  fontFamily: "var(--font-archivo-black, 'Archivo Black', sans-serif)",
  fontSize: 30,
  lineHeight: 1.2,
  color: COLORS.ink,
};

const bodyText: React.CSSProperties = {
  margin: 0,
  fontSize: 15,
  lineHeight: 1.6,
  color: COLORS.graphite,
};

const errorCard: React.CSSProperties = {
  padding: 12,
  marginTop: 16,
  borderRadius: 6,
  background: 'rgba(216, 90, 48, 0.08)',
  border: `1px solid rgba(216, 90, 48, 0.35)`,
  color: COLORS.warm,
  fontSize: 14,
  fontWeight: 600,
};

const ctaPrimary: React.CSSProperties = {
  padding: '12px 20px',
  background: COLORS.green,
  color: '#FFFFFF',
  borderRadius: 6,
  fontSize: 15,
  fontWeight: 700,
  textDecoration: 'none',
};

const ctaSecondary: React.CSSProperties = {
  padding: '12px 20px',
  background: 'transparent',
  color: COLORS.ink,
  border: `1px solid ${COLORS.rule}`,
  borderRadius: 6,
  fontSize: 15,
  fontWeight: 600,
  textDecoration: 'none',
};
