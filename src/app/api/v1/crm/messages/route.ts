// Builder's Knowledge Garden — CRM Messages Route (Brief 2)
//
// GET  /api/v1/crm/messages              → all messages (filterable)
// GET  /api/v1/crm/messages?inbox=1      → unread inbound + their drafts
// GET  /api/v1/crm/messages?contact=:id  → full thread for a contact
// POST /api/v1/crm/messages              → create a message (inbound or manual)
//
// Mirrors the CRUD shape of /api/v1/crm/route.ts: query-param-style
// discriminator on GET, explicit 405s on disallowed verbs, falls back to
// an empty in-memory list when Supabase envs are missing so previews
// don't crash.

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────

export const MESSAGE_DIRECTIONS = ['inbound', 'outbound'] as const;
export const MESSAGE_CHANNELS = [
  'sms',
  'voicemail',
  'email',
  'call_transcript',
  'manual',
] as const;
export const MESSAGE_STATUSES = [
  'received',
  'drafted',
  'queued',
  'sent',
  'delivered',
  'failed',
  'undone',
  'read',
] as const;

export type MessageDirection = (typeof MESSAGE_DIRECTIONS)[number];
export type MessageChannel = (typeof MESSAGE_CHANNELS)[number];
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

interface MessageRow {
  id: string;
  contact_id: string | null;
  direction: MessageDirection;
  channel: MessageChannel;
  body: string;
  ai_drafted: boolean | null;
  ai_tone: string | null;
  status: MessageStatus;
  queued_until: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  time_machine_handle: string | null;
  created_at: string;
  ai_reasoning_trace: Record<string, unknown> | null;
  external_from: string | null;
  external_to: string | null;
  external_message_id: string | null;
}

interface ContactSummary {
  id: string;
  first_name: string | null;
  last_name: string | null;
  lifecycle_stage: string | null;
}

interface ApiMessage {
  id: string;
  contactId: string | null;
  direction: MessageDirection;
  channel: MessageChannel;
  body: string;
  aiDrafted: boolean;
  aiTone?: string;
  status: MessageStatus;
  queuedUntil?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  timeMachineHandle: string;
  createdAt: string;
  contactName?: string;
  contactLifecycleStage?: string;
  reasoning?: string;
  containsCommitment?: boolean;
  containsPrice?: boolean;
  voiceMatchScore?: number;
  intentTags?: string[];
}

interface PostBody {
  contactId?: string | null;
  direction?: MessageDirection;
  channel?: MessageChannel;
  body?: string;
  externalFrom?: string;
  externalTo?: string;
  externalMessageId?: string;
}

// ─── Supabase admin client ────────────────────────────────────────────────

let adminClient: SupabaseClient | null = null;
function getAdminClient(): SupabaseClient | null {
  if (adminClient) return adminClient;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || url.includes('placeholder')) {
    console.warn('[crm/messages] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — returning empty list.');
    return null;
  }
  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function rowToApi(
  row: MessageRow,
  contactsById: Map<string, ContactSummary>
): ApiMessage {
  const trace = row.ai_reasoning_trace ?? {};
  const c = row.contact_id ? contactsById.get(row.contact_id) : undefined;
  const contactName = c
    ? [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || undefined
    : undefined;
  return {
    id: row.id,
    contactId: row.contact_id,
    direction: row.direction,
    channel: row.channel,
    body: row.body,
    aiDrafted: row.ai_drafted ?? false,
    aiTone: row.ai_tone ?? undefined,
    status: row.status,
    queuedUntil: row.queued_until ?? undefined,
    sentAt: row.sent_at ?? undefined,
    deliveredAt: row.delivered_at ?? undefined,
    readAt: row.read_at ?? undefined,
    timeMachineHandle: row.time_machine_handle ?? '',
    createdAt: row.created_at,
    contactName,
    contactLifecycleStage: c?.lifecycle_stage ?? undefined,
    reasoning: typeof trace.reasoning === 'string' ? (trace.reasoning as string) : undefined,
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
}

async function loadContactsByIds(
  admin: SupabaseClient,
  ids: string[]
): Promise<Map<string, ContactSummary>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await admin
    .from('crm_contacts')
    .select('id, first_name, last_name, lifecycle_stage')
    .in('id', ids);
  if (error || !data) return new Map();
  return new Map(
    (data as ContactSummary[]).map((c) => [c.id, c])
  );
}

function isMessageDirection(v: unknown): v is MessageDirection {
  return typeof v === 'string' && (MESSAGE_DIRECTIONS as readonly string[]).includes(v);
}

function isMessageChannel(v: unknown): v is MessageChannel {
  return typeof v === 'string' && (MESSAGE_CHANNELS as readonly string[]).includes(v);
}

// ─── GET ──────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const inbox = url.searchParams.get('inbox');
  const contactId = url.searchParams.get('contact');

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: true, messages: [] }, { status: 200 });
  }

  try {
    let query = admin
      .from('crm_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (inbox === '1' || inbox === 'true') {
      // Inbox view: unread inbound + their drafts (drafts share contact_id
      // and direction='outbound', status='drafted' or 'queued')
      query = query
        .or(
          [
            'and(direction.eq.inbound,status.in.(received,read))',
            'and(direction.eq.outbound,status.in.(drafted,queued))',
          ].join(',')
        );
    } else if (contactId) {
      query = query.eq('contact_id', contactId);
    }

    const { data, error } = await query;
    if (error || !data) {
      console.error('[crm/messages GET] query failed:', error?.message);
      return NextResponse.json({ ok: true, messages: [] }, { status: 200 });
    }
    const rows = data as MessageRow[];
    const contactIds = Array.from(
      new Set(rows.map((r) => r.contact_id).filter((id): id is string => Boolean(id)))
    );
    const contactsById = await loadContactsByIds(admin, contactIds);
    const messages = rows.map((r) => rowToApi(r, contactsById));
    return NextResponse.json({ ok: true, messages }, { status: 200 });
  } catch (err) {
    console.error('[crm/messages GET] error:', err);
    return NextResponse.json({ ok: true, messages: [] }, { status: 200 });
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.body || typeof body.body !== 'string' || body.body.trim().length === 0) {
    return NextResponse.json(
      { error: 'validation_failed', message: 'body is required' },
      { status: 400 }
    );
  }
  if (!isMessageDirection(body.direction)) {
    return NextResponse.json(
      { error: 'validation_failed', message: 'direction must be inbound|outbound' },
      { status: 400 }
    );
  }
  const channel: MessageChannel = isMessageChannel(body.channel)
    ? body.channel
    : 'sms';

  const admin = getAdminClient();
  const timeMachineHandle = crypto.randomUUID();

  if (!admin) {
    // Ephemeral response.
    return NextResponse.json(
      {
        ok: true,
        message: {
          id: crypto.randomUUID(),
          contactId: body.contactId ?? null,
          direction: body.direction,
          channel,
          body: body.body,
          status: body.direction === 'inbound' ? 'received' : 'drafted',
          timeMachineHandle,
          createdAt: new Date().toISOString(),
        },
        ephemeral: true,
      },
      { status: 200 }
    );
  }

  try {
    const insertRow = {
      contact_id: body.contactId ?? null,
      direction: body.direction,
      channel,
      body: body.body,
      ai_drafted: false,
      status: body.direction === 'inbound' ? 'received' : 'drafted',
      time_machine_handle: timeMachineHandle,
      external_from: body.externalFrom ?? null,
      external_to: body.externalTo ?? null,
      external_message_id: body.externalMessageId ?? null,
    };
    const { data, error } = await admin
      .from('crm_messages')
      .insert(insertRow)
      .select('*')
      .single();
    if (error || !data) {
      console.error('[crm/messages POST] insert failed:', error?.message);
      return NextResponse.json(
        { error: 'item_create_failed', message: error?.message ?? 'unknown' },
        { status: 500 }
      );
    }
    const row = data as MessageRow;
    const contactsById = await loadContactsByIds(
      admin,
      row.contact_id ? [row.contact_id] : []
    );
    return NextResponse.json(
      { ok: true, message: rowToApi(row, contactsById) },
      { status: 200 }
    );
  } catch (err) {
    console.error('[crm/messages POST] error:', err);
    return NextResponse.json(
      { error: 'item_create_failed', message: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    );
  }
}

// ─── 405s ─────────────────────────────────────────────────────────────────

export async function PUT(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
export async function PATCH(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
