'use client';

/**
 * AuditTrailClient
 * ================
 * Read-only view over audit_log. Bookkeepers need to prove:
 *   - WHO changed the record (changed_by)
 *   - WHEN (changed_at)
 *   - WHAT changed (old_data vs new_data diff, rendered as collapsible JSON)
 *
 * Filters: table, action (insert/update/delete), user, date range.
 */

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AuditRow {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_by: string | null;
  changed_at: string;
  source: string | null;
}

const COLORS = {
  paper: '#FAF8F2', ink: '#1A1A1A', graphite: '#3D3D3D', faded: '#B8B5AC',
  rule: '#D8D2C2', green: '#1D9E75', red: '#E8443A', brass: '#B6873A', indigo: '#3E3A6E',
};

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function actionColor(a: string): string {
  switch (a.toLowerCase()) {
    case 'insert': return COLORS.green;
    case 'update': return COLORS.brass;
    case 'delete': return COLORS.red;
    default: return COLORS.faded;
  }
}

function diff(oldData: Record<string, unknown> | null, newData: Record<string, unknown> | null): { key: string; before: unknown; after: unknown }[] {
  if (!oldData && newData) {
    return Object.keys(newData).map((k) => ({ key: k, before: null, after: newData[k] }));
  }
  if (oldData && !newData) {
    return Object.keys(oldData).map((k) => ({ key: k, before: oldData[k], after: null }));
  }
  if (!oldData || !newData) return [];
  const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  const out: { key: string; before: unknown; after: unknown }[] = [];
  for (const k of keys) {
    const b = oldData[k];
    const a = newData[k];
    if (JSON.stringify(b) !== JSON.stringify(a)) out.push({ key: k, before: b, after: a });
  }
  return out;
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'string') return v.length > 80 ? v.slice(0, 77) + '…' : v;
  return JSON.stringify(v);
}

export default function AuditTrailClient() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [tableFilter, setTableFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function refresh() {
    setLoading(true);
    try {
      const headers = await authHeaders();
      const params = new URLSearchParams();
      if (tableFilter) params.set('table', tableFilter);
      if (actionFilter) params.set('action', actionFilter);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await fetch(`/api/v1/audit-log?${params}`, { headers });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const j = await res.json();
      setRows(j.rows || []);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tableFilter, actionFilter, from, to]);

  const tableOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.table_name))).sort(),
    [rows]
  );

  function toggle(id: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div style={{ padding: 24, background: COLORS.paper, minHeight: '100vh', color: COLORS.ink, fontFamily: 'Georgia, serif' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <header style={{ marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>Audit trail</h1>
          <p style={{ color: COLORS.graphite, marginTop: 4 }}>
            Every change on vendors, invoices, line items, and payments. Who, when, what changed.
          </p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
            Table
            <select value={tableFilter} onChange={(e) => setTableFilter(e.target.value)} style={{ padding: 6, border: `1px solid ${COLORS.rule}`, borderRadius: 3 }}>
              <option value="">All</option>
              {tableOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              {/* common ones always offered */}
              {!tableOptions.includes('vendors') && <option value="vendors">vendors</option>}
              {!tableOptions.includes('invoices') && <option value="invoices">invoices</option>}
              {!tableOptions.includes('invoice_payments') && <option value="invoice_payments">invoice_payments</option>}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
            Action
            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} style={{ padding: 6, border: `1px solid ${COLORS.rule}`, borderRadius: 3 }}>
              <option value="">All</option>
              <option value="insert">insert</option>
              <option value="update">update</option>
              <option value="delete">delete</option>
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
            From
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ padding: 6, border: `1px solid ${COLORS.rule}`, borderRadius: 3 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
            To
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ padding: 6, border: `1px solid ${COLORS.rule}`, borderRadius: 3 }} />
          </label>
        </div>

        {err && <div style={{ padding: 12, background: '#FCE9E7', border: `1px solid ${COLORS.red}`, color: COLORS.red, borderRadius: 4, marginBottom: 12 }}>{err}</div>}

        <div style={{ background: '#fff', border: `1px solid ${COLORS.rule}`, borderRadius: 4, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: '#F5F0E4', textAlign: 'left' }}>
              <tr>
                <th style={{ padding: 8 }}>When</th>
                <th style={{ padding: 8 }}>Table</th>
                <th style={{ padding: 8 }}>Action</th>
                <th style={{ padding: 8 }}>Record</th>
                <th style={{ padding: 8 }}>Changed by</th>
                <th style={{ padding: 8 }}>Source</th>
                <th style={{ padding: 8 }}>Changes</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: COLORS.faded }}>Loading…</td></tr>}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: COLORS.faded }}>
                  No audit events yet. As soon as you create or edit a vendor / invoice / payment, rows will appear here.
                </td></tr>
              )}
              {rows.map((r) => {
                const isOpen = expanded.has(r.id);
                const changes = diff(r.old_data, r.new_data);
                return (
                  <>
                    <tr key={r.id} style={{ borderTop: `1px solid ${COLORS.rule}`, cursor: 'pointer' }} onClick={() => toggle(r.id)}>
                      <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>{new Date(r.changed_at).toLocaleString()}</td>
                      <td style={{ padding: 8 }}>{r.table_name}</td>
                      <td style={{ padding: 8 }}>
                        <span style={{ padding: '2px 8px', borderRadius: 999, background: actionColor(r.action) + '22', color: actionColor(r.action), fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>
                          {r.action}
                        </span>
                      </td>
                      <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 11 }}>{r.record_id?.slice(0, 8) || '—'}</td>
                      <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 11 }}>{r.changed_by?.slice(0, 8) || '—'}</td>
                      <td style={{ padding: 8, color: COLORS.graphite }}>{r.source || '—'}</td>
                      <td style={{ padding: 8 }}>
                        {changes.length} field{changes.length === 1 ? '' : 's'} {isOpen ? '▼' : '▶'}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={r.id + '-detail'}>
                        <td colSpan={7} style={{ padding: 12, background: COLORS.paper, borderTop: `1px dashed ${COLORS.rule}` }}>
                          {changes.length === 0 ? (
                            <em style={{ color: COLORS.faded }}>No field-level diff.</em>
                          ) : (
                            <table style={{ width: '100%', fontSize: 12, fontFamily: 'monospace' }}>
                              <thead><tr style={{ textAlign: 'left', color: COLORS.graphite }}>
                                <th style={{ padding: 4 }}>Field</th><th style={{ padding: 4 }}>Before</th><th style={{ padding: 4 }}>After</th>
                              </tr></thead>
                              <tbody>
                                {changes.map((c) => (
                                  <tr key={c.key}>
                                    <td style={{ padding: 4, fontWeight: 600 }}>{c.key}</td>
                                    <td style={{ padding: 4, color: COLORS.red }}>{fmtVal(c.before)}</td>
                                    <td style={{ padding: 4, color: COLORS.green }}>{fmtVal(c.after)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
