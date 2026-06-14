'use client';

/**
 * Client wrapper for /admin/review — fetches the B2 review-queue, wires the
 * transition actions via authedFetch, and renders the presentational
 * ReviewQueue. `?demo=1` renders seeded rows so the design can be reviewed
 * without an owner session or any rows yet in `review`.
 */

import { useCallback, useEffect, useState } from 'react';
import { authedFetch } from '@/lib/authed-fetch';
import ReviewQueue, { type ReviewItem, type ReviewEventRow } from '@/components/admin/ReviewQueue';

/** knowledge_entities title/summary are jsonb {en} | string. */
function unwrap(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && typeof (v as { en?: unknown }).en === 'string') {
    return (v as { en: string }).en;
  }
  return '';
}

interface RawRow {
  id: string;
  slug: string | null;
  title: unknown;
  entity_type: string | null;
  domain: string | null;
  status: string;
  jurisdiction_ids: string[] | null;
  auto_verification_flagged: boolean | null;
  auto_verification_confidence: number | null;
  source_urls: string[] | null;
}

function toItem(r: RawRow): ReviewItem {
  return {
    id: r.id,
    slug: r.slug,
    title: unwrap(r.title) || r.slug || '(untitled)',
    entity_type: r.entity_type,
    domain: r.domain,
    status: r.status,
    // jurisdiction_ids → name resolution is a follow-up (needs a jurisdictions
    // join); the component falls back to "Globally applicable".
    jurisdiction_label: null,
    auto_verification_flagged: r.auto_verification_flagged,
    auto_verification_confidence: r.auto_verification_confidence,
    source_urls: r.source_urls,
  };
}

// Seeded rows for ?demo=1 — realistic CA compliance entities across the flag
// taxonomy so the design reviews honestly. Not used in the live path.
const DEMO_ITEMS: ReviewItem[] = [
  {
    id: 'demo-1', slug: 'crc-r507-deck-ledger', title: 'CRC R507.2 — Deck ledger connection',
    entity_type: 'building_code', domain: 'codes', status: 'review', jurisdiction_label: 'California (CRC 2022)',
    auto_verification_flagged: true, auto_verification_confidence: 0.58,
    source_urls: ['https://up.codes/s/deck-ledger-connection'],
  },
  {
    id: 'demo-2', slug: 'nec-210-52-receptacles', title: 'NEC 210.52(C) — Kitchen counter receptacles',
    entity_type: 'code_section', domain: 'codes', status: 'review', jurisdiction_label: 'California (CEC 2022)',
    auto_verification_flagged: false, auto_verification_confidence: 0.93,
    source_urls: ['https://up.codes/s/receptacle-outlets', 'https://example.gov/cec-210'],
  },
  {
    id: 'demo-3', slug: 'marin-grading-permit', title: 'Marin County — Grading permit threshold',
    entity_type: 'permit_requirement', domain: 'permits', status: 'needs_changes', jurisdiction_label: 'Marin County, CA',
    auto_verification_flagged: null, auto_verification_confidence: null,
    source_urls: [],
  },
];

export default function ReviewQueueClient() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch('/api/v1/knowledge-entities/review-queue?limit=50');
      if (res.status === 403) {
        setError('Reviewer access only — sign in with an owner or admin seat.');
        setItems([]);
        return;
      }
      if (!res.ok) throw new Error(`queue_${res.status}`);
      const json = (await res.json()) as { items?: RawRow[] };
      setItems((json.items ?? []).map(toItem));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed_to_load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const isDemo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1';
    if (isDemo) {
      setDemo(true);
      setItems(DEMO_ITEMS);
      setLoading(false);
      return;
    }
    void load();
  }, [load]);

  const act = useCallback(
    async (id: string, path: string, body: Record<string, unknown>) => {
      if (demo) {
        // Design-review mode: optimistically clear the row, no network.
        setItems((p) => p.filter((i) => i.id !== id));
        return;
      }
      setBusyId(id);
      try {
        const res = await authedFetch(`/api/v1/knowledge-entities/${id}/${path}`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setError(`${path} failed: ${j?.error || res.status}`);
          return;
        }
        await load(); // refetch — the row left the queue (or changed status)
      } finally {
        setBusyId(null);
      }
    },
    [demo, load]
  );

  const loadHistory = useCallback(
    async (id: string): Promise<ReviewEventRow[]> => {
      if (demo) {
        return [
          { id: 'h1', action: 'submit', from_status: 'draft', to_status: 'review', actor_kind: 'machine', note: null, source: null, created_at: '' },
        ];
      }
      try {
        const res = await authedFetch(`/api/v1/knowledge-entities/${id}/history`);
        if (!res.ok) return [];
        const json = (await res.json()) as { events?: ReviewEventRow[] };
        return json.events ?? [];
      } catch {
        return [];
      }
    },
    [demo]
  );

  return (
    <ReviewQueue
      items={items}
      loading={loading}
      error={error}
      busyId={busyId}
      onApprove={(id, source) => act(id, 'approve', { source })}
      onReject={(id, reason) => act(id, 'reject', { reason })}
      onRequestChanges={(id, note) => act(id, 'request-changes', { note })}
      loadHistory={loadHistory}
    />
  );
}
