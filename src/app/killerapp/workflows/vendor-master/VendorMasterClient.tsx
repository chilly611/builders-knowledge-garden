'use client';

/**
 * VendorMasterClient
 * ==================
 * Admin-style data table for the vendor master.
 *
 * - Columns: Legal name, DBA, Org, CSLB# (expiry color), 1099 chip, W-9 chip, terms.
 * - "+ Add vendor" modal (all schema fields).
 * - "Lookup CSLB" calls server-side scraper /api/v1/cslb-lookup and
 *   autofills name, classification, expiry, bond. Row-level button opens
 *   the canonical CSLB page for human-eye verification.
 * - Org switcher: filter vendors by the org you belong to. "Create org"
 *   CTA appears for users with no orgs yet.
 * - Filter chips: All / 1099-eligible / W-9 missing / Insurance expiring soon.
 * - CSV export.
 *
 * Auth: requires Supabase session; calls /api/v1/vendors and
 * /api/v1/cslb-lookup with Bearer token.
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Vendor {
  id: string;
  project_id?: string | null;
  org_id?: string | null;
  legal_name: string;
  dba?: string | null;
  ein?: string | null;
  w9_on_file_at?: string | null;
  cslb_number?: string | null;
  cslb_classification?: string | null;
  cslb_expiry?: string | null;
  bond_number?: string | null;
  bond_amount?: number | null;
  insurance_gl_expiry?: string | null;
  insurance_wc_expiry?: string | null;
  insurance_auto_expiry?: string | null;
  address_street?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_zip?: string | null;
  phone?: string | null;
  email?: string | null;
  payment_terms?: string | null;
  is_1099_eligible?: boolean | null;
}

interface Org {
  id: string;
  slug: string;
  legal_name: string;
  dba?: string | null;
  role: 'owner' | 'admin' | 'member';
}

const COLORS = {
  paper:    '#FAF8F2',
  ink:      '#1A1A1A',
  graphite: '#3D3D3D',
  faded:    '#B8B5AC',
  rule:     '#D8D2C2',
  green:    '#1D9E75',
  red:      '#E8443A',
  amber:    '#C4A44A',
  brass:    '#B6873A',
};

type FilterMode = 'all' | '1099' | 'w9-missing' | 'expiring';

function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86_400_000);
}

function expiryColor(dateStr?: string | null): string {
  const d = daysUntil(dateStr);
  if (d === null) return COLORS.faded;
  if (d < 0) return COLORS.red;
  if (d <= 30) return COLORS.amber;
  return COLORS.green;
}

function vendorIsExpiringSoon(v: Vendor): boolean {
  const checks = [v.cslb_expiry, v.insurance_gl_expiry, v.insurance_wc_expiry, v.insurance_auto_expiry];
  return checks.some((d) => {
    const n = daysUntil(d);
    return n !== null && n <= 30;
  });
}

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

export default function VendorMasterClient() {
  const search = useSearchParams();
  const projectId = search.get('project');

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [showModal, setShowModal] = useState(false);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);

  async function loadOrgs() {
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/v1/orgs', { headers });
      if (!res.ok) return;
      const j = await res.json();
      setOrgs(j.orgs || []);
    } catch {
      // non-fatal — personal-mode users still work.
    }
  }

  async function refresh() {
    setLoading(true);
    try {
      const headers = await authHeaders();
      const params = new URLSearchParams();
      if (projectId) params.set('project_id', projectId);
      else if (selectedOrgId !== 'all') params.set('org_id', selectedOrgId);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/v1/vendors${qs}`, { headers });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const j = await res.json();
      setVendors(j.vendors || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  // Load orgs once on mount.
  useEffect(() => { void loadOrgs(); }, []);
  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [projectId, selectedOrgId]);

  const orgLabelFor = (id: string | null | undefined): string => {
    if (!id) return '—';
    const o = orgs.find((x) => x.id === id);
    return o ? (o.dba || o.legal_name) : '(other org)';
  };

  const filtered = useMemo(() => {
    switch (filter) {
      case '1099':       return vendors.filter((v) => v.is_1099_eligible);
      case 'w9-missing': return vendors.filter((v) => !v.w9_on_file_at);
      case 'expiring':   return vendors.filter(vendorIsExpiringSoon);
      default:           return vendors;
    }
  }, [vendors, filter]);

  function exportCsv() {
    const cols = [
      'legal_name', 'dba', 'ein', 'cslb_number', 'cslb_classification', 'cslb_expiry',
      'bond_number', 'bond_amount', 'insurance_gl_expiry', 'insurance_wc_expiry',
      'insurance_auto_expiry', 'phone', 'email', 'payment_terms', 'is_1099_eligible',
      'w9_on_file_at', 'address_street', 'address_city', 'address_state', 'address_zip',
    ];
    const esc = (v: unknown) => {
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g, '""');
      return /[,"\n]/.test(s) ? `"${s}"` : s;
    };
    const lines = [cols.join(',')];
    for (const v of filtered) {
      lines.push(cols.map((c) => esc((v as unknown as Record<string, unknown>)[c])).join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendors-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openCslbLookup(licNum?: string | null) {
    // Fallback / direct-link helper. The "+ Add vendor" modal hits the
    // server-side scraping endpoint (/api/v1/cslb-lookup) for autofill;
    // this button is the still-useful "open the canonical CSLB page in
    // a new tab" shortcut used in the row actions.
    const u = licNum
      ? `https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum=${encodeURIComponent(licNum)}`
      : 'https://www.cslb.ca.gov/onlineservices/checklicenseii/checklicense.aspx';
    window.open(u, '_blank', 'noopener,noreferrer');
  }

  return (
    <div style={{ padding: 24, background: COLORS.paper, minHeight: '100vh', color: COLORS.ink, fontFamily: 'Georgia, serif' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <header style={{ marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>Vendor master</h1>
          <p style={{ color: COLORS.graphite, marginTop: 4 }}>
            Single source of truth for every sub, supplier, and 1099 payee. CSLB / W-9 / insurance / payment terms.
          </p>
        </header>

        {/* Org switcher row — only shown when caller has 2+ orgs OR has none (CTA). */}
        {(orgs.length === 0 || orgs.length > 1) && !projectId && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, padding: 10, background: '#F5F0E4', border: `1px solid ${COLORS.rule}`, borderRadius: 4 }}>
            {orgs.length === 0 ? (
              <>
                <span style={{ fontSize: 13, color: COLORS.graphite, flex: 1 }}>
                  You don't have an organization yet. Create one to share vendors with teammates.
                </span>
                <button
                  onClick={() => setShowOrgModal(true)}
                  style={{ padding: '6px 12px', background: COLORS.brass, color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 4, fontWeight: 600 }}
                >
                  Create organization
                </button>
              </>
            ) : (
              <>
                <span style={{ fontSize: 13, color: COLORS.graphite }}>Organization:</span>
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value as string | 'all')}
                  style={{ padding: '6px 8px', border: `1px solid ${COLORS.rule}`, borderRadius: 4, fontSize: 13, background: '#fff' }}
                >
                  <option value="all">All (personal + every org)</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>{o.dba || o.legal_name}</option>
                  ))}
                </select>
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => setShowOrgModal(true)}
                  style={{ padding: '4px 10px', background: 'transparent', border: `1px solid ${COLORS.rule}`, cursor: 'pointer', borderRadius: 4, fontSize: 12 }}
                >
                  + New org
                </button>
              </>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          {(['all', '1099', 'w9-missing', 'expiring'] as FilterMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setFilter(m)}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                border: `1px solid ${filter === m ? COLORS.ink : COLORS.rule}`,
                background: filter === m ? COLORS.ink : 'transparent',
                color: filter === m ? COLORS.paper : COLORS.ink,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              {m === 'all' ? 'All' : m === '1099' ? '1099-eligible' : m === 'w9-missing' ? 'W-9 missing' : 'Expiring (30d)'}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button
            onClick={exportCsv}
            style={{ padding: '6px 12px', border: `1px solid ${COLORS.rule}`, background: 'transparent', cursor: 'pointer', borderRadius: 4 }}
          >
            Export CSV
          </button>
          <button
            onClick={() => { setEditing(null); setShowModal(true); }}
            style={{ padding: '8px 16px', background: COLORS.green, color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 4, fontWeight: 600 }}
          >
            + Add vendor
          </button>
        </div>

        {error && (
          <div style={{ padding: 12, background: '#FCE9E7', border: `1px solid ${COLORS.red}`, color: COLORS.red, borderRadius: 4, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <div style={{ border: `1px solid ${COLORS.rule}`, borderRadius: 4, background: '#fff', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead style={{ background: '#F5F0E4', textAlign: 'left' }}>
              <tr>
                <th style={{ padding: 10 }}>Legal name</th>
                <th style={{ padding: 10 }}>DBA</th>
                <th style={{ padding: 10 }}>Org</th>
                <th style={{ padding: 10 }}>CSLB#</th>
                <th style={{ padding: 10 }}>1099</th>
                <th style={{ padding: 10 }}>W-9</th>
                <th style={{ padding: 10 }}>Terms</th>
                <th style={{ padding: 10 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && (<tr><td colSpan={8} style={{ padding: 20, textAlign: 'center', color: COLORS.faded }}>Loading…</td></tr>)}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 20, textAlign: 'center', color: COLORS.faded }}>No vendors yet. Click "+ Add vendor" to start.</td></tr>
              )}
              {filtered.map((v) => (
                <tr key={v.id} style={{ borderTop: `1px solid ${COLORS.rule}` }}>
                  <td style={{ padding: 10, fontWeight: 600 }}>{v.legal_name}</td>
                  <td style={{ padding: 10, color: COLORS.graphite }}>{v.dba || '—'}</td>
                  <td style={{ padding: 10, fontSize: 12, color: v.org_id ? COLORS.graphite : COLORS.faded }}>
                    {v.org_id ? orgLabelFor(v.org_id) : <em>personal</em>}
                  </td>
                  <td style={{ padding: 10 }}>
                    {v.cslb_number ? (
                      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ color: expiryColor(v.cslb_expiry), fontWeight: 600 }}>{v.cslb_number}</span>
                        <button
                          onClick={() => openCslbLookup(v.cslb_number)}
                          style={{ fontSize: 11, padding: '2px 6px', border: `1px solid ${COLORS.rule}`, background: '#fff', cursor: 'pointer', borderRadius: 3 }}
                          title="Open CSLB license lookup"
                        >
                          Lookup
                        </button>
                      </span>
                    ) : (
                      <span style={{ color: COLORS.faded }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: 10 }}>
                    {v.is_1099_eligible ? (
                      <span style={{ padding: '2px 8px', background: COLORS.brass + '22', color: COLORS.brass, borderRadius: 999, fontSize: 12, fontWeight: 600 }}>1099</span>
                    ) : <span style={{ color: COLORS.faded }}>—</span>}
                  </td>
                  <td style={{ padding: 10 }}>
                    {v.w9_on_file_at ? (
                      <span style={{ padding: '2px 8px', background: COLORS.green + '22', color: COLORS.green, borderRadius: 999, fontSize: 12, fontWeight: 600 }}>On file</span>
                    ) : (
                      <span style={{ padding: '2px 8px', background: COLORS.red + '22', color: COLORS.red, borderRadius: 999, fontSize: 12, fontWeight: 600 }}>Missing</span>
                    )}
                  </td>
                  <td style={{ padding: 10, color: COLORS.graphite }}>{v.payment_terms || '—'}</td>
                  <td style={{ padding: 10, textAlign: 'right' }}>
                    <button
                      onClick={() => { setEditing(v); setShowModal(true); }}
                      style={{ fontSize: 12, padding: '4px 8px', border: `1px solid ${COLORS.rule}`, background: '#fff', cursor: 'pointer', borderRadius: 3 }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showModal && (
          <VendorModal
            initial={editing}
            projectId={projectId}
            orgs={orgs}
            defaultOrgId={selectedOrgId !== 'all' ? selectedOrgId : (orgs.length === 1 ? orgs[0].id : null)}
            onClose={() => setShowModal(false)}
            onSaved={() => { setShowModal(false); void refresh(); }}
          />
        )}

        {showOrgModal && (
          <OrgCreateModal
            onClose={() => setShowOrgModal(false)}
            onCreated={(newOrg) => {
              setOrgs((prev) => [...prev, newOrg]);
              setSelectedOrgId(newOrg.id);
              setShowOrgModal(false);
              void refresh();
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Org create modal
// ─────────────────────────────────────────────────────────────────────

function OrgCreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (org: Org) => void;
}) {
  const [legalName, setLegalName] = useState('');
  const [dba, setDba] = useState('');
  const [slug, setSlug] = useState('');
  const [primaryEmail, setPrimaryEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/v1/orgs', {
        method: 'POST',
        headers,
        body: JSON.stringify({ legal_name: legalName, dba: dba || null, slug: slug || undefined, primary_email: primaryEmail || null }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const j = await res.json();
      onCreated(j.org as Org);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create org');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: COLORS.paper, borderRadius: 8, padding: 24, maxWidth: 520, width: '90%' }}>
        <h2 style={{ marginTop: 0 }}>Create organization</h2>
        <p style={{ fontSize: 13, color: COLORS.graphite, marginTop: 0 }}>
          An organization is your tenancy — share vendors with teammates, scope compliance docs, and invoice under one entity.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: COLORS.graphite }}>
            <span>Legal name *</span>
            <input value={legalName} onChange={(e) => setLegalName(e.target.value)} style={{ padding: 6, border: `1px solid ${COLORS.rule}`, borderRadius: 3, fontSize: 14 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: COLORS.graphite }}>
            <span>DBA (doing-business-as)</span>
            <input value={dba} onChange={(e) => setDba(e.target.value)} style={{ padding: 6, border: `1px solid ${COLORS.rule}`, borderRadius: 3, fontSize: 14 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: COLORS.graphite }}>
            <span>URL slug (auto-derived from legal name if blank)</span>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. acme-construction" style={{ padding: 6, border: `1px solid ${COLORS.rule}`, borderRadius: 3, fontSize: 14 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: COLORS.graphite }}>
            <span>Primary email</span>
            <input type="email" value={primaryEmail} onChange={(e) => setPrimaryEmail(e.target.value)} style={{ padding: 6, border: `1px solid ${COLORS.rule}`, borderRadius: 3, fontSize: 14 }} />
          </label>
        </div>
        {err && <div style={{ marginTop: 12, color: COLORS.red }}>{err}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} disabled={saving} style={{ padding: '8px 16px', border: `1px solid ${COLORS.rule}`, background: '#fff', cursor: 'pointer', borderRadius: 4 }}>Cancel</button>
          <button onClick={save} disabled={saving || !legalName} style={{ padding: '8px 16px', background: COLORS.green, color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 4, fontWeight: 600 }}>
            {saving ? 'Creating…' : 'Create org'}
          </button>
        </div>
      </div>
    </div>
  );
}

function VendorModal({
  initial,
  projectId,
  orgs,
  defaultOrgId,
  onClose,
  onSaved,
}: {
  initial: Vendor | null;
  projectId: string | null;
  orgs: Org[];
  defaultOrgId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Vendor>>(
    initial || {
      is_1099_eligible: true,
      payment_terms: 'Net 30',
      org_id: defaultOrgId,
    }
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cslbLooking, setCslbLooking] = useState(false);
  const [cslbStatus, setCslbStatus] = useState<string | null>(null);

  function set<K extends keyof Vendor>(k: K, v: Vendor[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function runCslbLookup() {
    const lic = (form.cslb_number || '').toString().trim();
    if (!lic) {
      setCslbStatus('Enter a license number first.');
      return;
    }
    setCslbLooking(true);
    setCslbStatus(null);
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/v1/cslb-lookup?license=${encodeURIComponent(lic)}`, { headers });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        setCslbStatus(j.reason || `Lookup failed (HTTP ${res.status}). Use the deep-link button.`);
        return;
      }
      setForm((f) => ({
        ...f,
        // Only fill the legal name if the user hasn't already typed something.
        legal_name: f.legal_name && f.legal_name.trim() ? f.legal_name : j.name,
        cslb_classification: j.classification ?? f.cslb_classification,
        cslb_expiry: j.expiry ?? f.cslb_expiry,
        bond_number: j.bond_number ?? f.bond_number,
        bond_amount: j.bond_amount ?? f.bond_amount,
      }));
      setCslbStatus(
        `Filled from CSLB${j.cached ? ' (cached)' : ''}: ${j.name}${j.status ? ` — ${j.status}` : ''}`
      );
    } catch (e) {
      setCslbStatus(e instanceof Error ? e.message : 'Lookup failed');
    } finally {
      setCslbLooking(false);
    }
  }

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const headers = await authHeaders();
      const body = {
        ...form,
        project_id: form.project_id || projectId || null,
        org_id: form.org_id ?? defaultOrgId ?? null,
      };
      const isEdit = !!initial?.id;
      const res = await fetch('/api/v1/vendors', {
        method: isEdit ? 'PATCH' : 'POST',
        headers,
        body: JSON.stringify(isEdit ? { ...body, id: initial!.id } : body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const field = (label: string, key: keyof Vendor, type: 'text' | 'date' | 'number' = 'text') => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: COLORS.graphite }}>
      <span>{label}</span>
      <input
        type={type}
        value={(form[key] as string | number | undefined) ?? ''}
        onChange={(e) => set(key, (type === 'number' ? Number(e.target.value) || null : e.target.value) as Vendor[typeof key])}
        style={{ padding: 6, border: `1px solid ${COLORS.rule}`, borderRadius: 3, fontSize: 14 }}
      />
    </label>
  );

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: COLORS.paper, borderRadius: 8, padding: 24, maxWidth: 720, width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
        <h2 style={{ marginTop: 0 }}>{initial ? 'Edit vendor' : 'Add vendor'}</h2>

        {/* Org picker — only relevant when caller has 1+ orgs. */}
        {orgs.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: COLORS.graphite }}>
              <span>Organization (leave blank for personal vendor)</span>
              <select
                value={form.org_id ?? ''}
                onChange={(e) => set('org_id', e.target.value || null)}
                style={{ padding: 6, border: `1px solid ${COLORS.rule}`, borderRadius: 3, fontSize: 14, background: '#fff' }}
              >
                <option value="">— Personal (no org) —</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.dba || o.legal_name}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {field('Legal name *', 'legal_name')}
          {field('DBA', 'dba')}
          {field('EIN', 'ein')}
          {field('W-9 on file date', 'w9_on_file_at', 'date')}

          {/* CSLB number + Lookup CTA. */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: COLORS.graphite }}>
            <span>CSLB #</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                value={(form.cslb_number as string | undefined) ?? ''}
                onChange={(e) => set('cslb_number', e.target.value)}
                style={{ flex: 1, padding: 6, border: `1px solid ${COLORS.rule}`, borderRadius: 3, fontSize: 14 }}
              />
              <button
                type="button"
                onClick={() => void runCslbLookup()}
                disabled={cslbLooking || !form.cslb_number}
                style={{ padding: '6px 10px', background: COLORS.brass, color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 3, fontSize: 12, fontWeight: 600 }}
                title="Auto-fill name, classification, expiry and bond from CSLB"
              >
                {cslbLooking ? 'Looking…' : 'Lookup CSLB'}
              </button>
            </div>
          </label>

          {field('CSLB class', 'cslb_classification')}
          {field('CSLB expiry', 'cslb_expiry', 'date')}
          {field('Bond #', 'bond_number')}
          {field('Bond amount', 'bond_amount', 'number')}
          {field('GL insurance expiry', 'insurance_gl_expiry', 'date')}
          {field('WC insurance expiry', 'insurance_wc_expiry', 'date')}
          {field('Auto insurance expiry', 'insurance_auto_expiry', 'date')}
          {field('Street', 'address_street')}
          {field('City', 'address_city')}
          {field('State', 'address_state')}
          {field('ZIP', 'address_zip')}
          {field('Phone', 'phone')}
          {field('Email', 'email')}
          {field('Payment terms', 'payment_terms')}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={!!form.is_1099_eligible}
              onChange={(e) => set('is_1099_eligible', e.target.checked)}
            />
            1099 eligible
          </label>
        </div>

        {cslbStatus && (
          <div style={{ marginTop: 12, fontSize: 12, color: COLORS.graphite, padding: 8, background: '#F5F0E4', border: `1px solid ${COLORS.rule}`, borderRadius: 3 }}>
            {cslbStatus}
          </div>
        )}
        {err && <div style={{ marginTop: 12, color: COLORS.red }}>{err}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} disabled={saving} style={{ padding: '8px 16px', border: `1px solid ${COLORS.rule}`, background: '#fff', cursor: 'pointer', borderRadius: 4 }}>Cancel</button>
          <button onClick={save} disabled={saving || !form.legal_name} style={{ padding: '8px 16px', background: COLORS.green, color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 4, fontWeight: 600 }}>
            {saving ? 'Saving…' : 'Save vendor'}
          </button>
        </div>
      </div>
    </div>
  );
}
