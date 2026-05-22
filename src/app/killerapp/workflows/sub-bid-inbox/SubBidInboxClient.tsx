'use client';

/**
 * SubBidInboxClient (SUBBID-FLOW, 2026-05-22)
 * ============================================
 *
 * GC / owner / teammate view: list every bid on the GC's projects, group
 * by project, and let the GC review / accept / reject / counter-offer.
 *
 * Wrapped in <LaneGate allow={['gc','owner','teammate']}> so a sub who
 * lands here gets a redirect-to-submit panel instead of an inbox they
 * can't act on.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import LaneGate from '@/components/LaneGate';
import { useRealtimeChannel } from '@/lib/use-realtime-channel';

type BidStatus = 'submitted' | 'reviewed' | 'accepted' | 'rejected' | 'withdrawn';

interface LineItem {
  description?: string;
  qty?: number;
  unit?: string;
  unit_price?: number;
  amount?: number;
}

interface InsuranceCerts {
  gl?: boolean;
  wc?: boolean;
  auto?: boolean;
}

interface SubBid {
  id: string;
  project_id: string;
  sub_user_id: string;
  sub_vendor_id: string | null;
  csi_division: string | null;
  trade_label: string | null;
  scope_of_work: string | null;
  line_items: LineItem[] | null;
  subtotal: number | string | null;
  tax: number | string | null;
  total: number | string | null;
  validity_days: number | null;
  cslb_number: string | null;
  insurance_certs_attached: InsuranceCerts | null;
  status: BidStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewer_user_id: string | null;
  notes: string | null;
}

interface ProjectLite {
  id: string;
  name: string;
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
  teal:     '#0E7F8C',
  indigo:   '#3E3A6E',
};

const STATUS_META: Record<BidStatus, { label: string; color: string; bg: string }> = {
  submitted: { label: 'Submitted',  color: '#0E7F8C', bg: 'rgba(14,127,140,0.10)' },
  reviewed:  { label: 'Reviewed',   color: '#3E3A6E', bg: 'rgba(62,58,110,0.10)' },
  accepted:  { label: 'Accepted',   color: '#1D9E75', bg: 'rgba(29,158,117,0.12)' },
  rejected:  { label: 'Rejected',   color: '#E8443A', bg: 'rgba(232,68,58,0.10)' },
  withdrawn: { label: 'Withdrawn',  color: '#B8B5AC', bg: 'rgba(184,181,172,0.18)' },
};

function NotForYourRole() {
  return (
    <main style={pageWrap}>
      <div style={card}>
        <p style={eyebrow}>WRONG DESK</p>
        <h1 style={h1Style}>This is the GC inbox.</h1>
        <p style={{ ...bodyText, marginTop: 12 }}>
          You&apos;re signed in as a specialty sub. Push a bid back to the GC instead —
          this inbox is for the GC who&apos;s reviewing them.
        </p>
        <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/killerapp/workflows/sub-bid-submit" style={ctaPrimary}>
            Submit a bid →
          </Link>
          <Link href="/killerapp" style={ctaSecondary}>Back to your project</Link>
        </div>
      </div>
    </main>
  );
}

export default function SubBidInboxClient() {
  return (
    <LaneGate
      allow={['gc', 'owner', 'teammate']}
      fallback={<NotForYourRole />}
      loadingFallback={<main style={pageWrap} />}
    >
      <SubBidInbox />
    </LaneGate>
  );
}

function SubBidInbox() {
  const [loading, setLoading] = useState(true);
  const [bids, setBids] = useState<SubBid[]>([]);
  const [projects, setProjects] = useState<Record<string, ProjectLite>>({});
  const [error, setError] = useState<string | null>(null);
  const [openBidId, setOpenBidId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  // REALTIME (2026-05-22): track which bid IDs arrived via a live INSERT so
  // we can flash a subtle highlight on the row for 3s. Map keyed by bid id
  // so multiple incoming bids can pulse simultaneously without trampling.
  const [pulseIds, setPulseIds] = useState<Set<string>>(new Set());
  // REALTIME: debounce refetch — if a GC receives 5 INSERTs in rapid
  // succession (rare but possible during a bid sprint), one refetch suffices.
  const refetchTimerRef = useRef<number | null>(null);

  const loadBids = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const res = await fetch('/api/v1/sub-bids', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || 'Could not load bids.');
        return;
      }
      const inbox: SubBid[] = Array.isArray(json.inbox) ? json.inbox : Array.isArray(json.bids) ? json.bids : [];
      setBids(inbox);

      // Resolve project names for the projects this inbox spans.
      const projIds = Array.from(new Set(inbox.map((b) => b.project_id))).filter(Boolean);
      if (projIds.length > 0) {
        const { data: rows } = await supabase
          .from('command_center_projects')
          .select('id, name')
          .in('id', projIds);
        const map: Record<string, ProjectLite> = {};
        for (const r of rows ?? []) {
          map[String(r.id)] = { id: String(r.id), name: String(r.name) };
        }
        setProjects(map);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBids();
  }, [loadBids]);

  // REALTIME (2026-05-22): when a sub PUSHes a new bid (or updates one),
  // the GC inbox needs to reflect it without a manual refresh. We subscribe
  // unfiltered — RLS already constrains rows to projects this GC can see
  // (or, for any teammate flow, projects they're explicitly granted on the
  // command_center_projects row). The 500ms debounce coalesces bursts so a
  // busy bid window doesn't slam the network.
  const debouncedRefetch = useCallback(() => {
    if (refetchTimerRef.current) window.clearTimeout(refetchTimerRef.current);
    refetchTimerRef.current = window.setTimeout(() => {
      void loadBids();
    }, 500);
  }, [loadBids]);

  useRealtimeChannel<SubBid>({ table: 'sub_bids' }, (payload) => {
    // Only pulse on a NEW bid landing in the inbox — UPDATEs (status flips
    // we initiated, etc.) don't need the highlight.
    if (payload.eventType === 'INSERT') {
      const incoming = payload.new as SubBid | undefined;
      if (incoming?.id) {
        setPulseIds((prev) => {
          const next = new Set(prev);
          next.add(incoming.id);
          return next;
        });
        // Clear the pulse after 3s so the row settles back into the list.
        window.setTimeout(() => {
          setPulseIds((prev) => {
            const next = new Set(prev);
            next.delete(incoming.id);
            return next;
          });
        }, 3000);
      }
    }
    debouncedRefetch();
  });

  useEffect(() => () => {
    if (refetchTimerRef.current) window.clearTimeout(refetchTimerRef.current);
  }, []);

  const groupedByProject = useMemo(() => {
    const map: Record<string, SubBid[]> = {};
    for (const b of bids) {
      const key = b.project_id;
      if (!map[key]) map[key] = [];
      map[key].push(b);
    }
    return map;
  }, [bids]);

  async function patchBid(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const res = await fetch(`/api/v1/sub-bids?id=${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || 'Could not update bid.');
        return null;
      }
      // Update local state in place.
      setBids((prev) => prev.map((b) => (b.id === id ? { ...b, ...(json as SubBid) } : b)));
      return json as SubBid;
    } finally {
      setBusyId(null);
    }
  }

  function daysOpen(submittedAt: string | null): number {
    if (!submittedAt) return 0;
    const t = new Date(submittedAt).getTime();
    if (!Number.isFinite(t)) return 0;
    return Math.max(0, Math.floor((Date.now() - t) / 86400000));
  }

  return (
    <main style={pageWrap}>
      <div style={{ ...card, maxWidth: 960 }}>
        <p style={eyebrow}>STAGE 3 · PLAN · SUB-BID INBOX</p>
        <h1 style={h1Style}>Bids on your projects.</h1>
        <p style={{ ...bodyText, marginTop: 12 }}>
          Every bid your subs push lands here. Tap a row to see scope, line items,
          insurance, and CSLB. Then accept, reject, counter, or just mark it reviewed.
        </p>

        {error && <div role="alert" style={errorCard}>{error}</div>}

        {loading ? (
          <p style={{ ...bodyText, marginTop: 24, color: COLORS.faded }}>Loading…</p>
        ) : bids.length === 0 ? (
          <div style={{ marginTop: 32, padding: 24, background: COLORS.paper, borderRadius: 8, textAlign: 'center' }}>
            <p style={{ ...bodyText, marginBottom: 8 }}>
              <strong>No bids yet.</strong>
            </p>
            <p style={{ ...bodyText, fontSize: 14, color: COLORS.faded }}>
              When a sub submits a bid on one of your projects, it&apos;ll show up here.
            </p>
          </div>
        ) : (
          Object.entries(groupedByProject).map(([projectId, rows]) => {
            const projName = projects[projectId]?.name || projectId;
            return (
              <section key={projectId} style={{ marginTop: 32 }}>
                <h2 style={projectHeader}>{projName}</h2>
                <div style={{ border: `1px solid ${COLORS.rule}`, borderRadius: 8, overflow: 'hidden' }}>
                  {rows.map((bid, idx) => {
                    const open = openBidId === bid.id;
                    const total = Number(bid.total) || 0;
                    const status = STATUS_META[bid.status] || STATUS_META.submitted;
                    return (
                      <div
                        key={bid.id}
                        style={{
                          borderTop: idx === 0 ? 'none' : `1px solid ${COLORS.rule}`,
                          // REALTIME pulse: subtle green wash for 3s when a
                          // new bid lands. transition keeps it from snapping.
                          background: pulseIds.has(bid.id) ? 'rgba(29,158,117,0.10)' : 'transparent',
                          transition: 'background 600ms ease-out',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setOpenBidId(open ? null : bid.id)}
                          style={rowButton}
                        >
                          <span style={{ flex: '1 1 30%', fontWeight: 600 }}>
                            {bid.trade_label || 'Unspecified trade'}
                            {bid.csi_division ? (
                              <span style={{ color: COLORS.faded, fontWeight: 400, marginLeft: 6 }}>
                                Div {bid.csi_division}
                              </span>
                            ) : null}
                          </span>
                          <span style={{ flex: '1 1 20%', color: COLORS.graphite, fontSize: 14 }}>
                            {bid.cslb_number ? `CSLB #${bid.cslb_number}` : '—'}
                          </span>
                          <span style={{
                            flex: '0 0 130px',
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 700,
                            fontSize: 16,
                          }}>
                            ${total.toLocaleString()}
                          </span>
                          <span style={{
                            flex: '0 0 110px',
                            textAlign: 'center',
                          }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 700,
                              color: status.color,
                              background: status.bg,
                            }}>
                              {status.label}
                            </span>
                          </span>
                          <span style={{
                            flex: '0 0 80px',
                            textAlign: 'right',
                            color: COLORS.faded,
                            fontSize: 13,
                          }}>
                            {daysOpen(bid.submitted_at)}d open
                          </span>
                          <span style={{ marginLeft: 8, color: COLORS.faded }}>{open ? '▾' : '▸'}</span>
                        </button>

                        {open && (
                          <BidDetail
                            bid={bid}
                            busy={busyId === bid.id}
                            onAction={(nextStatus, notes) =>
                              patchBid(bid.id, { status: nextStatus, ...(notes !== undefined ? { notes } : {}) })
                            }
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>
    </main>
  );
}

interface BidDetailProps {
  bid: SubBid;
  busy: boolean;
  onAction: (status: BidStatus, notes?: string) => void;
}

function BidDetail({ bid, busy, onAction }: BidDetailProps) {
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const items = Array.isArray(bid.line_items) ? bid.line_items : [];
  const totalNumber = Number(bid.total) || 0;
  const subtotal = Number(bid.subtotal) || 0;
  const tax = Number(bid.tax) || 0;
  const ins = bid.insurance_certs_attached || {};

  const acceptHref = `/killerapp/workflows/contract-templates?template=sub-agreement&prefill=${encodeURIComponent(bid.id)}`;
  const counterHref = `/killerapp/workflows/sub-bid-submit?clone=${encodeURIComponent(bid.id)}`;
  const cslbHref = bid.cslb_number
    ? `https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum=${encodeURIComponent(bid.cslb_number)}`
    : null;

  return (
    <div style={{ padding: '16px 20px 20px', background: '#FFFFFF', borderTop: `1px solid ${COLORS.rule}` }}>
      {bid.scope_of_work && (
        <div style={{ marginBottom: 16 }}>
          <p style={detailLabel}>Scope of work</p>
          <p style={{ ...bodyText, fontSize: 14, marginTop: 4, whiteSpace: 'pre-wrap' }}>
            {bid.scope_of_work}
          </p>
        </div>
      )}

      {items.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={detailLabel}>Line items</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 6 }}>
            <thead>
              <tr style={{ background: COLORS.paper }}>
                <th style={th}>Description</th>
                <th style={{ ...th, width: 60, textAlign: 'right' }}>Qty</th>
                <th style={{ ...th, width: 70 }}>Unit</th>
                <th style={{ ...th, width: 100, textAlign: 'right' }}>Unit price</th>
                <th style={{ ...th, width: 110, textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((li, idx) => {
                const amt = Number(li.amount) || (Number(li.qty) || 0) * (Number(li.unit_price) || 0);
                return (
                  <tr key={idx}>
                    <td style={td}>{li.description || '—'}</td>
                    <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {Number(li.qty) || 0}
                    </td>
                    <td style={td}>{li.unit || ''}</td>
                    <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      ${(Number(li.unit_price) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      ${amt.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <p style={detailLabel}>Subtotal</p>
          <p style={detailValue}>${subtotal.toLocaleString()}</p>
        </div>
        <div>
          <p style={detailLabel}>Tax</p>
          <p style={detailValue}>${tax.toLocaleString()}</p>
        </div>
        <div>
          <p style={detailLabel}>Total</p>
          <p style={{ ...detailValue, fontWeight: 800, color: COLORS.teal }}>${totalNumber.toLocaleString()}</p>
        </div>
        <div>
          <p style={detailLabel}>Valid for</p>
          <p style={detailValue}>{bid.validity_days || 30} days</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <p style={detailLabel}>CSLB</p>
          <p style={detailValue}>
            {bid.cslb_number ? (
              <>
                #{bid.cslb_number}
                {cslbHref && (
                  <a
                    href={cslbHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ marginLeft: 8, fontSize: 12, color: COLORS.teal }}
                  >
                    Verify ↗
                  </a>
                )}
              </>
            ) : (
              '—'
            )}
          </p>
        </div>
        <div>
          <p style={detailLabel}>Insurance certs</p>
          <p style={detailValue}>
            {[
              ins.gl ? 'GL' : null,
              ins.wc ? 'WC' : null,
              ins.auto ? 'Auto' : null,
            ].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
      </div>

      {bid.notes && (
        <div style={{ marginBottom: 16 }}>
          <p style={detailLabel}>Notes</p>
          <p style={{ ...bodyText, fontSize: 14, marginTop: 4 }}>{bid.notes}</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        <button
          type="button"
          onClick={() => onAction('reviewed')}
          disabled={busy || bid.status === 'reviewed'}
          style={actionBtnSecondary}
        >
          Mark reviewed
        </button>
        <Link
          href={acceptHref}
          onClick={() => onAction('accepted')}
          style={actionBtnPrimary}
        >
          Accept → draft sub-agreement
        </Link>
        <button
          type="button"
          onClick={() => setShowReject((s) => !s)}
          disabled={busy}
          style={actionBtnDanger}
        >
          Reject
        </button>
        <Link href={counterHref} style={actionBtnNeutral}>
          Counter-offer
        </Link>
      </div>

      {showReject && (
        <div style={{ marginTop: 12 }}>
          <label style={detailLabel} htmlFor={`reject-${bid.id}`}>Reason (optional, shared with sub)</label>
          <textarea
            id={`reject-${bid.id}`}
            rows={2}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Over budget; please re-bid with reduced scope."
            style={{ ...textareaStyle, marginTop: 4 }}
          />
          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              onClick={() => {
                onAction('rejected', rejectReason || undefined);
                setShowReject(false);
              }}
              disabled={busy}
              style={actionBtnDanger}
            >
              Confirm reject
            </button>
          </div>
        </div>
      )}
    </div>
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
  maxWidth: 720,
  margin: '0 auto',
  background: '#FFFFFF',
  borderRadius: 12,
  padding: '40px 32px',
  border: `1px solid ${COLORS.rule}`,
  boxShadow: '0 1px 0 rgba(0,0,0,0.02), 0 8px 24px rgba(0,0,0,0.04)',
};

const eyebrow: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.14em',
  color: COLORS.teal,
  textTransform: 'uppercase',
};

const h1Style: React.CSSProperties = {
  margin: '8px 0 0',
  fontFamily: "var(--font-archivo-black, 'Archivo Black', sans-serif)",
  fontSize: 32,
  lineHeight: 1.2,
  color: COLORS.ink,
};

const bodyText: React.CSSProperties = {
  margin: 0,
  fontSize: 15,
  lineHeight: 1.55,
  color: COLORS.graphite,
};

const projectHeader: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: 16,
  fontWeight: 700,
  color: COLORS.ink,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const rowButton: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  width: '100%',
  padding: '14px 16px',
  background: '#FFFFFF',
  border: 'none',
  borderBottom: 'none',
  textAlign: 'left',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 14,
  color: COLORS.ink,
};

const detailLabel: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: COLORS.faded,
};

const detailValue: React.CSSProperties = {
  margin: '2px 0 0',
  fontSize: 14,
  fontWeight: 600,
  color: COLORS.ink,
};

const errorCard: React.CSSProperties = {
  padding: 12,
  marginTop: 16,
  borderRadius: 6,
  background: 'rgba(232, 68, 58, 0.08)',
  border: `1px solid rgba(232, 68, 58, 0.35)`,
  color: COLORS.red,
  fontSize: 14,
  fontWeight: 600,
};

const ctaPrimary: React.CSSProperties = {
  padding: '12px 20px',
  background: COLORS.teal,
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

const actionBtnBase: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-block',
  border: '1px solid transparent',
};

const actionBtnPrimary: React.CSSProperties = {
  ...actionBtnBase,
  background: COLORS.green,
  color: '#FFFFFF',
};

const actionBtnSecondary: React.CSSProperties = {
  ...actionBtnBase,
  background: '#FFFFFF',
  color: COLORS.indigo,
  border: `1px solid ${COLORS.indigo}`,
};

const actionBtnDanger: React.CSSProperties = {
  ...actionBtnBase,
  background: '#FFFFFF',
  color: COLORS.red,
  border: `1px solid ${COLORS.red}`,
};

const actionBtnNeutral: React.CSSProperties = {
  ...actionBtnBase,
  background: '#FFFFFF',
  color: COLORS.graphite,
  border: `1px solid ${COLORS.rule}`,
};

const th: React.CSSProperties = {
  padding: '8px 10px',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: COLORS.graphite,
  textAlign: 'left',
  borderBottom: `1px solid ${COLORS.rule}`,
};

const td: React.CSSProperties = {
  padding: '6px 8px',
  borderBottom: `1px solid ${COLORS.rule}`,
  verticalAlign: 'middle',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontSize: 14,
  fontFamily: 'inherit',
  background: '#FFFFFF',
  border: `1px solid ${COLORS.rule}`,
  borderRadius: 6,
  color: COLORS.ink,
  outline: 'none',
  resize: 'vertical',
  minHeight: 60,
  boxSizing: 'border-box',
};
