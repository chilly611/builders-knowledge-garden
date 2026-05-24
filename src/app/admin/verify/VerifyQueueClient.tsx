'use client';

/**
 * VerifyQueueClient (ATTEST-WIRE, 2026-05-24)
 * ============================================
 * Reviewer-facing queue. Fetches a page of 25 unverified, published
 * knowledge_entities and renders one card per row. The reviewer clicks
 * "Open in UpCodes" → reads the canonical text in the licensed source
 * → returns to this page → clicks Verify ✓ to stamp the attestation.
 *
 * Filters (client-side narrowing of the same query):
 *   - entity_type dropdown
 *   - jurisdiction dropdown (US-CA, US-FED, etc.)
 *   - search box (matches slug or title)
 *
 * Progress widget: live count of "X of N verified" + ETA assuming ~30s/row.
 *
 * "Skip" parks the row in localStorage so it doesn't show again today —
 * purely client-side, no DB write, so a fresh browser sees the full queue.
 *
 * LaneGate guards the UI; the API enforces the server-side allowlist
 * regardless of whether the UI is rendered.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import LaneGate from '@/components/LaneGate';

const COLORS = {
  paper: '#FAF8F2',
  ink: '#1A1A1A',
  graphite: '#3D3D3D',
  faded: '#B8B5AC',
  rule: '#D8D2C2',
  green: '#1D9E75',
  red: '#E8443A',
  amber: '#C4A44A',
  teal: '#0E7F8C',
  robin: '#0F6B65',
};

const PAGE_SIZE = 25;
const SECONDS_PER_ROW = 30;
const SKIP_STORAGE_KEY = 'bkg.verify.skipped';
const SKIP_TTL_HOURS = 24;

const ENTITY_TYPES: Array<{ value: string; label: string }> = [
  { value: '', label: 'All entity types' },
  { value: 'building_code', label: 'Building code' },
  { value: 'code_section', label: 'Code section' },
  { value: 'safety_regulation', label: 'Safety regulation' },
  { value: 'standard', label: 'Standard' },
  { value: 'material', label: 'Material' },
  { value: 'safety_rule', label: 'Safety rule' },
];

// Common jurisdictions in the corpus. Anything outside this list still
// works — the dropdown is a hint, not a hard constraint. Detected
// jurisdictions are added dynamically once the first page loads.
const KNOWN_JURISDICTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All jurisdictions' },
  { value: 'us', label: 'US (federal / model code)' },
  { value: 'us-ca', label: 'California' },
  { value: 'us-tx', label: 'Texas' },
  { value: 'us-fl', label: 'Florida' },
  { value: 'us-ny', label: 'New York' },
];

interface KnowledgeRow {
  id: string;
  slug: string | null;
  entity_type: string | null;
  title: unknown;
  summary: unknown;
  jurisdiction_ids: string[] | null;
  source_urls: string[] | null;
  metadata: Record<string, unknown> | null;
  manually_verified_at: string | null;
}

interface SkipMap {
  [id: string]: number; // timestamp ms when skipped
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function unwrap(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (typeof o.en === 'string') return o.en;
    return JSON.stringify(o);
  }
  return String(value);
}

function loadSkips(): SkipMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(SKIP_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SkipMap;
    const cutoff = Date.now() - SKIP_TTL_HOURS * 3600_000;
    const fresh: SkipMap = {};
    for (const [id, ts] of Object.entries(parsed)) {
      if (typeof ts === 'number' && ts >= cutoff) fresh[id] = ts;
    }
    return fresh;
  } catch {
    return {};
  }
}

function saveSkips(map: SkipMap) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SKIP_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota or private mode — silent */
  }
}

/**
 * Build a best-effort UpCodes search URL for a row. UpCodes uses
 * publication slugs (`/viewer/<code>/<section>`); we don't always know
 * the exact viewer path so we fall back to their search:
 *
 *   https://up.codes/s/<term>
 *
 * The reviewer adjusts in-app if the deep link missed. We optimize for
 * "land on something close enough that you don't have to type the
 * section number from scratch".
 */
function upCodesUrl(row: KnowledgeRow): string {
  const title = unwrap(row.title);
  const slug = row.slug || '';
  // Prefer section-number tokens out of the slug ("nec-210-52-c-5" →
  // search "210.52(C)(5)"). Falls back to the human title.
  const sectionMatch = slug.match(/^([a-z]+)-(\d[\d-]*[a-z\d-]*)$/i);
  let term: string;
  if (sectionMatch) {
    const code = sectionMatch[1];
    // Reverse the dash-collapse: "210-52-c-5" → "210.52(C)(5)" is
    // ambiguous so we just dot-join the numeric runs and let UpCodes
    // search handle the rest.
    const section = sectionMatch[2].replace(/-/g, '.');
    term = `${code.toUpperCase()} ${section}`;
  } else {
    term = title || slug;
  }
  return `https://up.codes/s/${encodeURIComponent(term)}`;
}

// ------------------------------------------------------------
// Layout pieces
// ------------------------------------------------------------

const pageWrap: React.CSSProperties = {
  minHeight: '100vh',
  background: COLORS.paper,
  padding: '40px 24px 80px',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  color: COLORS.ink,
};

const container: React.CSSProperties = {
  maxWidth: 980,
  margin: '0 auto',
};

const card: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: 12,
  padding: '24px 28px',
  border: `1px solid ${COLORS.rule}`,
  marginBottom: 18,
};

const eyebrow: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  letterSpacing: '0.14em',
  fontWeight: 700,
  color: COLORS.amber,
  textTransform: 'uppercase',
};

const h1Style: React.CSSProperties = {
  margin: '6px 0 14px',
  fontSize: 28,
  lineHeight: 1.2,
};

const buttonBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  border: `1px solid ${COLORS.rule}`,
  background: '#FFFFFF',
  color: COLORS.ink,
  textDecoration: 'none',
};

const buttonPrimary: React.CSSProperties = {
  ...buttonBase,
  background: COLORS.robin,
  borderColor: COLORS.robin,
  color: '#FFFFFF',
};

const buttonDanger: React.CSSProperties = {
  ...buttonBase,
  background: '#FFFFFF',
  borderColor: COLORS.rule,
  color: COLORS.graphite,
};

const inputStyle: React.CSSProperties = {
  ...buttonBase,
  cursor: 'text',
  padding: '8px 12px',
  minWidth: 220,
  fontWeight: 400,
};

// ------------------------------------------------------------
// LaneGate wrapper
// ------------------------------------------------------------

function NotForYourRole() {
  return (
    <main style={pageWrap}>
      <div style={{ ...container, ...card }}>
        <p style={eyebrow}>OWNERS ONLY</p>
        <h1 style={h1Style}>Verification queue is for org owners.</h1>
        <p style={{ color: COLORS.graphite, lineHeight: 1.55 }}>
          Manual attestation requires a seat at a licensed external source
          (e.g. UpCodes Essentials) and authority to stamp knowledge
          entities as verified. Ask the org owner to grant access.
        </p>
      </div>
    </main>
  );
}

export default function VerifyQueueClient() {
  return (
    <LaneGate
      allow={['owner']}
      fallback={<NotForYourRole />}
      loadingFallback={<main style={pageWrap} />}
    >
      <VerifyQueuePanel />
    </LaneGate>
  );
}

// ------------------------------------------------------------
// Main panel
// ------------------------------------------------------------

function VerifyQueuePanel() {
  const [rows, setRows] = useState<KnowledgeRow[]>([]);
  const [totalUnverified, setTotalUnverified] = useState<number | null>(null);
  const [totalVerified, setTotalVerified] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [entityType, setEntityType] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState<SkipMap>({});

  useEffect(() => {
    setSkipped(loadSkips());
  }, []);

  // Debounce search input so we don't fire a query per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let qb = supabase
        .from('knowledge_entities')
        .select(
          'id, slug, entity_type, title, summary, jurisdiction_ids, source_urls, metadata, manually_verified_at',
          { count: 'exact' }
        )
        .is('manually_verified_at', null)
        .eq('status', 'published')
        .order('updated_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (entityType) qb = qb.eq('entity_type', entityType);
      if (jurisdiction) qb = qb.contains('jurisdiction_ids', [jurisdiction]);
      if (debouncedSearch) {
        // Slug ilike OR title->>en ilike. PostgREST `or` lets us OR two
        // filters in one round-trip.
        const term = debouncedSearch.replace(/[%,]/g, '');
        qb = qb.or(`slug.ilike.%${term}%,search_text.ilike.%${term}%`);
      }

      const { data, error: err, count } = await qb;
      if (err) {
        setError(err.message);
        return;
      }
      setRows((data ?? []) as KnowledgeRow[]);
      setTotalUnverified(count ?? null);

      // Fetch verified count in a separate cheap HEAD request — only on
      // first page load, then refresh after each attest.
      const { count: vcount } = await supabase
        .from('knowledge_entities')
        .select('id', { count: 'exact', head: true })
        .not('manually_verified_at', 'is', null)
        .eq('status', 'published');
      setTotalVerified(vcount ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [page, entityType, jurisdiction, debouncedSearch]);

  useEffect(() => {
    void fetchPage();
  }, [fetchPage]);

  const visibleRows = useMemo(() => {
    return rows.filter((r) => !skipped[r.id]);
  }, [rows, skipped]);

  const attest = useCallback(
    async (row: KnowledgeRow) => {
      setBusyIds((s) => new Set(s).add(row.id));
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        if (!token) {
          setError('Not signed in.');
          return;
        }
        const res = await fetch(
          `/api/v1/knowledge-entities/${row.id}/attest`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ source: 'upcodes-essentials' }),
          }
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(
            (json as { error?: string })?.error || `Attest failed (${res.status})`
          );
          return;
        }
        // Optimistic: remove from current page and bump counters.
        setRows((prev) => prev.filter((r) => r.id !== row.id));
        setTotalUnverified((n) => (n != null ? Math.max(0, n - 1) : n));
        setTotalVerified((n) => (n != null ? n + 1 : n));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Network error');
      } finally {
        setBusyIds((s) => {
          const next = new Set(s);
          next.delete(row.id);
          return next;
        });
      }
    },
    []
  );

  const skip = useCallback((row: KnowledgeRow) => {
    setSkipped((prev) => {
      const next = { ...prev, [row.id]: Date.now() };
      saveSkips(next);
      return next;
    });
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const totalRows = (totalUnverified ?? 0) + (totalVerified ?? 0);
  const verifiedPct =
    totalRows > 0 ? Math.round(((totalVerified ?? 0) / totalRows) * 1000) / 10 : 0;
  const etaSec = (totalUnverified ?? 0) * SECONDS_PER_ROW;
  const etaLabel =
    etaSec === 0
      ? 'queue empty'
      : etaSec < 60
      ? `${etaSec}s`
      : etaSec < 3600
      ? `~${Math.round(etaSec / 60)} min`
      : `~${(etaSec / 3600).toFixed(1)} h`;

  return (
    <main style={pageWrap}>
      <div style={container}>
        <header style={card}>
          <p style={eyebrow}>ATTEST-WIRE · OWNERS ONLY</p>
          <h1 style={h1Style}>Verify knowledge entities</h1>
          <p style={{ margin: 0, color: COLORS.graphite, lineHeight: 1.55 }}>
            Open each row in UpCodes (or the licensed source of your
            choice), confirm the title and summary match, and click
            Verify ✓. Each attestation stamps the row, fires the audit
            log, and lifts the verified-source count.
          </p>

          {/* Progress widget */}
          <div
            style={{
              marginTop: 18,
              padding: '14px 16px',
              background: '#FAF8F2',
              borderRadius: 8,
              border: `1px solid ${COLORS.rule}`,
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              alignItems: 'baseline',
            }}
          >
            <strong style={{ fontSize: 22, color: COLORS.robin }}>
              {totalVerified ?? '—'}
            </strong>
            <span style={{ color: COLORS.graphite }}>
              of {totalRows || '—'} verified ({verifiedPct}%)
            </span>
            <span style={{ color: COLORS.faded }}>·</span>
            <span style={{ color: COLORS.graphite }}>
              {totalUnverified ?? '—'} remaining · est {etaLabel} at
              {' '}~{SECONDS_PER_ROW}s/row
            </span>
          </div>
        </header>

        {/* Filter bar */}
        <div
          style={{
            ...card,
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(0);
            }}
            style={inputStyle}
            aria-label="Filter by entity type"
          >
            {ENTITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={jurisdiction}
            onChange={(e) => {
              setJurisdiction(e.target.value);
              setPage(0);
            }}
            style={inputStyle}
            aria-label="Filter by jurisdiction"
          >
            {KNOWN_JURISDICTIONS.map((j) => (
              <option key={j.value} value={j.value}>
                {j.label}
              </option>
            ))}
          </select>
          <input
            type="search"
            placeholder="Search slug or text…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            style={inputStyle}
            aria-label="Search by slug or title"
          />
          <button
            type="button"
            style={buttonBase}
            onClick={() => {
              setSkipped({});
              saveSkips({});
            }}
            title="Clear today's skipped list"
          >
            Reset skipped ({Object.keys(skipped).length})
          </button>
        </div>

        {error && (
          <div
            style={{
              ...card,
              borderColor: COLORS.red,
              color: COLORS.red,
            }}
          >
            {error}
          </div>
        )}

        {loading && !rows.length && (
          <div style={{ ...card, color: COLORS.faded }}>Loading queue…</div>
        )}

        {!loading && visibleRows.length === 0 && (
          <div style={{ ...card, color: COLORS.graphite }}>
            <strong>Nothing to verify on this page.</strong> Try clearing
            filters or paging forward.
          </div>
        )}

        {visibleRows.map((row) => {
          const title = unwrap(row.title) || row.slug || row.id;
          const summary = unwrap(row.summary);
          const isOpen = expanded.has(row.id);
          const busy = busyIds.has(row.id);
          return (
            <article key={row.id} style={card} data-testid="verify-row">
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <Badge>{row.entity_type || 'unknown'}</Badge>
                {(row.jurisdiction_ids || []).map((j) => (
                  <Badge key={j} tone="teal">{j}</Badge>
                ))}
                <span
                  style={{
                    color: COLORS.faded,
                    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                    fontSize: 12,
                  }}
                >
                  {row.slug}
                </span>
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>{title}</h2>
              {summary && (
                <div style={{ marginBottom: 12 }}>
                  <p
                    style={{
                      margin: 0,
                      color: COLORS.graphite,
                      lineHeight: 1.55,
                      maxHeight: isOpen ? 'none' : 64,
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    {summary}
                  </p>
                  <button
                    type="button"
                    onClick={() => toggleExpand(row.id)}
                    style={{
                      marginTop: 6,
                      background: 'transparent',
                      border: 'none',
                      color: COLORS.teal,
                      cursor: 'pointer',
                      fontSize: 13,
                      padding: 0,
                    }}
                  >
                    {isOpen ? 'Collapse' : 'Expand'}
                  </button>
                </div>
              )}
              {(row.source_urls || []).length > 0 && (
                <ul
                  style={{
                    margin: '0 0 14px',
                    padding: 0,
                    listStyle: 'none',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  {(row.source_urls || []).map((u) => (
                    <li key={u}>
                      <a
                        href={u}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: COLORS.teal,
                          fontSize: 13,
                          textDecoration: 'underline',
                        }}
                      >
                        {u.replace(/^https?:\/\//, '').slice(0, 60)}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a
                  href={upCodesUrl(row)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={buttonBase}
                >
                  Open in UpCodes ↗
                </a>
                <button
                  type="button"
                  style={{
                    ...buttonPrimary,
                    opacity: busy ? 0.5 : 1,
                    cursor: busy ? 'wait' : 'pointer',
                  }}
                  disabled={busy}
                  onClick={() => void attest(row)}
                >
                  {busy ? 'Verifying…' : 'Verify ✓'}
                </button>
                <button
                  type="button"
                  style={buttonDanger}
                  onClick={() => skip(row)}
                  disabled={busy}
                >
                  Skip
                </button>
              </div>
            </article>
          );
        })}

        {/* Pagination */}
        <div
          style={{
            ...card,
            display: 'flex',
            gap: 8,
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            style={buttonBase}
            disabled={page === 0 || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            ← Previous
          </button>
          <span style={{ color: COLORS.faded }}>
            Page {page + 1}
            {totalUnverified != null
              ? ` of ~${Math.max(1, Math.ceil(totalUnverified / PAGE_SIZE))}`
              : ''}
          </span>
          <button
            type="button"
            style={buttonBase}
            disabled={loading || rows.length < PAGE_SIZE}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      </div>
    </main>
  );
}

function Badge({
  children,
  tone = 'amber',
}: {
  children: React.ReactNode;
  tone?: 'amber' | 'teal';
}) {
  const bg = tone === 'teal' ? `${COLORS.teal}1A` : `${COLORS.amber}26`;
  const color = tone === 'teal' ? COLORS.teal : '#7A5C1A';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        background: bg,
        color,
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        borderRadius: 4,
      }}
    >
      {children}
    </span>
  );
}
