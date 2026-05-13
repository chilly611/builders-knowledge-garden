// Builder's Knowledge Garden — Quick Reply Page (Brief 2)
//
// Server Component for /killerapp/quick-reply. Renders the inbox + AI
// drafts in the contractor's voice. Pro-toggle relabels to "Inbox".
//
// Pattern mirrors src/app/killerapp/who-is-asking/page.tsx:
//   - Read initial data server-side via the Supabase admin client.
//   - Render the Client Component with hydrated initialMessages.
//   - searchParams is a Promise in Next 16.

import type { Metadata } from 'next';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import QuickReplyClient, { type InitialMessage } from './QuickReplyClient';

export const metadata: Metadata = {
  title: "Quick reply | Builder's Knowledge Garden",
  description:
    'Inbound messages with AI-drafted replies in your voice. Thumb-approve to send. 90-second undo.',
  openGraph: {
    title: 'Quick reply — Builder\'s Knowledge Garden',
    description:
      'Inbound messages with AI-drafted replies in your voice. Thumb-approve to send. 90-second undo.',
  },
};

interface MessageRow {
  id: string;
  contact_id: string | null;
  direction: 'inbound' | 'outbound';
  channel: 'sms' | 'voicemail' | 'email' | 'call_transcript' | 'manual';
  body: string;
  ai_drafted: boolean | null;
  ai_tone: string | null;
  status: string;
  queued_until: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  time_machine_handle: string | null;
  created_at: string;
  ai_reasoning_trace: Record<string, unknown> | null;
}

interface ContactSummary {
  id: string;
  first_name: string | null;
  last_name: string | null;
  lifecycle_stage: string | null;
}

let cachedAdmin: SupabaseClient | null = null;
function getAdmin(): SupabaseClient | null {
  if (cachedAdmin) return cachedAdmin;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || url.includes('placeholder')) return null;
  cachedAdmin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedAdmin;
}

async function loadInbox(): Promise<InitialMessage[]> {
  const admin = getAdmin();
  if (!admin) return [];

  try {
    const { data: rows, error } = await admin
      .from('crm_messages')
      .select('*')
      .or(
        [
          'and(direction.eq.inbound,status.in.(received,read))',
          'and(direction.eq.outbound,status.in.(drafted,queued))',
        ].join(',')
      )
      .order('created_at', { ascending: false })
      .limit(100);
    if (error || !rows) return [];

    const messageRows = rows as MessageRow[];
    const contactIds = Array.from(
      new Set(
        messageRows
          .map((r) => r.contact_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    let contactsById = new Map<string, ContactSummary>();
    if (contactIds.length > 0) {
      const { data: cData } = await admin
        .from('crm_contacts')
        .select('id, first_name, last_name, lifecycle_stage')
        .in('id', contactIds);
      if (Array.isArray(cData)) {
        contactsById = new Map(
          (cData as ContactSummary[]).map((c) => [c.id, c])
        );
      }
    }

    return messageRows.map((r): InitialMessage => {
      const trace = r.ai_reasoning_trace ?? {};
      const c = r.contact_id ? contactsById.get(r.contact_id) : undefined;
      const contactName = c
        ? [c.first_name, c.last_name].filter(Boolean).join(' ').trim() ||
          undefined
        : undefined;
      return {
        id: r.id,
        contactId: r.contact_id,
        direction: r.direction,
        channel: r.channel,
        body: r.body,
        aiDrafted: r.ai_drafted ?? false,
        aiTone:
          r.ai_tone === 'warm' ||
          r.ai_tone === 'professional' ||
          r.ai_tone === 'brief' ||
          r.ai_tone === 'custom'
            ? r.ai_tone
            : undefined,
        status: r.status as InitialMessage['status'],
        queuedUntil: r.queued_until ?? undefined,
        sentAt: r.sent_at ?? undefined,
        deliveredAt: r.delivered_at ?? undefined,
        readAt: r.read_at ?? undefined,
        timeMachineHandle: r.time_machine_handle ?? '',
        createdAt: r.created_at,
        contactName,
        contactLifecycleStage: c?.lifecycle_stage ?? undefined,
        reasoning:
          typeof trace.reasoning === 'string'
            ? (trace.reasoning as string)
            : undefined,
        containsCommitment:
          typeof trace.contains_commitment === 'boolean'
            ? (trace.contains_commitment as boolean)
            : undefined,
        containsPrice:
          typeof trace.contains_price === 'boolean'
            ? (trace.contains_price as boolean)
            : undefined,
        voiceMatchScore:
          typeof trace.voice_match_score === 'number'
            ? (trace.voice_match_score as number)
            : undefined,
        intentTags: Array.isArray(trace.intent_tags)
          ? (trace.intent_tags as unknown[]).filter(
              (t): t is string => typeof t === 'string'
            )
          : undefined,
      };
    });
  } catch (err) {
    console.error('[quick-reply] loadInbox error:', err);
    return [];
  }
}

export default async function QuickReplyPage({
  searchParams,
}: {
  searchParams?: Promise<{ project?: string | string[] }>;
}) {
  await searchParams; // satisfy Next 16 contract; we don't use project here yet
  const initialMessages = await loadInbox();
  return <QuickReplyClient initialMessages={initialMessages} />;
}
