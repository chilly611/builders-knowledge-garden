import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// ═══════════════════════════════════════════════════════════════
// CRM API — The Killer App's revenue backbone
// GET  /api/v1/crm           → list contacts (filterable)
// GET  /api/v1/crm?id=xxx    → single contact
// GET  /api/v1/crm?stats=1   → pipeline summary
// POST /api/v1/crm           → create contact (writes to Supabase crm_contacts)
// PATCH /api/v1/crm          → update contact
// ═══════════════════════════════════════════════════════════════

const STAGES = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost", "dormant"] as const;
const CONTACT_TYPES = ["lead", "prospect", "client", "past_client", "vendor", "partner"] as const;
const TEMPERATURES = ["hot", "warm", "cool", "cold"] as const;
const LANES = ["dreamer", "builder", "specialist", "merchant", "ally", "crew", "fleet", "machine"] as const;

const TABLE = "crm_contacts";

type Stage = typeof STAGES[number];
type ContactType = typeof CONTACT_TYPES[number];
type Temperature = typeof TEMPERATURES[number];
type Lane = typeof LANES[number];

interface CRMContact {
  id: string;
  first_name: string;
  last_name?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  contact_type: string;
  stage: string;
  temperature: string;
  lane?: string | null;
  project_id?: string | null;
  project_type?: string | null;
  project_location?: string | null;
  estimated_value?: number | null;
  lead_score?: number | null;
  notes?: string | null;
  tags?: string[] | null;
  source?: string | null;
  source_audio_url?: string | null;
  source_photo_url?: string | null;
  source_transcript?: string | null;
  confidence?: number | null;
  time_machine_handle: string;
  archived?: boolean | null;
  created_at?: string;
  updated_at?: string;
  last_contact_at?: string | null;
  next_followup?: string | null;
  stage_changed_at?: string | null;
}

// Build a unique time_machine_handle. Schema mandates NOT NULL.
function newTimeMachineHandle(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `tm_${Date.now()}_${rand}`;
}

function asStage(value: unknown): Stage {
  return typeof value === "string" && (STAGES as readonly string[]).includes(value) ? (value as Stage) : "new";
}
function asContactType(value: unknown): ContactType {
  return typeof value === "string" && (CONTACT_TYPES as readonly string[]).includes(value) ? (value as ContactType) : "lead";
}
function asTemperature(value: unknown): Temperature {
  return typeof value === "string" && (TEMPERATURES as readonly string[]).includes(value) ? (value as Temperature) : "warm";
}
function asLane(value: unknown): Lane | null {
  return typeof value === "string" && (LANES as readonly string[]).includes(value) ? (value as Lane) : null;
}

// ═══ MOCK DATA — fallback when Supabase is not configured (e.g. local dev w/o env) ═══
const MOCK_CONTACTS: CRMContact[] = [
  {
    id: "crm-001", first_name: "Sarah", last_name: "Chen", company: "Westfield Developments",
    email: "sarah@westfield.dev", phone: "(512) 555-0142",
    contact_type: "prospect", stage: "qualified", temperature: "hot",
    project_type: "multi-family", project_location: "Austin, TX",
    estimated_value: 4200000, lead_score: 82,
    notes: "Met at Austin Construction Summit. Interested in our scheduling + estimating tools.",
    tags: ["summit-lead", "multi-family", "high-value"],
    source: "manual",
    time_machine_handle: "tm_seed_sarah",
    created_at: "2026-03-10T09:00:00Z", updated_at: "2026-03-24T14:30:00Z",
    last_contact_at: "2026-03-24T14:30:00Z", next_followup: "2026-03-28T10:00:00Z",
  },
  {
    id: "crm-002", first_name: "Marcus", last_name: "Rivera", company: "Rivera Electric",
    email: "marcus@riveraelectric.com", phone: "(305) 555-0198",
    contact_type: "lead", stage: "contacted", temperature: "warm",
    project_type: "commercial", project_location: "Miami, FL",
    estimated_value: 850000, lead_score: 55,
    notes: "Specialty electrical contractor. Interested in code lookup + cert tracking.",
    tags: ["electrical", "specialty", "miami"],
    source: "manual",
    time_machine_handle: "tm_seed_marcus",
    created_at: "2026-03-20T08:00:00Z", updated_at: "2026-03-22T10:00:00Z",
    last_contact_at: "2026-03-22T10:00:00Z", next_followup: "2026-03-27T09:00:00Z",
  },
];

// ═══ GET Handler ═══
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const stats = searchParams.get("stats");
  const stage = searchParams.get("stage");
  const contactType = searchParams.get("type");
  const temperature = searchParams.get("temperature");
  const lane = searchParams.get("lane");
  const archivedParam = searchParams.get("archived");
  const search = searchParams.get("q");

  // ───────── Supabase path ─────────
  if (isSupabaseConfigured()) {
    try {
      // Single contact
      if (id) {
        const { data, error } = await supabase
          .from(TABLE)
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        if (!data) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
        return NextResponse.json({ contact: data });
      }

      // Pipeline stats
      if (stats) {
        const { data, error } = await supabase
          .from(TABLE)
          .select("stage, estimated_value, lead_score, temperature, next_followup, archived")
          .eq("archived", false);
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        const rows = data || [];
        const pipeline: Record<string, { count: number; value: number }> = {};
        for (const s of STAGES) {
          const inStage = rows.filter(r => r.stage === s);
          pipeline[s] = {
            count: inStage.length,
            value: inStage.reduce((sum, r) => sum + (Number(r.estimated_value) || 0), 0),
          };
        }
        const total = rows.length;
        const totalValue = rows.reduce((sum, r) => sum + (Number(r.estimated_value) || 0), 0);
        const totalScore = rows.reduce((sum, r) => sum + (Number(r.lead_score) || 0), 0);
        return NextResponse.json({
          pipeline,
          totals: {
            contacts: total,
            total_value: totalValue,
            avg_score: total > 0 ? Math.round(totalScore / total) : 0,
            hot: rows.filter(r => r.temperature === "hot").length,
            needs_followup: rows.filter(r => r.next_followup && new Date(r.next_followup as string) <= new Date()).length,
          },
        });
      }

      // Filtered list (default: non-archived, newest first, limit 50)
      let query = supabase.from(TABLE).select("*");
      const showArchived = archivedParam === "true";
      if (!showArchived) {
        query = query.or("archived.is.null,archived.eq.false");
      }
      if (stage) query = query.eq("stage", stage);
      if (contactType) query = query.eq("contact_type", contactType);
      if (temperature) query = query.eq("temperature", temperature);
      if (lane) query = query.eq("lane", lane);
      if (search) {
        const q = search.replace(/[%,]/g, "");
        query = query.or(
          `first_name.ilike.%${q}%,last_name.ilike.%${q}%,company.ilike.%${q}%,email.ilike.%${q}%`
        );
      }
      query = query.order("created_at", { ascending: false }).limit(50);

      const { data, error } = await query;
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const list = data || [];
      return NextResponse.json({ contacts: list, total: list.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // ───────── Fallback: in-memory mock ─────────
  if (id) {
    const contact = MOCK_CONTACTS.find(c => c.id === id);
    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    return NextResponse.json({ contact });
  }

  if (stats) {
    const pipeline: Record<string, { count: number; value: number }> = {};
    for (const s of STAGES) {
      const inStage = MOCK_CONTACTS.filter(c => c.stage === s && !c.archived);
      pipeline[s] = { count: inStage.length, value: inStage.reduce((sum, c) => sum + (c.estimated_value || 0), 0) };
    }
    const total = MOCK_CONTACTS.filter(c => !c.archived);
    return NextResponse.json({
      pipeline,
      totals: {
        contacts: total.length,
        total_value: total.reduce((sum, c) => sum + (c.estimated_value || 0), 0),
        avg_score: total.length > 0 ? Math.round(total.reduce((sum, c) => sum + (c.lead_score || 0), 0) / total.length) : 0,
        hot: total.filter(c => c.temperature === "hot").length,
        needs_followup: total.filter(c => c.next_followup && new Date(c.next_followup) <= new Date()).length,
      },
    });
  }

  let contacts = MOCK_CONTACTS.filter(c => !c.archived);
  if (stage) contacts = contacts.filter(c => c.stage === stage);
  if (contactType) contacts = contacts.filter(c => c.contact_type === contactType);
  if (temperature) contacts = contacts.filter(c => c.temperature === temperature);
  if (lane) contacts = contacts.filter(c => c.lane === lane);
  if (search) {
    const q = search.toLowerCase();
    contacts = contacts.filter(c =>
      c.first_name.toLowerCase().includes(q) ||
      (c.last_name || "").toLowerCase().includes(q) ||
      (c.company || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.tags || []).some(t => t.includes(q))
    );
  }
  contacts.sort((a, b) => (b.lead_score || 0) - (a.lead_score || 0));
  return NextResponse.json({ contacts: contacts.slice(0, 50), total: contacts.length });
}

// ═══ POST Handler — Create contact ═══
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const firstName = typeof body.first_name === "string" ? body.first_name.trim() : "";
  if (!firstName) {
    return NextResponse.json({ error: "first_name is required" }, { status: 400 });
  }

  // Normalize: voice-extract may send extracted_value instead of estimated_value
  const rawEstimated = body.estimated_value ?? body.extracted_value;
  const estimatedValue = typeof rawEstimated === "number" && !Number.isNaN(rawEstimated) ? rawEstimated : null;

  const tagsInput = body.tags;
  const tags = Array.isArray(tagsInput)
    ? tagsInput.filter((t): t is string => typeof t === "string")
    : null;

  const source = typeof body.source === "string" && body.source.trim() ? body.source.trim() : "manual";

  const row: Omit<CRMContact, "id" | "created_at" | "updated_at"> & { tags: string[] | null } = {
    first_name: firstName,
    last_name: typeof body.last_name === "string" ? body.last_name : null,
    company: typeof body.company === "string" ? body.company : null,
    email: typeof body.email === "string" ? body.email : null,
    phone: typeof body.phone === "string" ? body.phone : null,
    contact_type: asContactType(body.contact_type),
    stage: asStage(body.stage),
    temperature: asTemperature(body.temperature),
    lane: asLane(body.lane),
    project_id: typeof body.project_id === "string" ? body.project_id : null,
    project_type: typeof body.project_type === "string" ? body.project_type : null,
    project_location: typeof body.project_location === "string" ? body.project_location : null,
    estimated_value: estimatedValue,
    lead_score: typeof body.lead_score === "number" ? body.lead_score : 30,
    notes: typeof body.notes === "string" ? body.notes : null,
    tags,
    source,
    source_audio_url: typeof body.source_audio_url === "string" ? body.source_audio_url : null,
    source_photo_url: typeof body.source_photo_url === "string" ? body.source_photo_url : null,
    source_transcript: typeof body.source_transcript === "string" ? body.source_transcript : null,
    confidence: typeof body.confidence === "number" ? body.confidence : null,
    time_machine_handle: newTimeMachineHandle(),
    archived: false,
  };

  // ───────── Supabase path ─────────
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .insert(row)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ contact: data, message: "Contact created" }, { status: 201 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown Supabase error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // ───────── Fallback: in-memory mock ─────────
  const newContact: CRMContact = {
    id: `crm-${Date.now()}`,
    ...row,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  MOCK_CONTACTS.push(newContact);
  return NextResponse.json({ contact: newContact, message: "Contact created (mock)" }, { status: 201 });
}

// ═══ PATCH Handler — Update contact ═══
export async function PATCH(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : null;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const allowed = [
    "first_name", "last_name", "company", "email", "phone",
    "contact_type", "stage", "temperature", "lane",
    "project_id", "project_type", "project_location",
    "estimated_value", "lead_score", "notes", "tags",
    "source", "source_audio_url", "source_photo_url", "source_transcript", "confidence",
    "next_followup", "last_contact_at", "archived",
  ] as const;

  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }
  updates.updated_at = new Date().toISOString();
  if (typeof body.stage === "string") {
    updates.stage_changed_at = new Date().toISOString();
  }

  // ───────── Supabase path ─────────
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (!data) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
      return NextResponse.json({ contact: data, message: "Contact updated" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown Supabase error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // ───────── Fallback: in-memory mock ─────────
  const contact = MOCK_CONTACTS.find(c => c.id === id);
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  for (const [k, v] of Object.entries(updates)) {
    // Narrow assignment to the known CRMContact shape.
    (contact as unknown as Record<string, unknown>)[k] = v;
  }
  return NextResponse.json({ contact, message: "Contact updated (mock)" });
}
