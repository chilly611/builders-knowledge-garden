import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════
// CRM API — The Killer App's revenue backbone (Brief 1 wiring)
//
// GET  /api/v1/crm           → list contacts (filterable)
// GET  /api/v1/crm?id=xxx    → single contact + activities
// GET  /api/v1/crm?stats=1   → pipeline summary
// POST /api/v1/crm           → create contact (Brief 1: extended shape)
// PATCH /api/v1/crm          → update contact
//
// Persistence is now Supabase-backed via SUPABASE_URL +
// SUPABASE_SERVICE_ROLE_KEY (server-only). If those envs are absent the
// route falls back to the in-memory MOCK_CONTACTS array so local dev and
// preview deploys keep working. Same external shape either way.
// ═══════════════════════════════════════════════════════════════

export const STAGES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'dormant'] as const;
export const CONTACT_TYPES = ['lead', 'prospect', 'client', 'past_client', 'vendor', 'partner'] as const;
export const TEMPERATURES = ['hot', 'warm', 'cool', 'cold'] as const;

export type Stage = (typeof STAGES)[number];
export type ContactType = (typeof CONTACT_TYPES)[number];
export type Temperature = (typeof TEMPERATURES)[number];

export interface CRMActivity {
  id: string;
  activity_type: string;
  title: string;
  body?: string;
  outcome?: string;
  scheduled_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface CRMContact {
  id: string;
  first_name: string;
  last_name?: string;
  company?: string;
  email?: string;
  phone?: string;
  contact_type: string;
  stage: string;
  temperature: string;
  // Brief 1 additions ↓
  lane?: string;
  lifecycle_stage?: string;
  source?: 'voice' | 'photo' | 'manual' | 'dream_builder';
  source_audio_url?: string;
  source_photo_url?: string;
  source_transcript?: string;
  confidence?: number;
  time_machine_handle?: string;
  jsonld?: Record<string, unknown>;
  // existing fields ↓
  project_type?: string;
  project_location?: string;
  estimated_value?: number;
  lead_score: number;
  notes?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  last_contact_at?: string;
  next_followup?: string;
  archived?: boolean;
  stage_changed_at?: string;
  activities?: CRMActivity[];
}

// ─── Supabase admin client ────────────────────────────────────────────────

let adminClient: SupabaseClient | null = null;
function getAdminClient(): SupabaseClient | null {
  if (adminClient) return adminClient;
  // SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are required for real persistence.
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || url.includes('placeholder')) {
    console.warn('[crm] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — using in-memory mock.');
    return null;
  }
  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

// ─── In-memory mock fallback ──────────────────────────────────────────────

const MOCK_CONTACTS: CRMContact[] = [
  {
    id: 'crm-001',
    first_name: 'Sarah',
    last_name: 'Chen',
    company: 'Westfield Developments',
    email: 'sarah@westfield.dev',
    phone: '(512) 555-0142',
    contact_type: 'prospect',
    stage: 'qualified',
    temperature: 'hot',
    project_type: 'multi-family',
    project_location: 'Austin, TX',
    estimated_value: 4200000,
    lead_score: 82,
    notes: 'Met at Austin Construction Summit.',
    tags: ['summit-lead', 'multi-family', 'high-value'],
    created_at: '2026-03-10T09:00:00Z',
    updated_at: '2026-03-24T14:30:00Z',
    last_contact_at: '2026-03-24T14:30:00Z',
    activities: [],
  },
  {
    id: 'crm-002',
    first_name: 'Marcus',
    last_name: 'Rivera',
    company: 'Rivera Electric',
    email: 'marcus@riveraelectric.com',
    phone: '(305) 555-0198',
    contact_type: 'lead',
    stage: 'contacted',
    temperature: 'warm',
    project_type: 'commercial',
    project_location: 'Miami, FL',
    estimated_value: 850000,
    lead_score: 55,
    notes: 'Specialty electrical contractor.',
    tags: ['electrical', 'specialty', 'miami'],
    created_at: '2026-03-20T08:00:00Z',
    updated_at: '2026-03-22T10:00:00Z',
    last_contact_at: '2026-03-22T10:00:00Z',
    activities: [],
  },
];

// ─── DB ↔ API row mapping ─────────────────────────────────────────────────

function toApiRow(row: Record<string, unknown>): CRMContact {
  const tags = Array.isArray(row.tags) ? (row.tags as string[]) : [];
  return {
    id: String(row.id),
    first_name: String(row.first_name ?? ''),
    last_name: (row.last_name as string) ?? undefined,
    company: (row.company as string) ?? undefined,
    email: (row.email as string) ?? undefined,
    phone: (row.phone as string) ?? undefined,
    contact_type: String(row.contact_type ?? 'lead'),
    stage: String(row.stage ?? 'new'),
    temperature: String(row.temperature ?? 'warm'),
    lane: (row.lane as string) ?? undefined,
    lifecycle_stage: (row.lifecycle_stage as string) ?? undefined,
    source: (row.source as CRMContact['source']) ?? undefined,
    source_audio_url: (row.source_audio_url as string) ?? undefined,
    source_photo_url: (row.source_photo_url as string) ?? undefined,
    source_transcript: (row.source_transcript as string) ?? undefined,
    confidence: typeof row.confidence === 'number' ? (row.confidence as number) : undefined,
    time_machine_handle: (row.time_machine_handle as string) ?? undefined,
    jsonld: (row.jsonld as Record<string, unknown>) ?? undefined,
    project_type: (row.project_type as string) ?? undefined,
    project_location: (row.project_location as string) ?? undefined,
    estimated_value: typeof row.estimated_value === 'number' ? (row.estimated_value as number) : undefined,
    lead_score: typeof row.lead_score === 'number' ? (row.lead_score as number) : 30,
    notes: (row.notes as string) ?? undefined,
    tags,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
    last_contact_at: (row.last_contact_at as string) ?? undefined,
    next_followup: (row.next_followup as string) ?? undefined,
    archived: (row.archived as boolean) ?? false,
    stage_changed_at: (row.stage_changed_at as string) ?? undefined,
  };
}

// ═══ GET ══════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const stats = searchParams.get('stats');
  const stage = searchParams.get('stage');
  const contactType = searchParams.get('type');
  const temperature = searchParams.get('temperature');
  const search = searchParams.get('q');

  const admin = getAdminClient();

  if (!admin) {
    // ── In-memory fallback ─────────────────────────────────────────
    if (id) {
      const contact = MOCK_CONTACTS.find((c) => c.id === id);
      if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
      return NextResponse.json({ contact });
    }
    if (stats) {
      const pipeline: Record<string, { count: number; value: number }> = {};
      for (const s of STAGES) {
        const inStage = MOCK_CONTACTS.filter((c) => c.stage === s && !c.archived);
        pipeline[s] = {
          count: inStage.length,
          value: inStage.reduce((sum, c) => sum + (c.estimated_value || 0), 0),
        };
      }
      const total = MOCK_CONTACTS.filter((c) => !c.archived);
      return NextResponse.json({
        pipeline,
        totals: {
          contacts: total.length,
          total_value: total.reduce((sum, c) => sum + (c.estimated_value || 0), 0),
          avg_score: total.length
            ? Math.round(total.reduce((sum, c) => sum + c.lead_score, 0) / total.length)
            : 0,
          hot: total.filter((c) => c.temperature === 'hot').length,
          needs_followup: total.filter((c) => c.next_followup && new Date(c.next_followup) <= new Date())
            .length,
        },
      });
    }
    let contacts = MOCK_CONTACTS.filter((c) => !c.archived);
    if (stage) contacts = contacts.filter((c) => c.stage === stage);
    if (contactType) contacts = contacts.filter((c) => c.contact_type === contactType);
    if (temperature) contacts = contacts.filter((c) => c.temperature === temperature);
    if (search) {
      const q = search.toLowerCase();
      contacts = contacts.filter(
        (c) =>
          c.first_name.toLowerCase().includes(q) ||
          (c.last_name || '').toLowerCase().includes(q) ||
          (c.company || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.tags || []).some((t) => t.includes(q))
      );
    }
    contacts.sort((a, b) => b.lead_score - a.lead_score);
    const list = contacts.map(({ activities, ...rest }) => ({
      ...rest,
      activity_count: (activities || []).length,
    }));
    return NextResponse.json({ contacts: list, total: list.length });
  }

  // ── Supabase path ────────────────────────────────────────────────
  try {
    if (id) {
      const { data, error } = await admin.from('crm_contacts').select('*').eq('id', id).single();
      if (error || !data) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
      const { data: acts } = await admin
        .from('crm_contact_activities')
        .select('*')
        .eq('contact_id', id)
        .order('created_at', { ascending: false });
      const contact = toApiRow(data as Record<string, unknown>);
      contact.activities = (acts ?? []) as CRMActivity[];
      return NextResponse.json({ contact });
    }

    if (stats) {
      const { data: rows, error } = await admin
        .from('crm_contacts')
        .select('stage, estimated_value, lead_score, temperature, next_followup, archived');
      if (error) {
        return NextResponse.json({ error: 'stats failed', detail: error.message }, { status: 500 });
      }
      const active = (rows ?? []).filter((r) => !r.archived);
      const pipeline: Record<string, { count: number; value: number }> = {};
      for (const s of STAGES) {
        const inStage = active.filter((r) => r.stage === s);
        pipeline[s] = {
          count: inStage.length,
          value: inStage.reduce(
            (sum, r) => sum + (typeof r.estimated_value === 'number' ? r.estimated_value : 0),
            0
          ),
        };
      }
      return NextResponse.json({
        pipeline,
        totals: {
          contacts: active.length,
          total_value: active.reduce(
            (sum, r) => sum + (typeof r.estimated_value === 'number' ? r.estimated_value : 0),
            0
          ),
          avg_score: active.length
            ? Math.round(
                active.reduce((sum, r) => sum + (typeof r.lead_score === 'number' ? r.lead_score : 0), 0) /
                  active.length
              )
            : 0,
          hot: active.filter((r) => r.temperature === 'hot').length,
          needs_followup: active.filter((r) => r.next_followup && new Date(r.next_followup) <= new Date())
            .length,
        },
      });
    }

    let query = admin
      .from('crm_contacts')
      .select('*, crm_contact_activities(count)')
      .eq('archived', false)
      .order('lead_score', { ascending: false })
      .limit(100);
    if (stage) query = query.eq('stage', stage);
    if (contactType) query = query.eq('contact_type', contactType);
    if (temperature) query = query.eq('temperature', temperature);
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,company.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: 'list failed', detail: error.message }, { status: 500 });
    }
    const list = (data ?? []).map((r) => {
      const row = toApiRow(r as Record<string, unknown>);
      const countArr = (r as Record<string, unknown>).crm_contact_activities as Array<{ count: number }> | undefined;
      const activity_count = countArr?.[0]?.count ?? 0;
      return { ...row, activity_count };
    });
    return NextResponse.json({ contacts: list, total: list.length });
  } catch (err) {
    console.error('[crm] GET failed:', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

// ═══ POST ═════════════════════════════════════════════════════════════════

interface CreateBody {
  first_name?: string;
  last_name?: string;
  company?: string;
  email?: string;
  phone?: string;
  contact_type?: string;
  stage?: string;
  project_type?: string;
  project_location?: string;
  estimated_value?: number;
  notes?: string;
  tags?: string[];
  // Brief 1 additions ↓
  lane?: string;
  lifecycle_stage?: string;
  source?: 'voice' | 'photo' | 'manual' | 'dream_builder';
  source_audio_url?: string;
  source_photo_url?: string;
  source_transcript?: string;
  confidence?: number;
  time_machine_handle?: string;
  jsonld?: Record<string, unknown>;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  if (!body.first_name) {
    return NextResponse.json({ error: 'first_name is required' }, { status: 400 });
  }

  const admin = getAdminClient();
  const contact_type =
    body.contact_type && (CONTACT_TYPES as readonly string[]).includes(body.contact_type)
      ? body.contact_type
      : 'lead';
  const stage =
    body.stage && (STAGES as readonly string[]).includes(body.stage) ? body.stage : 'new';

  if (!admin) {
    const newContact: CRMContact = {
      id: `crm-${Date.now()}`,
      first_name: body.first_name,
      last_name: body.last_name ?? '',
      company: body.company ?? '',
      email: body.email ?? '',
      phone: body.phone ?? '',
      contact_type,
      stage,
      temperature: 'warm',
      lane: body.lane,
      lifecycle_stage: body.lifecycle_stage ?? 'lead',
      source: body.source,
      source_audio_url: body.source_audio_url,
      source_photo_url: body.source_photo_url,
      source_transcript: body.source_transcript,
      confidence: body.confidence,
      time_machine_handle: body.time_machine_handle ?? `tm-${Date.now()}`,
      jsonld: body.jsonld,
      project_type: body.project_type ?? '',
      project_location: body.project_location ?? '',
      estimated_value: body.estimated_value ?? 0,
      lead_score: 30,
      notes: body.notes ?? '',
      tags: body.tags ?? [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      activities: [],
    };
    MOCK_CONTACTS.push(newContact);
    return NextResponse.json({ contact: newContact, message: 'Contact created' }, { status: 201 });
  }

  const insertRow = {
    first_name: body.first_name,
    last_name: body.last_name ?? null,
    company: body.company ?? null,
    email: body.email ?? null,
    phone: body.phone ?? null,
    contact_type,
    stage,
    temperature: 'warm',
    lane: body.lane ?? null,
    lifecycle_stage: body.lifecycle_stage ?? 'lead',
    source: body.source ?? 'manual',
    source_audio_url: body.source_audio_url ?? null,
    source_photo_url: body.source_photo_url ?? null,
    source_transcript: body.source_transcript ?? null,
    confidence: body.confidence ?? null,
    time_machine_handle: body.time_machine_handle ?? undefined, // let DB default fire if absent
    jsonld: body.jsonld ?? null,
    project_type: body.project_type ?? null,
    project_location: body.project_location ?? null,
    estimated_value: body.estimated_value ?? null,
    lead_score: 30,
    notes: body.notes ?? null,
    tags: body.tags ?? [],
  };
  const { data, error } = await admin.from('crm_contacts').insert(insertRow).select('*').single();
  if (error || !data) {
    return NextResponse.json({ error: 'insert failed', detail: error?.message }, { status: 500 });
  }
  return NextResponse.json(
    { contact: toApiRow(data as Record<string, unknown>), message: 'Contact created' },
    { status: 201 }
  );
}

// ═══ PATCH ════════════════════════════════════════════════════════════════

const ALLOWED_UPDATE_FIELDS = [
  'first_name',
  'last_name',
  'company',
  'email',
  'phone',
  'contact_type',
  'stage',
  'temperature',
  'lane',
  'lifecycle_stage',
  'project_type',
  'project_location',
  'estimated_value',
  'lead_score',
  'notes',
  'tags',
  'next_followup',
  'archived',
  'source_audio_url',
  'source_photo_url',
  'jsonld',
] as const;

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const id = body.id as string | undefined;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const admin = getAdminClient();
  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED_UPDATE_FIELDS) {
    if (key in body) updates[key] = body[key];
  }
  updates.updated_at = new Date().toISOString();
  if ('stage' in body) updates.stage_changed_at = new Date().toISOString();

  if (!admin) {
    const contact = MOCK_CONTACTS.find((c) => c.id === id);
    if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    for (const [k, v] of Object.entries(updates)) {
      (contact as unknown as Record<string, unknown>)[k] = v;
    }
    return NextResponse.json({ contact, message: 'Contact updated' });
  }

  const { data, error } = await admin
    .from('crm_contacts')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error || !data) {
    return NextResponse.json({ error: 'update failed', detail: error?.message }, { status: 500 });
  }
  return NextResponse.json({
    contact: toApiRow(data as Record<string, unknown>),
    message: 'Contact updated',
  });
}
